import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings2, BellRing, Wrench, Save, Droplets, Zap, Disc, Wind, Settings, CircleCheck, ZapOff } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { DEFAULT_SCHEDULE_ITEMS, type DefaultScheduleItem } from "@/lib/moto";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [appName, setAppName] = useState("MotoLog");
  const [appLogoPath, setAppLogoPath] = useState<string | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [rate, setRate] = useState("4100");
  const [schedule, setSchedule] = useState<DefaultScheduleItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? "");
    setAppName(profile.app_name || "MotoLog");
    setAppLogoPath(profile.app_logo_path || null);
    setCurrency(profile.display_currency);
    setRate(String(profile.khr_per_usd));
    
    // Initialize schedule from profile or fallbacks
    const profileSchedule = (profile?.default_maintenance_schedule as unknown as DefaultScheduleItem[]) || [];
    const mergedSchedule: DefaultScheduleItem[] = DEFAULT_SCHEDULE_ITEMS.map(fallback => {
      const custom = profileSchedule.find(c => c.item === fallback.item);
      return custom ? { ...fallback, ...custom } : fallback;
    });
    setSchedule(mergedSchedule);
  }, [profile]);

  const getMaintenanceIcon = (item: string) => {
    const lower = item.toLowerCase();
    if (lower.includes('oil')) return <Droplets className="size-3.5" />;
    if (lower.includes('battery')) return <Zap className="size-3.5" />;
    if (lower.includes('brake')) return <Disc className="size-3.5" />;
    if (lower.includes('filter')) return <Wind className="size-3.5" />;
    if (lower.includes('belt') || lower.includes('roller')) return <Settings className="size-3.5" />;
    if (lower.includes('inspection')) return <CircleCheck className="size-3.5" />;
    if (lower.includes('spark')) return <ZapOff className="size-3.5" />;
    return <Wrench className="size-3.5" />;
  };

  const updateScheduleItem = (index: number, field: keyof DefaultScheduleItem, value: string | number) => {
    const newSchedule = [...schedule];
    newSchedule[index] = { ...newSchedule[index], [field]: value } as DefaultScheduleItem;
    setSchedule(newSchedule);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Profile not loaded");
      const parsedRate = Number(rate);
      if (!Number.isFinite(parsedRate) || parsedRate <= 0) throw new Error("Enter a valid rate");
      
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: name.trim().slice(0, 80) || null,
          app_name: appName.trim().slice(0, 50) || "MotoLog",
          app_logo_path: appLogoPath,
          display_currency: currency,
          khr_per_usd: parsedRate,
          default_maintenance_schedule: schedule as any,
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}/branding/logo-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('bike-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      setAppLogoPath(filePath);
      toast.success("Logo uploaded. Remember to save all settings.");
    } catch (error: any) {
      toast.error("Error uploading logo: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AppShell title="Settings" subtitle="Configure your profile and maintenance preferences.">
      <div className="max-w-4xl space-y-8 pb-20">

        {/* Branding Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Settings2 className="size-5" />
            <h2 className="text-xl font-display uppercase tracking-tight">App Branding</h2>
          </div>
          <div className="panel space-y-5 p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="appName">App Name (Header)</Label>
                <Input 
                  id="appName" 
                  value={appName} 
                  maxLength={50} 
                  onChange={(e) => setAppName(e.target.value)} 
                  placeholder="e.g. MotoLog"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">App Logo</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={isUploading}
                    className="cursor-pointer"
                  />
                  {isUploading && <span className="text-xs animate-pulse">Uploading...</span>}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Profile Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Settings2 className="size-5" />
            <h2 className="text-xl font-display uppercase tracking-tight">General Profile</h2>
          </div>
          
          <div className="panel space-y-5 p-6">
            <div className="grid gap-6 md:grid-cols-2">
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
            </div>
          </div>
        </section>

        {/* Maintenance Schedule Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <BellRing className="size-5" />
            <h2 className="text-xl font-display uppercase tracking-tight">Default Maintenance Intervals</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure how often you should be alerted for maintenance. These values are used to calculate upcoming maintenance based on your history.
          </p>

          <div className="panel overflow-hidden border-none bg-secondary/30">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/50 uppercase font-display text-[10px] tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3">Maintenance Item</th>
                    <th className="px-6 py-3">Interval (km)</th>
                    <th className="px-6 py-3">Interval (days)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {schedule.map((item, idx) => (
                    <tr key={item.item} className="hover:bg-primary/5 transition-colors">
                      <td className="px-6 py-4 font-medium flex items-center gap-2">
                        <span className="text-primary/70">{getMaintenanceIcon(item.item)}</span>
                        {item.item}
                      </td>
                      <td className="px-6 py-4">
                        <Input
                          type="number"
                          className="w-24 h-8 text-xs num"
                          value={item.interval_km}
                          onChange={(e) => updateScheduleItem(idx, "interval_km", Number(e.target.value))}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <Input
                          type="number"
                          className="w-24 h-8 text-xs num"
                          value={item.interval_days || 0}
                          onChange={(e) => updateScheduleItem(idx, "interval_days", Number(e.target.value))}
                          placeholder="0 = none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="sticky bottom-4 z-10 flex justify-end">
          <Button 
            className="shadow-xl shadow-primary/20 gap-2 h-12 px-8" 
            onClick={() => save.mutate()} 
            disabled={save.isPending}
          >
            {save.isPending ? "Saving..." : <><Save className="size-4" /> Save All Settings</>}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
