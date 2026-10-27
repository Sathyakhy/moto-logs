// @ts-nocheck
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bike,
  BarChart3,
  Gauge,
  LogOut,
  Moon,
  Settings,
  Sun,
  Plus,
  Fuel,
  Wrench,
  ChevronDown,
  CloudCheck,
  Zap,
} from "lucide-react";
import { useState, type ReactNode, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useBikes } from "@/hooks/useBikes";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { OfflineBanner } from "@/components/OfflineBanner";
import { VehicleSelectorModal } from "@/components/VehicleSelectorModal";
import { BatteryModal, getBatteryHealth } from "@/components/BatteryModal";
import { LogFuelDialog } from "@/components/LogFuelDialog";
import { LogMaintenanceDialog } from "@/components/LogMaintenanceDialog";
import { toast } from "sonner";

interface AppShellProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const { data: bikes } = useBikes();

  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [batteryModalOpen, setBatteryModalOpen] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [batteryVoltage, setBatteryVoltage] = useState(12.6);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [fuelDialogOpen, setFuelDialogOpen] = useState(false);

  // Active motorcycle (default or first in fleet)
  const activeBike = bikes?.find((b) => b.is_default) || bikes?.[0];

  useEffect(() => {
    // Load stored battery voltage from localStorage for instant offline access
    const saved = localStorage.getItem("motolog_battery_v");
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 0) setBatteryVoltage(parsed);
    }
  }, []);

  const handleSaveVoltage = (v: number) => {
    setBatteryVoltage(v);
    localStorage.setItem("motolog_battery_v", String(v));
  };

  // 1-Tap Currency Switcher (USD ↔ KHR)
  const toggleCurrency = async () => {
    if (!profile) return;
    const nextCurrency = profile.display_currency === "KHR" ? "USD" : "KHR";
    try {
      await supabase
        .from("profiles")
        .update({ display_currency: nextCurrency })
        .eq("id", profile.id);

      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(`Currency switched to ${nextCurrency === "KHR" ? "Khmer Riel (៛)" : "US Dollar ($)"}`);
    } catch {
      toast.error("Failed to update currency preference");
    }
  };

  async function signOut() {
    await supabase.auth.signOut();
    queryClient.clear();
    void navigate({ to: "/auth" });
  }

  const batteryHealth = getBatteryHealth(batteryVoltage);

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 overflow-hidden overscroll-none select-none transition-colors duration-200">
      <OfflineBanner />

      {/* Sticky Top Header (Glassmorphic HUD) */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/85 backdrop-blur-xl pt-[env(safe-area-inset-top,0px)] transition-colors duration-200">
        <div className="mx-auto max-w-6xl">
          <div className="flex h-14 items-center justify-between px-3 sm:px-6 gap-2">
            {/* Left: Vehicle Selector Button */}
            <button
              type="button"
              onClick={() => setVehicleModalOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 px-2.5 py-1.5 transition-all hover:border-amber-500/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 active:scale-98 min-w-0 shadow-xs"
              title="Switch Vehicle"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500 dark:text-amber-400 font-bold">
                <Bike className="size-4" />
              </div>
              <div className="text-left min-w-0 pr-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate leading-none">
                  {activeBike?.name || activeBike?.model || "My Garage"}
                </p>
                <p className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 truncate leading-tight mt-0.5">
                  {activeBike ? `${activeBike.make} ${activeBike.model}` : "Select Bike"}
                </p>
              </div>
              <ChevronDown className="size-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            </button>

            {/* Center Status: Battery Voltage & Cloud Sync */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Battery Voltage Chip */}
              <button
                type="button"
                onClick={() => setBatteryModalOpen(true)}
                className={`flex items-center gap-1.5 rounded-full border ${batteryHealth.borderColor} bg-white/90 dark:bg-slate-900/80 px-2.5 py-1 text-[11px] font-mono font-semibold transition-all hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 shadow-xs`}
                title="Tap to test or calibrate battery voltage"
              >
                <Zap className={`size-3 ${batteryHealth.textColor}`} />
                <span className={batteryHealth.textColor}>{batteryVoltage.toFixed(1)}V</span>
                <span className="hidden md:inline text-[10px] text-slate-500 dark:text-slate-400">
                  {batteryHealth.status === "healthy" ? "Good" : batteryHealth.status}
                </span>
              </button>

              {/* Cloud Sync Status */}
              <div
                className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-2.5 py-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 shadow-xs"
                title="Cloud database synchronized"
              >
                <CloudCheck className="size-3.5 text-emerald-500 dark:text-emerald-400 animate-pulse" />
                <span className="text-slate-600 dark:text-slate-300">Synced</span>
              </div>
            </div>

            {/* Right Controls: Currency Toggle & Sign Out */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* 1-Tap Dual Currency Switcher */}
              <button
                type="button"
                onClick={toggleCurrency}
                className="flex items-center gap-1 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all shadow-xs"
                title="Toggle currency between USD ($) and Khmer Riel (៛)"
              >
                <span>{profile?.display_currency === "KHR" ? "៛ KHR" : "$ USD"}</span>
              </button>

              <ThemeToggle />

              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                aria-label="Sign out"
                className="size-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
                title="Sign out"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content View with balanced bottom clearance for bottom nav */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 pt-4 pb-20 sm:pb-24 -webkit-overflow-scrolling-touch">
        <div className="mx-auto max-w-6xl">
          {title && (
            <div className="mb-4 sm:mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-display text-2xl sm:text-4xl tracking-tight text-slate-900 dark:text-slate-100">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-mono">{subtitle}</p>
                )}
              </div>
              {actions}
            </div>
          )}

          {children}
        </div>
      </main>

      {/* Floating Bottom Navigation Dock (Ergonomic Thumb Reach) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom,0px)] shadow-2xl transition-colors duration-200">
        <div className="grid grid-cols-5 items-center h-16 max-w-md mx-auto px-2">
          {/* Tab 1: Cockpit Overview */}
          <Link
            to="/overview"
            className="flex flex-col items-center justify-center h-full text-center transition-all active:scale-95"
          >
            {({ isActive }) => (
              <>
                <Gauge
                  className={`size-5 transition-transform ${
                    isActive ? "text-amber-500 dark:text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span
                  className={`mt-1 text-[10px] font-mono tracking-tight ${
                    isActive ? "text-amber-500 dark:text-amber-400 font-bold" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Overview
                </span>
              </>
            )}
          </Link>

          {/* Tab 2: Analytics / Dashboard */}
          <Link
            to="/dashboard"
            className="flex flex-col items-center justify-center h-full text-center transition-all active:scale-95"
          >
            {({ isActive }) => (
              <>
                <BarChart3
                  className={`size-5 transition-transform ${
                    isActive ? "text-amber-500 dark:text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span
                  className={`mt-1 text-[10px] font-mono tracking-tight ${
                    isActive ? "text-amber-500 dark:text-amber-400 font-bold" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Analytics
                </span>
              </>
            )}
          </Link>

          {/* Center Elevated Speed-Dial FAB (+) */}
          <div className="flex flex-col items-center justify-center relative">
            <button
              type="button"
              onClick={() => setSpeedDialOpen((prev) => !prev)}
              aria-label="Speed dial logging"
              className={`-mt-5 flex size-12 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/35 transition-all active:scale-95 ${
                speedDialOpen ? "rotate-45" : "hover:scale-105"
              }`}
            >
              <Plus className="size-6 stroke-[3]" />
            </button>
            <span className="mt-1 text-[9px] font-mono font-bold text-amber-500 dark:text-amber-400">
              LOG
            </span>
          </div>

          {/* Tab 4: Fleet Garage */}
          <Link
            to="/bikes"
            className="flex flex-col items-center justify-center h-full text-center transition-all active:scale-95"
          >
            {({ isActive }) => (
              <>
                <Bike
                  className={`size-5 transition-transform ${
                    isActive ? "text-amber-500 dark:text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span
                  className={`mt-1 text-[10px] font-mono tracking-tight ${
                    isActive ? "text-amber-500 dark:text-amber-400 font-bold" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Garage
                </span>
              </>
            )}
          </Link>

          {/* Tab 5: Settings */}
          <Link
            to="/settings"
            className="flex flex-col items-center justify-center h-full text-center transition-all active:scale-95"
          >
            {({ isActive }) => (
              <>
                <Settings
                  className={`size-5 transition-transform ${
                    isActive ? "text-amber-500 dark:text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span
                  className={`mt-1 text-[10px] font-mono tracking-tight ${
                    isActive ? "text-amber-500 dark:text-amber-400 font-bold" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Settings
                </span>
              </>
            )}
          </Link>
        </div>
      </nav>

      {/* Speed-Dial Sub-Menu Overlay */}
      {speedDialOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end items-center bg-black/75 p-4 pb-24 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSpeedDialOpen(false)}
        >
          <div
            className="w-full max-w-xs space-y-3 animate-in slide-in-from-bottom-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 🟡 Log Service Shortcut */}
            <button
              type="button"
              onClick={() => {
                setSpeedDialOpen(false);
                if (!activeBike) {
                  toast.info("Please select or add a motorcycle first");
                  setVehicleModalOpen(true);
                  return;
                }
                setMaintenanceDialogOpen(true);
              }}
              className="flex w-full items-center gap-3.5 rounded-2xl border border-amber-500/40 bg-white dark:bg-slate-900/95 p-4 text-left shadow-2xl transition-all hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-98"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-500 dark:text-amber-400">
                <Wrench className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">🟡 Log Service</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Engine oil, CVT belt, brakes, tires</p>
              </div>
            </button>

            {/* ⛽ Add Fuel Shortcut */}
            <button
              type="button"
              onClick={() => {
                setSpeedDialOpen(false);
                if (!activeBike) {
                  toast.info("Please select or add a motorcycle first");
                  setVehicleModalOpen(true);
                  return;
                }
                setFuelDialogOpen(true);
              }}
              className="flex w-full items-center gap-3.5 rounded-2xl border border-cyan-500/40 bg-white dark:bg-slate-900/95 p-4 text-left shadow-2xl transition-all hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-98"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                <Fuel className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">⛽ Add Fuel</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Liters, price & odo calculation</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Quick Service / Maintenance Dialog (Mounted outside speed-dial to open reliably) */}
      {activeBike && (
        <LogMaintenanceDialog
          bikeId={activeBike.id}
          currentOdometer={activeBike.current_odometer}
          open={maintenanceDialogOpen}
          onOpenChange={setMaintenanceDialogOpen}
        />
      )}

      {/* Quick Fuel Dialog (Mounted outside speed-dial to open reliably) */}
      {activeBike && (
        <LogFuelDialog
          bikeId={activeBike.id}
          currentOdometer={activeBike.current_odometer}
          open={fuelDialogOpen}
          onOpenChange={setFuelDialogOpen}
        />
      )}

      {/* Vehicle Switcher Modal */}
      <VehicleSelectorModal
        open={vehicleModalOpen}
        onOpenChange={setVehicleModalOpen}
        activeBikeId={activeBike?.id}
      />

      {/* Battery Diagnostics HUD Modal */}
      <BatteryModal
        open={batteryModalOpen}
        onOpenChange={setBatteryModalOpen}
        voltage={batteryVoltage}
        onSaveVoltage={handleSaveVoltage}
      />
    </div>
  );
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("motolog_theme");
      if (saved) return saved === "dark";
      return document.documentElement.classList.contains("dark");
    }
    return true;
  });

  useEffect(() => {
    // Sync UI with current root state
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    const nextDark = !document.documentElement.classList.contains("dark");
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("motolog_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("motolog_theme", "light");
    }
    setIsDark(nextDark);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="size-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="size-4 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="size-4 text-slate-700 transition-transform hover:-rotate-12" />
      )}
    </Button>
  );
}

export function StatusPill({ status }: { status: "good" | "due-soon" | "overdue" }) {
  const map = {
    good: "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    "due-soon": "border-orange-500/40 bg-orange-500/15 text-orange-600 dark:text-orange-400",
    overdue: "border-red-500/40 bg-red-500/15 text-red-600 dark:text-red-400",
  } as const;
  const label = {
    good: "Good",
    "due-soon": "Due soon",
    overdue: "Overdue",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-mono font-semibold ${map[status]}`}
    >
      {label[status]}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-4 sm:p-5 shadow-lg transition-colors">
      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
      <p className="num mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
      {hint ? <p className="mt-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}
