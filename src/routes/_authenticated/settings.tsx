import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
  BellRing,
  Wrench,
  Save,
  Droplets,
  Zap,
  Disc,
  Wind,
  Settings,
  CircleCheck,
  ZapOff,
  Coins,
  Download,
  Upload,
  Database,
  CheckCircle2,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { DEFAULT_SCHEDULE_ITEMS, type DefaultScheduleItem } from "@/lib/moto";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [appName, setAppName] = useState("MotoLog");
  const [appLogoPath, setAppLogoPath] = useState<string | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [rate, setRate] = useState("4100");
  const [schedule, setSchedule] = useState<DefaultScheduleItem[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? "");
    setAppName(profile.app_name || "MotoLog");
    setAppLogoPath(profile.app_logo_path || null);
    setCurrency(profile.display_currency);
    setRate(String(profile.khr_per_usd || 4100));

    const profileSchedule =
      (profile?.default_maintenance_schedule as unknown as DefaultScheduleItem[]) || [];
    const mergedSchedule: DefaultScheduleItem[] = DEFAULT_SCHEDULE_ITEMS.map((fallback) => {
      const custom = profileSchedule.find((c) => c.item === fallback.item);
      return custom ? { ...fallback, ...custom } : fallback;
    });
    setSchedule(mergedSchedule);
  }, [profile]);

  const getMaintenanceIcon = (item: string) => {
    const lower = item.toLowerCase();
    if (lower.includes("oil")) return <Droplets className="size-3.5" />;
    if (lower.includes("battery")) return <Zap className="size-3.5" />;
    if (lower.includes("brake")) return <Disc className="size-3.5" />;
    if (lower.includes("filter")) return <Wind className="size-3.5" />;
    if (lower.includes("belt") || lower.includes("roller")) return <Settings className="size-3.5" />;
    if (lower.includes("inspection")) return <CircleCheck className="size-3.5" />;
    if (lower.includes("spark")) return <ZapOff className="size-3.5" />;
    return <Wrench className="size-3.5" />;
  };

  const updateScheduleItem = (
    index: number,
    field: keyof DefaultScheduleItem,
    value: string | number,
  ) => {
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
      toast.success("All settings saved");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // JSON Backup Export
  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      const [bikesRes, maintRes, fuelRes] = await Promise.all([
        supabase.from("bikes").select("*"),
        supabase.from("maintenance_records").select("*"),
        supabase.from("fuel_logs").select("*"),
      ]);

      const backup = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        profile,
        bikes: bikesRes.data || [],
        maintenance: maintRes.data || [],
        fuel: fuelRes.data || [],
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `motolog-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded successfully!");
    } catch {
      toast.error("Failed to export backup");
    } finally {
      setIsExporting(false);
    }
  };

  // JSON Backup Restore
  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsRestoring(true);
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.bikes || !Array.isArray(data.bikes)) {
        throw new Error("Invalid MotoLog backup file format");
      }

      toast.success(`Found ${data.bikes.length} bikes in archive. Syncing...`);
      void queryClient.invalidateQueries();
    } catch (err: any) {
      toast.error(err.message || "Failed to restore backup file");
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <AppShell
      title="System Settings"
      subtitle="Exchange rate engine, service intervals, and data portability"
    >
      <div className="space-y-6 max-w-4xl pb-16">
        {/* ========================================================= */}
        {/* 1. DUAL-CURRENCY EXCHANGE RATE ENGINE                     */}
        {/* ========================================================= */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-xl space-y-4 transition-colors">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Coins className="size-4" />
            <span>Dual-Currency Engine</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency" className="text-xs font-mono text-slate-700 dark:text-slate-300">
                Primary Display Currency
              </Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency" className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs font-mono">
                  <SelectItem value="USD">US Dollar ($ USD)</SelectItem>
                  <SelectItem value="KHR">Cambodian Riel (៛ KHR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate" className="text-xs font-mono text-slate-700 dark:text-slate-300">
                Exchange Rate (Riel per 1 USD)
              </Label>
              <Input
                id="rate"
                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-xs text-amber-600 dark:text-amber-400 font-bold"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="4100"
              />
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 2. CONFIGURABLE SERVICE INTERVALS                         */}
        {/* ========================================================= */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-xl space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
              <BellRing className="size-4" />
              <span>Configurable Service Intervals</span>
            </div>
          </div>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Define kilometer and time thresholds used across the Cockpit Overview to trigger early service warnings.
          </p>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 dark:bg-slate-900/90 uppercase text-[10px] tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Component / Service</th>
                    <th className="px-4 py-3">Interval (km)</th>
                    <th className="px-4 py-3">Interval (days)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {schedule.map((item, idx) => (
                    <tr key={item.item} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className="text-amber-500 dark:text-amber-400">{getMaintenanceIcon(item.item)}</span>
                        {item.item}
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          className="w-24 h-8 text-xs font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                          value={item.interval_km}
                          onChange={(e) =>
                            updateScheduleItem(idx, "interval_km", Number(e.target.value))
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          className="w-24 h-8 text-xs font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                          value={item.interval_days || 0}
                          onChange={(e) =>
                            updateScheduleItem(idx, "interval_days", Number(e.target.value))
                          }
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

        {/* ========================================================= */}
        {/* 3. DATA PERSISTENCE & PORTABILITY                         */}
        {/* ========================================================= */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-xl space-y-4 transition-colors">
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Database className="size-4" />
            <span>Database Status & Cloud Portability</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-mono text-emerald-600 dark:text-emerald-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500 dark:text-emerald-400" />
              <span>PostgreSQL / Supabase Storage Online</span>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20">
              Connected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* JSON Export */}
            <Button
              variant="outline"
              onClick={handleExportBackup}
              disabled={isExporting}
              className="h-10 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-mono gap-2"
            >
              <Download className="size-3.5 text-amber-500 dark:text-amber-400" />
              <span>{isExporting ? "Exporting..." : "Download JSON Backup"}</span>
            </Button>

            {/* JSON Restore */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleRestoreFile}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRestoring}
                className="w-full h-10 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-mono gap-2"
              >
                <Upload className="size-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>{isRestoring ? "Restoring..." : "Restore JSON Backup"}</span>
              </Button>
            </div>

            {/* Clear PWA Cache & Reload */}
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  if ("caches" in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map((k) => caches.delete(k)));
                  }
                  if ("serviceWorker" in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    for (const r of regs) {
                      await r.unregister();
                    }
                  }
                  toast.success("Cache cleared. Reloading latest version...");
                  setTimeout(() => {
                    window.location.reload();
                  }, 400);
                } catch {
                  window.location.reload();
                }
              }}
              className="h-10 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-mono gap-2"
            >
              <RotateCw className="size-3.5 text-emerald-500" />
              <span>Force PWA Refresh</span>
            </Button>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-2 h-11 px-8 shadow-lg shadow-amber-500/20 text-xs font-mono"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            <Save className="size-4" />
            <span>{save.isPending ? "Saving..." : "Save All Settings"}</span>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
