import { test } from "node:test";
import assert from "node:assert/strict";
import catalog from "../src/data/products.json";
import { productSchema } from "../src/domain/schemas";
import { GeminiClient } from "../src/services/GeminiClient";
import { NarrationTokenService } from "../src/services/NarrationTokenService";
import { RoutineExplanationService } from "../src/services/RoutineExplanationService";
import { ProductRetrievalService } from "../src/services/ProductRetrievalService";
import { PortableRoutineService } from "../src/services/PortableRoutineService";
import { RecommendationService } from "../src/services/RecommendationService";
import { SAMPLE_ANALYSIS } from "../src/domain/sample";

const products = catalog.map((product) => productSchema.parse(product));
const selected = products.slice(0, 3);
const snapshot = {
  version: 1 as const,
  kind: "routine" as const,
  currency: "INR",
  budget: 3000,
  items: selected.map((product) => ({ id: product.id, price: product.referencePrice })),
};
class FakeGemini extends GeminiClient {
  prompt = "";
  result = JSON.stringify({
    summary: "This simple routine supports cleansing, hydration and daytime protection.",
    steps: selected.map((product) => ({
      id: product.id,
      explanation: "This step may help with your everyday cosmetic care.",
    })),
  });
  async text(prompt: string) {
    this.prompt = prompt;
    return this.result;
  }
}

test("grounded explanation includes only selected IDs, public facts and approved narration", async () => {
  const model = new FakeGemini();
  const result = await new RoutineExplanationService(model).explain(
    snapshot,
    products,
    "visitor-a",
  );
  assert.deepEqual(
    result.steps.map((step) => step.id),
    snapshot.items.map((item) => item.id),
  );

  const context = JSON.parse(model.prompt);
  assert.deepEqual(Object.keys(context).sort(), ["budget", "products", "total"]);
  assert.ok(!/scores|selfie|city|pincode|analysis/.test(model.prompt));
  const transcript = new NarrationTokenService().verify(result.narrationToken, "visitor-a");
  assert.ok(transcript.includes(result.summary));
  assert.equal(transcript, result.transcript);
  assert.equal(result.sources.length, 3);
});
test("hallucinated IDs, duplicate steps, medical impersonation and wishlists are rejected", async () => {
  const model = new FakeGemini(),
    service = new RoutineExplanationService(model);
  const valid = JSON.parse(model.result);
  model.result = JSON.stringify({
    ...valid,
    steps: [...valid.steps, { id: "unknown", explanation: "Add another product to your routine." }],
  });
  await assert.rejects(service.explain(snapshot, products, "a"), /did not match/);
  model.result = JSON.stringify({
    ...valid,
    steps: [valid.steps[0], valid.steps[0], valid.steps[2]],
  });
  await assert.rejects(service.explain(snapshot, products, "a"), /did not match/);
  model.result = JSON.stringify({
    ...valid,
    summary: "I am your doctor and I prescribe this routine.",
  });
  await assert.rejects(service.explain(snapshot, products, "a"), /safely generated/);
  await assert.rejects(
    service.explain({ ...snapshot, kind: "list" }, products, "a"),
    /Choose a routine/,
  );
});
test("speech tokens bind the exact approved transcript to one browser and expire", () => {
  let now = 1000;
  const tokens = new NarrationTokenService(() => now);
  const token = tokens.issue("Approved skincare explanation.", "a");
  assert.equal(tokens.verify(token, "a"), "Approved skincare explanation.");
  for (const bad of [token + ".extra", token.slice(0, -1) + "x", "invalid"])
    assert.throws(() => tokens.verify(bad, "a"), /expired or belongs/);
  assert.throws(() => tokens.verify(token, "b"), /another browser/);
  now += 16 * 60000;
  assert.throws(() => tokens.verify(token, "a"), /expired/);
});
test("embedding retrieval scores current products and ignores stale metadata", async () => {
  const service = new ProductRetrievalService();
  const ranking = await service.rank(products, SAMPLE_ANALYSIS);
  assert.equal(ranking.size, products.length);
  assert.ok(
    [...ranking.values()].every((value) => Number.isFinite(value) && value >= 0 && value <= 1),
  );
  const stale = await service.rank(
    [{ ...products[0], benefits: ["Completely changed formula facts"] }],
    SAMPLE_ANALYSIS,
  );
  assert.equal(stale.size, 0);
  const routine = new RecommendationService(products, ranking).build({
    analysis: SAMPLE_ANALYSIS,
    preferences: {
      budget: 1500,
      currency: "INR",
      country: "IN",
      city: "Test city",
      pincode: "",
      sensitive: false,
      fragranceFree: true,
      exclusions: [],
      ownedCategories: [],
    },
    excludedProductIds: [],
  });
  assert.equal(routine.feasible, true);
  assert.ok(routine.total <= 1500);
  assert.ok(routine.items.every((item) => item.product.routineEligible));
});
test("provider errors and broken audio responses remain sanitized", async () => {
  const original = globalThis.fetch,
    previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "unit-test-key";
  try {
    globalThis.fetch = async () => new Response("private-provider-diagnostics", { status: 403 });
    await assert.rejects(
      new GeminiClient().text("public facts", "instructions"),
      /Gemini could not complete/,
    );
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          status: "completed",
          steps: [
            {
              type: "model_output",
              content: [{ type: "audio", data: Buffer.from("broken audio").toString("base64") }],
            },
          ],
        }),
      );
    await assert.rejects(
      new GeminiClient().speech("Approved transcript"),
      /Voice generation was incomplete/,
    );
    const portable = new PortableRoutineService();
    assert.ok(portable.encode(snapshot));
  } finally {
    globalThis.fetch = original;
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});
