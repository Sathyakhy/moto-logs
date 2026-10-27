// @ts-nocheck
import React, { useState } from "react";
import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  Fuel,
  Gauge,
  History,
  Plus,
  Settings,
  Wrench,
  RotateCw,
  Info,
  DollarSign,
  Droplets,
  Layers,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

import { AppShell, StatusPill } from "@/components/AppShell";
import { useBike, useSignedUrl } from "@/hooks/useBikes";
import { useMaintenanceRecords, useFuelLogs } from "@/hooks/useMaintenance";
import { useProfile } from "@/hooks/useProfile";
import { money, Currency } from "@/lib/money";
import { km } from "@/lib/moto";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogMaintenanceDialog } from "@/components/LogMaintenanceDialog";
import { LogFuelDialog } from "@/components/LogFuelDialog";
import { EditBikeDialog } from "@/components/EditBikeDialog";
import { View360 } from "@/components/View360";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/bikes/$bikeId")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search["tab"] as string) || undefined,
    };
  },
  component: BikeDetail,
});

const CATEGORY_FILTERS = [
  "All",
  "Engine Oil",
  "Gear Oil",
  "CVT Belt",
  "Brake Pads",
  "Tires",
  "Battery",
  "Air Filter",
  "Spark Plug",
  "Coolant",
  "Suspension",
  "General",
];

