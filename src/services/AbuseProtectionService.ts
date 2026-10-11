import { isIP } from "node:net";
import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors";
import { VisitorSessionService } from "./VisitorSessionService";
import { type AbuseStore, MemoryAbuseStore, MongoAbuseStore } from "./AbuseStore";
const state = globalThis as typeof globalThis & { skinnearAbuseStore?: MemoryAbuseStore };
state.skinnearAbuseStore ??= new MemoryAbuseStore();
export class RateLimitError extends AppError {
  constructor(
    public readonly retryAfter: number,
    message = "You have reached this request limit. Please try again later.",
  ) {
    super(message, 429);
  }
}
export class AbuseProtectionService {
  private readonly sessions = new VisitorSessionService();
  private readonly enabled: boolean;
  constructor(
    private readonly store: AbuseStore = process.env.NODE_ENV === "production"
      ? new MongoAbuseStore()
      : state.skinnearAbuseStore!,
    private readonly now = () => Date.now(),
    enabled = true,
  ) {
    this.enabled = process.env.NODE_ENV === "production" || enabled;
    if (process.env.NODE_ENV === "production" && !process.env.MONGODB_URI)
      throw new AppError(
        "Configure MongoDB request protection before enabling public requests.",
        503,
      );
  }
  private ip(headers: Headers) {
    const header = process.env.CLIENT_IP_HEADER;
    const raw =
      process.env.TRUST_PROXY_HEADERS === "true" && header
        ? headers.get(header)?.split(",")[0].trim()
        : undefined;
    if (raw && isIP(raw)) {
      let value = raw;
      if (isIP(raw) === 6) {
        const parts = new URL(`http://[${raw}]/`).hostname
          .slice(1, -1)
          .split("::")
          .map((part) => part.split(":").filter(Boolean));
        const groups =
          parts.length === 2
            ? [...parts[0], ...Array(8 - parts.flat().length).fill("0"), ...parts[1]]
            : parts[0];
        value = groups
          .slice(0, 4)
          .map((part) => parseInt(part, 16).toString(16))
          .join(":");
      }
      return this.sessions.hash("ip:" + value);
    }
    if (process.env.NODE_ENV === "production")
      throw new AppError(
        "Configure a trusted visitor IP header before enabling public requests.",
        503,
      );
    return this.sessions.hash("ip:local");
  }
  async consume(key: string, maximum: number, windowMs: number) {
    const ends = (Math.floor(this.now() / windowMs) + 1) * windowMs;
    const count = await this.store.increment(`${key}:${ends}`, ends);
    if (count > maximum)
      throw new RateLimitError(Math.max(1, Math.ceil((ends - this.now()) / 1000)));
  }
  async request(headers: Headers, userId: string, scope: string, maximum: number) {
    if (!this.enabled) return;
    const ip = this.ip(headers);
    await this.consume(`${scope}:ip:${ip}`, maximum * 3, 60000);
    await this.consume(`${scope}:user:${userId}`, maximum, 60000);
    await this.consume(`${scope}:global`, maximum * 100, 60000);
  }
  async reserveScan(headers: Headers, userId: string): Promise<string> {
    if (!this.enabled) return randomUUID();
    const ip = this.ip(headers);
    const lease = randomUUID();
    if (!(await this.store.acquire(`scan:active:${userId}`, lease, this.now() + 10 * 60000)))
      throw new RateLimitError(
        60,
        "A scan is already processing for this browser. Wait for it to finish before starting another.",
      );
    try {
      await this.consume(`scan:hour:ip:${ip}`, 10, 3600000);
      await this.consume(`scan:day:ip:${ip}`, 20, 86400000);
      await this.consume(`scan:hour:user:${userId}`, 3, 3600000);
      await this.consume(`scan:day:user:${userId}`, 5, 86400000);
      const configured = Number(process.env.YOUCAM_DAILY_SCAN_LIMIT || 100);
      const maximum =
        Number.isInteger(configured) && configured > 0 && configured <= 10000 ? configured : 100;
      await this.consume("scan:day:global", maximum, 86400000);
      return lease;
    } catch (error) {
      await this.releaseScan(userId, lease);
      throw error;
    }
  }
  async releaseScan(userId: string, lease: string) {
    if (this.enabled) await this.store.release(`scan:active:${userId}`, lease);
  }
  async reserveAi(headers: Headers, userId: string) {
    if (!this.enabled) return;
    const ip = this.ip(headers);
    await this.consume(`ai:hour:user:${userId}`, 10, 3600000);
    await this.consume(`ai:day:user:${userId}`, 20, 86400000);
    await this.consume(`ai:day:ip:${ip}`, 60, 86400000);
    const configured = Number(process.env.GEMINI_DAILY_REQUEST_LIMIT || 200);
    const maximum =
      Number.isInteger(configured) && configured > 0 && configured <= 10000 ? configured : 200;
    await this.consume("ai:day:global", maximum, 86400000);
  }
}
