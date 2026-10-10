import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import catalog from "../src/data/products.json";
import { DEFAULT_TREATMENT_PREFERENCES, preferencesSchema, productSchema, type RoutineRequest, type TreatmentPreferences } from "../src/domain/schemas";
import { RecommendationService } from "../src/services/RecommendationService";

const products = z.array(productSchema).parse(catalog);
const service = new RecommendationService(products);
const consent: TreatmentPreferences = { ...DEFAULT_TREATMENT_PREFERENCES, consent: true, goal: "oil-balance", basicsEstablished: true, adult: true, healthClear: true };
function request(options: Partial<TreatmentPreferences> = {}, budget = 3000): RoutineRequest {
  return { analysis: { mode: "live", scores: [{ concern: "oiliness", score: 30 }, { concern: "redness", score: 90 }] }, preferences: { budget, country: "IN", currency: "INR", city: "Mumbai", pincode: "", sensitive: false, fragranceFree: true, exclusions: [], ownedCategories: [], treatments: { ...consent, ...options } }, excludedProductIds: [], selectedProductIds: ["cetaphil-sun"] };
}
const extras = (result: ReturnType<RecommendationService["build"]>) => result.items.filter(({ product }) => ["serum", "retinoid"].includes(product.category));

test("old preferences and partial treatment options default to no consent", () => {
  const old = request(); delete old.preferences.treatments;
  assert.equal(extras(service.build(old)).length, 0);
  const parsed = preferencesSchema.parse({ ...old.preferences, treatments: { goal: "fine-lines" } });
  assert.equal(parsed.treatments?.consent, false);
  assert.equal(extras(service.build({ ...old, preferences: parsed })).length, 0);
});

test("a supported persistent goal adds at most one serum without changing essentials", () => {
  const baseline = service.build(request({ consent: false }));
  const result = service.build(request());
  assert.equal(extras(result).length, 1);
  assert.equal(extras(result)[0].product.id, "minimalist-niacinamide-5");
  assert.deepEqual(result.items.filter(({ product }) => !["serum", "retinoid"].includes(product.category)).map(({ product }) => product.id), baseline.items.map(({ product }) => product.id));
  assert.deepEqual(result.items.map(({ product }) => product.category), ["cleanser", "serum", "moisturizer", "sunscreen"]);
  for (const item of result.items.filter(({ product }) => product.category !== "serum")) {
    assert.ok(item.alternatives.every((alternative) => ![...alternative.ingredients, ...alternative.ingredientHighlights].join(" ").toLowerCase().includes("niacinamide")));
  }
  assert.ok(result.total <= result.budget);
  assert.equal(result.total, result.items.reduce((sum, item) => sum + item.product.referencePrice, 0));
});

test("consent never overrides missing need or safety confirmations", () => {
  for (const options of [{ consent: false }, { goal: "none" as const }, { adult: false }, { healthClear: false }, { basicsEstablished: false }, { alreadyUsingTreatment: true }]) {
    assert.equal(extras(service.build(request(options))).length, 0);
  }
  const healthy = request(); healthy.analysis.scores[0].score = 90;
  assert.equal(extras(service.build(healthy)).length, 0);
  const sample = request(); sample.analysis.mode = "demo";
  assert.equal(extras(service.build(sample)).length, 0);
  const sensitive = request(); sensitive.preferences.sensitive = true;
  assert.equal(extras(service.build(sensitive)).length, 0);
  const redness = request(); redness.analysis.scores[1].score = 30;
  assert.equal(extras(service.build(redness)).length, 0);
});

test("retinol requires a stated fine-line goal, separate consent and daily sun protection", () => {
  for (const options of [{ goal: "fine-lines" as const }, { goal: "fine-lines" as const, retinoidConsent: true }, { goal: "fine-lines" as const, dailySunscreen: true }]) {
    assert.equal(extras(service.build(request(options))).length, 0);
  }
  const result = service.build(request({ goal: "fine-lines", retinoidConsent: true, dailySunscreen: true }));
  assert.equal(extras(result)[0]?.product.category, "retinoid");
  assert.match(extras(result)[0].reason, /scan does not assess fine lines/);
  assert.match(extras(result)[0].product.usageNote!, /Evening only/);
});

