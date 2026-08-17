export type Currency = "USD" | "KHR";

export const CURRENCIES: Currency[] = ["USD", "KHR"];

/** Convert an amount from its stored currency into the display currency. */
export function convert(
  amount: number | string | null | undefined,
  from: string | null | undefined,
  to: Currency,
  khrPerUsd: number,
): number {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return 0;
  const rate = khrPerUsd > 0 ? khrPerUsd : 4100;
  const source = (from ?? "USD").toUpperCase() === "KHR" ? "KHR" : "USD";
  if (source === to) return value;
  return source === "USD" ? value * rate : value / rate;
}

export function formatMoney(amount: number, currency: Currency) {
  if (currency === "KHR") {
    return `៛${Math.round(amount).toLocaleString()}`;
  }
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Convert + format in one step. */
export function money(
  amount: number | string | null | undefined,
  from: string | null | undefined,
  display: Currency,
  khrPerUsd: number,
) {
  return formatMoney(convert(amount, from, display, khrPerUsd), display);
}
