import { z } from "zod";
import { AppError } from "@/lib/errors";

const envelopeSchema = z.object({ status: z.number().optional(), data: z.unknown().optional(), error_code: z.string().optional() });

/** Server-side transport. Provider bodies and credentials never reach the browser. */
export class YouCamClient {
  private readonly key = process.env.YOUCAM_API_KEY?.trim();
  private readonly origin = process.env.YOUCAM_API_BASE_URL?.trim() || "https://yce-api-01.makeupar.com";

  async request<T>(path: string, schema: z.ZodType<T>, options: RequestInit = {}): Promise<T> {
    if (!this.key) throw new AppError("Live scans need a YouCam API key. You can explore the sample experience now.", 503);
    let base: URL;
    try { base = new URL(this.origin); }
    catch { throw new AppError("Check the YouCam API origin in your server configuration.", 503); }
    if (base.protocol !== "https:" || base.username || base.password || base.pathname !== "/" || base.search || base.hash) {
      throw new AppError("Set the YouCam API origin to an HTTPS origin without a path.", 503);
    }
    let response: Response;
    try {
      response = await fetch(new URL(path, base), {
        ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.key}` },
        signal: AbortSignal.timeout(25000), cache: "no-store", redirect: "error",
      });
    } catch { throw new AppError("YouCam could not be reached. Please retry.", 502); }
    const raw: unknown = await response.json().catch(() => null);
    const envelope = envelopeSchema.safeParse(raw);
    const code = envelope.success ? envelope.data.error_code : undefined;
    if (!response.ok || (envelope.success && envelope.data.status !== undefined && envelope.data.status >= 400)) {
      const status = envelope.success ? envelope.data.status ?? response.status : response.status;
      if (status === 401 || status === 403) throw new AppError("YouCam rejected the API key or access to skin analysis. Check your key and account permissions.", 503);
      if (status === 429) throw new AppError("YouCam is busy. Please wait a moment before trying again.", 429);
      if (status === 402 || code === "InsufficientCredit") throw new AppError("Your YouCam account needs more units to run this scan.", 503);
      if (status === 400) throw new AppError("YouCam could not accept this photo or scan request. Try a clear, front-facing JPEG or PNG.", 422);
      throw new AppError("YouCam could not complete this request. Please retry.", 502);
    }
    const parsed = schema.safeParse(envelope.success ? envelope.data.data : undefined);
    if (!parsed.success) throw new AppError("YouCam returned an unexpected response. Please retry.", 502);
    return parsed.data;
  }
}
