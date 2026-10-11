import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/errors";

const state = globalThis as typeof globalThis & { skinnearSigningKey?: string };
state.skinnearSigningKey ??= randomBytes(32).toString("hex");

/** Capability token prevents clients from querying arbitrary provider tasks. */
export class TaskTokenService {
  private readonly key = process.env.TASK_SIGNING_SECRET || state.skinnearSigningKey!;

  issue(taskId: string, ownerId?: string, lease?: string): string {
    const payload = Buffer.from(
      JSON.stringify({ taskId, ownerId, lease, expiresAt: Date.now() + 20 * 60000 }),
    ).toString("base64url");
    return `${payload}.${this.sign(payload)}`;
  }

  verify(token: string, ownerId?: string): string {
    return this.read(token, ownerId).taskId;
  }

  read(token: string, ownerId?: string): { taskId: string; expiresAt: number; lease?: string } {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra !== undefined || token.length > 2048)
      throw new AppError("This scan session is invalid.", 400);
    const expected = Buffer.from(this.sign(payload));
    const supplied = Buffer.from(signature);
    if (supplied.length !== expected.length || !timingSafeEqual(expected, supplied))
      throw new AppError("This scan session is invalid.", 403);
    let parsed: { taskId: string; expiresAt: number; ownerId?: string; lease?: string };
    try {
      parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    } catch {
      throw new AppError("This scan session is invalid.", 400);
    }
    if (
      !parsed ||
      typeof parsed.taskId !== "string" ||
      !parsed.taskId ||
      parsed.taskId.length > 512 ||
      !Number.isFinite(parsed.expiresAt) ||
      parsed.expiresAt <= Date.now()
    )
      throw new AppError("This scan session expired. Please start a new scan.", 410);
    if (ownerId && parsed.ownerId !== ownerId)
      throw new AppError("This scan belongs to another browser session.", 403);
    if (parsed.lease !== undefined && typeof parsed.lease !== "string")
      throw new AppError("This scan session is invalid.", 400);
    return parsed;
  }

  private sign(payload: string) {
    return createHmac("sha256", this.key).update(payload).digest("base64url");
  }
}
