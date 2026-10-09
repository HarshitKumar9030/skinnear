import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/errors";

const state = globalThis as typeof globalThis & { skinnearSigningKey?: string };
state.skinnearSigningKey ??= randomBytes(32).toString("hex");

/** Capability token prevents clients from querying arbitrary provider tasks. */
export class TaskTokenService {
  private readonly key = process.env.TASK_SIGNING_SECRET || state.skinnearSigningKey!;

  issue(taskId: string): string {
    const payload = Buffer.from(JSON.stringify({ taskId, expiresAt: Date.now() + 20 * 60000 })).toString("base64url");
    return `${payload}.${this.sign(payload)}`;
  }

  verify(token: string): string {
    const [payload, signature] = token.split(".");
    if (!payload || !signature || token.length > 2048) throw new AppError("This scan session is invalid.", 400);
    const expected = Buffer.from(this.sign(payload));
    const supplied = Buffer.from(signature);
    if (supplied.length !== expected.length || !timingSafeEqual(expected, supplied)) throw new AppError("This scan session is invalid.", 403);
    let parsed: { taskId: string; expiresAt: number };
    try { parsed = JSON.parse(Buffer.from(payload, "base64url").toString()); } catch { throw new AppError("This scan session is invalid.", 400); }
    if (typeof parsed.taskId !== "string" || parsed.expiresAt < Date.now()) throw new AppError("This scan session expired. Please start a new scan.", 410);
    return parsed.taskId;
  }

  private sign(payload: string) { return createHmac("sha256", this.key).update(payload).digest("base64url"); }
}
