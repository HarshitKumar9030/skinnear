import { isIP } from "node:net";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { fetchJson } from "@/lib/http";

const locationSchema = z.object({ city: z.string().optional(), region: z.string().optional(), country: z.string().optional() });

export class LocationService {
  async suggest(headers: Headers) {
    if (process.env.TRUST_PROXY_HEADERS !== "true" || !process.env.IPINFO_TOKEN) throw new AppError("Automatic location is not configured. Please enter your city manually.", 503);
    const ip = headers.get("x-forwarded-for")?.split(",")[0].trim();
    if (!ip || !isIP(ip) || ip === "127.0.0.1" || ip === "::1") throw new AppError("We could not determine a public location. Please enter your city manually.", 422);
    const url = new URL(`https://ipinfo.io/${encodeURIComponent(ip)}/json`);
    url.searchParams.set("token", process.env.IPINFO_TOKEN);
    const result = locationSchema.parse(await fetchJson<unknown>(url));
    if (!result.city || result.country !== "IN") throw new AppError("This prototype supports Indian cities. Please enter your city manually.", 422);
    return { city: result.city, approximate: true };
  }
}
