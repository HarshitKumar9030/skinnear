import { test } from "node:test";
import assert from "node:assert/strict";
import { GeminiClient } from "../src/services/GeminiClient";
import {
  SkinExplanationService,
  skinExplanationInput,
} from "../src/services/SkinExplanationService";
import { NarrationTokenService } from "../src/services/NarrationTokenService";

const input = {
  mode: "live" as const,
  scores: [
    { concern: "moisture" as const, score: 58 },
    { concern: "redness" as const, score: 71 },
  ],
};
class FakeSkinGemini extends GeminiClient {
  prompt = "";
  system = "";
  result = JSON.stringify({
    summary:
      "This photo suggests hydration deserves attention relative to the other reported area.",
    steps: [
      {
        id: "redness",
        explanation: "This score describes the appearance of redness in the photo.",
      },
      {
        id: "moisture",
        explanation:
          "Hydration is the lower favorable score in this report, which is a cosmetic observation.",
      },
    ],
  });
  async text(prompt: string, system: string) {
    this.prompt = prompt;
    this.system = system;
    return this.result;
  }
}

test("skin explanation uses only consented scores, preserves their order and signs the approved narration", async () => {
  const model = new FakeSkinGemini();
  const result = await new SkinExplanationService(model).explain(input, "visitor");
  assert.deepEqual(JSON.parse(model.prompt), input);
  assert.deepEqual(
    result.steps.map((step) => step.id),
    ["moisture", "redness"],
  );
  assert.match(model.system, /Higher scores mean a more favorable/);
  assert.match(model.system, /BEFORE routine selection/);
  const transcript = new NarrationTokenService().verify(result.narrationToken, "visitor");
  assert.equal(transcript, result.transcript);

  const demo = await new SkinExplanationService(model).explain(
    { ...input, mode: "demo" },
    "visitor",
  );
  assert.match(demo.summary, /^This is an illustrative sample, not an assessment of your skin/);
  const valid = JSON.parse(model.result);
  model.result = JSON.stringify({
    ...valid,
    summary: "These are cosmetic observations, not a medical diagnosis.",
  });
  await assert.doesNotReject(new SkinExplanationService(model).explain(input, "visitor"));
});

test("skin narration rejects invented concerns, repeated concerns, invented numbers and diagnoses", async () => {
  const model = new FakeSkinGemini(),
    service = new SkinExplanationService(model);
  const valid = JSON.parse(model.result);
  for (const steps of [
    valid.steps.slice(0, 1),
    [valid.steps[0], valid.steps[0]],
    [{ ...valid.steps[0], id: "acne" }, valid.steps[1]],
  ]) {
    model.result = JSON.stringify({ ...valid, steps });
    await assert.rejects(service.explain(input, "visitor"), /reliably match/);
  }
  for (const summary of [
    "You have eczema and need treatment.",
    "Your hydration is 58 percent.",
    "I am your doctor and I prescribe retinol.",
  ]) {
    model.result = JSON.stringify({ ...valid, summary });
    await assert.rejects(service.explain(input, "visitor"), /reliably match/);
  }
});

test("skin-score boundary rejects hidden images, arbitrary text, duplicates and excessive score payloads", () => {
  assert.equal(skinExplanationInput.safeParse(input).success, true);
  for (const invalid of [
    { ...input, photo: "private-photo" },
    { ...input, scores: [{ ...input.scores[0], maskUrl: "https://example.com/private-mask" }] },
    { ...input, scores: [input.scores[0], input.scores[0]] },
    { ...input, scores: [{ concern: "moisture", score: 101 }] },
    { ...input, scores: Array(6).fill(input.scores[0]) },
  ])
    assert.equal(skinExplanationInput.safeParse(invalid).success, false);
});
