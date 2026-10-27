import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bike as BikeIcon,
  Calendar,
  Gauge,
  Wrench,
  Fuel,
  History,
  Settings,
  Star,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { AppShell } from "@/components/AppShell";
import { AddBikeDialog } from "@/components/AddBikeDialog";
import { useBikes } from "@/hooks/useBikes";
import { km } from "@/lib/moto";
import { EditBikeDialog } from "@/components/EditBikeDialog";
import { LogMaintenanceDialog } from "@/components/LogMaintenanceDialog";
import { LogFuelDialog } from "@/components/LogFuelDialog";
import { View360 } from "@/components/View360";
import { Button } from "@/components/ui/button";
import { useSignedUrl } from "@/hooks/useBikes";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/bikes/")({
  component: Bikes,
});

function Bikes() {
  const { data: bikes, isLoading } = useBikes();
  const queryClient = useQueryClient();

  const handleSetDefault = async (bike: any) => {
    if (bike.is_default) return;
    try {
      await supabase
        .from("bikes")
        .update({ is_default: false })
        .eq("user_id", bike.user_id)
        .eq("is_default", true);

      await supabase
        .from("bikes")
        .update({ is_default: true })
        .eq("id", bike.id);

      await queryClient.invalidateQueries({ queryKey: ["bikes"] });
      toast.success(`${bike.make} ${bike.model} set as primary cockpit`);
    } catch {
      toast.error("Failed to update default motorcycle");
    }
  };

  return (
    <AppShell
      title="Fleet Garage"
      subtitle="Digital telemetry and service history across all registered motorcycles"
      actions={<AddBikeDialog />}
    >
      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-64 rounded-2xl border border-slate-800/80 bg-slate-900/60 animate-pulse"
            />
          ))}
        </div>
      ) : !bikes || bikes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-10 sm:p-14 text-center">
          <div className="size-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400">
            <BikeIcon className="size-8" />
          </div>
          <h2 className="text-xl font-bold mb-1 text-slate-100 font-display">No Motorcycles Registered</h2>
          <p className="text-xs text-slate-400 mb-6 max-w-sm">
            Add your motorcycle to monitor service intervals, telemetry stats, fuel consumption, and full lifetime cost.
          </p>
          <AddBikeDialog />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {bikes.map((bike) => {
            const hasMultiplePhotos = bike.photos_paths && bike.photos_paths.length > 1;
            const isDue = (bike.dueItemsCount || 0) > 0;

            return (
              <div
                key={bike.id}
                className={cn(
                  "rounded-2xl border bg-slate-900/90 backdrop-blur-xl overflow-hidden shadow-xl transition-all duration-200 flex flex-col justify-between group",
                  bike.is_default
                    ? "border-amber-500/50 shadow-amber-500/5 ring-1 ring-amber-500/20"
                    : "border-slate-800/80 hover:border-slate-700"
                )}
              >
                <div>
                  {/* Visual Bike Display Frame */}
                  <div className="relative aspect-video w-full bg-slate-950/80 border-b border-slate-800/60 overflow-hidden">
                    {hasMultiplePhotos ? (
                      <View360
                        paths={bike.photos_paths}
                        fallbackPath={bike.photo_path}
                        className="size-full"
                      />
                    ) : (
                      <BikeImage path={bike.photo_path} />
                    )}

                    {/* Status & Badge Overlays */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-2 pointer-events-none">
                      {bike.is_default && (
                        <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-amber-400 backdrop-blur-md shadow-sm">
                          <Star className="size-3 fill-amber-400 text-amber-400" />
                          <span>Primary Cockpit</span>
                        </div>
                      )}
                    </div>

                    <div className="absolute bottom-2.5 right-2.5 pointer-events-none">
                      {isDue ? (
                        <div className="flex items-center gap-1.5 rounded-lg bg-red-500/20 border border-red-500/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-400 backdrop-blur-md">
                          <AlertTriangle className="size-3" />
                          <span>Attention Due</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 backdrop-blur-md">
                          <ShieldCheck className="size-3" />
                          <span>All Systems OK</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bike Card Body */}
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to="/bikes/$bikeId"
                        params={{ bikeId: bike.id }}
                        search={{ tab: undefined }}
                        className="flex-1 min-w-0"
                      >
                        <h3 className="text-lg font-bold text-slate-100 group-hover:text-amber-400 transition-colors truncate">
                          {bike.name}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                          {bike.year} {bike.make} {bike.model}
                          {bike.plate_number ? ` · ${bike.plate_number}` : ""}
                        </p>
                      </Link>

                      {/* Quick Top Icon Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "size-8 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60",
                            bike.is_default && "text-amber-400 hover:text-amber-300"
                          )}
                          title={bike.is_default ? "Primary Bike" : "Set as Primary"}
                          onClick={() => handleSetDefault(bike)}
                        >
                          <Star className={cn("size-4", bike.is_default && "fill-amber-400")} />
                        </Button>

                        <EditBikeDialog
                          bike={bike}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                              title="Edit Motorcycle Specs"
                            >
                              <Settings className="size-4" />
                            </Button>
                          }
                        />
                      </div>
                    </div>

                    {/* LCD Odometer Strip */}
                    <div className="mt-4 rounded-xl border border-slate-800/90 bg-slate-950/80 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gauge className="size-4 text-amber-500" />
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                            Current Odometer
                          </p>
                          <p className="font-mono text-base font-bold text-amber-400 tracking-wider">
                            {km(bike.current_odometer)}
                          </p>
                        </div>
                      </div>

                      <Link
                        to="/bikes/$bikeId"
                        params={{ bikeId: bike.id }}
                        search={{ tab: undefined }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-amber-400 transition-colors"
                      >
                        <span>Telemetry</span>
                        <ChevronRight className="size-3.5" />
                      </Link>
                    </div>

                    {/* Telemetry Details */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-slate-800/40 border border-slate-800/60 p-2.5">
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                          Last Service
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 text-slate-200">
                          <Calendar className="size-3 text-slate-400" />
                          <span className="truncate text-[11px] font-medium">
                            {bike.lastServiceDate
                              ? new Date(bike.lastServiceDate).toLocaleDateString()
                              : "No records yet"}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-lg bg-slate-800/40 border border-slate-800/60 p-2.5">
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                          Status Check
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 text-slate-200">
                          <Wrench className="size-3 text-slate-400" />
                          <span className="truncate text-[11px] font-medium">
                            {isDue
                              ? `${bike.dueItemsCount} items due`
                              : "All items current"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="border-t border-slate-800/80 bg-slate-950/40 px-4 py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <LogMaintenanceDialog
                      bikeId={bike.id}
                      currentOdometer={bike.current_odometer}
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold gap-1.5"
                        >
                          <Wrench className="size-3.5 text-amber-400" />
                          <span>Service</span>
                        </Button>
                      }
                    />

                    <LogFuelDialog
                      bikeId={bike.id}
                      currentOdometer={bike.current_odometer}
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold gap-1.5"
                        >
                          <Fuel className="size-3.5 text-amber-500" />
                          <span>Fuel</span>
                        </Button>
                      }
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 text-xs gap-1"
                    asChild
                  >
                    <Link
                      to="/bikes/$bikeId"
                      params={{ bikeId: bike.id }}
                      search={{ tab: "history" }}
                    >
                      <History className="size-3.5" />
                      <span>Logbook</span>
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function BikeImage({ path }: { path: string | null | undefined }) {
  const { data: url } = useSignedUrl(path || "");

  if (!url) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 bg-slate-950">
        <BikeIcon className="size-16 stroke-1 text-slate-800" />
        <span className="text-[11px] font-mono text-slate-600 mt-2">Vehicle Photo Pending</span>
      </div>
    );
  }

  return (
    <div className="relative size-full flex items-center justify-center bg-slate-950/80 p-2">
      <img
        src={url}
        alt="Motorcycle"
        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
      />
    </div>
  );
}
