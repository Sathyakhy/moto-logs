import { createFileRoute, Link } from "@tanstack/react-router";
import { Bike as BikeIcon, Calendar, Gauge } from "lucide-react";

import { AppShell, StatusPill } from "@/components/AppShell";
import { AddBikeDialog } from "@/components/AddBikeDialog";
import { useBikes } from "@/hooks/useBikes";
import { km } from "@/lib/moto";
import { EditBikeDialog } from "@/components/EditBikeDialog";
import { LogMaintenanceDialog } from "@/components/LogMaintenanceDialog";
import { LogFuelDialog } from "@/components/LogFuelDialog";
import { Wrench, Fuel, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSignedUrl } from "@/hooks/useBikes";

export const Route = createFileRoute("/_authenticated/bikes/")({
  component: Bikes,
});

function Bikes() {
  const { data: bikes, isLoading } = useBikes();

  return (
    <AppShell 
      title="My Garage" 
      subtitle="Manage your motorcycles and track their status"
      actions={<AddBikeDialog />}
    >
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <div key={i} className="panel h-48 animate-pulse bg-secondary/50" />
          ))}
        </div>
      ) : bikes?.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-12 text-center">
          <div className="size-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <BikeIcon className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">No bikes yet</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Add your first motorcycle to start tracking maintenance and expenses.
          </p>
          <AddBikeDialog />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bikes?.map((bike) => (
            <div 
              key={bike.id} 
              className="panel group block overflow-hidden transition-all border-border"
            >
              <Link
                to="/bikes/$bikeId" 
                params={{ bikeId: bike.id }}
                search={{ tab: undefined }}
                className="block"
              >

                <div className="aspect-video w-full bg-secondary relative overflow-hidden">
                  {bike.photo_path ? (
                    <BikeImage path={bike.photo_path} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20">
                      <BikeIcon className="size-16" />
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3">
                     <StatusPill status={bike.status} />
                  </div>
                </div>
              </Link>
              
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to="/bikes/$bikeId" 
                    params={{ bikeId: bike.id }}
                    search={{ tab: undefined }}
                    className="flex-1"
                  >

                    <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">{bike.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {bike.year} {bike.model}
                    </p>
                  </Link>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {bike.plate_number && (
                      <div className="rounded bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border border-border">
                        {bike.plate_number}
                      </div>
                    )}
                    <div className="flex gap-1.5 sm:gap-2">
                      <Button variant="outline" size="icon" className="size-8 sm:size-9" title="History" asChild>
                        <Link to="/bikes/$bikeId" params={{ bikeId: bike.id }} search={{ tab: 'history' }}>
                          <History className="size-4" />
                        </Link>
                      </Button>

                      <LogMaintenanceDialog 
                        bikeId={bike.id} 
                        currentOdometer={bike.current_odometer}
                        trigger={
                          <Button variant="outline" size="icon" className="size-8 sm:size-9" title="Add Maintenance">
                            <Wrench className="size-4" />
                          </Button>
                        }
                      />

                      <LogFuelDialog 
                        bikeId={bike.id} 
                        currentOdometer={bike.current_odometer}
                        trigger={
                          <Button variant="outline" size="icon" className="size-8 sm:size-9 text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-900/50" title="Log Fuel">
                            <Fuel className="size-4" />
                          </Button>
                        }
                      />
                      <EditBikeDialog 
                        bike={bike} 
                        trigger={
                          <Button variant="outline" size="icon" className="size-8 sm:size-9" title="Edit">
                            <Settings className="size-4" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4">
                  <div>
                    <p className="label-caps mb-1">Odometer</p>
                    <div className="flex items-center gap-1.5">
                      <Gauge className="size-3.5 text-primary" />
                      <span className="num text-sm font-semibold">{km(bike.current_odometer)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="label-caps mb-1">Last Service</p>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {bike.lastServiceDate 
                          ? new Date(bike.lastServiceDate).toLocaleDateString() 
                          : "Never"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function BikeImage({ path }: { path: string }) {
  const { data: url } = useSignedUrl(path);
  
  if (!url) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20">
        <BikeIcon className="size-16" />
      </div>
    );
  }

  return (
    <img 
      src={url} 
      alt="Motorcycle" 
      className="h-full w-full object-contain bg-white transition-transform duration-500 group-hover:scale-105" 
    />
  );
}
