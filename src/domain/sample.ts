import type { SkinAnalysis } from "./schemas";

export const SAMPLE_ANALYSIS: SkinAnalysis = {
  mode: "demo",
  skinProfile: [
    { region: "whole", skinType: "Combination" },
    { region: "t_zone", skinType: "Oily" },
    { region: "u_zone", skinType: "Dry" },
  ],
  scores: [
    { concern: "moisture", score: 58 },
    { concern: "redness", score: 71 },
    { concern: "oiliness", score: 76 },
    { concern: "pore", score: 82 },
    { concern: "acne", score: 79 },
  ],
};

export const CONCERN_LABELS = {
  moisture: "Hydration",
  redness: "Redness",
  oiliness: "Oil balance",
  pore: "Pores",
  acne: "Breakouts",
};

export const CATEGORY_LABELS = {
  cleanser: "Cleanse",
  moisturizer: "Hydrate",
  sunscreen: "Protect",
  serum: "Targeted serum",
  retinoid: "Optional retinol",
};
