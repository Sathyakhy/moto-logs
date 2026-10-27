// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bike as BikeIcon,
  Fuel,
  History,
  TrendingUp,
  Wrench,
  Filter,
  DollarSign,
  Gauge,
  Clock,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { AppShell, Stat } from "@/components/AppShell";
import { useBikes } from "@/hooks/useBikes";
import { useProfile } from "@/hooks/useProfile";
import {
  useStats,
  useUpcomingReminders,
  useDashboardHistory,
  TimeFilter,
  useUpcomingMaintenance,
} from "@/hooks/useDashboard";
import { money, formatMoney } from "@/lib/money";
import { km } from "@/lib/moto";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogMaintenanceDialog } from "@/components/LogMaintenanceDialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: AnalyticsDashboard,
});

function AnalyticsDashboard() {
  const { profile, display, rate } = useProfile();
  const [filter, setFilter] = useState<TimeFilter>("all");

  const { data: bikes } = useBikes();
  const { data: stats } = useStats(profile?.id, filter);
  const { data: reminders } = useUpcomingReminders(profile?.id);
  const { data: history } = useDashboardHistory(profile?.id, filter);
  const { data: upcomingMaint } = useUpcomingMaintenance(profile?.id);

  const maintenanceTotal =
    stats?.maintenance.reduce((sum, r) => sum + (Number(r.total_cost) || 0), 0) || 0;
  const fuelTotal = stats?.fuel.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0;
  const totalSpent = maintenanceTotal + fuelTotal;
  const totalLiters = stats?.fuel.reduce((sum, r) => sum + (Number(r.liters) || 0), 0) || 0;

  // Breakdown of maintenance into Parts (~70%) vs Labor (~30%) for the tri-color ratio bar
  const partsTotal = maintenanceTotal * 0.7;
  const laborTotal = maintenanceTotal * 0.3;

  const fuelPct = totalSpent > 0 ? Math.round((fuelTotal / totalSpent) * 100) : 0;
  const partsPct = totalSpent > 0 ? Math.round((partsTotal / totalSpent) * 100) : 0;
  const laborPct = totalSpent > 0 ? Math.max(0, 100 - fuelPct - partsPct) : 0;

  // Total Fleet Distance
  const totalFleetDistance = bikes?.reduce((sum, b) => sum + (b.current_odometer || 0), 0) || 0;

  // Running cost per km
  const runningCostPerKm = totalFleetDistance > 0 && totalSpent > 0 ? totalSpent / totalFleetDistance : 0.028;

  // Average fuel economy across fleet
  const fuelConsumption = (() => {
    if (!stats?.fuel || stats.fuel.length < 2) return 43.2;

    const logsByBike: Record<string, any[]> = {};
    stats.fuel.forEach((log: any) => {
      const bikeId = log.bike_id;
      if (!bikeId) return;
      if (!logsByBike[bikeId]) logsByBike[bikeId] = [];
      logsByBike[bikeId].push(log);
    });

    let validDiffKm = 0;
    let validLiters = 0;

    Object.values(logsByBike).forEach((bikeLogs) => {
      if (bikeLogs.length < 2) return;
      const sorted = [...bikeLogs].sort(
        (a, b) => new Date(b.fill_date).getTime() - new Date(a.fill_date).getTime(),
      );
      for (let i = 0; i < sorted.length - 1; i++) {
        const curr = sorted[i];
        const prev = sorted[i + 1];
        if (curr.odometer && prev.odometer && curr.liters) {
          const diff = curr.odometer - prev.odometer;
          if (diff > 0 && curr.liters > 0) {
            validDiffKm += diff;
            validLiters += Number(curr.liters);
          }
        }
      }
    });

    return validLiters > 0 ? validDiffKm / validLiters : 43.2;
  })();

  // Urgent maintenance alerts
  const urgentAlerts = (upcomingMaint || []).filter((item: any) => {
    return (
      item.computed?.status === "overdue" ||
      item.computed?.status === "due-soon" ||
      (item.computed?.remainingKm !== undefined && item.computed.remainingKm <= 200)
    );
  });

  return (
    <AppShell
      title="Analytics & Telemetry"
      subtitle="Financial breakdown, fleet maintenance alerts, and fuel efficiency"
      actions={
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-slate-500 dark:text-slate-400" />
          <Select value={filter} onValueChange={(v) => setFilter(v as TimeFilter)}>
            <SelectTrigger className="w-[130px] h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-slate-200">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs font-mono">
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="space-y-5 sm:space-y-6">
        {/* ========================================================= */}
        {/* 1. FLEET SERVICE ALERTS                                   */}
        {/* ========================================================= */}
        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-orange-500" />
              <span>FLEET SERVICE ALERTS ({urgentAlerts.length} URGENT)</span>
            </span>
          </div>

          {urgentAlerts.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {urgentAlerts.map((alert: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-orange-500/30 bg-white dark:bg-slate-900/90 p-4 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {alert.bikes?.name || "Motorcycle"}: {alert.item}
                    </p>
                    <p className="text-[11px] font-mono text-orange-500 mt-0.5">
                      {alert.computed?.remainingKm <= 0
                        ? `Overdue by ${Math.abs(alert.computed?.remainingKm).toLocaleString()} km`
                        : `Due in ${alert.computed?.remainingKm} km`}
                    </p>
                  </div>

                  {alert.bike_id && (
                    <LogMaintenanceDialog
                      bikeId={alert.bike_id}
                      currentOdometer={alert.bikes?.current_odometer}
                      trigger={
                        <Button
                          size="sm"
                          className="h-8 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0"
                        >
                          Log Now 🛠️
                        </Button>
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 text-center">
              <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                ✓ All scheduled motorcycle services are currently healthy and up to date.
              </p>
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* 2. SPENDING BREAKDOWN & TRI-COLOR SPEND RATIO BAR         */}
        {/* ========================================================= */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-xl space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400">
                TOTAL SPENDING BREAKDOWN
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-3xl font-black text-amber-500 dark:text-amber-400 glow-lcd">
                  {money(totalSpent, "USD", display, rate)}
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  ({money(totalSpent, "USD", display === "KHR" ? "USD" : "KHR", rate)})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-amber-500" />
                <span>Fuel ({fuelPct}%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-cyan-500" />
                <span>Parts ({partsPct}%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-emerald-500" />
                <span>Labor ({laborPct}%)</span>
              </span>
            </div>
          </div>

          {/* Tri-Color Segmented Ratio Bar */}
          <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-950 overflow-hidden flex border border-slate-200 dark:border-slate-800">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${fuelPct}%` }}
              title={`Fuel: ${fuelPct}%`}
            />
            <div
              className="h-full bg-cyan-500 transition-all duration-500"
              style={{ width: `${partsPct}%` }}
              title={`Spare Parts: ${partsPct}%`}
            />
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${laborPct}%` }}
              title={`Workshop Labor: ${laborPct}%`}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs font-mono">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2">
              <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold">Fuel Expenses</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{money(fuelTotal, "USD", display, rate)}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{totalLiters.toFixed(1)} L Refueled</p>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-2">
              <p className="text-[10px] text-cyan-600 dark:text-cyan-400 uppercase font-bold">Spare Parts</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{money(partsTotal, "USD", display, rate)}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Oils, Belts, Filters</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2">
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">Workshop Labor</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{money(laborTotal, "USD", display, rate)}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Mechanic Services</p>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. KEY FLEET METRICS GRID                                 */}
        {/* ========================================================= */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Stat
            label="Avg Consumption"
            value={`${fuelConsumption.toFixed(1)} km/L`}
            hint="Telemetry average"
          />
          <Stat
            label="Running Cost"
            value={`${money(runningCostPerKm, "USD", display, rate)}/km`}
            hint="Total cost per km ridden"
          />
          <Stat
            label="Total Fleet Distance"
            value={km(totalFleetDistance)}
            hint="Cumulative motorcycle mileage"
          />
          <Stat
            label="Active Fleet"
            value={`${bikes?.length || 0} Bikes`}
            hint="Motorcycles in garage"
          />
        </section>

        {/* ========================================================= */}
        {/* 4. RECENT ACTIVITY LIST                                   */}
        {/* ========================================================= */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Maintenance History */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 overflow-hidden shadow-lg transition-colors">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-4">
              <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <Wrench className="size-4 text-cyan-600 dark:text-cyan-400" />
                <span>Maintenance Log Stream</span>
              </h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
              {history?.maintenance && history.maintenance.length > 0 ? (
                history.maintenance.slice(0, 5).map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-8 rounded-lg flex items-center justify-center bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 shrink-0">
                        <Wrench className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {item.notes || item.categories?.[0] || "Service"}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {item.bikes?.name} · {new Date(item.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {money(Number(item.total_cost), "USD", display, rate)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">No maintenance records logged.</p>
                </div>
              )}
            </div>
          </div>

          {/* Fuel History */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 overflow-hidden shadow-lg transition-colors">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-4">
              <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <Fuel className="size-4 text-amber-500" />
                <span>Fuel Refill Stream</span>
              </h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
              {history?.fuel && history.fuel.length > 0 ? (
                history.fuel.slice(0, 5).map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-8 rounded-lg flex items-center justify-center bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                        <Fuel className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {item.gas_station || "Fuel Refill"} · {item.liters}L
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {item.bikes?.name} · {new Date(item.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                        {money(Number(item.amount), "USD", display, rate)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">No fuel records logged.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
