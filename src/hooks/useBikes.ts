import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Bike = Tables<"bikes">;

export function useBikes() {
  return useQuery({
    queryKey: ["bikes"],
    queryFn: async (): Promise<Bike[]> => {
      const { data, error } = await supabase
        .from("bikes")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBike(bikeId: string) {
  return useQuery({
    queryKey: ["bike", bikeId],
    queryFn: async (): Promise<Bike | null> => {
      const { data, error } = await supabase.from("bikes").select("*").eq("id", bikeId).maybeSingle();
      if (error) throw error;
      return data;
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
