import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import catalog from "../src/data/products.json";
import { productSchema, type RoutineRequest } from "../src/domain/schemas";
import { SAMPLE_ANALYSIS } from "../src/domain/sample";
import { RecommendationService } from "../src/services/RecommendationService";

const products = z.array(productSchema).parse(catalog);
const service = new RecommendationService(products);
function input(overrides: Partial<RoutineRequest["preferences"]> = {}): RoutineRequest {
  return { analysis: SAMPLE_ANALYSIS, preferences: { budget: 1500, city: "Bengaluru", pincode: "", sensitive: false, fragranceFree: false, exclusions: [], ownedCategories: [], ...overrides }, excludedProductIds: [] };
}

test("selects all essentials without exceeding the whole basket budget", () => {
  const result = service.build(input({ budget: 1000 }));
  assert.equal(result.feasible, true);
  assert.deepEqual(result.items.map((item) => item.product.category), ["cleanser", "moisturizer", "sunscreen"]);
  assert.ok(result.total <= 1000);
  assert.equal(result.total, result.items.reduce((sum, item) => sum + item.product.referencePrice, 0));
});
test("returns an honest infeasible state instead of an over-budget partial plan", () => {
  const result = service.build(input({ budget: 100 }));
  assert.equal(result.feasible, false);
  assert.equal(result.items.length, 0);
  assert.match(result.message, /lowest matching routine/);
});
test("substitutes an excluded item while preserving budget and category coverage", () => {
  const first = service.build(input());
  const second = service.build({ ...input(), excludedProductIds: [first.items[0].product.id] });
  assert.equal(second.feasible, true);
  assert.equal(second.items.length, 3);
  assert.ok(!second.items.some((item) => item.product.id === first.items[0].product.id));
  assert.ok(second.total <= second.budget);
});
test("ingredient exclusions remove matches and products with incomplete formulas", () => {
  const result = service.build(input({ exclusions: ["glycerin"] }));
  assert.equal(result.feasible, false);
  const result2 = service.build(input({ exclusions: ["niacinamide"], ownedCategories: ["sunscreen"] }));
  assert.equal(result2.feasible, true);
  assert.ok(result2.items.every((item) => item.product.ingredientsComplete));
  assert.ok(result2.items.every((item) => !item.product.ingredients.join(" ").toLowerCase().includes("niacinamide")));
});
test("owned essentials do not generate redundant purchases", () => {
  const result = service.build(input({ ownedCategories: ["cleanser", "moisturizer", "sunscreen"] }));
  assert.equal(result.feasible, true);
  assert.equal(result.total, 0);
  assert.equal(result.items.length, 0);
});
test("higher favorable score does not turn into a higher concern priority", () => {
  const analysis = { mode: "demo" as const, scores: [{ concern: "oiliness" as const, score: 20 }, { concern: "redness" as const, score: 95 }] };
  const result = service.build({ ...input(), analysis });
  assert.equal(result.items[0].product.id, "minimalist-aquaporin");
  assert.equal(result.items[1].product.id, "minimalist-b5");
});
