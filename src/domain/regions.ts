import countries from "i18n-iso-countries/langs/en.json";
import countryToCurrency from "country-to-currency";

export const COUNTRIES = Object.entries(countries.countries)
  .map(([code, value]) => ({ code, name: Array.isArray(value) ? value[0] : value }))
  .sort((a, b) => a.name.localeCompare(b.name));
export const CURRENCIES: string[] = [...new Set(Object.values(countryToCurrency))].sort();
export function countryName(code: string) {
  return COUNTRIES.find((country) => country.code === code)?.name ?? code;
}
export function defaultCurrency(code: string): string {
  return (countryToCurrency as Record<string, string>)[code] ?? "USD";
}
export function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Suggested amounts in currency units, not exchange-rate estimates. */
export function budgetPresets(currency: string): number[] {
  if (currency === "INR") return [1000, 1500, 2500];
  if (["IDR", "VND", "IRR", "LAK", "UZS"].includes(currency)) return [200000, 500000, 1000000];
  if (["KRW", "NGN", "CLP", "COP", "PYG", "LBP"].includes(currency)) return [20000, 50000, 100000];
  if (["JPY", "PKR", "LKR", "HUF", "RSD", "NPR", "BDT", "ISK", "ARS"].includes(currency))
    return [2000, 5000, 10000];
  if (["THB", "TWD", "CZK", "UAH", "MXN", "ZAR", "TRY", "DZD", "PHP"].includes(currency))
    return [500, 1500, 3000];
  if (
    ["CNY", "HKD", "SEK", "NOK", "DKK", "AED", "SAR", "PLN", "RON", "BRL", "MYR"].includes(currency)
  )
    return [100, 300, 500];
  return [20, 50, 100];
}
