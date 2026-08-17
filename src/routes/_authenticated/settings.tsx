import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [rate, setRate] = useState("4100");

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? "");
    setCurrency(profile.display_currency);
    setRate(String(profile.khr_per_usd));
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Profile not loaded");
      const parsedRate = Number(rate);
      if (!Number.isFinite(parsedRate) || parsedRate <= 0) throw new Error("Enter a valid rate");
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: name.trim().slice(0, 80) || null,
          display_currency: currency,
          khr_per_usd: parsedRate,
        })
        .eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell title="Settings" subtitle="Display name and how money is shown across the app.">
      <div className="panel max-w-lg space-y-5 p-6">
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Show all amounts in</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">US dollar ($)</SelectItem>
              <SelectItem value="KHR">Cambodian riel (៛)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            You can still enter each cost in whichever currency you paid; totals convert to this one.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rate">Riel per US dollar</Label>
          <Input
            id="rate"
            className="num"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>

        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          Save settings
        </Button>
      </div>
    </AppShell>
  );
}
