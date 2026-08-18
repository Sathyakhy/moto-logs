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
  const [activeHistoryTab, setActiveHistoryTab] = useState<'maintenance' | 'fuel'>('maintenance');

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
      ? `Est ${format(new Date(computed.estimatedDate), "dd-MMM-yy")}`
      : "";
    
    const itemLower = primaryCategory.toLowerCase();
    const actionLabel = itemLower.includes('oil') 
      ? 'oil change' 
      : itemLower.includes('battery') 
        ? 'replacement' 
        : 'service';

    let kmDaysText = "";
    if (scheduleRow.interval_km === 0) {
      if (computed.remainingDays !== null) {
        const absDays = Math.abs(computed.remainingDays);
        kmDaysText = `${absDays} Days until next ${actionLabel}`;
      } else {
        kmDaysText = "No schedule set";
      }
    } else {
      kmDaysText = `${Math.abs(computed.remainingKm)}KM until next ${actionLabel}`;
    }

    return {
      kmDaysText,
      dateText,
      status: computed.status,
      item: s!.item
    };
  };

  const oilStatus = getStatusInfo(["Engine Oil"]);
  const gearOilStatus = getStatusInfo(["Gear Oil"]);
  const batteryStatus = getStatusInfo(["Battery"]);
  
  // Upcoming maintenance (excluding oil and battery)
  const defaultSchedule = (profile?.default_maintenance_schedule as any[]) || [];
  
  // Combine actual schedules with default intervals for items not specifically scheduled
  const allPossibleItems = new Set([
    ...(schedules?.map(s => s.item) || []),
    ...defaultSchedule.map(d => d.item)
  ]);

  const upcomingMaintenance = Array.from(allPossibleItems)
    .filter(item => {
      const lower = item.toLowerCase();
      return !lower.includes("engine oil") && !lower.includes("gear oil") && !lower.includes("battery");
    })
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
    .sort((a, b) => a.computed.remainingKm - b.computed.remainingKm).slice(0, 3);

  return (
    <AppShell title="Vehicle Care" subtitle={bike ? `${bike.model || ''} ${bike.year || ''}`.trim() : "Welcome to your garage"}>
      <div className="hidden sm:block">
        {/* Do not make any visual modifications. The phrases I write are commands to understand what I want, not to be written down. Understand their content well, then execute what is required.
                                        
                                            
                                            Lost the 360 Perspective */}
      </div>

      <div className="flex flex-col items-center mb-6 overflow-hidden">
        <div className="relative w-[115%] -mx-[7.5%] aspect-video sm:aspect-video md:aspect-[21/9] sm:w-full sm:max-w-4xl flex items-center justify-center mb-6 group bike-bg-premium-lg z-0">
          {bike?.photos_paths && bike.photos_paths.length > 0 ? (
            <View360 paths={bike.photos_paths} className="size-full" />
          ) : bike?.photo_path ? (
            <HeroImage path={bike.photo_path} />
          ) : (
            <BikeIcon className="size-32 text-muted-foreground/20" />
          )}
        </div>
        
      </div>

      <div className="space-y-4 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        {/* Odometer Tracker Section */}
        {bike && (
          <section>
            <div className="panel p-3 sm:p-5 border-l-4 border-l-primary flex flex-col gap-2 sm:gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary/80">
                  <Gauge className="size-3.5 sm:size-5" />
                  <span className="text-[12.6px] sm:text-xs font-black uppercase tracking-wider">Current Mileage</span>
                </div>
                {!isUpdatingOdo ? (
                  <button 
                    onClick={() => setIsUpdatingOdo(true)}
                    className="text-[12.6px] sm:text-xs font-black uppercase text-primary hover:underline"
                  >
                    Update
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsUpdatingOdo(false)}
                    className="text-[9px] sm:text-xs font-black uppercase text-muted-foreground hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </div>
              
              {!isUpdatingOdo ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-[42px] sm:text-5xl font-bold tracking-tighter text-primary leading-none" style={{ fontFamily: 'Digital-7' }}>
                    {bike.current_odometer?.toLocaleString()}
                  </span>
                  <span className="text-[14px] sm:text-sm font-black text-muted-foreground uppercase tracking-widest">KM</span>
                </div>
              ) : (
                <form onSubmit={handleOdoSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      value={odometerValue}
                      onChange={(e) => setOdometerValue(e.target.value)}
                      className="h-9 sm:h-12 text-lg sm:text-2xl font-mono font-black pr-10"
                      autoFocus
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] sm:text-xs font-black text-muted-foreground">KM</div>
                  </div>
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="h-9 w-9 sm:h-12 sm:w-12 shrink-0 shadow-lg shadow-primary/20"
                    disabled={updateOdometerMutation.isPending}
                  >
                    <Check className="size-4 sm:size-6" />
                  </Button>
                </form>
              )}
            </div>
          </section>
        )}

        {/* Vehicle Status Section */}
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
            {/* Engine & Gear Oil Status Combined */}
            <div className={`panel p-3 sm:p-5 flex flex-col justify-between min-h-[100px] sm:min-h-[140px] border-l-4 ${
              oilStatus.status === 'overdue' || gearOilStatus.status === 'overdue' ? 'border-l-destructive' :
              oilStatus.status === 'due-soon' || gearOilStatus.status === 'due-soon' ? 'border-l-amber-500' :
              'border-l-primary'
            }`}>
              <div className="flex items-center gap-2 text-primary/80 mb-1 sm:mb-3">
                <Droplets className="size-3.5 sm:size-5" />
                <span className="text-[12.6px] sm:text-xs font-black uppercase tracking-wider">OIL STATUS</span>
              </div>
              <div className="space-y-2">
                <div className="flex flex-col">
                  <p className="text-[9.8px] sm:text-[9px] font-black text-muted-foreground uppercase leading-none mb-0.5">Engine</p>
                  <p className="text-[14px] sm:text-sm font-black leading-tight">
                    {oilStatus.kmDaysText}
                  </p>
                  <p className="text-[11.2px] sm:text-[11px] font-bold text-muted-foreground">
                    {oilStatus.dateText}
                  </p>
                </div>
                <div className="flex flex-col border-t border-white/5 pt-1.5">
                  <p className="text-[9.8px] sm:text-[9px] font-black text-muted-foreground uppercase leading-none mb-0.5">Gear</p>
                  <p className="text-[14px] sm:text-sm font-black leading-tight">
                    {gearOilStatus.kmDaysText}
                  </p>
                  <p className="text-[11.2px] sm:text-[11px] font-bold text-muted-foreground">
                    {gearOilStatus.dateText}
                  </p>
                </div>
              </div>
            </div>

            {/* Battery Status */}
            <div className={`panel p-3 sm:p-5 flex flex-col min-h-[100px] sm:min-h-[140px] border-l-4 ${
              batteryStatus.status === 'overdue' ? 'border-l-destructive' :
              batteryStatus.status === 'due-soon' ? 'border-l-amber-500' :
              'border-l-primary'
            }`}>
              <div className="flex items-center gap-2 text-primary/80 mb-1 sm:mb-3">
                <Zap className="size-3.5 sm:size-5" />
                <span className="text-[12.6px] sm:text-xs font-black uppercase tracking-wider">BATTERY</span>
              </div>
              <div className="space-y-2">
                <div className="flex flex-col">
                  <p className="text-[9.8px] sm:text-[9px] font-black text-muted-foreground uppercase leading-none mb-0.5">YT7Z-BS 12V 7Ah</p>
                  <p className="text-[14px] sm:text-sm font-black leading-tight">
                    {batteryStatus.kmDaysText}
                  </p>
                  <p className="text-[11.2px] sm:text-[11px] font-bold text-muted-foreground">
                    {batteryStatus.dateText}
                  </p>
                </div>
                {/* Spacer block to match Oil Status height without creating bottom gap */}
                <div className="flex flex-col items-center justify-center border-t border-white/5 pt-1.5 opacity-100 flex-1 min-h-[40px]">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-8 sm:size-10 lg:size-12 text-primary">
                    <path d="M4 6V4h4v2h8V4h4v2h1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h1zm11 7h-2v2h-2v-2H9v-2h2V9h2v2h2v2zM5 8v10h14V8H5z"/>
                  </svg>
                </div>
              </div>
            </div>

            <div className="panel p-3 sm:p-5 col-span-2 flex flex-col justify-between min-h-[100px] sm:min-h-[140px] border-l-4 border-l-primary w-full">
              <div className="flex items-center gap-2 text-primary/80 mb-2 sm:mb-4">
                <Clock className="size-3.5 sm:size-5" />
                <span className="text-[12.6px] sm:text-xs font-black uppercase tracking-wider">UPCOMING MAINTENANCE</span>
              </div>
              {upcomingMaintenance && (upcomingMaintenance as any[]).length > 0 ? (
                <div className="space-y-2.5 sm:space-y-4">
                  {(upcomingMaintenance as any[]).map((task, idx) => (
                    <div key={idx} className="flex justify-between items-center gap-2 pb-1.5 sm:pb-3 last:pb-0 border-b last:border-0 border-white/5">
                      <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-[14px] sm:text-sm font-black text-primary leading-tight uppercase">{task.item}</p>
                        <p className="text-[11.2px] sm:text-[11px] font-bold leading-tight text-muted-foreground">
                          {task.computed.status === "overdue" 
                            ? `Overdue by ${Math.abs(task.computed.remainingKm)}KM`
                            : `In ${task.computed.remainingKm}KM`}
                          {task.computed.estimatedDate && ` — Est ${format(new Date(task.computed.estimatedDate), "dd-MMM-yy")}`}
                        </p>
                      </div>
                      <div className={`text-[9.8px] sm:text-[10px] px-1.5 sm:px-2.5 py-0.5 rounded-full uppercase font-black shrink-0 ${
                        task.computed.status === 'overdue' ? 'bg-destructive/20 text-destructive' :
                        task.computed.status === 'due-soon' ? 'bg-amber-500/20 text-amber-500' :
                        'bg-primary/20 text-primary'
                      }`}>
                        {task.computed.status}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[9px] sm:text-xs text-muted-foreground italic">No upcoming tasks</p>
              )}
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:gap-8 pt-2">
          {bike && (
            <>
              <LogMaintenanceDialog 
                bikeId={bike.id}
                currentOdometer={bike.current_odometer}
                trigger={
                  <Button variant="outline" className="w-full h-16 sm:h-28 flex flex-col items-center justify-center border-primary/20 hover:border-primary/40 bg-primary/5 gap-1 sm:gap-3 transition-all">
                    <div className="flex items-center gap-2 text-primary">
                      <Wrench className="size-4 sm:size-7" />
                      <span className="text-[12.6px] sm:text-sm font-black uppercase tracking-widest">Maintenance</span>
                    </div>
                  </Button>
                }
              />
              <LogFuelDialog 
                bikeId={bike.id}
                currentOdometer={bike.current_odometer}
                trigger={
                  <Button variant="outline" className="w-full h-16 sm:h-28 flex flex-col items-center justify-center border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5 gap-1 sm:gap-3 transition-all">
                    <div className="flex items-center gap-2 text-amber-500">
                      <Fuel className="size-4 sm:size-7" />
                      <span className="text-[12.6px] sm:text-sm font-black uppercase tracking-widest">Fuel Fill</span>
                    </div>
                  </Button>
                }
              />
            </>
          )}
        </div>

        {/* Recent History */}
        <section className="space-y-4 pt-4 sm:pt-8">
          <div className="flex items-center justify-between">
            <h3 className="label-caps flex items-center gap-2">
              <History className="size-3.5 sm:size-5 text-primary" />
              <span className="text-[14px] sm:text-sm">History</span>
            </h3>
            {bike && (
              <Link 
                to="/bikes/$bikeId" 
                params={{ bikeId: bike.id }} 
                search={{ tab: 'history' }}
                className="text-[12.6px] sm:text-xs font-black uppercase tracking-widest text-primary hover:underline"
              >
                View All
              </Link>
            )}
          </div>
          
          <div className="panel p-0 overflow-hidden border-white/5">
            <div className="flex border-b border-white/5 bg-secondary/10">
              <button 
                onClick={() => setActiveHistoryTab('maintenance')}
                className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-[12.6px] sm:text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
                  activeHistoryTab === 'maintenance' 
                    ? 'border-primary text-primary bg-primary/5' 
                    : 'border-transparent text-muted-foreground hover:text-primary/70'
                }`}
              >
                <Wrench className="size-3 sm:size-4" />
                Maintenance
              </button>
              <button 
                onClick={() => setActiveHistoryTab('fuel')}
                className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-[12.6px] sm:text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
                  activeHistoryTab === 'fuel' 
                    ? 'border-amber-500 text-amber-500 bg-amber-500/5' 
                    : 'border-transparent text-muted-foreground hover:text-amber-500/70'
                }`}
              >
                <Fuel className="size-3 sm:size-4" />
                Fuel fill
              </button>
            </div>

            <div className="p-3 sm:p-5 space-y-3">
              {activeHistoryTab === 'maintenance' ? (
                <>
                  {history?.maintenance && history.maintenance.length > 0 ? (
                    history.maintenance.slice(0, 5).map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between hover:bg-secondary/20 p-2 -mx-2 rounded-lg transition-colors group">
                        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                          <div className="size-7 sm:size-10 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Wrench className="size-3.5 sm:size-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[14px] sm:text-sm font-black leading-tight group-hover:text-primary transition-colors truncate uppercase">
                              {item.notes?.split('\n')[0] || item.categories?.[0] || "Maintenance"}
                            </p>
                            <p className="text-[11.2px] sm:text-[11px] font-bold text-muted-foreground mt-0.5 sm:mt-1">
                              {format(new Date(item.date), "dd MMM")} • {km(item.odometer)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[14px] sm:text-sm font-black text-primary">
                            ${Number(item.total_cost).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-xl">
                      <p className="text-[9px] sm:text-xs text-muted-foreground italic">No maintenance logs found</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {history?.fuel && history.fuel.length > 0 ? (
                    history.fuel.slice(0, 5).map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between hover:bg-secondary/20 p-2 -mx-2 rounded-lg transition-colors group">
                        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                          <div className="size-7 sm:size-10 rounded bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                            <Fuel className="size-3.5 sm:size-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[14px] sm:text-sm font-black leading-tight group-hover:text-amber-500 transition-colors truncate uppercase">
                              {item.gas_station || "Fuel Fill"}
                            </p>
                            <p className="text-[11.2px] sm:text-[11px] font-bold text-muted-foreground mt-0.5 sm:mt-1">
                              {format(new Date(item.date), "dd MMM")} • {km(item.odometer)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[14px] sm:text-sm font-black text-amber-500">
                            ${Number(item.amount).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-xl">
                      <p className="text-[9px] sm:text-xs text-muted-foreground italic">No fuel fill logs found</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
        <div className="h-20 sm:hidden" /> {/* Extra padding for mobile navigation clearance */}
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
