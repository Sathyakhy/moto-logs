import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

export function useCreateBike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bike: TablesInsert<"bikes">) => {
      const { data, error } = await supabase.from("bikes").insert(bike).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bikes"] });
    },
  });
}
