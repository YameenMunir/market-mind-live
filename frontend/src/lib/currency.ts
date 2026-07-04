/** Converts an amount denominated in `fromCurrency` into `toCurrency` using a rates
 * table where each value is "USD value of 1 unit of that currency" (matching the shape
 * returned by GET /api/fx/rates). Falls back to the original amount, unconverted, if
 * either currency is missing from the table - e.g. rates haven't loaded yet, or the
 * native currency isn't one we track (safer than showing a wrong number). */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number> | null | undefined
): number {
  if (fromCurrency === toCurrency) return amount;
  if (!rates) return amount;

  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];
  if (!fromRate || !toRate) return amount;

  const usdAmount = amount * fromRate;
  return usdAmount / toRate;
}
