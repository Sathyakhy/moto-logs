import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { SERVICE_CATEGORIES } from "@/lib/moto";
import { useCreateMaintenanceRecord } from "@/hooks/useMaintenance";
import { useUpdateMaintenanceRecord, useDeleteMaintenanceRecord } from "@/hooks/useUpdateLogs";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";

const formSchema = z.object({
  bike_id: z.string().uuid(),
  title: z.string().min(2, "Title is required"),
  category: z.string().min(1, "Category is required"),
  service_date: z.date(),
  odometer: z.coerce.number().min(0, "Odometer must be positive"),
  total_cost: z.coerce.number().min(0, "Cost must be positive"),
  notes: z.string().optional(),
  workshop: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function LogMaintenanceDialog({ 
  bikeId, 
  currentOdometer, 
  trigger,
  editRecord
}: { 
  bikeId: string, 
  currentOdometer?: number,
  trigger?: React.ReactNode,
  editRecord?: Tables<"maintenance_records">
}) {
  const [open, setOpen] = useState(false);
  const mutation = useCreateMaintenanceRecord();
  const updateMutation = useUpdateMaintenanceRecord();
  const deleteMutation = useDeleteMaintenanceRecord();
  const { profile } = useProfile();

  const isEditing = !!editRecord;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bike_id: bikeId,
      title: editRecord?.notes?.split('\n')[0] || "",
      category: editRecord?.categories?.[0] || "",
      service_date: editRecord ? new Date(editRecord.service_date) : new Date(),
      odometer: editRecord?.odometer || currentOdometer || 0,
      total_cost: Number(editRecord?.total_cost || 0),
      notes: editRecord?.notes || "",
      workshop: editRecord?.workshop || "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!profile?.id) {
      toast.error("You must be logged in to log maintenance");
      return;
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: editRecord.id,
          service_date: values.service_date.toISOString(),
          odometer: values.odometer,
          total_cost: values.total_cost,
          notes: values.notes || null,
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
          notes: values.notes || null,
          workshop: values.workshop || null,
          categories: [values.category],
        });
        toast.success("Maintenance log added successfully");
      }
      setOpen(false);
      if (!isEditing) form.reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to save maintenance log");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="size-4" />
            Log Maintenance
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <DialogTitle>{isEditing ? "Edit Maintenance" : "Log Maintenance"}</DialogTitle>
          {isEditing && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive">
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete maintenance log?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove this record from your bike's history.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-destructive text-destructive-foreground"
                    onClick={async () => {
                      await deleteMutation.mutateAsync({ id: editRecord.id, bike_id: bikeId });
                      toast.success("Record deleted");
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Regular Service" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SERVICE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="service_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
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
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="total_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Cost ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
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
                    <FormLabel>Workshop (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Honda Service" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Details about the service..." 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={mutation.isPending || updateMutation.isPending}>
              {isEditing 
                ? (updateMutation.isPending ? "Updating..." : "Update Record")
                : (mutation.isPending ? "Adding..." : "Add Record")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
