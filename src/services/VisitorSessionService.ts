import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/errors";
const state = globalThis as typeof globalThis & { skinnearVisitorSecret?: string };
state.skinnearVisitorSecret ??= randomBytes(32).toString("hex");
export const VISITOR_COOKIE = "skinnear-visitor";
/** Anonymous browser identity, signed so callers cannot choose another visitor ID. */
export class VisitorSessionService {
  private readonly secret: string;
  constructor(private readonly now = () => Date.now()) {
    if (
      process.env.NODE_ENV === "production" &&
      (!process.env.TASK_SIGNING_SECRET || process.env.TASK_SIGNING_SECRET.length < 32)
    )
      throw new AppError(
        "Configure a stable server signing secret before enabling public requests.",
        503,
      );
    this.secret = process.env.TASK_SIGNING_SECRET || state.skinnearVisitorSecret!;
  }
  resolve(cookie?: string): { id: string; cookie?: string } {
    if (cookie && cookie.length < 512) {
      const [id, expiry, signature, extra] = cookie.split(".");
      const expected = this.sign(`${id}.${expiry}`);
      if (
        !extra &&
        /^[a-f0-9-]{36}$/.test(id || "") &&
        Number(expiry) > this.now() &&
        signature?.length === expected.length &&
        timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
      )
        return { id };
    }
    const id = randomUUID();
    const payload = `${id}.${this.now() + 30 * 86400000}`;
    return { id, cookie: `${payload}.${this.sign(payload)}` };
  }
  private sign(payload: string) {
    return createHmac("sha256", this.secret)
      .update("visitor:" + payload)
      .digest("base64url");
  }
  hash(value: string) {
    return createHmac("sha256", this.secret)
      .update("limiter:" + value)
      .digest("hex");
  }
}
