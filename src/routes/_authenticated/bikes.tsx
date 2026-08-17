import { createFileRoute, Link } from "@tanstack/react-router";
import { Bike as BikeIcon, Calendar, Gauge, MapPin } from "lucide-react";

import { AppShell, StatusPill } from "@/components/AppShell";
import { AddBikeDialog } from "@/components/AddBikeDialog";
import { useBikes } from "@/hooks/useBikes";
import { km } from "@/lib/moto";

export const Route = createFileRoute("/_authenticated/bikes")({
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
            <Link 
              key={bike.id} 
              to="/_authenticated/bikes/$bikeId" 
              params={{ bikeId: bike.id }}
              className="panel group block overflow-hidden transition-all hover:border-primary hover:shadow-glow"
            >
              <div className="aspect-video w-full bg-secondary relative overflow-hidden">
                {bike.photo_path ? (
                   <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs uppercase font-semibold">
                     Photo Uploaded
                   </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20">
                    <BikeIcon className="size-16" />
                  </div>
                )}
                <div className="absolute bottom-3 right-3">
                   <StatusPill status="good" />
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xl font-bold leading-tight">{bike.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {bike.year} {bike.model}
                    </p>
                  </div>
                  {bike.plate_number && (
                    <div className="rounded bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border border-border">
                      {bike.plate_number}
                    </div>
                  )}
                </div>
                
                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-4">
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
                      <span className="text-sm font-medium">Never</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

