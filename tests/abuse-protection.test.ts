import { test } from "node:test";
import assert from "node:assert/strict";
import { AbuseProtectionService, RateLimitError } from "../src/services/AbuseProtectionService";
import { MemoryAbuseStore } from "../src/services/AbuseStore";
import { VisitorSessionService } from "../src/services/VisitorSessionService";
import { TaskTokenService } from "../src/services/TaskTokenService";
import { boundedBody, boundedJson } from "../src/lib/request-body";
import { errorResponse } from "../src/lib/errors";
import { isLocalDevelopment } from "../src/lib/request-policy";

test("visitor cookies are stable, signed and expiring", () => {
  let now = 1000; const sessions = new VisitorSessionService(() => now);
  const first = sessions.resolve(); assert.ok(first.cookie);
  assert.deepEqual(sessions.resolve(first.cookie), { id: first.id });
  assert.notEqual(sessions.resolve(first.cookie + "x").id, first.id);
  now += 31 * 86400000; assert.notEqual(sessions.resolve(first.cookie).id, first.id);
});
test("localhost bypass applies only to development and cannot be spoofed in production", () => {
  const env = process.env as Record<string, string | undefined>; const previous = env.NODE_ENV;
  try {
    env.NODE_ENV = "development";
    for (const host of ["localhost:3000", "127.0.0.1:3000", "[::1]:3000"]) assert.equal(isLocalDevelopment(new Headers({ host })), true);
    assert.equal(isLocalDevelopment(new Headers({ host: "localhost.evil.example:3000" })), false);
    env.NODE_ENV = "production";
    assert.equal(isLocalDevelopment(new Headers({ host: "localhost:3000" })), false);
  } finally { if (previous === undefined) delete env.NODE_ENV; else env.NODE_ENV = previous; }
});
test("local bypass allows repeated requests and overlapping scans", async () => {
  const guard = new AbuseProtectionService(new MemoryAbuseStore(), undefined, false);
  for (let i = 0; i < 50; i++) {
    await guard.request(new Headers(), "visitor", "local", 1);
    await guard.reserveScan(new Headers(), "visitor");
  }
});
test("rate limits isolate visitors and return Retry-After", async () => {
  const now = 1000; const store = new MemoryAbuseStore(undefined, () => now);
  const guard = new AbuseProtectionService(store, () => now); const headers = new Headers();
  await guard.request(headers, "visitor-a", "test", 1);
  await guard.request(headers, "visitor-b", "test", 1);
  await assert.rejects(guard.request(headers, "visitor-a", "test", 1), (error) => {
    assert.ok(error instanceof RateLimitError); assert.equal(errorResponse(error).headers.get("Retry-After"), "59"); return true;
  });
});
test("one scan lease wins concurrent starts and stale cleanup cannot unlock a new scan", async () => {
  let now = 1000; const guard = new AbuseProtectionService(new MemoryAbuseStore(undefined, () => now), () => now);
  const results = await Promise.allSettled([guard.reserveScan(new Headers(), "visitor"), guard.reserveScan(new Headers(), "visitor")]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const first = results.find((result) => result.status === "fulfilled") as PromiseFulfilledResult<string>;
  now += 10 * 60000 + 1;
  const next = await guard.reserveScan(new Headers(), "visitor");
  await guard.releaseScan("visitor", first.value);
  await assert.rejects(guard.reserveScan(new Headers(), "visitor"), /already processing/);
  await guard.releaseScan("visitor", next);
});
test("clearing visitor cookies cannot bypass the IP scan limit", async () => {
  const guard = new AbuseProtectionService(new MemoryAbuseStore());
  for (let i = 0; i < 10; i++) { const lease = await guard.reserveScan(new Headers(), `visitor-${i}`); await guard.releaseScan(`visitor-${i}`, lease); }
  await assert.rejects(guard.reserveScan(new Headers(), "another-cookie"), /request limit/);
});
test("scan capabilities reject another visitor and extra token segments", () => {
  const tokens = new TaskTokenService(); const token = tokens.issue("provider-task", "visitor-a", "lease");
  assert.equal(tokens.verify(token, "visitor-a"), "provider-task");
  assert.throws(() => tokens.verify(token, "visitor-b"), /another browser/);
  assert.throws(() => tokens.verify(token + ".extra"), /invalid/);
});
test("streamed uploads are bounded even with missing or understated Content-Length", async () => {
  const body = () => new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(8)); controller.enqueue(new Uint8Array(8)); controller.close(); } });
  for (const headers of [{}, { "Content-Length": "1" }]) {
    const request = new Request("http://localhost/", { method: "POST", headers, body: body(), duplex: "half" } as RequestInit);
    await assert.rejects(boundedBody(request, 10), /too large/);
  }
  assert.deepEqual(await boundedJson(new Request("http://localhost/", { method: "POST", body: '{"ok":true}' })), { ok: true });
  await assert.rejects(boundedJson(new Request("http://localhost/", { method: "POST", body: "garbage" })), /valid JSON/);
});

test("daily global budget holds even when visitors change identities and IP addresses", async () => {
  const env = process.env as Record<string, string | undefined>;
  const previous = { cap: env.YOUCAM_DAILY_SCAN_LIMIT, trust: env.TRUST_PROXY_HEADERS, header: env.CLIENT_IP_HEADER };
  env.YOUCAM_DAILY_SCAN_LIMIT = "2"; env.TRUST_PROXY_HEADERS = "true"; env.CLIENT_IP_HEADER = "x-real-ip";
  try {
    const guard = new AbuseProtectionService(new MemoryAbuseStore());
    for (let i = 1; i <= 2; i++) { const lease = await guard.reserveScan(new Headers({ "x-real-ip": `192.0.2.${i}` }), `visitor-${i}`); await guard.releaseScan(`visitor-${i}`, lease); }
    await assert.rejects(guard.reserveScan(new Headers({ "x-real-ip": "192.0.2.3" }), "third-visitor"), /request limit/);
  } finally {
    for (const [key, value] of [["YOUCAM_DAILY_SCAN_LIMIT", previous.cap], ["TRUST_PROXY_HEADERS", previous.trust], ["CLIENT_IP_HEADER", previous.header]]) { if (value === undefined) delete env[key!]; else env[key!] = value; }
  }
});

test("public production fails closed without shared storage, signing or trusted IP configuration", async () => {
  const env = process.env as Record<string, string | undefined>;
  const names = ["NODE_ENV", "MONGODB_URI", "TASK_SIGNING_SECRET", "TRUST_PROXY_HEADERS", "CLIENT_IP_HEADER"];
  const previous = names.map((name) => env[name]);
  env.NODE_ENV = "production"; delete env.TASK_SIGNING_SECRET;
  try {
    assert.throws(() => new AbuseProtectionService(new MemoryAbuseStore()), /signing secret/);
    env.TASK_SIGNING_SECRET = "a".repeat(64); delete env.MONGODB_URI;
    assert.throws(() => new AbuseProtectionService(new MemoryAbuseStore()), /MongoDB request protection/);
    env.MONGODB_URI = "mongodb://test-only"; env.TRUST_PROXY_HEADERS = "false";
    await assert.rejects(new AbuseProtectionService(new MemoryAbuseStore()).request(new Headers({ "x-forwarded-for": "192.0.2.1" }), "visitor", "test", 1), /trusted visitor IP/);
  } finally { names.forEach((name, index) => { if (previous[index] === undefined) delete env[name]; else env[name] = previous[index]; }); }
});