test("extras use only leftover budget and cannot make an incomplete basket feasible", () => {
  const baseline = service.build(request({ consent: false }));
  const tight = service.build(request({}, baseline.total));
  assert.equal(tight.feasible, true);
  assert.equal(tight.total, baseline.total);
  assert.equal(extras(tight).length, 0);
  assert.deepEqual(tight.items.map(({ product }) => product.id), baseline.items.map(({ product }) => product.id));
  const impossible = service.build(request({}, 100));
  assert.equal(impossible.feasible, false);
  assert.equal(impossible.items.length, 0);
});

test("a matching active already in essentials suppresses a duplicate serum", () => {
  const input = request();
  // Pin the actual niacinamide moisturizer from the catalog rather than rely on rank.
  input.selectedProductIds = [products.find((p) => p.category === "moisturizer" && p.ingredients.some((i) => i.toLowerCase() === "niacinamide"))!.id];
  assert.equal(extras(service.build(input)).length, 0);
});

test("exclusions, existing treatments and direct product choices cannot bypass consent", () => {
  const excluded = request(); excluded.selectedProductIds = []; excluded.preferences.exclusions = ["niacinamide"];
  assert.equal(extras(service.build(excluded)).length, 0);
  for (const options of [{ consent: false }, { adult: false }, { alreadyUsingTreatment: true }]) {
    const input = request(options); input.selectedProductIds = ["minimalist-niacinamide-5"];
    assert.throws(() => service.build(input), /optional treatment no longer matches/);
  }
  const input = request(); input.selectedProductIds = ["minimalist-niacinamide-5", "minimalist-retinol-03"];
  assert.throws(() => service.build(input), /at most one/);
});

test("hydration does not add a redundant hyaluronic serum and excludes incomplete formulas", () => {
  const input = request({ goal: "hydration" }); input.analysis.scores = [{ concern: "moisture", score: 30 }];
  input.selectedProductIds = ["minimalist-b5", "cetaphil-sun"];
  assert.equal(extras(service.build(input)).length, 0);
  input.selectedProductIds = [];
  input.preferences.ownedCategories = ["cleanser", "moisturizer", "sunscreen"];
  assert.equal(extras(service.build(input))[0]?.product.treatmentGoal, "hydration");
  input.preferences.exclusions = ["oat"];
  assert.equal(extras(service.build(input)).length, 0);
});

test("mild breakout serums require matching live insight, consent, SPF and budget", () => {
  const input=request({goal:"breakouts",breakoutSeverity:"mild",dailySunscreen:true});
  input.analysis.scores.push({concern:"acne",score:35});
  const result=service.build(input);
  assert.equal(extras(result).length,1);
  assert.equal(extras(result)[0].product.treatmentGoal,"breakouts");
  assert.equal(extras(result)[0].product.eveningOnly,true);
  assert.ok(result.total<=result.budget);
  for(const patch of [{consent:false},{dailySunscreen:false},{healthClear:false}]) {
    assert.equal(extras(service.build({...input,preferences:{...input.preferences,treatments:{...input.preferences.treatments!,...patch}}})).length,0);
  }
  input.analysis.scores=input.analysis.scores.filter(score=>score.concern!=="acne");
  assert.equal(extras(service.build(input)).length,0);
});

test("severe or uncertain breakouts block all actives, including direct choices", () => {
  for(const breakoutSeverity of ["severe","unsure"] as const) {
    const input=request({breakoutSeverity});
    const result=service.build(input);
    assert.equal(extras(result).length,0);
    assert.match(result.treatmentMessage!,/dermatologist/);
    assert.ok(result.items.every(({product})=>!product.ingredientHighlights.join(" ").toLowerCase().match(/glycolic|salicylic|retinol/)));
    input.selectedProductIds=["minimalist-niacinamide-5"];
    assert.throws(()=>service.build(input),/no longer matches/);
  }
});

test("converted currencies obey the same total and alternative budget cap", () => {
  const converted = new RecommendationService(products.map((product) => ({ ...product, referenceCurrency: "USD", referencePrice: Math.ceil(product.referencePrice * 0.012 * 100) / 100 })));
  const input = request({}, 30); input.preferences.country = "US"; input.preferences.currency = "USD";
  const result = converted.build(input);
  assert.equal(extras(result).length, 1);
  assert.ok(result.total <= 30);
  for (const item of result.items) for (const alternative of item.alternatives) assert.ok(result.total - item.product.referencePrice + alternative.referencePrice <= 30);
});

