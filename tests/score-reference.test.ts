import { test } from "node:test";
import assert from "node:assert/strict";
import { cosmeticScoreBand } from "../src/domain/score-reference";
import { SAMPLE_ANALYSIS } from "../src/domain/sample";

test("cosmetic bands preserve the published boundary values", () => {
  for (const [score, band] of [
    [0, "Needs attention"],
    [39, "Needs attention"],
    [40, "Average"],
    [69, "Average"],
    [70, "Good"],
    [84, "Good"],
    [85, "Excellent"],
    [100, "Excellent"],
  ] as const)
    assert.equal(cosmeticScoreBand(score), band);
  for (const score of [NaN, Infinity, -1, 101])
    assert.equal(cosmeticScoreBand(score), "Unavailable");
});

test("sample report includes all five requested concerns without duplicates", () => {
  assert.deepEqual(
    new Set(SAMPLE_ANALYSIS.scores.map(({ concern }) => concern)),
    new Set(["moisture", "redness", "oiliness", "pore", "acne"]),
  );
  assert.equal(SAMPLE_ANALYSIS.scores.length, 5);
});
