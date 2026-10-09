import { AppError } from "./errors";

const state = globalThis as typeof globalThis & { skinnearRequests?: Map<string, { count: number; until: number }> };
state.skinnearRequests ??= new Map();

/** Local/single-instance guard. Replace with a shared limiter before scaling. */
export function limitRequest(headers: Headers, scope: string, maximum = 20) {
  const now = Date.now();
  const map = state.skinnearRequests!;
  for (const [key, value] of map) if (value.until < now) map.delete(key);
  const visitor = process.env.TRUST_PROXY_HEADERS === "true" ? headers.get("x-forwarded-for")?.split(",")[0] || "unknown" : "local";
  const key = `${scope}:${visitor}`;
  const current = map.get(key) ?? { count: 0, until: now + 60000 };
  current.count += 1;
  map.set(key, current);
  if (current.count > maximum) throw new AppError("Please wait a minute before trying again.", 429);
}
