import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Currency } from "@/lib/money";

export type Profile = {
  id: string;
  display_name: string | null;
  display_currency: Currency;
  khr_per_usd: number;
  default_maintenance_schedule?: any;
  app_name?: string | null;
  app_logo_path?: string | null;
};

export function useProfile() {
  const query = useQuery({
    queryKey: ["profile"],
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    queryFn: async (): Promise<Profile | null> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, display_currency, khr_per_usd, default_maintenance_schedule, app_name, app_logo_path")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        const inserted = await supabase
          .from("profiles")
          .insert({ id: auth.user.id, display_name: auth.user.email?.split("@")[0] ?? null })
          .select("id, display_name, display_currency, khr_per_usd, default_maintenance_schedule, app_name, app_logo_path")
          .single();
        if (inserted.error) throw inserted.error;
        return normalize(inserted.data);
      }
      return normalize(data);
    },
  });

  const profile = query.data ?? null;
  return {
    ...query,
    profile,
    display: (profile?.display_currency ?? "USD") as Currency,
    rate: profile?.khr_per_usd ?? 4100,
  };
}

function normalize(row: {
  id: string;
  display_name: string | null;
  display_currency: string;
  khr_per_usd: number;
  default_maintenance_schedule?: any;
  app_name?: string | null;
  app_logo_path?: string | null;
}): Profile {
  return {
    id: row.id,
    display_name: row.display_name,
    display_currency: row.display_currency === "KHR" ? "KHR" : "USD",
    khr_per_usd: Number(row.khr_per_usd) || 4100,
    default_maintenance_schedule: row.default_maintenance_schedule,
    app_name: row.app_name,
    app_logo_path: row.app_logo_path,
  };
}
