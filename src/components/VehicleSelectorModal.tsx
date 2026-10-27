// @ts-nocheck
import * as React from "react";
import { Bike as BikeIcon, Check, Plus, X, Star } from "lucide-react";
import { useBikes } from "@/hooks/useBikes";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { km } from "@/lib/moto";
import { AddBikeDialog } from "@/components/AddBikeDialog";

interface VehicleSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeBikeId?: string;
}

export function VehicleSelectorModal({
  open,
  onOpenChange,
  activeBikeId,
}: VehicleSelectorModalProps) {
  const { data: bikes } = useBikes();
  const queryClient = useQueryClient();

  if (!open) return null;

  const handleSelectBike = async (bike: any) => {
    try {
      if (!bike.is_default) {
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
        toast.success(`Active bike set to ${bike.make} ${bike.model}`);
      }
      onOpenChange(false);
    } catch {
      toast.error("Failed to switch active motorcycle");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl text-slate-100 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <BikeIcon className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Active Vehicle Cockpit</h3>
              <p className="text-[11px] text-slate-400">Select motorcycle for telemetry</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-100"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Vehicle List */}
        <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
          {bikes?.map((bike) => {
            const isSelected = bike.id === activeBikeId || bike.is_default;
            return (
              <button
                key={bike.id}
                type="button"
                onClick={() => handleSelectBike(bike)}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${
                  isSelected
                    ? "border-amber-500/50 bg-amber-500/10 shadow-xs"
                    : "border-slate-800 bg-slate-950/60 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                      isSelected
                        ? "bg-amber-500 text-slate-950 font-bold"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    <BikeIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-100 truncate">
                        {bike.name || `${bike.make} ${bike.model}`}
                      </p>
                      {bike.is_default && (
                        <Star className="size-3 fill-amber-400 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 truncate">
                      {bike.year} {bike.make} {bike.model}
                      {bike.plate_number ? ` · ${bike.plate_number}` : ""}
                    </p>
                    <p className="text-[10px] font-mono text-amber-400/90 mt-0.5">
                      {km(bike.current_odometer)}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-slate-950">
                    <Check className="size-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Add Vehicle Action */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center">
          <AddBikeDialog
            trigger={
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300"
              >
                <Plus className="size-3.5" />
                <span>Add Another Bike</span>
              </button>
            }
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
