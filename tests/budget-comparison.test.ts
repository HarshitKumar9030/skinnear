import { test } from "node:test";
import assert from "node:assert/strict";
import catalog from "../src/data/products.json";
import {
  productSchema,
  DEFAULT_TREATMENT_PREFERENCES,
  type Product,
  type RoutineRequest,
} from "../src/domain/schemas";
import { RecommendationService } from "../src/services/RecommendationService";
import { BudgetComparisonService } from "../src/services/BudgetComparisonService";

const products: Product[] = ["cleanser", "moisturizer", "sunscreen"].flatMap((category) => {
  const base = productSchema.parse(catalog.find((product) => product.category === category));
  return [
    {
      ...base,
      id: `${category}-lean`,
      referencePrice: 10,
      referenceCurrency: "INR",
      concerns: [],
      sensitive: true,
      fragranceFree: true,
      ingredients: ["Water"],
      ingredientHighlights: ["Water"],
      ingredientsComplete: true,
      routineEligible: true,
    },
    {
      ...base,
      id: `${category}-match`,
      referencePrice: 40,
      referenceCurrency: "INR",
      concerns: ["moisture" as const],
      sensitive: true,
      fragranceFree: true,
      ingredients: ["Water"],
      ingredientHighlights: ["Water"],
      ingredientsComplete: true,
      routineEligible: true,
    },
  ];
});
function input(budget = 150): RoutineRequest {
  return {
    analysis: { mode: "live", scores: [{ concern: "moisture", score: 40 }] },
    preferences: {
      budget,
      country: "IN",
      currency: "INR",
      city: "Test city",
      pincode: "",
      sensitive: false,
      fragranceFree: true,
      exclusions: [],
      ownedCategories: [],
    },
    excludedProductIds: [],
    selectedProductIds: ["cleanser-match"],
  };
}
const service = new BudgetComparisonService(new RecommendationService(products));

test("lean essentials minimizes total while other baskets retain skin relevance and the cap", () => {
  const request = input();
  const original = JSON.stringify(request);
  const result = service.compare(request);
  assert.equal(result.scenarios[0].routine.total, 30);
  assert.equal(result.scenarios[1].routine.budget, 105);
  assert.equal(result.scenarios[2].routine.total, 120);
  assert.ok(
    result.scenarios.every(
      ({ routine }) => routine.total <= routine.budget && routine.budget <= result.cap,
    ),
  );
  assert.ok(result.scenarios.every(({ routine }) => routine.items.length === 3));
  assert.equal(JSON.stringify(request), original);
});
test("applying a preview through normal selection preserves its exact product IDs", () => {
  const request = input();
  const preview = service.compare(request).scenarios[0];
  const applied = new RecommendationService(products).build({
    ...request,
    preferences: {
      ...request.preferences,
      budget: preview.routine.budget,
      treatments: preview.treatments,
    },
    selectedProductIds: preview.routine.items.map((item) => item.product.id),
  });
  assert.deepEqual(
    applied.items.map((item) => item.product.id),
    preview.routine.items.map((item) => item.product.id),
  );
  assert.equal(applied.total, preview.routine.total);
});
test("budget exploration respects rejected products and ingredient exclusions", () => {
  const request = input();
  request.excludedProductIds = ["cleanser-lean"];
  assert.equal(service.compare(request).scenarios[0].routine.total, 60);
  request.preferences.exclusions = ["water"];
  assert.ok(
    service
      .compare(request)
      .scenarios.every(({ routine }) => !routine.feasible && !routine.items.length),
  );
});
test("infeasible budgets never produce partial baskets or overspend", () => {
  assert.ok(
    service
      .compare(input(20))
      .scenarios.every(({ routine }) => !routine.feasible && !routine.items.length),
  );
});
test("owned essentials remain free and no scenario assumes treatment consent", () => {
  const request = input();
  request.preferences.ownedCategories = ["cleanser", "moisturizer", "sunscreen"];
  assert.ok(
    service
      .compare(request)
      .scenarios.every(({ routine }) => routine.total === 0 && routine.items.length === 0),
  );
  const severe = input();
  severe.preferences.treatments = {
    ...DEFAULT_TREATMENT_PREFERENCES,
    consent: true,
    goal: "breakouts",
    breakoutSeverity: "severe",
  };
  const result = service.compare(severe);
  assert.equal(result.scenarios[0].treatments?.consent, false);
  assert.ok(result.scenarios.every((option) => option.treatments?.breakoutSeverity === "severe"));
  assert.ok(
    result.scenarios.every((option) =>
      option.routine.items.every((item) => !["serum", "retinoid"].includes(item.product.category)),
    ),
  );
});
