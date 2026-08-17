import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  AlertCircle, 
  Bike as BikeIcon, 
  Calendar, 
  CreditCard, 
  Gauge, 
  History, 
  TrendingUp,
  Wrench
} from "lucide-react";

import { AppShell, Stat } from "@/components/AppShell";
import { useBikes } from "@/hooks/useBikes";
import { useProfile } from "@/hooks/useProfile";
import { useStats, useUpcomingReminders } from "@/hooks/useDashboard";
import { money } from "@/lib/money";
import { km } from "@/lib/moto";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { profile, display, rate } = useProfile();
  const { data: bikes } = useBikes();
  const { data: stats } = useStats(profile?.id);
  const { data: reminders } = useUpcomingReminders(profile?.id);

  // Simple aggregation for the dashboard
  const totalSpent = (stats?.maintenance.reduce((sum, r) => sum + (Number(r.total_cost) || 0), 0) || 0) +
                     (stats?.fuel.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0) +
                     (stats?.expenses.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0);

  return (
    <AppShell title="Dashboard" subtitle="Your garage at a glance">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Stat 
          label="Total Spent" 
          value={money(totalSpent, "USD", display, rate)} 
          hint="All bikes & expenses"
        />
        <Stat 
          label="Active Bikes" 
          value={bikes?.length || 0} 
          hint="In your garage"
        />
        <Stat 
          label="Due Soon" 
          value={reminders?.length || 0} 
          hint="Maintenance tasks"
        />
        <Stat 
          label="Total Distance" 
          value={km(bikes?.reduce((sum, b) => sum + (b.current_odometer || 0), 0) || 0)} 
          hint="Cumulative mileage"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Upcoming Service */}
        <div className="panel lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-5">
            <h2 className="flex items-center gap-2 font-bold uppercase tracking-tight">
              <AlertCircle className="size-4 text-primary" />
              Service Alerts
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/bikes" className="text-xs uppercase font-bold text-muted-foreground">View All</Link>
            </Button>
          </div>
          <div className="divide-y divide-border">
            {reminders && reminders.length > 0 ? (
              reminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between p-5 hover:bg-secondary/30 transition-colors">
                  <div>
                    <p className="font-bold">{reminder.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {(reminder.bikes as any)?.name} • {reminder.due_date ? new Date(reminder.due_date).toLocaleDateString() : `${km(reminder.due_odometer)}`}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">Service</Button>
                </div>
              ))
            ) : (
              <div className="p-10 text-center">
                <p className="text-sm text-muted-foreground">No pending maintenance alerts.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links / Recent Bikes */}
        <div className="panel overflow-hidden">
          <div className="border-b border-border p-5">
            <h2 className="flex items-center gap-2 font-bold uppercase tracking-tight">
              <BikeIcon className="size-4 text-primary" />
              Garage
            </h2>
          </div>
          <div className="divide-y divide-border">
            {bikes && bikes.length > 0 ? (
              bikes.slice(0, 4).map((bike) => (
                <Link 
                  key={bike.id} 
                  to="/bikes/$bikeId" 
                  params={{ bikeId: bike.id }}
                  className="flex items-center gap-4 p-5 hover:bg-secondary/30 transition-colors"
                >
                  <div className="size-10 rounded-lg bg-secondary flex items-center justify-center">
                    <BikeIcon className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-bold leading-none">{bike.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{bike.model}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="num text-sm font-bold">{km(bike.current_odometer)}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-10 text-center">
                <Button size="sm" asChild>
                  <Link to="/bikes">Add your first bike</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

