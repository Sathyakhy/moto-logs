import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export function useMaintenanceRecords(bikeId: string) {
  return useQuery({
    queryKey: ["maintenance", bikeId],
    queryFn: async (): Promise<Tables<"maintenance_records">[]> => {
      const { data, error } = await supabase
        .from("maintenance_records")
        .select("*")
        .eq("bike_id", bikeId)
        .order("service_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export { useCreateMaintenanceRecord } from "./useUpdateLogs";

export function useFuelLogs(bikeId: string) {
  return useQuery({
    queryKey: ["fuel-logs", bikeId],
    queryFn: async (): Promise<Tables<"fuel_logs">[]> => {
      const { data, error } = await supabase
        .from("fuel_logs")
        .select("*")
        .eq("bike_id", bikeId)
        .order("fill_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useServiceSchedules(bikeId: string) {
  return useQuery({
    queryKey: ["service-schedules", bikeId],
    queryFn: async (): Promise<Tables<"service_schedules">[]> => {
      const { data, error } = await supabase
        .from("service_schedules")
        .select("*")
        .eq("bike_id", bikeId)
        .order("interval_km", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
