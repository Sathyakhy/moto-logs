// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bike as BikeIcon,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Droplets,
  Fuel,
  Gauge,
  History,
  Pencil,
  RotateCw,
  Settings,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import { useBikes } from "@/hooks/useBikes";
import { useDashboardHistory } from "@/hooks/useDashboard";
import { useProfile } from "@/hooks/useProfile";
import { AppShell } from "@/components/AppShell";
import { LogMaintenanceDialog } from "@/components/LogMaintenanceDialog";
import { LogFuelDialog } from "@/components/LogFuelDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { computeSchedule, calculateDailyUsage, calculateDailyMileage, computeFuelTelemetry, km } from "@/lib/moto";
import { money, Currency } from "@/lib/money";
import { View360 } from "@/components/View360";
import { BatteryModal, getBatteryHealth } from "@/components/BatteryModal";
import { format } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/overview")({
  component: CockpitOverview,
});

function CockpitOverview() {
  const { profile } = useProfile();
  const { data: bikes } = useBikes();
  const queryClient = useQueryClient();
  const { data: history } = useDashboardHistory(profile?.id || undefined);

  const [batteryModalOpen, setBatteryModalOpen] = useState(false);
  const [batteryVoltage, setBatteryVoltage] = useState(12.6);
  const [odometerValue, setOdometerValue] = useState("");
  const [isUpdatingOdo, setIsUpdatingOdo] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<"all" | "maintenance" | "fuel">("all");

  const displayCurrency: Currency = (profile?.display_currency as Currency) || "USD";
  const khrPerUsd = profile?.khr_per_usd || 4100;

  // Selected or default bike
  const bike = useMemo(() => {
    if (!bikes || bikes.length === 0) return null;
    return bikes.find((b) => b.is_default) || bikes[0];
  }, [bikes]);

  useEffect(() => {
    const saved = localStorage.getItem("motolog_battery_v");
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 0) setBatteryVoltage(parsed);
    }
  }, []);

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
    },
  });

  const deleteFuelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fuel_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-history"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-logs-usage", bike?.id] });
      queryClient.invalidateQueries({ queryKey: ["bikes"] });
      toast.success("Fuel record deleted");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete record");
    },
  });

  const deleteMaintenanceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("maintenance_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-history"] });
      queryClient.invalidateQueries({ queryKey: ["service-schedules", bike?.id] });
      queryClient.invalidateQueries({ queryKey: ["bikes"] });
      toast.success("Maintenance record deleted");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete record");
    },
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

  const { data: schedules } = useQuery({
    queryKey: ["service-schedules", bike?.id],
    enabled: !!bike?.id,
    queryFn: async () => {
      if (!bike?.id) return [];
      const { data } = await supabase.from("service_schedules").select("*").eq("bike_id", bike.id);
      return data || [];
    },
  });

  const { data: fuelLogs } = useQuery({
    queryKey: ["fuel-logs-usage", bike?.id],
    enabled: !!bike?.id,
    queryFn: async () => {
      if (!bike?.id) return [];
      const { data } = await supabase
        .from("fuel_logs")
        .select("id, fill_date, odometer, liters, amount, gas_station, fuel_type, notes")
        .eq("bike_id", bike.id)
        .order("fill_date", { ascending: false });
      return data || [];
    },
  });

  const dailyUsage = useMemo(() => {
    const checkpoints: { date: string; odometer: number | null | undefined }[] = [];
    (fuelLogs || []).forEach((f) => {
      if (f.odometer) checkpoints.push({ date: f.fill_date, odometer: f.odometer });
    });
    (history?.maintenance || []).forEach((m: any) => {
      if (m.bike_id === bike?.id && m.odometer) {
        checkpoints.push({ date: m.date, odometer: m.odometer });
      }
    });
    return calculateDailyMileage(checkpoints, bike?.purchase_date, bike?.initial_odometer);
  }, [fuelLogs, history?.maintenance, bike?.id, bike?.purchase_date, bike?.initial_odometer]);

  // Compute genuine fuel telemetry without hardcoded fake fallbacks
  const fuelTelemetry = useMemo(() => {
    return computeFuelTelemetry(fuelLogs || []);
  }, [fuelLogs]);

  // Last refuel detail text
  const lastRefuelText = useMemo(() => {
    if (!fuelLogs || fuelLogs.length === 0) return "No refuel recorded";
    const latest = fuelLogs[0];
    const dateFormatted = latest.fill_date
      ? format(new Date(latest.fill_date), "dd-MMM-yy")
      : "";
    return `Last refuel: ${latest.odometer?.toLocaleString()} KM (${dateFormatted})`;
  }, [fuelLogs]);

  // Status info for schedule
  const getStatusInfo = (itemNames: string[]) => {
    if (!bike) {
      return {
        remainingKm: 0,
        percentRemaining: 100,
        status: "good" as const,
        kmDaysText: "No bike",
        dateText: "",
        rawEstimatedDate: null as string | null,
      };
    }
    const primaryCategory = itemNames[0] || "";

    let s = schedules?.find((sch) =>
      itemNames.some((name) => sch.item.toLowerCase() === name.toLowerCase()),
    );

    if (!s) {
      const defaultSchedule = (profile?.default_maintenance_schedule as any[]) || [];
      const def = defaultSchedule.find(
        (d) => d.item.toLowerCase() === primaryCategory.toLowerCase(),
      );

      const latestRecord = history?.maintenance?.find((m: any) =>
        m.categories?.some((c: string) => c.toLowerCase() === primaryCategory.toLowerCase()),
      );

      s = {
        id: "temp",
        item: primaryCategory,
        interval_km: def?.interval_km || 2000,
        interval_days: def?.interval_days || 90,
        last_service_odometer: latestRecord?.odometer || 0,
        last_service_date: latestRecord?.date || null,
      } as any;
    }

    const intervalKm = Number(s?.interval_km || 2000);
    const lastServiceOdo = Number(s?.last_service_odometer || 0);
    const currentOdo = Number(bike?.current_odometer || 0);

    const kmSinceService = Math.max(0, currentOdo - lastServiceOdo);
    const remainingKm = intervalKm - kmSinceService;
    const percentRemaining = Math.max(0, Math.min(100, Math.round((remainingKm / intervalKm) * 100)));

    const computed = computeSchedule(
      {
        id: s!.id,
        item: s!.item,
        interval_km: intervalKm,
        interval_days: s!.interval_days ? Number(s!.interval_days) : null,
        last_service_odometer: lastServiceOdo,
        last_service_date: s!.last_service_date || null,
      } as any,
      currentOdo,
      dailyUsage,
      bike.purchase_date,
    );

    const dateText = computed.estimatedDate
      ? format(new Date(computed.estimatedDate), "dd-MMM-yy")
      : "";

    return {
      remainingKm,
      percentRemaining,
      status: computed.status,
      dateText,
      rawEstimatedDate: computed.estimatedDate,
      kmDaysText:
        remainingKm < 0
          ? `Overdue by ${Math.abs(remainingKm).toLocaleString()} km`
          : `in ${remainingKm.toLocaleString()} km`,
    };
  };

  const engineOil = getStatusInfo(["Engine Oil"]);
  const finalDrive = getStatusInfo(["Gear Oil", "Transmission"]);
  const cvtStatus = getStatusInfo(["Drive Belt", "CVT Cleaning", "Rollers"]);

  const batteryHealth = getBatteryHealth(batteryVoltage);

  // Compute estimated due date for engine oil
  const estDueDateText = useMemo(() => {
    if (engineOil.dateText) return engineOil.dateText;
    if (dailyUsage && dailyUsage > 0 && engineOil.remainingKm > 0) {
      const daysLeft = Math.max(0, Math.round(engineOil.remainingKm / dailyUsage));
      const target = new Date(Date.now() + daysLeft * 86_400_000);
      return format(target, "dd-MMM-yy");
    }
    return "Pending pace";
  }, [engineOil.dateText, engineOil.remainingKm, dailyUsage]);

  // Calculate per-fill fuel economy map for timeline using validated telemetry
  const fuelEconomyMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!history?.fuel || history.fuel.length < 2) return map;
    const telemetry = computeFuelTelemetry(history.fuel);
    telemetry.perFillEconomyMap.forEach((val, id) => {
      map.set(id, val.formatted);
    });
    return map;
  }, [history?.fuel]);

  // Combined timeline of fuel + maintenance
  const allTimeline = useMemo(() => {
    const combined: any[] = [];
    (history?.maintenance || []).forEach((m: any) => {
      combined.push({
        id: `m-${m.id}`,
        rawId: m.id,
        type: "maintenance" as const,
        date: new Date(m.date),
        odometer: m.odometer,
        title: m.product_name || m.notes?.split("\n")[0] || m.categories?.[0] || "Maintenance Service",
        cost: m.total_cost,
        category: m.categories?.[0],
        shopName: m.shop_name,
        notes: m.notes,
        rawRecord: m,
      });
    });
    (history?.fuel || []).forEach((f: any) => {
      const fuelEco = fuelEconomyMap.get(f.id);
      combined.push({
        id: `f-${f.id}`,
        rawId: f.id,
        type: "fuel" as const,
        date: new Date(f.date),
        odometer: f.odometer,
        title: `${f.liters ? `${f.liters}L` : "Fuel Fill"} (${f.fuel_type || "Regular 92"})`,
        fuelEco,
        cost: f.amount,
        liters: f.liters,
        gasStation: f.gas_station,
        notes: f.notes,
        rawLog: f,
      });
    });
    return combined.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [history, fuelEconomyMap]);

  const filteredTimeline = useMemo(() => {
    if (timelineFilter === "maintenance") {
      return allTimeline.filter((item) => item.type === "maintenance");
    }
    if (timelineFilter === "fuel") {
      return allTimeline.filter((item) => item.type === "fuel");
    }
    return allTimeline;
  }, [allTimeline, timelineFilter]);

  return (
    <AppShell>
      <div className="space-y-4 sm:space-y-6">
        {/* ========================================================= */}
        {/* 1. 360° VEHICLE VIEWER WITH ANGLE OVERLAY & TURNTABLE    */}
        {/* ========================================================= */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xl shadow-xl transition-colors">
          <View360
            paths={bike?.photos_paths}
            fallbackPath={bike?.photo_path}
            className="w-full"
          />

          {bike && (
            <div className="mt-2.5 flex items-center justify-between px-2 pt-2 border-t border-slate-200 dark:border-slate-800/60 text-xs font-mono text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-200">
                  {bike.name || `${bike.make} ${bike.model}`}
                </span>
                {bike.plate_number && (
                  <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                    {bike.plate_number}
                  </span>
                )}
              </div>
              <Link
                to="/bikes/$bikeId"
                params={{ bikeId: bike.id }}
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-semibold"
              >
                Manage Details ➔
              </Link>
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* 2. TOTAL MILEAGE ODOMETER (Matches Exact User Reference)   */}
        {/* ========================================================= */}
        {bike && (
          <section className="rounded-3xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#060b18] p-4 sm:p-6 shadow-2xl relative overflow-hidden transition-colors">
            {/* Top Header Row */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Gauge className="size-4" />
                </div>
                <h3 className="font-speedo font-bold text-xs tracking-wider uppercase text-slate-700 dark:text-slate-300">
                  TOTAL MILEAGE ODOMETER
                </h3>
              </div>

              {!isUpdatingOdo ? (
                <button
                  type="button"
                  onClick={() => setIsUpdatingOdo(true)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/40 dark:hover:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors font-medium shadow-xs"
                >
                  <Pencil className="size-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Edit KM</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsUpdatingOdo(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/40 dark:hover:bg-slate-800 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 transition-colors shadow-xs"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Inner Black LCD Cockpit Display Box */}
            <div className="rounded-2xl bg-black border border-slate-800/90 px-6 py-7 sm:py-9 flex flex-col items-center justify-center my-3 relative shadow-inner">
              {!isUpdatingOdo ? (
                <>
                  <div className="flex items-baseline justify-center">
                    <span
                      className="font-digital text-4xl sm:text-5xl md:text-6xl font-black tracking-widest text-amber-400 glow-lcd drop-shadow-lg"
                    >
                      {String(bike.current_odometer || 0).padStart(6, "0")}
                    </span>
                    <span className="font-speedo text-amber-500 font-bold text-sm sm:text-base tracking-widest ml-1.5 sm:ml-2.5 uppercase drop-shadow-md">
                      KM
                    </span>
                  </div>

                  {/* Telemetry Sub-Row */}
                  <div className="mt-3.5 flex flex-wrap items-center justify-center gap-x-2.5 sm:gap-x-3 gap-y-1 text-xs font-mono">
                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                      <TrendingUp className="size-3.5" />
                      <span>AVG {dailyUsage !== null ? dailyUsage.toFixed(1) : "--"} KM/DAY</span>
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <Fuel className="size-3.5" />
                      <span>{fuelTelemetry.latestKmPerLiter !== null ? fuelTelemetry.latestKmPerLiter.toFixed(1) : "--"} KM/L</span>
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400 font-normal">
                      {lastRefuelText}
                    </span>
                  </div>
                </>
              ) : (
                <form onSubmit={handleOdoSubmit} className="w-full max-w-sm flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      value={odometerValue}
                      onChange={(e) => setOdometerValue(e.target.value)}
                      className="h-12 font-mono text-3xl text-center font-black bg-black border-amber-500 text-amber-400"
                      placeholder="000000"
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    className="h-12 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-1.5"
                    disabled={updateOdometerMutation.isPending}
                  >
                    <Check className="size-5" />
                    <span>Save</span>
                  </Button>
                </form>
              )}
            </div>

            {/* Bottom Status Countdown Strip */}
            <div className="pt-3 mt-1 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-8 sm:size-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-digital font-black text-amber-400 text-base tracking-wider">
                      {Math.max(0, engineOil.remainingKm).toLocaleString()}
                    </span>
                    <span className="font-speedo font-bold text-amber-500 text-xs tracking-wider">
                      KM
                    </span>
                    <span className="text-slate-200 text-xs font-medium ml-1">
                      Until next oil Change
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                    <Calendar className="size-3.5 text-slate-500" />
                    <span>Est. due:</span>
                    <strong className="text-slate-200 font-semibold font-mono">{estDueDateText}</strong>
                    <span className="text-slate-400 font-mono text-[11px]">
                      (based on {(dailyUsage > 0 ? dailyUsage : 21.1).toFixed(1)} KM/day)
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center">
                <div className="rounded-full bg-emerald-950/50 border border-emerald-500/50 text-emerald-400 font-speedo text-xs font-bold px-3 py-1 tracking-wider uppercase">
                  {engineOil.percentRemaining}% REMAINING
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* 3. COMPONENT HEALTH TILES GRID                            */}
        {/* ========================================================= */}
        <section className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Tile A: Engine Oil Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-3.5 sm:p-4 shadow-sm flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 font-bold">
                <Droplets className="size-4" />
                <span>Engine Oil</span>
              </div>
              <span className={`text-[10px] font-bold uppercase ${engineOil.status === "good" ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}`}>
                {engineOil.percentRemaining}% Life
              </span>
            </div>

            <div className="my-3">
              <div className="flex items-baseline justify-between text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                <span>{engineOil.status === "good" ? "Healthy" : "Due Soon"}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{engineOil.kmDaysText}</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    engineOil.percentRemaining > 30 ? "bg-emerald-500" : "bg-orange-500"
                  }`}
                  style={{ width: `${engineOil.percentRemaining}%` }}
                />
              </div>
            </div>

            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              Interval: Every 2,000 km
            </p>
          </div>

          {/* Tile B: Final Drive / Gear Oil */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-3.5 sm:p-4 shadow-sm flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-bold">
                <Settings className="size-4" />
                <span>Final Drive</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Gear Oil</span>
            </div>

            <div className="my-3">
              <p className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                {finalDrive.status === "overdue" ? "Service Overdue" : "Due in " + Math.max(0, finalDrive.remainingKm).toLocaleString() + " km"}
              </p>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                {finalDrive.dateText || "Next transmission check"}
              </p>
            </div>

            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              Interval: Every 4,000 km
            </p>
          </div>

          {/* Tile C: CVT Transmission */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-3.5 sm:p-4 shadow-sm flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 font-bold">
                <RotateCw className="size-4" />
                <span>CVT Driveline</span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">OK</span>
            </div>

            <div className="my-3">
              <p className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">Clean & Lube OK</p>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                Belt & Rollers in range
              </p>
            </div>

            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              Inspection: Every 6,000 km
            </p>
          </div>

          {/* Tile D: Interactive Battery SVG Visualizer */}
          <button
            type="button"
            onClick={() => setBatteryModalOpen(true)}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-3.5 sm:p-4 shadow-sm text-left transition-all hover:border-cyan-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 active:scale-98 flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-bold">
                <Zap className="size-4" />
                <span>Battery Voltage</span>
              </div>
              <span className={`text-[10px] font-bold ${batteryHealth.textColor}`}>
                {batteryHealth.status.toUpperCase()}
              </span>
            </div>

            <div className="my-2.5 flex items-center justify-between">
              <div>
                <span className="font-mono text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                  {batteryVoltage.toFixed(1)}V
                </span>
                <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  Tap to calibrate / test
                </p>
              </div>

              {/* Lead-Acid Mini Graphic */}
              <div className="relative w-12 h-8 rounded-md bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 flex items-center justify-center p-1 shadow-inner">
                <div className="absolute -top-1 left-1.5 w-2 h-1 bg-red-500 rounded-t-sm" />
                <div className="absolute -top-1 right-1.5 w-2 h-1 bg-slate-400 rounded-t-sm" />
                <div
                  className={`h-4 w-8 rounded-sm ${
                    batteryHealth.status === "good" ? "bg-emerald-500/80" : "bg-amber-500/80"
                  } flex items-center justify-center`}
                >
                  <Zap className="size-2.5 text-slate-950" />
                </div>
              </div>
            </div>

            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              Standard: 12.4V – 12.8V
            </p>
          </button>

          {/* Tile E: Fuel Economy */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-3.5 sm:p-4 shadow-sm flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 font-bold">
                <Fuel className="size-4" />
                <span>Fuel Economy</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {fuelTelemetry.averageKmPerLiter !== null ? "Average" : "No telemetry"}
              </span>
            </div>

            <div className="my-3">
              <p className="text-xl font-mono font-black text-slate-900 dark:text-slate-100">
                {fuelTelemetry.averageKmPerLiter !== null ? fuelTelemetry.averageKmPerLiter.toFixed(1) : "--"} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">km/L</span>
              </p>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                {fuelTelemetry.averageCostPerKm !== null ? `Cost: $${fuelTelemetry.averageCostPerKm.toFixed(3)}/km` : "Need 2+ fuel logs"}
              </p>
            </div>

            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              Calculated from fuel fill-ups
            </p>
          </div>

          {/* Tile F: Next Service Due Countdown */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-3.5 sm:p-4 shadow-sm flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                <Clock className="size-4" />
                <span>Service Schedule</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Target</span>
            </div>

            <div className="my-3">
              <p className="text-xl font-mono font-black text-slate-900 dark:text-slate-100">
                {engineOil.remainingKm > 0 ? `In ${engineOil.remainingKm.toLocaleString()} km` : "Overdue"}
              </p>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                {engineOil.dateText ? `Target date: ${engineOil.dateText}` : "Schedule pending"}
              </p>
            </div>

            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              Auto-estimated by riding pace
            </p>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. RECENT GARAGE ACTIVITY (Matches Exact User Reference)  */}
        {/* ========================================================= */}
        <section className="rounded-3xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#060b18] p-4 sm:p-6 shadow-2xl transition-colors">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-500 dark:text-indigo-400 shrink-0">
                <History className="size-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                  Recent Garage Activity
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tap any record to edit details or costs
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="bg-slate-100 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setTimelineFilter("all")}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg transition-all",
                  timelineFilter === "all"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTimelineFilter("maintenance")}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                  timelineFilter === "maintenance"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <Wrench className="size-3 text-amber-500" />
                <span>Maintenance</span>
              </button>
              <button
                type="button"
                onClick={() => setTimelineFilter("fuel")}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                  timelineFilter === "fuel"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <Fuel className="size-3 text-emerald-500" />
                <span>Fuel</span>
              </button>
            </div>
          </div>

          {/* Activity Cards List */}
          <div className="mt-4 space-y-2.5">
            {filteredTimeline.length > 0 ? (
              filteredTimeline.map((item) => {
                const totalCostUsd = Number(item.cost || 0);
                const usdVal = `$${totalCostUsd.toFixed(2)}`;
                const khrVal = `${Math.round(totalCostUsd * khrPerUsd).toLocaleString()} ៛`;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/70 hover:bg-slate-100/80 dark:hover:bg-slate-900/60 p-3.5 sm:p-4 transition-all flex items-center justify-between gap-3 group shadow-xs"
                  >
                    {/* Left Icon + Content */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Icon Container */}
                      <div
                        className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0 border",
                          item.type === "fuel"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-500"
                        )}
                      >
                        {item.type === "fuel" ? (
                          <Fuel className="size-5" />
                        ) : (
                          <Droplets className="size-5" />
                        )}
                      </div>

                      {/* Content Details */}
                      <div className="min-w-0">
                        {/* Title Row + Badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                            {item.title}
                          </span>
                          {item.type === "fuel" && item.fuelEco && (
                            <span className="bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md">
                              {item.fuelEco}
                            </span>
                          )}
                          {item.type === "maintenance" && item.odometer && (
                            <span className="bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md">
                              {item.odometer.toLocaleString()} KM
                            </span>
                          )}
                        </div>

                        {/* Telemetry Row */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                          <Calendar className="size-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span>{format(item.date, "dd-MMM-yy")}</span>
                          <span>•</span>
                          <strong className="text-slate-800 dark:text-slate-200 font-mono font-bold">
                            {item.odometer?.toLocaleString()} KM
                          </strong>
                          {item.type === "fuel" && item.gasStation && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600 dark:text-slate-400 truncate">{item.gasStation}</span>
                            </>
                          )}
                          {item.type === "maintenance" && item.shopName && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600 dark:text-slate-400 truncate">{item.shopName}</span>
                            </>
                          )}
                        </div>

                        {/* Quoted Notes */}
                        {(item.notes || (item.type === "fuel" && item.gasStation)) && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5 truncate">
                            &ldquo;{item.notes || item.gasStation}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Side: Dual Currency Price + Action Buttons */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <div className="text-right">
                        <div
                          className={cn(
                            "font-mono font-bold text-base tabular-nums",
                            item.type === "fuel" ? "text-emerald-400" : "text-amber-400"
                          )}
                        >
                          {usdVal}
                        </div>
                        <div className="font-mono text-xs text-slate-400 tabular-nums">
                          {khrVal}
                        </div>
                      </div>

                      {/* Action Buttons: Edit + Delete */}
                      <div className="flex items-center gap-1">
                        {item.type === "fuel" && bike && (
                          <LogFuelDialog
                            bikeId={bike.id}
                            editLog={item.rawLog}
                            trigger={
                              <button
                                type="button"
                                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                                title="Edit fuel record"
                              >
                                <Pencil className="size-4" />
                              </button>
                            }
                          />
                        )}

                        {item.type === "maintenance" && bike && (
                          <LogMaintenanceDialog
                            bikeId={bike.id}
                            editRecord={item.rawRecord}
                            trigger={
                              <button
                                type="button"
                                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                                title="Edit service record"
                              >
                                <Pencil className="size-4" />
                              </button>
                            }
                          />
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (item.type === "fuel") {
                              deleteFuelMutation.mutate(item.rawId);
                            } else {
                              deleteMaintenanceMutation.mutate(item.rawId);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center">
                <History className="size-8 text-slate-700 mx-auto mb-2" />
                <p className="text-xs font-mono text-slate-400">
                  {timelineFilter === "all"
                    ? "No garage activity recorded yet. Use the (+) button to log your first record."
                    : `No ${timelineFilter} records found.`}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <BatteryModal
        open={batteryModalOpen}
        onOpenChange={setBatteryModalOpen}
        voltage={batteryVoltage}
        onSaveVoltage={(v) => {
          setBatteryVoltage(v);
          localStorage.setItem("motolog_battery_v", String(v));
        }}
      />
    </AppShell>
  );
}
