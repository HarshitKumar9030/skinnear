import { test } from "node:test";
import assert from "node:assert/strict";
import { ClientLocationService } from "../src/services/ClientLocationService";
import { LocationService } from "../src/services/LocationService";

test("unconfigured server lookup delegates to browser and ignores untrusted headers", async () => {
  const previous = process.env.TRUST_PROXY_HEADERS;
  process.env.TRUST_PROXY_HEADERS = "false";
  try { assert.deepEqual(await new LocationService().suggest(new Headers({ "x-forwarded-for": "8.8.8.8" })), { lookup: "browser" }); }
  finally { if (previous !== undefined) process.env.TRUST_PROXY_HEADERS = previous; else delete process.env.TRUST_PROXY_HEADERS; }
});
test("key-free browser lookup validates country/currency and discards precise coordinates", async () => {
  const previous = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response(JSON.stringify(calls.length === 1 ? { lookup: "browser" } : calls.length === 2 ? { ip: "8.8.8.8" } : { city: "London", country: "GB", currency: "GBP", latitude: 51.5, longitude: -0.1 }), { status: 200 });
  };
  try {
    assert.deepEqual(await new ClientLocationService().suggest(), { city: "London", country: "GB", currency: "GBP" });
    assert.deepEqual(calls, ["/api/location", "https://api64.ipify.org?format=json", "/api/location"]);
  } finally { globalThis.fetch = previous; }
});
test("configured server suggestion avoids an unnecessary browser provider request", async () => {
  const previous = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({ city: "Toronto", country: "CA", currency: "CAD" }), { status: 200 }); };
  try { assert.equal((await new ClientLocationService().suggest()).country, "CA"); assert.equal(calls, 1); }
  finally { globalThis.fetch = previous; }
});
test("provider failure leaves an actionable manual-entry message", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: "unavailable" }), { status: 429 });
  try { await assert.rejects(new ClientLocationService().suggest(), /Enter your city below/); }
  finally { globalThis.fetch = previous; }
});

test("server resolves the supplied visitor IP and only returns approximate location fields", async () => {
  const previous = globalThis.fetch;
  let requested: URL | undefined;
  globalThis.fetch = async (input) => { requested = new URL(String(input)); return new Response(JSON.stringify({ success: true, city: "London", country_code: "GB", latitude: 51.5 }), { status: 200 }); };
  try {
    assert.deepEqual(await new LocationService().resolve("8.8.8.8"), { city: "London", country: "GB", currency: "GBP" });
    assert.equal(requested?.hostname, "ipwho.is");
    assert.equal(requested?.pathname, "/8.8.8.8");
    assert.equal(requested?.searchParams.get("fields"), "success,city,country_code");
  } finally { globalThis.fetch = previous; }
});
