import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export function useStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard-stats", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;

      const [maintenance, fuel, expenses] = await Promise.all([
        supabase.from("maintenance_records").select("total_cost, currency").eq("user_id", userId),
        supabase.from("fuel_logs").select("amount, currency").eq("user_id", userId),
        supabase.from("expenses").select("amount, currency").eq("user_id", userId),
      ]);

      return {
        maintenance: maintenance.data ?? [],
        fuel: fuel.data ?? [],
        expenses: expenses.data ?? [],
      };
    },
  });
}

export function useUpcomingReminders(userId: string | undefined) {
  return useQuery({
    queryKey: ["upcoming-reminders", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("reminders")
        .select("*, bikes(name)")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("due_date", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });
}