function BikeDetail() {
  const { bikeId } = useParams({ from: "/_authenticated/bikes/$bikeId" });
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { data: bike, isLoading } = useBike(bikeId);
  const { data: history } = useMaintenanceRecords(bikeId);
  const { data: fuelLogs } = useFuelLogs(bikeId);
  const { profile } = useProfile();

  const [selectedCategory, setSelectedCategory] = useState("All");

  const displayCurrency: Currency = (profile?.display_currency as Currency) || "USD";
  const khrPerUsd = profile?.khr_per_usd || 4100;

  const currentTab = (search as any).tab || "logbook";

  const totalMaintenance =
    history?.reduce((acc, curr) => acc + Number(curr.total_cost || 0), 0) || 0;
  const totalFuel = fuelLogs?.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) || 0;
  const totalSpent = totalMaintenance + totalFuel;

  // Average Fuel Economy (km/L)
  const fuelEcoKmL = React.useMemo(() => {
    if (!fuelLogs || fuelLogs.length < 2) return null;
    const sorted = [...fuelLogs].sort((a, b) => (b.odometer || 0) - (a.odometer || 0));
    const latest = sorted[0];
    const previous = sorted[1];
    if (latest && previous && latest.odometer && previous.odometer && latest.liters) {
      const distance = latest.odometer - previous.odometer;
      if (distance > 0 && latest.liters > 0) {
        return distance / latest.liters;
      }
    }
    return null;
  }, [fuelLogs]);

  // Filtered maintenance history
  const filteredHistory = React.useMemo(() => {
    if (!history) return [];
    if (selectedCategory === "All") return history;
    return history.filter(
      (rec) =>
        rec.categories?.some((cat: string) =>
          cat.toLowerCase().includes(selectedCategory.toLowerCase())
        ) ||
        rec.notes?.toLowerCase().includes(selectedCategory.toLowerCase())
    );
  }, [history, selectedCategory]);

  if (isLoading) {
    return (
      <AppShell title="Loading Cockpit...">
        <div className="py-20 text-center text-slate-400 font-mono text-sm animate-pulse">
          INITIALIZING TELEMETRY TELEMETRY SYSTEMS...
        </div>
      </AppShell>
    );
  }

  if (!bike) {
    return (
      <AppShell title="Motorcycle Not Found">
        <div className="py-16 text-center">
          <p className="text-red-400 font-bold mb-4">Motorcycle not found in database</p>
          <Button asChild variant="outline">
            <Link to="/bikes">Return to Garage</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const hasMultiplePhotos = bike.photos_paths && bike.photos_paths.length > 1;

  return (
    <AppShell
      title={bike.name}
      subtitle={`${bike.year} ${bike.make} ${bike.model}${bike.plate_number ? ` • ${bike.plate_number}` : ""}`}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-9 px-3 rounded-xl border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
          >
            <Link to="/bikes">
              <ArrowLeft className="size-4 mr-1.5" />
              Garage
            </Link>
          </Button>
          <EditBikeDialog
            bike={bike}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3.5 rounded-xl border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-bold gap-1.5"
              >
                <Settings className="size-3.5 text-slate-400" />
                <span>Specs</span>
              </Button>
            }
          />
        </div>
      }
    >
      {/* Cockpit Hero Visual & Telemetry HUD */}
      <div className="grid gap-4 lg:grid-cols-12 mb-6">
        {/* Left: 360/Hero Turntable */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800/80 bg-slate-900/90 backdrop-blur-xl overflow-hidden shadow-xl flex flex-col">
          <div className="relative aspect-[16/10] w-full bg-slate-950 flex items-center justify-center">
            {hasMultiplePhotos ? (
              <View360
                paths={bike.photos_paths}
                fallbackPath={bike.photo_path}
                className="size-full"
              />
            ) : (
              <BikeHeroImage path={bike.photo_path} />
            )}

            {/* Status Chip */}
            <div className="absolute top-3 right-3 pointer-events-none">
              <StatusPill status={bike.status} />
            </div>
          </div>

          {/* Quick Specs Bar Under Image */}
          <div className="grid grid-cols-4 border-t border-slate-800/80 bg-slate-950/60 p-3 text-center divide-x divide-slate-800/60">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Engine</p>
              <p className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                {bike.displacement_cc ? `${bike.displacement_cc} cc` : "160 cc"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Oil Cap</p>
              <p className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                {bike.oil_capacity_l ? `${bike.oil_capacity_l} L` : "0.8 L"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Fuel Tank</p>
              <p className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                {bike.fuel_tank_capacity_l ? `${bike.fuel_tank_capacity_l} L` : "8.1 L"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tire PSI</p>
              <p className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                {bike.tire_pressure_front_psi && bike.tire_pressure_rear_psi
                  ? `${bike.tire_pressure_front_psi}/${bike.tire_pressure_rear_psi}`
                  : "29 / 33"}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Key Telemetry Cards */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">
          {/* Odometer Cockpit LCD */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 backdrop-blur-xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="font-speedo text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Odometer Telemetry
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                LIVE SYNC
              </span>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-black p-4 shadow-inner">
              <div className="font-digital text-3xl font-black tracking-widest text-amber-400 glow-lcd flex items-baseline gap-2">
                <span>{km(bike.current_odometer)}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>Next Engine Oil Interval:</span>
              <span className="font-mono font-bold text-slate-200">
                in {Math.max(0, 2000 - ((bike.current_odometer || 0) % 2000))} km
              </span>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 flex-1">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 backdrop-blur-xl p-4 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Fuel Economy</span>
                <Fuel className="size-4 text-amber-400" />
              </div>
              <div className="my-2">
                <p className="font-mono text-2xl font-bold text-slate-100">
                  {fuelEcoKmL ? `${fuelEcoKmL.toFixed(1)}` : "--"}
                </p>
                <p className="text-[11px] font-mono text-slate-400">km / Liter</p>
              </div>
              <p className="text-[10px] text-slate-400">
                {fuelLogs && fuelLogs.length > 1 ? "Calculated from tank fills" : "Needs 2+ logs"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 backdrop-blur-xl p-4 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Lifetime Cost</span>
                <DollarSign className="size-4 text-cyan-400" />
              </div>
              <div className="my-2">
                <p className="font-mono text-xl font-bold text-amber-400 truncate">
                  {money(totalSpent, "USD", displayCurrency, khrPerUsd)}
                </p>
                <p className="text-[11px] font-mono text-slate-400">Fuel & Maintenance</p>
              </div>
              <p className="text-[10px] text-slate-400">
                Maint: {money(totalMaintenance, "USD", displayCurrency, khrPerUsd)}
              </p>
            </div>
          </div>

          {/* Quick Action Dial Bar */}
          <div className="grid grid-cols-2 gap-2">
            <LogMaintenanceDialog
              bikeId={bikeId}
              currentOdometer={bike.current_odometer || 0}
              trigger={
                <Button className="h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-2 shadow-lg shadow-amber-500/20">
                  <Wrench className="size-4" />
                  <span>Log Service</span>
                </Button>
              }
            />
            <LogFuelDialog
              bikeId={bikeId}
              currentOdometer={bike.current_odometer || 0}
              trigger={
                <Button
                  variant="outline"
                  className="h-11 rounded-xl border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs gap-2"
                >
                  <Fuel className="size-4 text-amber-500" />
                  <span>Add Fuel Fill</span>
                </Button>
              }
            />
          </div>
        </div>
      </div>

      {/* Tabs Section: Logbook, Fuel Records, Specs, 360 Angles */}
      <Tabs
        value={currentTab}
        onValueChange={(val) => {
          navigate({
            to: "/bikes/$bikeId",
            params: { bikeId },
            search: { tab: val },
            replace: true,
          });
        }}
        className="space-y-4"
      >
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 backdrop-blur-xl p-1.5 shadow-xl overflow-x-auto">
          <TabsList className="bg-transparent gap-1 w-full justify-start sm:justify-center">
            <TabsTrigger
              value="logbook"
              className="gap-2 rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 text-slate-400"
            >
              <Wrench className="size-3.5" />
              <span>Maintenance Logbook</span>
              <span className="ml-1 rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px]">
                {history?.length || 0}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="fuel"
              className="gap-2 rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 text-slate-400"
            >
              <Fuel className="size-3.5" />
              <span>Fuel Records</span>
              <span className="ml-1 rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px]">
                {fuelLogs?.length || 0}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="specs"
              className="gap-2 rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 text-slate-400"
            >
              <Info className="size-3.5" />
              <span>Specs & Telemetry</span>
            </TabsTrigger>

            <TabsTrigger
              value="angles"
              className="gap-2 rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 text-slate-400"
            >
              <RotateCw className="size-3.5" />
              <span>360° Angles</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: Maintenance Logbook */}
        <TabsContent value="logbook" className="space-y-4">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border",
                  selectedCategory === cat
                    ? "bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-sm"
                    : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
              <Wrench className="size-10 text-slate-700 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-200">No Maintenance Records Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-5">
                {selectedCategory === "All"
                  ? "Log your first service to track replacement intervals and parts cost."
                  : `No entries matching category "${selectedCategory}".`}
              </p>
              <LogMaintenanceDialog
                bikeId={bikeId}
                currentOdometer={bike.current_odometer || 0}
                trigger={
                  <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-2">
                    <Plus className="size-4" />
                    <span>Log Service Now</span>
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredHistory.map((record) => {
                const partsCost = Number(record.parts_cost || 0);
                const laborCost = Number(record.labor_cost || 0);
                const hasCostSplit = partsCost > 0 || laborCost > 0;

                return (
                  <LogMaintenanceDialog
                    key={record.id}
                    bikeId={bikeId}
                    editRecord={record}
                    trigger={
                      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 hover:border-amber-500/40 transition-all cursor-pointer group shadow-lg">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                                {km(record.odometer)}
                              </span>
                              <span className="text-xs text-slate-400">
                                {new Date(record.service_date).toLocaleDateString()}
                              </span>
                              {record.shop_name && (
                                <span className="text-xs text-slate-400 truncate">
                                  @ {record.shop_name}
                                </span>
                              )}
                            </div>

                            <h4 className="font-bold text-base text-slate-100 group-hover:text-amber-400 transition-colors">
                              {record.notes?.split("\n")[0] ||
                                record.categories?.[0] ||
                                "Service Maintenance"}
                            </h4>

                            {record.categories && record.categories.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {record.categories.map((cat: string) => (
                                  <span
                                    key={cat}
                                    className="text-[10px] font-bold uppercase tracking-wider bg-slate-800/80 text-cyan-400 border border-slate-700/60 px-2 py-0.5 rounded-md"
                                  >
                                    {cat}
                                  </span>
                                ))}
                              </div>
                            )}

                            {record.product_name && (
                              <p className="text-xs text-slate-400 mt-2 font-mono">
                                Spec: {record.product_name}
                              </p>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <p className="font-mono text-lg font-bold text-amber-400 tabular-nums">
                              {money(record.total_cost, "USD", displayCurrency, khrPerUsd)}
                            </p>
                            {hasCostSplit && (
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5 space-y-0.5">
                                {partsCost > 0 && (
                                  <p>Parts: {money(partsCost, "USD", displayCurrency, khrPerUsd)}</p>
                                )}
                                {laborCost > 0 && (
                                  <p>Labor: {money(laborCost, "USD", displayCurrency, khrPerUsd)}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: Fuel Records */}
        <TabsContent value="fuel" className="space-y-4">
          {(!fuelLogs || fuelLogs.length === 0) ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
              <Fuel className="size-10 text-slate-700 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-200">No Fuel Records Logged</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-5">
                Keep track of every fuel fill to monitor true km/L economy and total petrol spending.
              </p>
              <LogFuelDialog
                bikeId={bikeId}
                currentOdometer={bike.current_odometer || 0}
                trigger={
                  <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-2">
                    <Plus className="size-4" />
                    <span>Log First Fill</span>
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid gap-3">
              {fuelLogs.map((log) => (
                <LogFuelDialog
                  key={log.id}
                  bikeId={bikeId}
                  editLog={log}
                  trigger={
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 hover:border-amber-500/40 transition-all cursor-pointer group shadow-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                              {km(log.odometer)}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(log.fill_date).toLocaleDateString()}
                            </span>
                            {log.gas_station && (
                              <span className="text-xs text-slate-400 font-medium truncate">
                                @ {log.gas_station}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2.5 py-0.5 rounded-lg font-mono">
                              {log.liters} L
                            </span>
                            <span className="text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700/60 px-2.5 py-0.5 rounded-lg font-mono">
                              {log.fuel_type || "Regular 92"}
                            </span>
                            {log.is_full && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                                Full Tank
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-mono text-lg font-bold text-amber-400 tabular-nums">
                            {money(log.amount, "USD", displayCurrency, khrPerUsd)}
                          </p>
                          {log.liters && log.amount && (
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {(Number(log.amount) / Number(log.liters)).toFixed(2)}/L
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: Specs & Telemetry */}
        <TabsContent value="specs">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 backdrop-blur-xl p-5 shadow-xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <Gauge className="size-4 text-amber-500" />
                <span>Engine & Powertrain</span>
              </h3>
              <dl className="divide-y divide-slate-800/60 text-xs">
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">Make & Model</dt>
                  <dd className="font-semibold text-slate-200">
                    {bike.make} {bike.model} ({bike.year})
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">Displacement</dt>
                  <dd className="font-mono font-semibold text-slate-200">
                    {bike.displacement_cc || 160} cc
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">License Plate</dt>
                  <dd className="font-mono font-semibold text-amber-400">
                    {bike.plate_number || "Not assigned"}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">Engine Oil Capacity</dt>
                  <dd className="font-mono font-semibold text-slate-200">
                    {bike.oil_capacity_l || 0.8} L (10W-40 JASO MB)
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">Final Drive Gear Oil</dt>
                  <dd className="font-mono font-semibold text-slate-200">
                    {bike.gear_oil_capacity_l || 0.12} L
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 backdrop-blur-xl p-5 shadow-xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <Layers className="size-4 text-cyan-400" />
                <span>Chassis & Electrical</span>
              </h3>
              <dl className="divide-y divide-slate-800/60 text-xs">
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">Fuel Tank Capacity</dt>
                  <dd className="font-mono font-semibold text-slate-200">
                    {bike.fuel_tank_capacity_l || 8.1} L
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">Front Tire PSI</dt>
                  <dd className="font-mono font-semibold text-slate-200">
                    {bike.tire_pressure_front_psi || 29} PSI
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">Rear Tire PSI</dt>
                  <dd className="font-mono font-semibold text-slate-200">
                    {bike.tire_pressure_rear_psi || 33} PSI
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">Battery Specification</dt>
                  <dd className="font-mono font-semibold text-slate-200">
                    {bike.battery_model || "12V 5Ah Maintenance Free"}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">Spark Plug</dt>
                  <dd className="font-mono font-semibold text-slate-200">
                    {bike.spark_plug || "CPR7EA-9 (NGK)"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: 360 Angles */}
        <TabsContent value="angles">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 backdrop-blur-xl p-6 shadow-xl">
            <div className="max-w-2xl mx-auto">
              <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 mb-4">
                <View360
                  paths={bike.photos_paths || []}
                  fallbackPath={bike.photo_path}
                  className="size-full"
                />
              </div>

              <div className="text-center">
                <h4 className="text-sm font-bold text-slate-200">Multi-Angle Interactive Turntable</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Drag left/right to inspect all exterior angles. Upload 0°, 90°, 180°, and 270° photos
                  in the Edit Bike dialog for complete 360 coverage.
                </p>
                <div className="mt-4">
                  <EditBikeDialog
                    bike={bike}
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold gap-2"
                      >
                        <Settings className="size-3.5" />
                        <span>Manage 360 Photos</span>
                      </Button>
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function BikeHeroImage({ path }: { path: string | null | undefined }) {
  const { data: url } = useSignedUrl(path || "");

  if (!url) {
    return (
      <div className="size-full flex flex-col items-center justify-center text-slate-700 bg-slate-950 p-6">
        <Gauge className="size-16 stroke-1 text-slate-800" />
        <span className="text-xs font-mono text-slate-500 mt-3">NO PHOTO CONFIGURED</span>
      </div>
    );
  }

  return (
    <div className="size-full flex items-center justify-center p-4">
      <img
        src={url}
        alt="Motorcycle"
        className="max-h-full max-w-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
      />
    </div>
  );
}
