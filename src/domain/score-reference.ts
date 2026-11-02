/** General cosmetic bands published by Perfect Corp., not clinical cutoffs. */
export const COSMETIC_REFERENCE_MIN = 70;
export const SCORE_GUIDE_URL = "https://www.perfectcorp.com/business/products/ai-skin-analysis";

export function cosmeticScoreBand(score: number): string {
  if (!Number.isFinite(score) || score < 0 || score > 100) return "Unavailable";
  if (score < 40) return "Needs attention";
  if (score < COSMETIC_REFERENCE_MIN) return "Average";
  if (score < 85) return "Good";
  return "Excellent";
}
