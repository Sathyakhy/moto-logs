import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, startOfMonth, startOfYear } from "date-fns";

export type TimeFilter = "all" | "year" | "month" | "week";

export function useStats(userId: string | undefined, filter: TimeFilter = "all") {
  return useQuery({
    queryKey: ["dashboard-stats", userId, filter],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;

      let maintenanceQuery = supabase.from("maintenance_records").select("total_cost, currency, service_date").eq("user_id", userId);
      let fuelQuery = supabase.from("fuel_logs").select("amount, currency, fill_date").eq("user_id", userId);
      let expensesQuery = supabase.from("expenses").select("amount, currency, expense_date").eq("user_id", userId);

      if (filter !== "all") {
        const now = new Date();
        let startDate: Date;
        if (filter === "week") startDate = startOfWeek(now);
        else if (filter === "month") startDate = startOfMonth(now);
        else startDate = startOfYear(now);

        const startDateISO = startDate.toISOString();
        
        maintenanceQuery = maintenanceQuery.gte("service_date", startDateISO);
        fuelQuery = fuelQuery.gte("fill_date", startDateISO);
        expensesQuery = expensesQuery.gte("expense_date", startDateISO);
      }

      const [maintenance, fuel, expenses] = await Promise.all([
        maintenanceQuery,
        fuelQuery,
        expensesQuery,
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

export function useDashboardHistory(userId: string | undefined, filter: TimeFilter = "all") {
  return useQuery({
    queryKey: ["dashboard-history", userId, filter],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;

      let maintenanceQuery = supabase
        .from("maintenance_records")
        .select("id, service_date, total_cost, notes, categories, bikes(name)")
        .eq("user_id", userId)
        .order("service_date", { ascending: false });

      let fuelQuery = supabase
        .from("fuel_logs")
        .select("id, fill_date, amount, gas_station, liters, bikes(name)")
        .eq("user_id", userId)
        .order("fill_date", { ascending: false });

      if (filter !== "all") {
        const now = new Date();
        let startDate: Date;
        if (filter === "week") startDate = startOfWeek(now);
        else if (filter === "month") startDate = startOfMonth(now);
        else startDate = startOfYear(now);

        maintenanceQuery = maintenanceQuery.gte("service_date", startDate.toISOString());
        fuelQuery = fuelQuery.gte("fill_date", startDate.toISOString());
      }

      const [maint, fuel] = await Promise.all([maintenanceQuery, fuelQuery]);

      const history = [
        ...(maint.data || []).map(m => ({ ...m, type: 'maintenance' as const, date: m.service_date })),
        ...(fuel.data || []).map(f => ({ ...f, type: 'fuel' as const, date: f.fill_date }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return history.slice(0, 10);
    }
  });
}
