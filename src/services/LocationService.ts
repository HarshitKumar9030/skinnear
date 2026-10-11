import { defaultCurrency, COUNTRIES } from "@/domain/regions";
import { isIP } from "node:net";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { fetchJson } from "@/lib/http";
import { locationSuggestionSchema, publicIpSchema } from "@/domain/location";

const locationSchema = z.object({
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
});

export class LocationService {
  async resolve(ip: string) {
    publicIpSchema.parse(ip);
    if (ip === "127.0.0.1" || ip === "::1")
      throw new AppError("Enter your city manually for a local network address.", 422);
    const url = new URL(`https://ipwho.is/${encodeURIComponent(ip)}`);
    url.searchParams.set("fields", "success,city,country_code");
    const result = z
      .object({ success: z.literal(true), city: z.string(), country_code: z.string() })
      .parse(await fetchJson<unknown>(url));
    return locationSuggestionSchema.parse({
      city: result.city,
      country: result.country_code,
      currency: defaultCurrency(result.country_code),
    });
  }

  async suggest(headers: Headers) {
    if (process.env.TRUST_PROXY_HEADERS !== "true" || !process.env.IPINFO_TOKEN)
      return { lookup: "browser" as const };
    const ip = headers.get("x-forwarded-for")?.split(",")[0].trim();
    if (!ip || !isIP(ip) || ip === "127.0.0.1" || ip === "::1")
      return { lookup: "browser" as const };
    const url = new URL(`https://ipinfo.io/${encodeURIComponent(ip)}/json`);
    url.searchParams.set("token", process.env.IPINFO_TOKEN);
    const result = locationSchema.parse(await fetchJson<unknown>(url));
    if (!result.city || !COUNTRIES.some((country) => country.code === result.country))
      throw new AppError("We could not determine your country. Please choose it manually.", 422);
    return {
      city: result.city,
      country: result.country!,
      currency: defaultCurrency(result.country!),
      approximate: true,
    };
  }
}
