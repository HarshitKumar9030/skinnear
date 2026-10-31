import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSkinZones } from "../src/domain/skin-zones";
import { analysisSchema, productSchema, type RoutineRequest } from "../src/domain/schemas";
import { skinExplanationInput } from "../src/services/SkinExplanationService";
import { RecommendationService } from "../src/services/RecommendationService";
import catalog from "../src/data/products.json";
import { SAMPLE_ANALYSIS } from "../src/domain/sample";

test("regional output matches the live-verified skin_type shape and is ordered for the UI", () => {
  const zones = parseSkinZones([
    { type: "skin_type", region: "u_zone", skin_type: "Dry", mask_urls: ["javascript:alert(1)"] },
    { type: "skin_type", region: "whole", skin_type: "Combination" },
    {
      type: "skin_type",
      region: "t_zone",
      skin_type: "Oily",
      mask_urls: ["https://", "https://example.com/t-zone.jpg"],
    },
  ]);
  assert.deepEqual(
    zones.map(({ region, skinType }) => [region, skinType]),
    [
      ["whole", "Combination"],
      ["t_zone", "Oily"],
      ["u_zone", "Dry"],
    ],
  );
  assert.equal(zones[1].maskUrl, "https://example.com/t-zone.jpg");
  assert.equal(zones[2].maskUrl, undefined);
});

test("invalid, repeated and unsupported provider metadata cannot invent regional observations", () => {
  const zones = parseSkinZones([
    null,
    { type: "skin_type", region: "whole", skin_type: "Oily" },
    { type: "skin_type", region: "whole", skin_type: "Dry" },
    { type: "skin_type", region: "nose", skin_type: "Dry" },
    { type: "skin_type", region: "u_zone", skin_type: "Psoriasis" },
    { type: "skin_type", region: "t_zone", ui_score: 60 },
    { type: "unknown", region: "u_zone", skin_type: "Dry" },
  ]);
  assert.deepEqual(zones, [{ region: "whole", skinType: "Oily", maskUrl: undefined }]);
});

test("regional metadata is optional for old reports and must not enter the Gemini score boundary", () => {
  const old = { mode: "live", scores: [{ concern: "moisture", score: 70 }] };
  assert.equal(analysisSchema.safeParse(old).success, true);
  assert.equal(
    analysisSchema.safeParse({
      ...old,
      skinProfile: [
        { region: "whole", skinType: "Oily" },
        { region: "whole", skinType: "Dry" },
      ],
    }).success,
    false,
  );
  assert.equal(
    skinExplanationInput.safeParse({ ...old, skinProfile: [{ region: "whole", skinType: "Oily" }] })
      .success,
    false,
  );
});

test("regional observations cannot add products, bypass treatment consent or change the budget", () => {
  const products = catalog.map((product) => productSchema.parse(product));
  const planner = new RecommendationService(products);
  const request: RoutineRequest = {
    analysis: SAMPLE_ANALYSIS,
    preferences: {
      country: "IN",
      currency: "INR",
      city: "Bengaluru",
      pincode: "",
      budget: 1500,
      sensitive: false,
      fragranceFree: false,
      exclusions: [],
      ownedCategories: [],
    },
    excludedProductIds: [],
  };
  const withZones = planner.build(request);
  const withoutZones = planner.build({
    ...request,
    analysis: { mode: SAMPLE_ANALYSIS.mode, scores: SAMPLE_ANALYSIS.scores },
  });
  assert.deepEqual(
    withZones.items.map(({ product }) => product.id),
    withoutZones.items.map(({ product }) => product.id),
  );
  assert.equal(withZones.total, withoutZones.total);
  assert.ok(withZones.total <= request.preferences.budget);
  assert.equal(
    withZones.items.some(({ product }) => ["serum", "retinoid"].includes(product.category)),
    false,
  );
});
