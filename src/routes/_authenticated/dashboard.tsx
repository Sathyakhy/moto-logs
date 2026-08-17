import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  AlertCircle, 
  Bike as BikeIcon, 
  Fuel, 
  History, 
  TrendingUp,
  Wrench,
  Filter
} from "lucide-react";
import { useState } from "react";

import { AppShell, Stat, StatusPill } from "@/components/AppShell";
import { useBikes } from "@/hooks/useBikes";
import { useProfile } from "@/hooks/useProfile";
import { useStats, useUpcomingReminders, useDashboardHistory, TimeFilter, useUpcomingMaintenance } from "@/hooks/useDashboard";
import { money } from "@/lib/money";
import { km } from "@/lib/moto";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { profile, display, rate } = useProfile();
  const [filter, setFilter] = useState<TimeFilter>("all");
  
  const { data: bikes } = useBikes();
  const { data: stats } = useStats(profile?.id, filter);
  const { data: reminders } = useUpcomingReminders(profile?.id);
  const { data: history } = useDashboardHistory(profile?.id, filter);
  const { data: upcomingMaint } = useUpcomingMaintenance(profile?.id);

  const totalSpent = (stats?.maintenance.reduce((sum, r) => sum + (Number(r.total_cost) || 0), 0) || 0) +
                     (stats?.fuel.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0) +
                     (stats?.expenses.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0);

  const maintenanceTotal = stats?.maintenance.reduce((sum, r) => sum + (Number(r.total_cost) || 0), 0) || 0;
  const fuelTotal = stats?.fuel.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0;
  const totalLiters = stats?.fuel.reduce((sum, r) => sum + (Number(r.liters) || 0), 0) || 0;

  // Calculate Fuel Consumption (KM/L) per bike then average
  const fuelConsumption = (() => {
    if (!stats?.fuel || stats.fuel.length < 2) return 0;
    
    // Group fuel logs by bike
    const logsByBike: Record<string, any[]> = {};
    stats.fuel.forEach((log: any) => {
      const bikeId = log.bike_id;
      if (!bikeId) return;
      if (!logsByBike[bikeId]) logsByBike[bikeId] = [];
      logsByBike[bikeId].push(log);
    });

    let totalKm = 0;
    let totalL = 0;

    Object.values(logsByBike).forEach(bikeLogs => {
      if (bikeLogs.length < 2) return;
      
      // Sort logs by date descending (latest first)
      const sorted = [...bikeLogs].sort((a, b) => new Date(b.fill_date).getTime() - new Date(a.fill_date).getTime());
      
      // "Latest available data" logic: calculate consumption between the last two fill-ups
      // This is more reactive to recent changes in riding style or bike health
      const lastLog = sorted[0];
      const prevLog = sorted[1];
      
      const distance = (lastLog.odometer || 0) - (prevLog.odometer || 0);
      const liters = Number(lastLog.liters) || 0;
      
      if (distance > 0 && liters > 0) {
        totalKm += distance;
        totalL += liters;
      }
    });

    return totalL > 0 ? totalKm / totalL : 0;
  })();


  return (
    <AppShell 
      title="Dashboard" 
      subtitle="Your garage at a glance"
      actions={
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={filter} onValueChange={(v) => setFilter(v as TimeFilter)}>
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat 
          label="Total Spent" 
          value={money(totalSpent, "USD", display, rate)} 
          hint="Maintenance + Fuel + Expenses"
        />
        <Stat 
          label="Maintenance" 
          value={money(maintenanceTotal, "USD", display, rate)} 
          hint="Service costs"
        />
        <Stat 
          label="Fuel Costs" 
          value={money(fuelTotal, "USD", display, rate)} 
          hint="Refuel costs"
        />
        <Stat 
          label="Fuel Usage" 
          value={`${totalLiters.toFixed(1)} L`} 
          hint="Total liters consumed"
        />
        <Stat 
          label="Consumption" 
          value={fuelConsumption > 0 ? `${fuelConsumption.toFixed(2)} KM/L` : "N/A"} 
          hint="Avg. fuel economy"
        />
        <Stat 
          label="Total Distance" 
          value={km(bikes?.reduce((sum, b) => sum + (b.current_odometer || 0), 0) || 0)} 
          hint="Cumulative mileage"
        />
      </div>



      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Maintenance History */}
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-5">
            <h2 className="flex items-center gap-2 font-bold uppercase tracking-tight">
              <Wrench className="size-4 text-primary" />
              Maintenance History
            </h2>
          </div>
          <div className="divide-y divide-border">
            {history?.maintenance && history.maintenance.length > 0 ? (
              history.maintenance.slice(0, 5).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-5 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="size-9 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
                      <Wrench className="size-4" />
                    </div>
                    <div>
                      <p className="font-bold leading-tight">
                        {item.notes || item.categories?.[0] || "Maintenance"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.bikes?.name} • {new Date(item.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="num font-bold text-primary">
                      {money(Number(item.total_cost), "USD", display, rate)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center">
                <p className="text-sm text-muted-foreground">No maintenance records found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Fuel History */}
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-5">
            <h2 className="flex items-center gap-2 font-bold uppercase tracking-tight">
              <Fuel className="size-4 text-amber-500" />
              Fuel History
            </h2>
          </div>
          <div className="divide-y divide-border">
            {history?.fuel && history.fuel.length > 0 ? (
              history.fuel.slice(0, 5).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-5 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="size-9 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-500">
                      <Fuel className="size-4" />
                    </div>
                    <div>
                      <p className="font-bold leading-tight">
                        {item.gas_station || "Refuel"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.bikes?.name} • {new Date(item.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="num font-bold text-amber-500">
                      {money(Number(item.amount), "USD", display, rate)}
                    </p>
                    {item.liters && <p className="text-[10px] text-muted-foreground">{item.liters} L</p>}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center">
                <p className="text-sm text-muted-foreground">No fuel records found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Service Alerts */}
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-5">
            <h2 className="flex items-center gap-2 font-bold uppercase tracking-tight">
              <AlertCircle className="size-4 text-primary" />
              Active Alerts
            </h2>
          </div>
          <div className="divide-y divide-border">
            {bikes?.some(b => b.status !== 'good') ? (
              bikes.filter(b => b.status !== 'good').map(bike => (
                <div key={bike.id} className="p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm">{bike.name}</p>
                    <StatusPill status={bike.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {bike.dueItemsCount} maintenance tasks are {bike.status === 'overdue' ? 'overdue' : 'due soon'}.
                  </p>
                </div>
              ))
            ) : (
              <div className="p-6 text-center">
                <p className="text-xs text-muted-foreground">No pending alerts.</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Maintenance (Predictive) */}
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-5">
            <h2 className="flex items-center gap-2 font-bold uppercase tracking-tight">
              <TrendingUp className="size-4 text-primary" />
              Upcoming Maintenance
            </h2>
            <span className="text-[10px] text-muted-foreground uppercase bg-secondary px-2 py-0.5 rounded">Predictive</span>
          </div>
          <div className="divide-y divide-border">
            {upcomingMaint && upcomingMaint.length > 0 ? (
              upcomingMaint.slice(0, 5).map((item, idx) => (
                <div key={`${item.bikeId}-${item.item}-${idx}`} className="p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-bold text-sm leading-tight">{item.item}</p>
                      <p className="text-[10px] text-muted-foreground">{item.bikeName}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-xs font-bold",
                        item.status === 'overdue' ? "text-destructive" : "text-primary"
                      )}>
                        {item.status === 'overdue' ? 'Overdue' : 
                          item.estimatedDate ? `Est. ${new Date(item.estimatedDate).toLocaleDateString()}` : 
                          'Date N/A'
                        }
                      </p>
                      {item.dailyUsage && (
                        <p className="text-[9px] text-muted-foreground">~{item.dailyUsage.toFixed(1)} km/day</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>{km(item.dueAtKm - item.remainingKm)}</span>
                      <span>{km(item.dueAtKm)}</span>
                    </div>
                    <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-500",
                          item.status === 'overdue' ? "bg-destructive" : 
                          item.status === 'due-soon' ? "bg-amber-500" : "bg-primary"
                        )}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    {item.remainingKm > 0 && (
                      <p className="text-[9px] text-center text-muted-foreground pt-1">
                        {km(item.remainingKm)} remaining
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center">
                <p className="text-xs text-muted-foreground">No upcoming maintenance items.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

