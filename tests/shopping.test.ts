import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import catalog from "../src/data/products.json";
import { preferencesSchema, productSchema } from "../src/domain/schemas";
import { RetailerLookupService } from "../src/services/RetailerLookupService";
import { ShoppingService } from "../src/services/ShoppingService";

const product = z.array(productSchema).parse(catalog)[1];
test("international lookup is country scoped and excludes Indian delivery retailers", () => {
  const links = new RetailerLookupService().forProduct(product, "GB");
  assert.equal(links.length, 1);
  assert.equal(links[0].retailer, "google-shopping");
  assert.equal(new URL(links[0].url).searchParams.get("gl"), "gb");
  assert.equal(links[0].availability, "check with retailer");
});
test("Indian lookup retains Blinkit and Zepto public destinations", () => {
  const links = new RetailerLookupService().forProduct(product, "IN");
  assert.deepEqual(links.map((link) => link.retailer), ["blinkit", "zepto"]);
  assert.ok(links.every((link) => link.url.startsWith("https://")));
});
test("postal codes accept international formats and reject unknown countries", () => {
  const base = { budget: 50, country: "GB", currency: "GBP", city: "London", pincode: "SW1A 1AA", sensitive: false, fragranceFree: true, exclusions: [], ownedCategories: [] };
  assert.equal(preferencesSchema.safeParse(base).success, true);
  assert.equal(preferencesSchema.safeParse({ ...base, country: "XX" }).success, false);
});
test("unconfigured shopping returns usable links without fabricated listings", async () => {
  const previous = process.env.SERPAPI_API_KEY;
  delete process.env.SERPAPI_API_KEY;
  try {
    const result = await new ShoppingService().lookup(product, "Toronto", "CA");
    assert.equal(result.mode, "retailer-lookup");
    assert.equal(result.listings.length, 0);
    assert.equal(result.lookups[0].retailer, "google-shopping");
  } finally { if (previous) process.env.SERPAPI_API_KEY = previous; }
});
test("live seller search sends the selected country to the provider", async () => {
  const previousKey = process.env.SERPAPI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.SERPAPI_API_KEY = "test-only-placeholder";
  let requested: URL | undefined;
  globalThis.fetch = async (input) => {
    requested = new URL(String(input));
    return new Response(JSON.stringify({ shopping_results: [{ title: "Test product listing", source: "Test seller", product_link: "https://example.com/product", price: "$12" }] }), { status: 200 });
  };
  try {
    const result = await new ShoppingService().lookup(product, "Toronto", "CA");
    assert.equal(requested?.searchParams.get("gl"), "ca");
    assert.equal(requested?.searchParams.get("location"), "Toronto, Canada");
    assert.equal(result.mode, "live-search");
    assert.equal(result.listings.length, 1);
  } finally { globalThis.fetch = previousFetch; if (previousKey) process.env.SERPAPI_API_KEY = previousKey; else delete process.env.SERPAPI_API_KEY; }
});
