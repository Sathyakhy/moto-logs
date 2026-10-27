export const SERVICE_CATEGORIES = [
  "Engine Oil",
  "Gear Oil",
  "CVT Cleaning",
  "Drive Belt",
  "Rollers",
  "Coolant",
  "Brake Fluid",
  "Brake Pads",
  "Air Filter",
  "Battery",
  "Spark Plug",
  "Tire Replacement",
  "General Inspection",
] as const;

export const EXPENSE_CATEGORIES = [
  "fuel",
  "maintenance",
  "insurance",
  "parking",
  "road tax",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const FUEL_TYPES = ["Regular 91", "Super 95", "E20", "Other"] as const;

export const ATTACHMENT_KINDS = ["invoice", "receipt", "warranty", "part photo", "other"] as const;

/** Sensible starter intervals (km) for small-displacement scooters/bikes. */
export interface DefaultScheduleItem {
  item: string;
  interval_km: number;
  interval_days?: number;
}

export const DEFAULT_SCHEDULE_ITEMS: DefaultScheduleItem[] = [
  { item: "Engine Oil", interval_km: 2000, interval_days: 180 },
  { item: "Gear Oil", interval_km: 6000, interval_days: 365 },
  { item: "CVT Cleaning", interval_km: 6000, interval_days: 180 },
  { item: "Drive Belt", interval_km: 20000, interval_days: 730 },
  { item: "Rollers", interval_km: 12000, interval_days: 365 },
  { item: "Coolant", interval_km: 12000, interval_days: 365 },
  { item: "Brake Fluid", interval_km: 12000, interval_days: 365 },
  { item: "Brake Pads", interval_km: 10000 },
  { item: "Air Filter", interval_km: 6000 },
  { item: "Battery", interval_km: 0, interval_days: 730 },
  { item: "Spark Plug", interval_km: 8000 },
];

export type ScheduleStatus = "good" | "due-soon" | "overdue";

export type ScheduleRow = {
  id: string;
  item: string;
  interval_km: number;
  interval_days: number | null;
  last_service_odometer: number;
  last_service_date: string | null;
};

export type ScheduleComputed = {
  dueAtKm: number;
  remainingKm: number;
  dueOnDate: string | null;
  remainingDays: number | null;
  estimatedDate: string | null;
  dailyUsage: number | null;
  status: ScheduleStatus;
  progress: number;
};

export function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function computeSchedule(
  row: ScheduleRow,
  currentOdometer: number,
  dailyUsage?: number | null,
  purchaseDate?: string | null,
): ScheduleComputed {
  const lastOdo = Number(row.last_service_odometer || 0);
  const interval = Number(row.interval_km || 0);

  // Usage since last service
  const usageSinceLast = currentOdometer - lastOdo;
  let remainingKm = interval - usageSinceLast;
  const dueAtKm = lastOdo + interval;

  let dueOnDate: string | null = null;
  let remainingDays: number | null = null;

  // Handle case where interval_km is 0 (Time-based only)
  if (interval === 0 && row.interval_days) {
    const startDate = row.last_service_date
      ? new Date(row.last_service_date)
      : purchaseDate
        ? new Date(purchaseDate)
        : null;

    if (startDate) {
      const due = addDays(startDate, row.interval_days);
      dueOnDate = due.toISOString().slice(0, 10);
      remainingDays = daysBetween(new Date(), due);
      // For time-only, we treat remainingKm as infinite or just don't use it for overdue checks
      remainingKm = 999999;
    }
  } else if (row.interval_days && row.last_service_date) {
    const lastDate = new Date(row.last_service_date);
    const due = addDays(lastDate, row.interval_days);
    dueOnDate = due.toISOString().slice(0, 10);
    remainingDays = daysBetween(new Date(), due);
  }

  // Predictive estimation
  let estimatedDate: string | null = dueOnDate;
  if (interval > 0 && dailyUsage && dailyUsage > 0) {
    const daysToKm = Math.ceil(remainingKm / dailyUsage);
    const estimated = addDays(new Date(), daysToKm);

    if (dueOnDate) {
      const timeDue = new Date(dueOnDate);
      if (estimated < timeDue) {
        estimatedDate = estimated.toISOString().slice(0, 10);
      }
    } else {
      estimatedDate = estimated.toISOString().slice(0, 10);
    }
  }

  const kmWarn = Math.max(200, interval * 0.1);
  let status: ScheduleStatus = "good";
  if (remainingKm <= 0 || (remainingDays !== null && remainingDays <= 0)) status = "overdue";
  else if (remainingKm <= kmWarn || (remainingDays !== null && remainingDays <= 14))
    status = "due-soon";

  const progress = Math.max(0, Math.min(100, (usageSinceLast / interval) * 100));

  return {
    dueAtKm,
    remainingKm,
    dueOnDate,
    remainingDays,
    estimatedDate,
    dailyUsage: dailyUsage ?? null,
    status,
    progress,
  };
}

export interface OdometerCheckpoint {
  date: string;
  odometer: number | null | undefined;
}

export function calculateDailyMileage(
  checkpoints: OdometerCheckpoint[],
  purchaseDate?: string | null,
  initialOdometer?: number | null,
): number | null {
  const validPoints: { date: Date; odometer: number }[] = [];

  for (const cp of checkpoints) {
    if (cp && cp.odometer !== null && cp.odometer !== undefined && cp.date) {
      const odo = Number(cp.odometer);
      const d = new Date(cp.date);
      if (Number.isFinite(odo) && odo >= 0 && !isNaN(d.getTime())) {
        validPoints.push({ date: d, odometer: odo });
      }
    }
  }

  if (purchaseDate) {
    const pDate = new Date(purchaseDate);
    if (!isNaN(pDate.getTime())) {
      validPoints.push({ date: pDate, odometer: Number(initialOdometer || 0) });
    }
  }

  if (validPoints.length < 2) return null;

  validPoints.sort((a, b) => a.date.getTime() - b.date.getTime());

  const earliest = validPoints[0];
  const latest = validPoints[validPoints.length - 1];
  if (!earliest || !latest) return null;

  const kmDiff = latest.odometer - earliest.odometer;
  const daysDiff = Math.max(1, daysBetween(earliest.date, latest.date));

  if (kmDiff <= 0) return null;

  const avg = kmDiff / daysDiff;
  return avg > 0 && avg < 2500 ? avg : null;
}

export function calculateDailyUsage(
  fuelLogs: { fill_date?: string; date?: string; odometer: number | null | undefined }[],
  additionalLogs?: { date?: string; fill_date?: string; odometer: number | null | undefined }[],
  purchaseDate?: string | null,
): number | null {
  const list: OdometerCheckpoint[] = [];
  (fuelLogs || []).forEach((l) => {
    list.push({ date: l.fill_date || l.date || "", odometer: l.odometer });
  });
  (additionalLogs || []).forEach((l) => {
    list.push({ date: l.date || l.fill_date || "", odometer: l.odometer });
  });
  return calculateDailyMileage(list, purchaseDate);
}

export interface FuelEntry {
  id?: string;
  fill_date?: string;
  date?: string;
  odometer: number | null | undefined;
  liters: number | string | null | undefined;
  amount?: number | string | null | undefined;
  gas_station?: string | null;
  fuel_type?: string | null;
  notes?: string | null;
}

export interface FuelTelemetryResult {
  latestKmPerLiter: number | null;
  averageKmPerLiter: number | null;
  latestCostPerKm: number | null;
  averageCostPerKm: number | null;
  totalTrackedDistanceKm: number;
  totalTrackedLiters: number;
  totalTrackedCost: number;
  perFillEconomyMap: Map<string, { kmPerLiter: number; costPerKm: number; deltaKm: number; formatted: string }>;
}

export function computeFuelTelemetry(logs: FuelEntry[]): FuelTelemetryResult {
  const result: FuelTelemetryResult = {
    latestKmPerLiter: null,
    averageKmPerLiter: null,
    latestCostPerKm: null,
    averageCostPerKm: null,
    totalTrackedDistanceKm: 0,
    totalTrackedLiters: 0,
    totalTrackedCost: 0,
    perFillEconomyMap: new Map(),
  };

  if (!logs || logs.length < 2) return result;

  const valid = logs
    .filter((l) => {
      const odo = Number(l.odometer);
      const lit = Number(l.liters);
      return Number.isFinite(odo) && odo > 0 && Number.isFinite(lit) && lit > 0;
    })
    .map((l) => ({
      ...l,
      odometerNum: Number(l.odometer),
      litersNum: Number(l.liters),
      amountNum: Number(l.amount || 0),
      timestamp: new Date(l.fill_date || l.date || "").getTime() || 0,
    }));

  if (valid.length < 2) return result;

  // Sort by odometer ascending, secondary by timestamp
  valid.sort((a, b) => {
    if (a.odometerNum !== b.odometerNum) return a.odometerNum - b.odometerNum;
    return a.timestamp - b.timestamp;
  });

  let sumValidDeltaKm = 0;
  let sumValidLiters = 0;
  let sumValidCost = 0;
  let latestPair: { kmPerLiter: number; costPerKm: number } | null = null;

  for (let i = 1; i < valid.length; i++) {
    const prev = valid[i - 1];
    const curr = valid[i];
    if (!prev || !curr) continue;

    const deltaKm = curr.odometerNum - prev.odometerNum;
    const liters = curr.litersNum;
    const cost = curr.amountNum;

    // Realistic motorcycle fuel efficiency range (5 km/L to 120 km/L)
    if (deltaKm > 0 && liters > 0) {
      const kmPerLiter = deltaKm / liters;
      const costPerKm = cost > 0 ? cost / deltaKm : 0;

      if (kmPerLiter >= 5 && kmPerLiter <= 120) {
        sumValidDeltaKm += deltaKm;
        sumValidLiters += liters;
        if (cost > 0) sumValidCost += cost;

        const formatted = `${kmPerLiter % 1 === 0 ? kmPerLiter.toFixed(0) : kmPerLiter.toFixed(kmPerLiter >= 20 ? 1 : 2)} KM/L`;

        if (curr.id) {
          result.perFillEconomyMap.set(curr.id, {
            kmPerLiter,
            costPerKm,
            deltaKm,
            formatted,
          });
        }

        latestPair = { kmPerLiter, costPerKm };
      }
    }
  }

  if (latestPair) {
    result.latestKmPerLiter = latestPair.kmPerLiter;
    result.latestCostPerKm = latestPair.costPerKm > 0 ? latestPair.costPerKm : null;
  }

  if (sumValidDeltaKm > 0 && sumValidLiters > 0) {
    result.averageKmPerLiter = sumValidDeltaKm / sumValidLiters;
    result.totalTrackedDistanceKm = sumValidDeltaKm;
    result.totalTrackedLiters = sumValidLiters;
    result.totalTrackedCost = sumValidCost;
    if (sumValidCost > 0) {
      result.averageCostPerKm = sumValidCost / sumValidDeltaKm;
    }
  }

  return result;
}

export const STATUS_LABEL: Record<ScheduleStatus, string> = {
  good: "Good",
  "due-soon": "Due soon",
  overdue: "Overdue",
};

export function km(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} km`;
}

export function monthKey(date: string) {
  return date.slice(0, 7);
}
