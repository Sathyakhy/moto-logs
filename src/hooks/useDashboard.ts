import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { calculateDailyUsage, computeSchedule, ScheduleComputed } from "@/lib/moto";

export type TimeFilter = "all" | "year" | "month" | "week";

export function useStats(userId: string | undefined, filter: TimeFilter = "all") {
  return useQuery({
    queryKey: ["dashboard-stats", userId, filter],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!userId) return null;

      let maintenanceQuery = supabase
        .from("maintenance_records")
        .select("total_cost, currency, service_date")
        .eq("user_id", userId);
      let fuelQuery = supabase
        .from("fuel_logs")
        .select("amount, currency, fill_date, liters, odometer, bike_id")
        .eq("user_id", userId)
        .order("fill_date", { ascending: true });
      let expensesQuery = supabase
        .from("expenses")
        .select("amount, currency, expense_date")
        .eq("user_id", userId);

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

export function useUpcomingMaintenance(userId: string | undefined) {
  return useQuery({
    queryKey: ["upcoming-maintenance", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];

      // Fetch bikes
      const { data: bikes } = await supabase.from("bikes").select("*").eq("user_id", userId);

      if (!bikes || bikes.length === 0) return [];

      // Fetch fuel logs for usage calculation
      const { data: fuelLogs } = await supabase
        .from("fuel_logs")
        .select("bike_id, fill_date, odometer")
        .eq("user_id", userId)
        .order("fill_date", { ascending: false });

      // Fetch schedules
      const { data: schedules } = await supabase
        .from("service_schedules")
        .select("*")
        .in(
          "bike_id",
          bikes.map((b) => b.id),
        );

      const upcomingItems: (ScheduleComputed & {
        bikeName: string;
        bikeId: string;
        item: string;
      })[] = [];

      bikes.forEach((bike) => {
        const bikeFuel = fuelLogs?.filter((l) => l.bike_id === bike.id) || [];
        const dailyUsage = calculateDailyUsage(bikeFuel);
        const bikeSchedules = schedules?.filter((s) => s.bike_id === bike.id) || [];

        bikeSchedules.forEach((schedule) => {
          const computed = computeSchedule(schedule as any, bike.current_odometer || 0, dailyUsage);
          // Only show items that are not yet overdue but coming up, or already overdue
          upcomingItems.push({
            ...computed,
            bikeName: bike.name,
            bikeId: bike.id,
            item: schedule.item,
          });
        });
      });

      // Sort by estimated date
      return upcomingItems
        .sort((a, b) => {
          if (!a.estimatedDate) return 1;
          if (!b.estimatedDate) return -1;
          return new Date(a.estimatedDate).getTime() - new Date(b.estimatedDate).getTime();
        })
        .filter((item) => item.status !== "good")
        .slice(0, 5);
    },
  });
}

export function useDashboardHistory(userId: string | undefined, filter: TimeFilter = "all") {
  return useQuery({
    queryKey: ["dashboard-history", userId, filter],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!userId) return null;

      let maintenanceQuery = supabase
        .from("maintenance_records")
        .select("id, service_date, total_cost, notes, categories, odometer, bikes(name)")
        .eq("user_id", userId)
        .order("service_date", { ascending: false });

      let fuelQuery = supabase
        .from("fuel_logs")
        .select("id, fill_date, amount, gas_station, liters, odometer, bikes(name)")
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

      return {
        maintenance: (maint.data || []).map((m) => ({
          ...m,
          type: "maintenance" as const,
          date: m.service_date,
        })),
        fuel: (fuel.data || []).map((f) => ({ ...f, type: "fuel" as const, date: f.fill_date })),
      };
    },
  });
}
