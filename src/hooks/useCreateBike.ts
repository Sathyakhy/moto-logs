import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

import { DEFAULT_SCHEDULE_ITEMS, type DefaultScheduleItem } from "@/lib/moto";

export function useCreateBike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bike: TablesInsert<"bikes">) => {
      // 1. Create the bike
      const { data: newBike, error: bikeError } = await supabase
        .from("bikes")
        .insert(bike)
        .select()
        .single();
      if (bikeError) throw bikeError;

      // 2. Get user's default schedule from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("default_maintenance_schedule")
        .eq("id", bike.user_id)
        .single();

      const customDefaults = (profile?.default_maintenance_schedule as unknown as DefaultScheduleItem[]) || [];
      
      // Merge custom defaults with fallback hardcoded defaults
      // We use the custom one if it exists for a specific item name
      const scheduleToUse = DEFAULT_SCHEDULE_ITEMS.map(fallback => {
        const custom = customDefaults.find(c => c.item === fallback.item);
        return custom || fallback;
      });

      // Also add any custom items that aren't in the default list
      customDefaults.forEach(custom => {
        if (!DEFAULT_SCHEDULE_ITEMS.find(d => d.item === custom.item)) {
          scheduleToUse.push(custom);
        }
      });

      // 3. Initialize service schedules for the new bike
      if (scheduleToUse.length > 0) {
        const schedules = scheduleToUse.map(item => ({
          bike_id: newBike.id,
          user_id: bike.user_id,
          item: item.item,
          interval_km: item.interval_km,
          interval_days: item.interval_days || null,
          last_service_odometer: bike.current_odometer || 0,
          last_service_date: bike.purchase_date || new Date().toISOString().split("T")[0] || null,
        }));

        const { error: scheduleError } = await supabase
          .from("service_schedules")
          .insert(schedules);
        
        if (scheduleError) {
          console.error("Failed to initialize schedules:", scheduleError);
          // We don't throw here to avoid failing the whole bike creation 
          // if just the schedules fail, but ideally they should work.
        }
      }

      return newBike;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bikes"] });
    },
  });
}
