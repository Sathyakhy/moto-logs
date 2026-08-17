export const SERVICE_CATEGORIES = [
  "Engine oil change",
  "Oil filter",
  "Gear oil change",
  "Air filter replacement",
  "Spark plug replacement",
  "Brake pad replacement",
  "Brake fluid replacement",
  "Coolant replacement",
  "Battery replacement",
  "CVT / Belt replacement",
  "Tire replacement",
  "Chain & sprocket service",
  "General inspection",
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
export const DEFAULT_SCHEDULE_ITEMS: { item: string; interval_km: number; interval_days?: number }[] =
  [
    { item: "Engine oil change", interval_km: 2000, interval_days: 180 },
    { item: "Gear oil change", interval_km: 6000 },
    { item: "Air filter replacement", interval_km: 6000 },
    { item: "Spark plug replacement", interval_km: 8000 },
    { item: "CVT / Belt replacement", interval_km: 20000 },
    { item: "Brake pad replacement", interval_km: 12000 },
    { item: "Tire replacement", interval_km: 15000 },
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

export function computeSchedule(row: ScheduleRow, currentOdometer: number): ScheduleComputed {
  const dueAtKm = Number(row.last_service_odometer) + Number(row.interval_km);
  const remainingKm = dueAtKm - currentOdometer;

  let dueOnDate: string | null = null;
  let remainingDays: number | null = null;
  if (row.interval_days && row.last_service_date) {
    const due = addDays(new Date(row.last_service_date), row.interval_days);
    dueOnDate = due.toISOString().slice(0, 10);
    remainingDays = daysBetween(new Date(), due);
  }

  const kmWarn = Math.max(200, Number(row.interval_km) * 0.1);
  let status: ScheduleStatus = "good";
  if (remainingKm <= 0 || (remainingDays !== null && remainingDays <= 0)) status = "overdue";
  else if (remainingKm <= kmWarn || (remainingDays !== null && remainingDays <= 14))
    status = "due-soon";

  const used = Number(row.interval_km) - remainingKm;
  const progress = Math.max(0, Math.min(100, (used / Number(row.interval_km)) * 100));

  return { dueAtKm, remainingKm, dueOnDate, remainingDays, status, progress };
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
