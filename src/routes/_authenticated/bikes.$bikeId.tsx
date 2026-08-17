import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Droplets, 
  Fuel, 
  Gauge, 
  History, 
  Plus, 
  Settings, 
  Wrench 
} from "lucide-react";

import { AppShell, StatusPill, Stat } from "@/components/AppShell";
import { useBike } from "@/hooks/useBikes";
import { useMaintenanceRecords } from "@/hooks/useMaintenance";
import { km } from "@/lib/moto";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogMaintenanceDialog } from "@/components/LogMaintenanceDialog";
import { LogFuelDialog } from "@/components/LogFuelDialog";
import { EditBikeDialog } from "@/components/EditBikeDialog";
import { useFuelLogs } from "@/hooks/useMaintenance";

export const Route = createFileRoute("/_authenticated/bikes/$bikeId")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search['tab'] as string) || undefined,
    }
  },
  component: BikeDetail,
});


function BikeDetail() {
  const { bikeId } = useParams({ from: "/_authenticated/bikes/$bikeId" });
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { data: bike, isLoading } = useBike(bikeId);
  const { data: history } = useMaintenanceRecords(bikeId);
  const { data: fuelLogs } = useFuelLogs(bikeId);
  
  const currentTab = search.tab || "schedule";

  if (isLoading) return <div className="p-8 text-center">Loading bike details...</div>;
  if (!bike) return <div className="p-8 text-center text-destructive">Bike not found</div>;

  return (

    <AppShell 
      title={bike.name} 
      subtitle={`${bike.year} ${bike.model || ""} ${bike.purchase_date ? `• Purchased ${new Date(bike.purchase_date).toLocaleDateString()}` : ""}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/bikes">
              <ArrowLeft className="size-4 mr-2" />
              Back
            </Link>
          </Button>
          <EditBikeDialog bike={bike} />
        </div>
      }
    >
      <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-4">
        <Stat 
          label="Odometer" 
          value={km(bike.current_odometer)} 
          hint="Last updated today" 
        />
        <Stat 
          label="Service Status" 
          value={<StatusPill status={bike.status} />} 
          hint={bike.dueItemsCount > 0 ? `${bike.dueItemsCount} items need attention` : "All systems go"} 
        />
        <Stat 
          label="Fuel Economy" 
          value="-- L/100km" 
          hint="No logs yet" 
        />
        <Stat 
          label="Total Spent" 
          value="$0.00" 
          hint="Since purchase" 
        />
      </div>

      <div className="mt-8">
        <Tabs 
          value={currentTab} 
          onValueChange={(val) => {
            navigate({ search: { tab: val } });
          }}
        >
          <TabsList className="bg-secondary/50 p-1">
            <TabsTrigger value="schedule" className="gap-2">
              <Clock className="size-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="size-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="fuel" className="gap-2">
              <Fuel className="size-4" />
              Fuel Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold uppercase tracking-tight">Maintenance Schedule</h2>
              <Button size="sm" variant="outline" className="gap-2">
                <Plus className="size-3.5" />
                Customize
              </Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="panel p-5">
                 <div className="flex items-start justify-between">
                    <div>
                       <h3 className="font-bold">Engine Oil Change</h3>
                       <p className="text-sm text-muted-foreground">Every 2,000 km or 6 months</p>
                    </div>
                    <StatusPill status="good" />
                 </div>
                 <div className="mt-6">
                    <div className="flex justify-between text-xs mb-2">
                       <span className="text-muted-foreground">Progress</span>
                       <span className="num font-bold">500 / 2,000 km</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                       <div className="h-full bg-primary" style={{ width: '25%' }} />
                    </div>
                 </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {history && history.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold uppercase tracking-tight">Service History</h2>
                  <LogMaintenanceDialog bikeId={bikeId} currentOdometer={bike.current_odometer || 0} />
                </div>
                <div className="grid gap-4">
                  {history.map((record) => (
                    <LogMaintenanceDialog 
                      key={record.id}
                      bikeId={bikeId} 
                      editRecord={record}
                      trigger={
                        <div className="panel p-5 cursor-pointer hover:bg-secondary/20 transition-colors group">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-bold group-hover:text-primary transition-colors">
                                {record.notes?.split('\n')[0] || record.categories?.[0] || "Service Record"}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(record.service_date).toLocaleDateString()} • {km(record.odometer)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="num font-bold text-primary">${Number(record.total_cost).toFixed(2)}</p>
                              {record.workshop && <p className="text-xs text-muted-foreground">{record.workshop}</p>}
                            </div>
                          </div>
                        </div>
                      }
                    />
                  ))}

                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-12 text-center">
                <Wrench className="size-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No history logs</h3>
                <p className="text-muted-foreground mb-6">Start logging maintenance records to see them here.</p>
                <LogMaintenanceDialog bikeId={bikeId} currentOdometer={bike.current_odometer || 0} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="fuel" className="mt-6">
            {fuelLogs && fuelLogs.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold uppercase tracking-tight">Fuel History</h2>
                  <LogFuelDialog 
                    bikeId={bikeId} 
                    currentOdometer={bike.current_odometer || 0} 
                    trigger={
                      <Button size="sm" className="gap-2">
                        <Plus className="size-4" />
                        Log Fuel
                      </Button>
                    }
                  />
                </div>
                <div className="grid gap-4">
                  {fuelLogs.map((log) => (
                    <LogFuelDialog 
                      key={log.id}
                      bikeId={bikeId} 
                      editLog={log}
                      trigger={
                        <div className="panel p-5 cursor-pointer hover:bg-secondary/20 transition-colors group">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-bold group-hover:text-amber-500 transition-colors">
                                {log.gas_station || "Fuel Fill"}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(log.fill_date).toLocaleDateString()} • {km(log.odometer)}
                              </p>
                              <div className="mt-2 flex gap-4 text-xs font-medium">
                                <span className="bg-secondary/50 px-2 py-1 rounded">{log.liters} L</span>
                                {log.fuel_type && <span className="bg-secondary/50 px-2 py-1 rounded">{log.fuel_type}</span>}
                                {log.price_per_liter && (
                                  <span className="text-muted-foreground flex items-center">
                                    ${Number(log.price_per_liter).toFixed(3)}/L
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="num font-bold text-amber-500">${Number(log.amount).toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      }
                    />
                  ))}

                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-12 text-center">
                <Fuel className="size-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No fuel logs</h3>
                <p className="text-muted-foreground mb-6">Track your fuel consumption and economy.</p>
                <LogFuelDialog 
                  bikeId={bikeId} 
                  currentOdometer={bike.current_odometer || 0}
                  trigger={
                    <Button className="gap-2">
                      <Plus className="size-4" />
                      Add Fuel Log
                    </Button>
                  }
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
