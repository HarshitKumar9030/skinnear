import { z } from "zod";
import { fetchJson } from "@/lib/http";
import { AppError } from "@/lib/errors";

const responseSchema = z.object({ result: z.literal("success"), base_code: z.literal("INR"), time_last_update_unix: z.number(), rates: z.record(z.string(), z.number().positive()) });
type Rates = z.infer<typeof responseSchema>;
let cache: { data: Rates; expires: number } | undefined;
let pending: Promise<Rates> | undefined;

/** Daily cached conversion of catalog estimates, never a local retailer quote. */
export class CurrencyService {
  async quote(currency: string): Promise<{ rate: number; date?: string }> {
    if (currency === "INR") return { rate: 1 };
    try {
      if (!cache || cache.expires < Date.now()) {
        pending ??= fetchJson<unknown>("https://open.er-api.com/v6/latest/INR").then((value) => responseSchema.parse(value));
        try { cache = { data: await pending, expires: Date.now() + 86400000 }; } finally { pending = undefined; }
      }
      const rate = cache.data.rates[currency];
      if (!rate) throw new AppError(`Estimates are not available in ${currency} yet. Choose another budget currency.`, 422);
      return { rate, date: new Date(cache.data.time_last_update_unix * 1000).toISOString() };
    } catch (error) { if (error instanceof AppError && error.status === 422) throw error; throw new AppError("Currency conversion is temporarily unavailable. Please retry shortly.", 503); }
  }
}
