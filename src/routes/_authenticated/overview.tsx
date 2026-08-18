import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Bike as BikeIcon, 
  Battery,
  Calendar, 
  CircleDot, 
  Fuel,
  History, 
  Info, 
  LayoutDashboard, 
  Wrench,
  Droplets,
  Zap,
  Clock,
  Gauge,
  Check
} from "lucide-react";
import { useBikes } from "@/hooks/useBikes";
import { useDashboardHistory } from "@/hooks/useDashboard";
import { useProfile } from "@/hooks/useProfile";
import { AppShell } from "@/components/AppShell";
import { LogMaintenanceDialog } from "@/components/LogMaintenanceDialog";
import { LogFuelDialog } from "@/components/LogFuelDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSignedUrl } from "@/hooks/useBikes";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { computeSchedule, calculateDailyUsage, km } from "@/lib/moto";
import { View360 } from "@/components/View360";
import { format, addDays } from "date-fns";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/overview")({
  component: Overview,
});

function Overview() {
  const { profile } = useProfile();
  const { data: bikes } = useBikes();
  const { data: history } = useDashboardHistory(profile?.id || undefined);
  
  // Use the default bike, or the first one if none is set
  const bike = bikes?.find(b => b.is_default) || bikes?.[0];

  const { data: schedules } = useQuery({
    queryKey: ["service-schedules", bike?.id],
    enabled: !!bike?.id,
    queryFn: async () => {
      if (!bike?.id) return [];
      const { data } = await supabase
        .from("service_schedules")
        .select("*")
        .eq("bike_id", bike.id);
      return data || [];
    }
  });

  const { data: fuelLogs } = useQuery({
    queryKey: ["fuel-logs-usage", bike?.id],
    enabled: !!bike?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("fuel_logs")
        .select("fill_date, odometer")
        .eq("bike_id", bike!.id)
        .order("fill_date", { ascending: false });
      return data || [];
    }
  });

  const dailyUsage = calculateDailyUsage(fuelLogs || []);

  const getStatusInfo = (itemNames: string[]) => {
    // Find the schedule for any of the item names
    const s = schedules?.find(s => 
      itemNames.some(name => s.item.toLowerCase().includes(name.toLowerCase()))
    );

    if (!bike) return { text: "N/A", status: "good" as const };
    
    // If no specific schedule found, we display a message
    if (!s) return { text: "No schedule set", status: "good" as const };
    
    const computed = computeSchedule(s as any, bike.current_odometer || 0, dailyUsage);
    
    const dateText = computed.estimatedDate 
      ? `(Est ${format(new Date(computed.estimatedDate), "dd-MMM-yy")})`
      : "";
    
    // The user specifically wants: "Need change in 500KM (Est 30-Sep-26)"
    return {
      text: computed.status === "overdue" 
        ? `Overdue by ${Math.abs(computed.remainingKm)}KM ${dateText}`
        : `Need change in ${computed.remainingKm}KM ${dateText}`,
      status: computed.status,
      item: s.item
    };
  };

  const oilStatus = getStatusInfo(["oil"]);
  const batteryStatus = getStatusInfo(["battery"]);
  
  // Upcoming maintenance (excluding oil and battery)
  const upcomingMaintenance = schedules
    ?.filter(s => !s.item.toLowerCase().includes("oil") && !s.item.toLowerCase().includes("battery"))
    .map(s => ({
      ...s,
      computed: computeSchedule(s as any, bike?.current_odometer || 0, dailyUsage)
    }))
    .sort((a, b) => a.computed.remainingKm - b.computed.remainingKm)[0];

  return (
    <AppShell title="Vehicle Care" subtitle={bike ? `${bike.model || ''} ${bike.year || ''}`.trim() : "Welcome to your garage"}>
      <div className="flex flex-col items-center mb-6 overflow-hidden">
        <div className="relative w-[115%] -mx-[7.5%] aspect-video sm:aspect-[4/3] sm:w-full sm:max-w-md flex items-center justify-center mb-6 group bike-bg-premium-lg z-0">
          {bike?.photos_paths && bike.photos_paths.length > 0 ? (
            <View360 paths={bike.photos_paths} className="size-full" />
          ) : bike?.photo_path ? (
            <HeroImage path={bike.photo_path} />
          ) : (
            <BikeIcon className="size-32 text-muted-foreground/20" />
          )}
        </div>
        
      </div>

      <div className="space-y-4">
        {/* Vehicle Status Section */}
        <section className="space-y-3">
          
          <div className="grid grid-cols-2 grid-rows-2 gap-3">
            {/* Oil Status */}
            <div className={`panel p-4 flex flex-col justify-between min-h-[110px] border-l-4 ${
              oilStatus.status === 'overdue' ? 'border-l-destructive' :
              oilStatus.status === 'due-soon' ? 'border-l-amber-500' :
              'border-l-primary'
            }`}>
              <div className="flex items-center gap-2 text-primary/80 mb-2">
                <Droplets className="size-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Oil Status</span>
              </div>
              <p className="text-[11px] font-medium leading-relaxed">
                {oilStatus.text}
              </p>
            </div>

            {/* Battery Status */}
            <div className={`panel p-4 flex flex-col justify-between min-h-[110px] border-l-4 ${
              batteryStatus.status === 'overdue' ? 'border-l-destructive' :
              batteryStatus.status === 'due-soon' ? 'border-l-amber-500' :
              'border-l-primary'
            }`}>
              <div className="flex items-center gap-2 text-primary/80 mb-2">
                <Zap className="size-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Battery</span>
              </div>
              <p className="text-[11px] font-medium leading-relaxed">
                {batteryStatus.text}
              </p>
            </div>

            {/* Upcoming Maintenance */}
            <div className={`panel p-4 col-span-2 flex flex-col justify-between min-h-[110px] border-l-4 ${
              upcomingMaintenance?.computed.status === 'overdue' ? 'border-l-destructive' :
              upcomingMaintenance?.computed.status === 'due-soon' ? 'border-l-amber-500' :
              'border-l-primary'
            }`}>
              <div className="flex items-center gap-2 text-primary/80 mb-2">
                <Clock className="size-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Upcoming Maintenance</span>
              </div>
              {upcomingMaintenance ? (
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[12px] font-bold text-primary">{upcomingMaintenance.item}</p>
                    <p className="text-[11px] font-medium">
                      {upcomingMaintenance.computed.status === "overdue" 
                        ? `Overdue by ${Math.abs(upcomingMaintenance.computed.remainingKm)}KM`
                        : `In ${upcomingMaintenance.computed.remainingKm}KM`}
                      {upcomingMaintenance.computed.estimatedDate && ` (Est ${format(new Date(upcomingMaintenance.computed.estimatedDate), "dd-MMM-yy")})`}
                    </p>
                  </div>
                  <div className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                    upcomingMaintenance.computed.status === 'overdue' ? 'bg-destructive/20 text-destructive' :
                    upcomingMaintenance.computed.status === 'due-soon' ? 'bg-amber-500/20 text-amber-500' :
                    'bg-primary/20 text-primary'
                  }`}>
                    {upcomingMaintenance.computed.status}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">No upcoming tasks</p>
              )}
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {bike && (
            <>
              <LogMaintenanceDialog 
                bikeId={bike.id}
                currentOdometer={bike.current_odometer}
                trigger={
                  <Button variant="outline" className="w-full h-14 flex flex-col items-center justify-center border-primary/20 hover:border-primary/40 bg-primary/5 gap-1">
                    <div className="flex items-center gap-2 text-primary">
                      <Wrench className="size-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Maintenance</span>
                    </div>
                    <span className="text-[8px] opacity-50 font-bold uppercase">Log Task</span>
                  </Button>
                }
              />
              <LogFuelDialog 
                bikeId={bike.id}
                currentOdometer={bike.current_odometer}
                trigger={
                  <Button variant="outline" className="w-full h-14 flex flex-col items-center justify-center border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5 gap-1">
                    <div className="flex items-center gap-2 text-amber-500">
                      <Fuel className="size-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Fuel Fill</span>
                    </div>
                    <span className="text-[8px] opacity-50 font-bold uppercase">Add Entry</span>
                  </Button>
                }
              />
            </>
          )}
        </div>

        {/* Recent History */}
        <section className="space-y-3 pt-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="label-caps flex items-center gap-2">
              <History className="size-3 text-primary" />
              Recent History
            </h3>
            {bike && (
              <Link 
                to="/bikes/$bikeId" 
                params={{ bikeId: bike.id }} 
                search={{ tab: 'history' }}
                className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
              >
                View All
              </Link>
            )}
          </div>
          
          <div className="space-y-2">
            {history?.maintenance && history.maintenance.length > 0 ? (
              history.maintenance.slice(0, 3).map((item: any) => (
                <div key={item.id} className="panel p-3 flex items-center justify-between hover:bg-secondary/20 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                      <Wrench className="size-3.5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold leading-tight group-hover:text-primary transition-colors">
                        {item.notes?.split('\n')[0] || item.categories?.[0] || "Maintenance"}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {format(new Date(item.date), "dd MMM yyyy")} • {km(item.odometer)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-primary">
                      ${Number(item.total_cost).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="panel p-6 text-center">
                <p className="text-[10px] text-muted-foreground italic">No recent logs</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function HeroImage({ path }: { path: string }) {
  const { data: url } = useSignedUrl(path);
  if (!url) return <div className="animate-pulse bg-secondary size-full rounded-2xl" />;
  return (
    <img 
      src={url} 
      alt="Motorcycle" 
      className="h-full w-full object-contain filter drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]" 
    />
  );
}
