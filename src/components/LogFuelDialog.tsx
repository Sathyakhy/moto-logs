import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Fuel, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { useDeleteFuelLog } from "@/hooks/useUpdateLogs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";

const FUEL_GRADES = ["Regular 92", "Super 95", "Euro 5 Diesel"];

const formSchema = z.object({
  bike_id: z.string().uuid(),
  fill_date: z.date(),
  odometer: z.coerce.number().min(0, "Odometer must be positive"),
  liters: z.coerce.number().min(0.01, "Liters must be positive"),
  total_amount: z.coerce.number().min(0.01, "Total amount must be positive"),
  fuel_type: z.string().optional(),
  gas_station: z.string().optional(),
  is_full_tank: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export function LogFuelDialog({
  bikeId,
  currentOdometer,
  trigger,
  editLog,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  bikeId: string;
  currentOdometer?: number;
  trigger?: React.ReactNode;
  editLog?: Tables<"fuel_logs">;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(val);
    } else {
      setInternalOpen(val);
    }
  };
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const deleteMutation = useDeleteFuelLog();

  const isEditing = !!editLog;
  const khrRate = profile?.khr_per_usd || 4100;

  // Auto-fill odometer: current odometer + 1 km to prevent lower mileage errors
  const defaultOdo = editLog
    ? editLog.odometer
    : currentOdometer !== undefined
      ? currentOdometer + 1
      : 0;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bike_id: bikeId,
      fill_date: editLog ? new Date(editLog.fill_date) : new Date(),
      odometer: defaultOdo,
      liters: Number(editLog?.liters || 0),
      total_amount: Number(editLog?.amount || 0),
      fuel_type: editLog?.fuel_type || FUEL_GRADES[1],
      gas_station: editLog?.gas_station || "",
      is_full_tank: true,
    },
  });

  const liters = form.watch("liters");
  const totalAmount = form.watch("total_amount");
  const selectedGrade = form.watch("fuel_type");
  const isFullTank = form.watch("is_full_tank");

  const pricePerLiter = liters > 0 ? (totalAmount / liters).toFixed(3) : "0.000";
  const totalKHR = Math.round(totalAmount * khrRate);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!profile?.id) throw new Error("Not logged in");

      const pricePerLiterNum = values.liters > 0 ? values.total_amount / values.liters : 0;

      if (isEditing) {
        const { error } = await supabase
          .from("fuel_logs")
          .update({
            fill_date: values.fill_date.toISOString(),
            odometer: values.odometer,
            liters: values.liters,
            amount: values.total_amount,
            fuel_type: values.fuel_type || null,
            gas_station: values.gas_station || null,
            price_per_liter: pricePerLiterNum,
          })
          .eq("id", editLog.id);
        if (error) throw error;
      } else {
        const { error: logError } = await supabase.from("fuel_logs").insert({
          bike_id: values.bike_id,
          user_id: profile.id,
          fill_date: values.fill_date.toISOString(),
          odometer: values.odometer,
          liters: values.liters,
          amount: values.total_amount,
          fuel_type: values.fuel_type || null,
          gas_station: values.gas_station || null,
          price_per_liter: pricePerLiterNum,
        });
        if (logError) throw logError;
      }

      if (currentOdometer !== undefined && values.odometer > currentOdometer) {
        await supabase
          .from("bikes")
          .update({ current_odometer: values.odometer })
          .eq("id", values.bike_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-logs", bikeId] });
      queryClient.invalidateQueries({ queryKey: ["bikes"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-logs-usage", bikeId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-history"] });
      toast.success(isEditing ? "Fuel log updated" : "Fuel log recorded successfully");
      setOpen(false);
      form.reset();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to log fuel");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button className="h-10 gap-2 font-mono text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400">
            <Fuel className="size-4" />
            <span>Add Fuel</span>
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800">
          <DialogTitle className="flex items-center gap-2 font-mono text-base font-bold text-slate-100">
            <Fuel className="size-5 text-amber-500" />
            {isEditing ? "Edit Fuel Log" : "Add Fuel Fill-Up"}
          </DialogTitle>
          {isEditing && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 text-destructive hover:bg-destructive/10">
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete fuel entry?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    This fuel log entry will be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-200">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground font-bold"
                    onClick={() => {
                      deleteMutation.mutate(editLog.id);
                      setOpen(false);
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4 pt-2">
            {/* Fuel Grade Quick Chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300">Fuel Grade</label>
              <div className="flex gap-2">
                {FUEL_GRADES.map((grade) => (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => form.setValue("fuel_type", grade)}
                    className={`flex-1 rounded-xl py-2 px-2 text-xs font-mono font-semibold transition-all border ${
                      selectedGrade === grade
                        ? "border-amber-500 bg-amber-500/20 text-amber-400 shadow-xs"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Auto-filled Odometer */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="fill_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs font-mono text-slate-300">Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "h-10 text-xs font-mono bg-slate-950 border-slate-800 text-slate-200 justify-start px-3",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 size-3.5 opacity-50" />
                            {field.value ? format(field.value, "MMM d, yyyy") : "Pick date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="odometer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono text-slate-300">
                      Odometer (km)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="h-10 bg-slate-950 border-slate-800 font-mono text-xs font-bold text-amber-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Volume & Cost Calculator */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="liters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono text-slate-300">Volume (Liters)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="h-10 bg-slate-950 border-slate-800 font-mono text-xs font-bold text-slate-100"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono text-slate-300">Total Price ($ USD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="h-10 bg-slate-950 border-slate-800 font-mono text-xs font-bold text-amber-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Real-Time Price & Dual-Currency Telemetry */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 flex justify-between items-center text-xs font-mono">
              <div>
                <span className="text-slate-400">Unit Price:</span>{" "}
                <span className="font-bold text-cyan-400">${pricePerLiter}/L</span>
              </div>
              <div>
                <span className="text-slate-400">Riel (KHR):</span>{" "}
                <span className="font-bold text-amber-400">៛{totalKHR.toLocaleString()}</span>
              </div>
            </div>

            {/* Gas Station & Full Tank Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <FormField
                control={form.control}
                name="gas_station"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono text-slate-300">Gas Station</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="TotalEnergies, Caltex, PTT"
                        className="h-9 bg-slate-950 border-slate-800 text-xs font-mono text-slate-200"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="full_tank"
                  checked={isFullTank}
                  onChange={(e) => form.setValue("is_full_tank", e.target.checked)}
                  className="size-4 accent-amber-500 rounded bg-slate-950 border-slate-800"
                />
                <label htmlFor="full_tank" className="text-xs font-mono text-slate-300 cursor-pointer">
                  Full Tank (calculates km/L)
                </label>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-xs font-mono font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Recording..." : isEditing ? "Update Fuel Log" : "⛽ Save Fuel Entry"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
