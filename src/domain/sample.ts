import type { SkinAnalysis } from "./schemas";

export const SAMPLE_ANALYSIS: SkinAnalysis = {
  mode: "demo",
  scores: [
    { concern: "moisture", score: 58 },
    { concern: "redness", score: 71 },
    { concern: "oiliness", score: 76 },
    { concern: "pore", score: 82 },
  ],
};

export const CONCERN_LABELS = {
  moisture: "Hydration",
  redness: "Redness",
  oiliness: "Oil balance",
  pore: "Pores",
};

export const CATEGORY_LABELS = {
  cleanser: "Cleanse",
  moisturizer: "Hydrate",
  sunscreen: "Protect",
  serum: "Optional serum",
  retinoid: "Optional retinol",
};
