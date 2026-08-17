import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Fuel, Plus } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { FUEL_TYPES } from "@/lib/moto";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  bike_id: z.string().uuid(),
  fill_date: z.date(),
  odometer: z.coerce.number().min(0, "Odometer must be positive"),
  liters: z.coerce.number().min(0.01, "Liters must be positive"),
  total_amount: z.coerce.number().min(0.01, "Total amount must be positive"),
  fuel_type: z.string().optional(),
  gas_station: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function LogFuelDialog({ 
  bikeId, 
  currentOdometer, 
  trigger 
}: { 
  bikeId: string, 
  currentOdometer?: number,
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { profile } = useProfile();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bike_id: bikeId,
      fill_date: new Date(),
      odometer: currentOdometer || 0,
      liters: 0,
      total_amount: 0,
      fuel_type: FUEL_TYPES[0],
      gas_station: "",
    },
  });

  const liters = form.watch("liters");
  const totalAmount = form.watch("total_amount");
  const pricePerLiter = liters > 0 ? (totalAmount / liters).toFixed(3) : "0.000";

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!profile?.id) throw new Error("Not logged in");

      const pricePerLiterNum = values.liters > 0 ? values.total_amount / values.liters : 0;

      // 1. Insert fuel log
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

      // 2. Update bike odometer if the new one is higher
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
      toast.success("Fuel log added");
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add fuel log");
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="icon" className="size-8">
            <Fuel className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Fuel</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fill_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal h-10",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "MMM d, yyyy")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
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
                    <FormLabel>Odometer (km)</FormLabel>
                    <FormControl>
                      <Input type="number" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="liters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Liters</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" className="h-10" {...field} />
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
                    <FormLabel>Total Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-lg bg-secondary/30 p-3 flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Price per Liter:</span>
              <span className="font-mono font-bold text-primary">${pricePerLiter}</span>
            </div>

            <FormField
              control={form.control}
              name="gas_station"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gas Station</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. PTT, Total, Caltex" className="h-10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20" disabled={mutation.isPending}>
              {mutation.isPending ? "Logging..." : "Log Fuel Fill"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}