import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

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
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["maintenance", data.bike_id] });
      queryClient.invalidateQueries({ queryKey: ["bikes"] });
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
      queryClient.invalidateQueries({ queryKey: ["bikes"] });
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
    },
  });
}
