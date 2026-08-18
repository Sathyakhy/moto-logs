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
  // 1. Fetch current bike schedules
  const { data: schedules } = await supabase
    .from("service_schedules")
    .select("id, item")
    .eq("bike_id", bikeId);

  // 2. Fetch user's default intervals from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("default_maintenance_schedule")
    .eq("id", userId)
    .single();

  const defaultSchedule = (profile?.default_maintenance_schedule as any[]) || [];

  for (const category of categories) {
    const existing = schedules?.find(s => s.item === category);
    
    if (existing) {
      // Update existing schedule
      await supabase
        .from("service_schedules")
        .update({
          last_service_odometer: odometer,
          last_service_date: date,
        })
        .eq("id", existing.id);
    } else {
      // Find default interval for this category
      const def = defaultSchedule.find(d => d.item === category);
      if (def) {
        // Create new schedule entry automatically
        await supabase
          .from("service_schedules")
          .insert({
            bike_id: bikeId,
            user_id: userId,
            item: category,
            interval_km: Number(def.interval_km || 0),
            interval_days: def.interval_days ? Number(def.interval_days) : null,
            last_service_odometer: odometer,
            last_service_date: date,
          });
      }
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
