import { test } from "node:test";
import assert from "node:assert/strict";
import catalog from "../src/data/products.json";
import { productSchema, preferencesSchema } from "../src/domain/schemas";
import { SAMPLE_ANALYSIS } from "../src/domain/sample";
import { RecommendationService } from "../src/services/RecommendationService";
import { PortableRoutineService } from "../src/services/PortableRoutineService";

const products = catalog.map((product) => productSchema.parse(product));

test("reviewed catalog has distinct shareable products and primary source metadata", () => {
  assert.ok(products.length >= 230);
  assert.ok(new Set(products.map((product) => product.brand)).size >= 25);
  assert.equal(new Set(products.map((product) => product.id)).size, products.length);
  assert.equal(new Set(products.map((product) => product.sourceUrl)).size, products.length);
  for (const product of products) {
    assert.match(product.id, /^[a-z0-9-]{1,80}$/);
    assert.ok(product.imageUrl?.startsWith("https://"));
    assert.ok(product.benefits.length >= 2);
    assert.equal(product.priceKind, "planning estimate");
    assert.ok(!product.ingredientsComplete || product.ingredients.length > 0);
    if (["brightening", "texture", "soothing"].includes(product.treatmentGoal ?? ""))
      assert.equal(product.routineEligible, false);
  }
});

test("browse-only acid cleansers cannot be pinned into automatic essentials", () => {
  const blocked = products.find((product) => product.id === "minimalist-salicylic-lha-2-cleanser")!;
  assert.equal(blocked.routineEligible, false);
  const request = {
    analysis: SAMPLE_ANALYSIS,
    preferences: preferencesSchema.parse({budget: 3000, country: "IN", currency: "INR", city: "Mumbai", pincode: "", sensitive: false, fragranceFree: false, exclusions: [], ownedCategories: []}),
    excludedProductIds: [],
  };
  const service = new RecommendationService(products);
  const routine = service.build(request);
  assert.ok(routine.items.every((item) => item.product.routineEligible));
  assert.ok(routine.items.every((item) => item.alternatives.every((product) => product.routineEligible)));
  assert.throws(() => service.build({...request, selectedProductIds: [blocked.id]}), /no longer matches/);
});

test("native price currencies do not leak into shared lists", () => {
  const product = products.find((product) => product.brand === "Geek & Gorgeous")!;
  assert.equal(product.referenceCurrency, "EUR");
  const portable = new PortableRoutineService();
  const snapshot = portable.fromProducts([{...product, referencePrice: 11.5}], "USD");
  const resolved = portable.resolve(portable.decode(portable.encode(snapshot), products), products);
  assert.equal(resolved[0].referenceCurrency, "USD");
  assert.equal(resolved[0].referencePrice, 11.5);
});
