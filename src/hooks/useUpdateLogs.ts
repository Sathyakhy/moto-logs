import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

/**
 * Updates a bike's schedule based on a maintenance record.
 * When a maintenance item is logged, we reset the last_service_odometer and date.
 */
async function updateScheduleFromMaintenance(
  bikeId: string,
  userId: string,
  categories: string[],
  odometer: number,
  date: string
) {
  // Find schedules matching these categories
  const { data: schedules } = await supabase
    .from("service_schedules")
    .select("id, item")
    .eq("bike_id", bikeId);

  if (!schedules) return;

  const updates = schedules
    .filter(s => categories.includes(s.item))
    .map(s => ({
      id: s.id,
      last_service_odometer: odometer,
      last_service_date: date,
    }));

  if (updates.length > 0) {
    for (const update of updates) {
      await supabase
        .from("service_schedules")
        .update({
          last_service_odometer: update.last_service_odometer,
          last_service_date: update.last_service_date,
        })
        .eq("id", update.id);
    }
  }
}

export function useCreateMaintenanceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (record: TablesInsert<"maintenance_records">) => {
      const { data, error } = await supabase
        .from("maintenance_records")
        .insert(record)
        .select()
        .single();
      if (error) throw error;

      // Update schedule
      if (record.categories && record.categories.length > 0 && record.user_id && record.service_date) {
        await updateScheduleFromMaintenance(
          record.bike_id,
          record.user_id,
          record.categories,
          Number(record.odometer),
          record.service_date
        );
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["maintenance", variables.bike_id] });
      queryClient.invalidateQueries({ queryKey: ["bikes"] });
      queryClient.invalidateQueries({ queryKey: ["service-schedules", variables.bike_id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-history"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-maintenance"] });
    },
  });
}

export function useUpdateMaintenanceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: TablesUpdate<"maintenance_records"> & { id: string }) => {
      const { data, error } = await supabase
        .from("maintenance_records")
        .update(update)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Also update schedule if categories/odometer/date changed
      if (data.categories && data.categories.length > 0) {
        await updateScheduleFromMaintenance(
          data.bike_id,
          data.user_id,
          data.categories,
          Number(data.odometer),
          data.service_date
        );
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["maintenance", data.bike_id] });
      queryClient.invalidateQueries({ queryKey: ["bikes"] });
      queryClient.invalidateQueries({ queryKey: ["service-schedules", data.bike_id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-history"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-maintenance"] });
    },
  });
}

export function useDeleteMaintenanceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, bike_id }: { id: string; bike_id: string }) => {
      const { error } = await supabase
        .from("maintenance_records")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { id, bike_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["maintenance", data.bike_id] });
      queryClient.invalidateQueries({ queryKey: ["bikes"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-maintenance"] });
    },
  });
}

export function useUpdateFuelLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: TablesUpdate<"fuel_logs"> & { id: string }) => {
      const { data, error } = await supabase
        .from("fuel_logs")
        .update(update)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["fuel-logs", data.bike_id] });
      queryClient.invalidateQueries({ queryKey: ["fuel-logs-usage", data.bike_id] });
      queryClient.invalidateQueries({ queryKey: ["bikes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-history"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-maintenance"] });
    },
  });
}

export function useDeleteFuelLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, bike_id }: { id: string; bike_id: string }) => {
      const { error } = await supabase
        .from("fuel_logs")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { id, bike_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["fuel-logs", data.bike_id] });
      queryClient.invalidateQueries({ queryKey: ["bikes"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-maintenance"] });
    },
  });
}
