import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { computeSchedule, ScheduleStatus } from "@/lib/moto";

export type Bike = Tables<"bikes">;

export interface BikeWithStatus extends Bike {
  status: ScheduleStatus;
  dueItemsCount: number;
  lastServiceDate?: string | null | undefined;
}

export function useBikes() {
  return useQuery({
    queryKey: ["bikes"],
    queryFn: async (): Promise<BikeWithStatus[]> => {
      const { data: bikes, error } = await supabase
        .from("bikes")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!bikes) return [];

      // Fetch all service schedules for these bikes
      const { data: schedules } = await supabase
        .from("service_schedules")
        .select("*")
        .in("bike_id", bikes.map(b => b.id));

      // Fetch latest maintenance records for these bikes
      const { data: records } = await supabase
        .from("maintenance_records")
        .select("bike_id, service_date")
        .in("bike_id", bikes.map(b => b.id))
        .order("service_date", { ascending: false });

      return bikes.map(bike => {
        const bikeSchedules = schedules?.filter(s => s.bike_id === bike.id) || [];
        const computed = bikeSchedules.map(s => computeSchedule(s as any, bike.current_odometer || 0));
        
        let status: ScheduleStatus = "good";
        if (computed.some(c => c.status === "overdue")) status = "overdue";
        else if (computed.some(c => c.status === "due-soon")) status = "due-soon";

        const dueItemsCount = computed.filter(c => c.status !== "good").length;
        const lastServiceDate = records?.find(r => r.bike_id === bike.id)?.service_date;

        return { ...bike, status, dueItemsCount, lastServiceDate };
      });
    },
  });
}

export function useBike(bikeId: string) {
  return useQuery({
    queryKey: ["bike", bikeId],
    queryFn: async (): Promise<BikeWithStatus | null> => {
      const { data: bike, error } = await supabase.from("bikes").select("*").eq("id", bikeId).maybeSingle();
      if (error) throw error;
      if (!bike) return null;

      const [{ data: schedules }, { data: records }] = await Promise.all([
        supabase
          .from("service_schedules")
          .select("*")
          .eq("bike_id", bike.id),
        supabase
          .from("maintenance_records")
          .select("service_date")
          .eq("bike_id", bike.id)
          .order("service_date", { ascending: false })
          .limit(1)
      ]);

      const computed = schedules?.map(s => computeSchedule(s as any, bike.current_odometer || 0)) || [];
      
      let status: ScheduleStatus = "good";
      if (computed.some(c => c.status === "overdue")) status = "overdue";
      else if (computed.some(c => c.status === "due-soon")) status = "due-soon";

      const dueItemsCount = computed.filter(c => c.status !== "good").length;
      const lastServiceDate = records?.[0]?.service_date;

      return { ...bike, status, dueItemsCount, lastServiceDate };
    },
  });
}

export async function signedUrl(path: string | null | undefined) {
  if (!path) return null;
  const { data } = await supabase.storage.from("bike-files").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export function useSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["signed-url", path],
    enabled: Boolean(path),
    staleTime: 30 * 60 * 1000,
    queryFn: () => signedUrl(path),
  });
}

export async function uploadFile(userId: string, file: File, folder: string) {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("bike-files").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}
