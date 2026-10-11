import { z } from "zod";
import {
  locationSuggestionSchema,
  publicIpSchema,
  type LocationSuggestion,
} from "@/domain/location";
import { SkinNearApi } from "@/lib/client-api";

/** Uses the visitor's browser IP, never the application server's outbound IP. */
export class ClientLocationService {
  constructor(private readonly api = new SkinNearApi()) {}

  async suggest(): Promise<LocationSuggestion> {
    try {
      const result = await this.api.request<unknown>("/api/location", {
        signal: AbortSignal.timeout(6000),
      });
      const parsed = locationSuggestionSchema.safeParse(result);
      if (parsed.success) return parsed.data;
    } catch {
      /* A server lookup is optional; the browser lookup needs no API key. */
    }

    try {
      const response = await fetch("https://api64.ipify.org?format=json", {
        signal: AbortSignal.timeout(8000),
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      if (!response.ok) throw new Error("Location lookup unavailable");
      const { ip } = z.object({ ip: publicIpSchema }).parse(await response.json());
      return locationSuggestionSchema.parse(
        await this.api.post("/api/location", { ip }, AbortSignal.timeout(12000)),
      );
    } catch {
      throw new Error("Couldn’t suggest a city right now. Enter your city below.");
    }
  }
}
