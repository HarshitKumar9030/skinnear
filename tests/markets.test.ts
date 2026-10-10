import { test } from "node:test";
import assert from "node:assert/strict";
import catalog from "../src/data/products.json";
import { productSchema, preferencesSchema } from "../src/domain/schemas";
import { MarketCatalogService } from "../src/services/MarketCatalogService";
import { CurrencyService } from "../src/services/CurrencyService";
import { RecommendationService } from "../src/services/RecommendationService";
import { SAMPLE_ANALYSIS } from "../src/domain/sample";

const products = catalog.map((product) => productSchema.parse(product));
class TestCurrencies extends CurrencyService {
  calls: string[] = [];
  async quote(currency: string, base = "INR") {
    this.calls.push(`${base}:${currency}`);
    const usd: Record<string, number> = {
      USD: 1,
      GBP: 1.25,
      EUR: 1.1,
      INR: 0.01,
      KRW: 0.0007,
      AUD: 0.65,
      CAD: 0.75,
      JPY: 0.007,
      SGD: 0.75,
    };
    return { rate: usd[base] / usd[currency], date: "2026-10-10" };
  }
}
test("country collections distinguish Indian, US and UK formulas", () => {
  const service = new MarketCatalogService();
  const us = service.select(products, "US"),
    gb = service.select(products, "GB"),
    india = service.select(products, "IN");
  assert.ok(us.some((p) => p.id === "neutrogena-ultrasheer-spf55-us"));
  assert.ok(
    !us.some(
      (p) =>
        p.id === "lrp-uvmune-gb" ||
        p.id === "minimalist-b5" ||
        p.id === "boj-relief-sun",
    ),
  );
  assert.ok(gb.some((p) => p.id === "lrp-uvmune-gb"));
  assert.ok(!india.some((p) => p.id === "vanicream-cleanser-us"));
  assert.equal(service.select(products).length, products.length);
  assert.ok(
    service.select(products, "ZW").every((p) => p.markets.length === 0),
  );
});
test("native and country-specific estimates convert once, grouped by base currency", async () => {
  const fx = new TestCurrencies(),
    service = new MarketCatalogService(fx);
  const source = products.filter((p) =>
    ["vanicream-cleanser-us", "cerave-hydrating", "lrp-uvmune-gb"].includes(
      p.id,
    ),
  );
  const priced = await service.price(source, "USD", "US");
  assert.equal(
    priced.products.find((p) => p.id === "vanicream-cleanser-us")!
      .referencePrice,
    10,
  );
  assert.equal(
    priced.products.find((p) => p.id === "cerave-hydrating")!.referencePrice,
    16,
  );
  assert.equal(
    priced.products.find((p) => p.id === "lrp-uvmune-gb")!.referencePrice,
    26.25,
  );
  assert.deepEqual(fx.calls.sort(), ["GBP:USD", "USD:USD"]);
  assert.ok(priced.products.every((p) => p.referenceCurrency === "USD"));
  const again = await service.price(priced.products, "USD", "US");
  assert.equal(
    again.products.find((p) => p.id === "vanicream-cleanser-us")!
      .referencePrice,
    10,
  );
});
test("foreign routines retain whole-basket and swap budget caps", async () => {
  const market = new MarketCatalogService(new TestCurrencies());
  for (const [country, currency] of [
    ["US", "USD"],
    ["GB", "GBP"],
    ["KR", "KRW"],
    ["FR", "EUR"],
    ["CA", "CAD"],
    ["AU", "AUD"],
  ]) {
    const priced = await market.price(
      market.select(products, country),
      currency,
      country,
    );
    const preferences = preferencesSchema.parse({
      budget: currency === "KRW" ? 150000 : currency === "AUD" ? 150 : 100,
      country,
      currency,
      city: "Test city",
      pincode: "",
      sensitive: false,
      fragranceFree: true,
      exclusions: [],
      ownedCategories: [],
    });
    const routine = new RecommendationService(priced.products).build({
      analysis: SAMPLE_ANALYSIS,
      preferences,
      excludedProductIds: [],
    });
    assert.equal(routine.feasible, true, country);
    assert.equal(routine.items.length, 3);
    assert.ok(routine.total <= preferences.budget);
    for (const item of routine.items)
      for (const alternative of item.alternatives)
        assert.ok(
          routine.total -
            item.product.referencePrice +
            alternative.referencePrice <=
            preferences.budget,
        );
  }
});
test("sensitive-skin preferences cannot be bypassed by a regional sunscreen", async () => {
  const market = new MarketCatalogService(new TestCurrencies());
  const priced = await market.price(market.select(products, "JP"), "JPY", "JP");
  const preferences = preferencesSchema.parse({budget: 30000, country: "JP", currency: "JPY", city: "Tokyo", pincode: "", sensitive: true, fragranceFree: false, exclusions: [], ownedCategories: []});
  const service = new RecommendationService(priced.products);
  const sensitive = service.build({analysis: SAMPLE_ANALYSIS, preferences, excludedProductIds: []});
  assert.equal(sensitive.feasible, false);
  const normal = service.build({analysis: SAMPLE_ANALYSIS, preferences: {...preferences, sensitive: false}, excludedProductIds: []});
  assert.equal(normal.feasible, true);
  assert.ok(normal.items.some((item)=>item.product.id === "biore-aqua-rich-jp"));
});
test("exchange quotes calculate cross-currency ratios and share the daily fetch", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({result: "success", base_code: "INR", time_last_update_unix: 1791580800, rates: {INR: 1, USD: 0.01, GBP: 0.008}}), {headers: {"Content-Type": "application/json"}}); };
  try {
    const service = new CurrencyService();
    const [usd, gbp] = await Promise.all([service.quote("USD", "GBP"), service.quote("GBP", "USD")]);
    assert.equal(usd.rate, 1.25);
    assert.equal(gbp.rate, 0.8);
    assert.equal(calls, 1);
    assert.equal((await service.quote("USD", "USD")).rate, 1);
    await assert.rejects(service.quote("USD", "ZZZ"), /Estimates are not available/);
  } finally {globalThis.fetch = original;}
});
test("missing market coverage never turns an Indian import estimate into a local routine", async () => {
  const market = new MarketCatalogService(new TestCurrencies());
  const priced = await market.price(market.select(products, "ZW"), "USD", "ZW");
  const preferences = preferencesSchema.parse({
    budget: 100,
    country: "ZW",
    currency: "USD",
    city: "Harare",
    pincode: "",
    sensitive: false,
    fragranceFree: true,
    exclusions: [],
    ownedCategories: [],
  });
  assert.equal(
    new RecommendationService(priced.products).build({
      analysis: SAMPLE_ANALYSIS,
      preferences,
      excludedProductIds: [],
    }).feasible,
    false,
  );
});
