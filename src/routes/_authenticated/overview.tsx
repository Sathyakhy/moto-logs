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
  const queryClient = useQueryClient();
  const { data: history } = useDashboardHistory(profile?.id || undefined);
  
  // Use the default bike, or the first one if none is set
  const bike = bikes?.find(b => b.is_default) || bikes?.[0];

  const [odometerValue, setOdometerValue] = useState<string>("");
  const [isUpdatingOdo, setIsUpdatingOdo] = useState(false);

  useEffect(() => {
    if (bike?.current_odometer !== undefined) {
      setOdometerValue(bike.current_odometer.toString());
    }
  }, [bike?.current_odometer]);

  const updateOdometerMutation = useMutation({
    mutationFn: async (newOdo: number) => {
      if (!bike?.id) return;
      const { error } = await supabase
        .from("bikes")
        .update({ current_odometer: newOdo })
        .eq("id", bike.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bikes"] });
      queryClient.invalidateQueries({ queryKey: ["service-schedules", bike?.id] });
      queryClient.invalidateQueries({ queryKey: ["fuel-logs-usage", bike?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-history"] });
      toast.success("Odometer updated");
      setIsUpdatingOdo(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update odometer");
    }
  });

  const handleOdoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(odometerValue);
    if (isNaN(val)) return;
    if (bike?.current_odometer !== undefined && val < bike.current_odometer) {
      toast.error("Odometer cannot be less than current value");
      return;
    }
    updateOdometerMutation.mutate(val);
  };

  const { data: schedules, isLoading: isSchedulesLoading } = useQuery({
    queryKey: ["service-schedules", bike?.id],
    enabled: !!bike?.id,
    queryFn: async () => {
      if (!bike?.id) return [];
      const { data } = await supabase
        .from("service_schedules")
        .select("*")
        .eq("bike_id", bike.id);
      
      // If no schedules exist yet for this bike, we should return the defaults
      // to allow the UI to show potential status even before user customizes.
      // However, schedules table is where we track last_service_odometer/date.
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
    if (!bike) return { text: "N/A", status: "good" as const };
    const primaryCategory = itemNames[0] || "";

    // 1. Try to find an existing schedule for this bike
    let s = schedules?.find(s => 
      itemNames.some(name => s.item.toLowerCase() === name.toLowerCase())
    );

    // 2. If no schedule, try to construct one from history + default intervals
    if (!s) {
      if (!primaryCategory) return { text: "No schedule set", status: "good" as const };
      
      const defaultSchedule = (profile?.default_maintenance_schedule as any[]) || [];
      const def = defaultSchedule.find(d => d.item.toLowerCase() === primaryCategory.toLowerCase());
      
      if (!def) return { text: "No schedule set", status: "good" as const };

      // Find the latest maintenance record for this category to get the last service odometer
      const latestRecord = history?.maintenance?.find((m: any) => 
        m.categories?.some((c: string) => c.toLowerCase() === primaryCategory.toLowerCase())
      );

      s = {
        id: 'temp',
        item: primaryCategory,
        interval_km: def.interval_km,
        interval_days: def.interval_days || null,
        last_service_odometer: latestRecord?.odometer || 0,
        last_service_date: latestRecord?.date || null
      } as any;
    }

    const scheduleRow = {
      id: s!.id,
      item: s!.item,
      interval_km: Number(s!.interval_km),
      interval_days: s!.interval_days ? Number(s!.interval_days) : null,
      last_service_odometer: Number(s!.last_service_odometer || 0),
      last_service_date: s!.last_service_date || null
    };

    const computed = computeSchedule(
      scheduleRow as any, 
      bike.current_odometer || 0, 
      dailyUsage,
      bike.purchase_date
    );
    
    const dateText = computed.estimatedDate 
      ? `(Est ${format(new Date(computed.estimatedDate), "dd-MMM-yy")})`
      : "";
    
    const itemLower = primaryCategory.toLowerCase();
    const actionLabel = itemLower.includes('oil') 
      ? 'oil change' 
      : itemLower.includes('battery') 
        ? 'replacement' 
        : 'service';

    let statusText = "";
    if (scheduleRow.interval_km === 0) {
      // Time based only display
      if (computed.remainingDays !== null) {
        const absDays = Math.abs(computed.remainingDays);
        if (computed.remainingDays < 0) {
          statusText = `${absDays} Days overdue ${dateText}`;
        } else {
          statusText = `${absDays} Days until next ${actionLabel} ${dateText}`;
        }
      } else {
        statusText = "No schedule set";
      }
    } else {
      statusText = computed.status === "overdue" 
        ? `${Math.abs(computed.remainingKm)}KM overdue ${dateText}`
        : `${computed.remainingKm}KM until next ${actionLabel} ${dateText}`;
    }

    return {
      text: statusText,
      status: computed.status,
      item: s!.item
    };
  };

  const oilStatus = getStatusInfo(["Engine Oil"]);
  const batteryStatus = getStatusInfo(["Battery"]);
  
  // Upcoming maintenance (excluding oil and battery)
  const defaultSchedule = (profile?.default_maintenance_schedule as any[]) || [];
  
  // Combine actual schedules with default intervals for items not specifically scheduled
  const allPossibleItems = new Set([
    ...(schedules?.map(s => s.item) || []),
    ...defaultSchedule.map(d => d.item)
  ]);

  const upcomingMaintenance = Array.from(allPossibleItems)
    .filter(item => !item.toLowerCase().includes("oil") && !item.toLowerCase().includes("battery"))
    .map(item => {
      // Reuse getStatusInfo logic but return the full computed object
      const info = getStatusInfo([item]);
      
      // We need a slightly different format for the upcoming sorting
      // so we manually compute it here to get access to remainingKm
      let s = schedules?.find(s => s.item.toLowerCase() === item.toLowerCase());
      let defItem = defaultSchedule.find(d => d.item.toLowerCase() === item.toLowerCase());
      
      if (!s && !defItem) return null;

      const latestRecord = history?.maintenance?.find((m: any) => 
        m.categories?.some((c: string) => c.toLowerCase() === item.toLowerCase())
      );

      const scheduleRow = {
        id: s?.id || 'temp',
        item: item,
        interval_km: Number(s?.interval_km || defItem?.interval_km || 0),
        interval_days: s?.interval_days ? Number(s.interval_days) : (defItem?.interval_days ? Number(defItem.interval_days) : null),
        last_service_odometer: Number(s?.last_service_odometer || latestRecord?.odometer || 0),
        last_service_date: s?.last_service_date || latestRecord?.date || null
      };

      return {
        item,
        computed: computeSchedule(scheduleRow as any, bike?.current_odometer || 0, dailyUsage, bike?.purchase_date)
      };
    })
    .filter((x): x is { item: string; computed: any } => x !== null)
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
        {/* Odometer Tracker Section */}
        {bike && (
          <section className="px-1">
            <div className="panel p-4 border-l-4 border-l-primary flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary/80">
                  <Gauge className="size-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Current Mileage</span>
                </div>
                {!isUpdatingOdo ? (
                  <button 
                    onClick={() => setIsUpdatingOdo(true)}
                    className="text-[10px] font-bold uppercase text-primary hover:underline"
                  >
                    Update
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsUpdatingOdo(false)}
                    className="text-[10px] font-bold uppercase text-muted-foreground hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </div>
              
              {!isUpdatingOdo ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-bold tracking-tighter text-primary">
                    {bike.current_odometer?.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-muted-foreground uppercase">KM</span>
                </div>
              ) : (
                <form onSubmit={handleOdoSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      value={odometerValue}
                      onChange={(e) => setOdometerValue(e.target.value)}
                      className="h-10 text-xl font-mono font-bold pr-10"
                      autoFocus
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">KM</div>
                  </div>
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="h-10 w-10 shrink-0 shadow-lg shadow-primary/20"
                    disabled={updateOdometerMutation.isPending}
                  >
                    <Check className="size-4" />
                  </Button>
                </form>
              )}
            </div>
          </section>
        )}

        {/* Vehicle Status Section */}
        <section className="space-y-3">
          
          <div className="grid grid-cols-2 gap-3">
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
                <div className="flex justify-between items-end gap-2">
                  <div className="space-y-1">
                    <p className="text-[12px] font-bold text-primary leading-tight">{upcomingMaintenance.item}</p>
                    <p className="text-[11px] font-medium leading-tight">
                      {upcomingMaintenance.computed.status === "overdue" 
                        ? `Overdue by ${Math.abs(upcomingMaintenance.computed.remainingKm)}KM`
                        : `In ${upcomingMaintenance.computed.remainingKm}KM`}
                      {upcomingMaintenance.computed.estimatedDate && <br />}
                      {upcomingMaintenance.computed.estimatedDate && `(Est ${format(new Date(upcomingMaintenance.computed.estimatedDate), "dd-MMM-yy")})`}
                    </p>
                  </div>
                  <div className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold shrink-0 ${
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
                  </Button>
                }
              />
            </>
          )}
        </div>

        {/* Recent History */}
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="label-caps flex items-center gap-2">
              <History className="size-3 text-primary" />
              History
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
          
          <div className="flex flex-col md:grid md:grid-cols-2 gap-x-3 gap-y-6 items-start">
            {/* Maintenance History */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1 mb-1">
                <Wrench className="size-3 text-primary" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Maintenance</span>
              </div>
              {history?.maintenance && history.maintenance.length > 0 ? (
                history.maintenance.slice(0, 3).map((item: any) => (
                  <div key={item.id} className="panel p-3 flex items-center justify-between hover:bg-secondary/20 transition-colors group">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-7 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Wrench className="size-3" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold leading-tight group-hover:text-primary transition-colors truncate">
                          {item.notes?.split('\n')[0] || item.categories?.[0] || "Maintenance"}
                        </p>
                        <p className="text-[8px] text-muted-foreground mt-0.5">
                          {format(new Date(item.date), "dd MMM")} • {km(item.odometer)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold text-primary">
                        ${Number(item.total_cost).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="panel p-4 text-center border-dashed">
                  <p className="text-[9px] text-muted-foreground italic">No logs</p>
                </div>
              )}
            </div>

            {/* Fuel History */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1 mb-1">
                <Fuel className="size-3 text-amber-500" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Fuel</span>
              </div>
              {history?.fuel && history.fuel.length > 0 ? (
                history.fuel.slice(0, 3).map((item: any) => (
                  <div key={item.id} className="panel p-3 flex items-center justify-between hover:bg-secondary/20 transition-colors group">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-7 rounded bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                        <Fuel className="size-3" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold leading-tight group-hover:text-amber-500 transition-colors truncate">
                          {item.gas_station || "Fuel Fill"}
                        </p>
                        <p className="text-[8px] text-muted-foreground mt-0.5">
                          {format(new Date(item.date), "dd MMM")} • {km(item.odometer)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold text-amber-500">
                        ${Number(item.amount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="panel p-4 text-center border-dashed">
                  <p className="text-[9px] text-muted-foreground italic">No logs</p>
                </div>
              )}
            </div>
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
