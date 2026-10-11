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
  return {
    analysis: SAMPLE_ANALYSIS,
    preferences: {
      budget: 1500,
      country: "IN",
      currency: "INR",
      city: "Bengaluru",
      pincode: "",
      sensitive: false,
      fragranceFree: false,
      exclusions: [],
      ownedCategories: [],
      ...overrides,
    },
    excludedProductIds: [],
  };
}

test("selects all essentials without exceeding the whole basket budget", () => {
  const result = service.build(input({ budget: 1000 }));
  assert.equal(result.feasible, true);
  assert.deepEqual(
    result.items.map((item) => item.product.category),
    ["cleanser", "moisturizer", "sunscreen"],
  );
  assert.ok(result.total <= 1000);
  assert.equal(
    result.total,
    result.items.reduce((sum, item) => sum + item.product.referencePrice, 0),
  );
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
  const result2 = service.build(
    input({ exclusions: ["niacinamide"], ownedCategories: ["moisturizer", "sunscreen"] }),
  );
  assert.equal(result2.feasible, true);
  assert.ok(result2.items.every((item) => item.product.ingredientsComplete));
  assert.ok(
    result2.items.every(
      (item) => !item.product.ingredients.join(" ").toLowerCase().includes("niacinamide"),
    ),
  );
});
test("owned essentials do not generate redundant purchases", () => {
  const result = service.build(
    input({ ownedCategories: ["cleanser", "moisturizer", "sunscreen"] }),
  );
  assert.equal(result.feasible, true);
  assert.equal(result.total, 0);
  assert.equal(result.items.length, 0);
});
test("higher favorable score does not turn into a higher concern priority", () => {
  const analysis = {
    mode: "demo" as const,
    scores: [
      { concern: "oiliness" as const, score: 20 },
      { concern: "redness" as const, score: 95 },
    ],
  };
  const result = service.build({ ...input(), analysis });
  assert.ok(result.items[0].product.concerns.includes("oiliness"));
  assert.ok(result.items[1].product.concerns.includes("oiliness"));
});

test("expanded catalog exposes multiple brands with source-backed images and benefits", () => {
  assert.ok(new Set(products.map((product) => product.brand)).size >= 9);
  assert.ok(
    products.every(
      (product) => product.imageUrl?.startsWith("https://") && product.benefits.length >= 2,
    ),
  );
  const routine = service.build(input({ budget: 5000 }));
  assert.ok(routine.items[0].alternatives.some((product) => product.brand === "Cetaphil"));
  assert.ok(routine.items[1].alternatives.some((product) => product.brand === "CeraVe"));
  assert.ok(routine.items[2].alternatives.some((product) => product.brand === "Neutrogena"));
});

test("choosing a different brand preserves other steps and budget", () => {
  const first = service.build(input({ budget: 5000 }));
  const selected = ["cetaphil-gentle", ...first.items.slice(1).map((item) => item.product.id)];
  const result = service.build({ ...input({ budget: 5000 }), selectedProductIds: selected });
  assert.equal(result.items[0].product.id, "cetaphil-gentle");
  assert.deepEqual(
    result.items.slice(1).map((item) => item.product.id),
    selected.slice(1),
  );
  assert.ok(result.total <= result.budget);
  assert.ok(result.items[0].alternatives.length > 0);
});

test("alternatives cannot exceed the current basket budget", () => {
  const result = service.build(input({ budget: 1000 }));
  for (const item of result.items)
    for (const alternative of item.alternatives) {
      assert.ok(
        result.total - item.product.referencePrice + alternative.referencePrice <= result.budget,
      );
    }
  const forced = service.build({
    ...input({ budget: 1000 }),
    selectedProductIds: ["cerave-hydrating"],
  });
  assert.equal(forced.feasible, false);
  assert.equal(forced.items.length, 0);
});

test("explicit choices cannot bypass exclusions or repeat a routine step", () => {
  assert.throws(
    () =>
      service.build({
        ...input({ exclusions: ["niacinamide"] }),
        selectedProductIds: ["cetaphil-gentle"],
      }),
    /no longer matches/,
  );
  assert.throws(
    () =>
      service.build({ ...input(), selectedProductIds: ["cetaphil-gentle", "bioderma-sensibio"] }),
    /only one product/,
  );
});
