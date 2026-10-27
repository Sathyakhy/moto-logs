import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CalendarIcon,
  Wrench,
  Trash2,
  Droplets,
  Settings,
  Disc,
  Wind,
  Zap,
  RotateCw,
  Gauge,
  Sparkles,
  CircleCheck,
} from "lucide-react";
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
import { useCreateMaintenanceRecord } from "@/hooks/useMaintenance";
import { useUpdateMaintenanceRecord, useDeleteMaintenanceRecord } from "@/hooks/useUpdateLogs";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";

export const CATEGORIES_12 = [
  { name: "Engine Oil", icon: Droplets },
  { name: "Gear Oil", icon: Settings },
  { name: "CVT Drive Belt", icon: RotateCw },
  { name: "Roller Weights", icon: RotateCw },
  { name: "Brake Pads", icon: Disc },
  { name: "Air Filter", icon: Wind },
  { name: "Spark Plug", icon: Zap },
  { name: "Battery", icon: Zap },
  { name: "Tires", icon: Gauge },
  { name: "Coolant", icon: Droplets },
  { name: "Fork Oil", icon: Droplets },
  { name: "Inspection", icon: CircleCheck },
];

const formSchema = z.object({
  bike_id: z.string().uuid(),
  title: z.string().min(2, "Title is required"),
  category: z.string().min(1, "Category is required"),
  brand_model: z.string().optional(),
  service_date: z.date(),
  odometer: z.coerce.number().min(0, "Odometer must be positive"),
  parts_cost: z.coerce.number().min(0).default(0),
  labor_cost: z.coerce.number().min(0).default(0),
  total_cost: z.coerce.number().min(0, "Cost must be positive"),
  notes: z.string().optional(),
  workshop: z.string().optional(),
  schedule_next: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export function LogMaintenanceDialog({
  bikeId,
  currentOdometer,
  trigger,
  editRecord,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  bikeId: string;
  currentOdometer?: number;
  trigger?: React.ReactNode;
  editRecord?: Tables<"maintenance_records">;
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
  const mutation = useCreateMaintenanceRecord();
  const updateMutation = useUpdateMaintenanceRecord();
  const deleteMutation = useDeleteMaintenanceRecord();
  const { profile } = useProfile();

  const isEditing = !!editRecord;
  const khrRate = profile?.khr_per_usd || 4100;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bike_id: bikeId,
      title: editRecord?.notes?.split("\n")[0] || "",
      category: editRecord?.categories?.[0] || CATEGORIES_12[0].name,
      brand_model: editRecord?.notes?.includes("Brand/Model: ")
        ? editRecord.notes.split("Brand/Model: ")[1]?.split("\n")[0] || ""
        : "",
      service_date: editRecord ? new Date(editRecord.service_date) : new Date(),
      odometer: editRecord?.odometer || currentOdometer || 0,
      parts_cost: Number(editRecord?.total_cost || 0),
      labor_cost: 0,
      total_cost: Number(editRecord?.total_cost || 0),
      notes: editRecord?.notes || "",
      workshop: editRecord?.workshop || "",
      schedule_next: true,
    },
  });

  const selectedCategory = form.watch("category");
  const partsCost = form.watch("parts_cost") || 0;
  const laborCost = form.watch("labor_cost") || 0;

  // Auto-calculate total cost when parts or labor cost changes
  useEffect(() => {
    const sum = Number(partsCost) + Number(laborCost);
    form.setValue("total_cost", sum, { shouldValidate: true });
  }, [partsCost, laborCost, form]);

  const totalCost = form.watch("total_cost");
  const totalKHR = Math.round((totalCost || 0) * khrRate);

  async function onSubmit(values: FormValues) {
    if (!profile?.id) {
      toast.error("You must be logged in to log maintenance");
      return;
    }

    const fullNotes = [
      values.title,
      values.brand_model ? `Brand/Specs: ${values.brand_model}` : null,
      values.parts_cost ? `Parts: $${values.parts_cost}` : null,
      values.labor_cost ? `Labor: $${values.labor_cost}` : null,
      values.notes || null,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: editRecord.id,
          service_date: values.service_date.toISOString(),
          odometer: values.odometer,
          total_cost: values.total_cost,
          notes: fullNotes,
          workshop: values.workshop || null,
          categories: [values.category],
        });
        toast.success("Maintenance log updated successfully");
      } else {
        await mutation.mutateAsync({
          bike_id: values.bike_id,
          user_id: profile.id,
          service_date: values.service_date.toISOString(),
          odometer: values.odometer,
          total_cost: values.total_cost,
          notes: fullNotes,
          workshop: values.workshop || null,
          categories: [values.category],
        });
        toast.success("Service recorded in garage history");
      }
      setOpen(false);
      form.reset();
    } catch (err: any) {
      toast.error(err.message || "Failed to save maintenance record");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button className="h-10 gap-2 font-mono text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400">
            <Wrench className="size-4" />
            <span>Log Service</span>
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-slate-100 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800">
          <DialogTitle className="flex items-center gap-2 font-mono text-base font-bold text-slate-100">
            <Wrench className="size-5 text-amber-500" />
            {isEditing ? "Edit Maintenance Record" : "Add Service & Maintenance"}
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
                  <AlertDialogTitle>Delete record?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    This maintenance entry will be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-200">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground font-bold"
                    onClick={async () => {
                      await deleteMutation.mutateAsync({ id: editRecord.id, bikeId });
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* Category Selector (12 Categories Grid) */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300">Service Category</label>
              <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 rounded-xl bg-slate-950 border border-slate-800">
                {CATEGORIES_12.map(({ name, icon: Icon }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      form.setValue("category", name);
                      if (!form.getValues("title")) form.setValue("title", `${name} Service`);
                    }}
                    className={`flex items-center gap-1.5 rounded-lg p-2 text-left text-[11px] font-mono transition-all border ${
                      selectedCategory === name
                        ? "border-amber-500 bg-amber-500/20 text-amber-400 font-bold shadow-xs"
                        : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    }`}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="truncate">{name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title / Description */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-mono text-slate-300">Service Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Motul 7100 10W-40 Oil Change"
                      className="h-10 bg-slate-950 border-slate-800 text-xs font-mono text-slate-100"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date & Odometer */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="service_date"
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

            {/* Split Cost Accounting: Parts Cost vs Labor Cost */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-bold">Split Cost Accounting</span>
                <span className="text-amber-400 font-bold">
                  Total: ${Number(totalCost).toFixed(2)} (៛{totalKHR.toLocaleString()})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <FormField
                  control={form.control}
                  name="parts_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-mono text-cyan-400">Parts Cost ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="h-9 bg-slate-900 border-slate-800 font-mono text-xs text-slate-100"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="labor_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-mono text-emerald-400">Labor Cost ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="h-9 bg-slate-900 border-slate-800 font-mono text-xs text-slate-100"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Product Details & Workshop */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="brand_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono text-slate-300">Brand / Specs</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Motul 7100 10W40"
                        className="h-9 bg-slate-950 border-slate-800 text-xs font-mono text-slate-200"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="workshop"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono text-slate-300">Workshop / Mechanic</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Honda Official Care"
                        className="h-9 bg-slate-950 border-slate-800 text-xs font-mono text-slate-200"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-xs font-mono font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20"
              disabled={mutation.isPending || updateMutation.isPending}
            >
              {mutation.isPending || updateMutation.isPending
                ? "Saving..."
                : isEditing
                  ? "Update Service Record"
                  : "🟡 Record Maintenance"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
