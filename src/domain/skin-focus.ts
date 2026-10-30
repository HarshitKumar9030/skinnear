import type { Concern, SkinAnalysis } from "./schemas";

export const SKIN_FOCUS: Record<
  Concern,
  { title: string; observation: string; action: string; step: string }
> = {
  moisture: {
    title: "Give hydration a little room.",
    observation:
      "This score describes visible hydration cues in this scan; it does not measure your skin barrier directly.",
    action:
      "Keep cleansing gentle and make moisturizer a consistent step. Extra actives can wait until the basics feel comfortable.",
    step: "Cleanse gently → Hydrate → Protect",
  },
  redness: {
    title: "Keep care calm and simple.",
    observation: "The overlay highlights visible redness. A photo cannot tell us its cause.",
    action:
      "Start with a gentle, fragrance-free routine if it suits you. Persistent irritation deserves a clinician's assessment before adding actives.",
    step: "Gentle cleanse → Moisturize → Protect",
  },
  oiliness: {
    title: "Balance without stripping.",
    observation: "This score reflects visible oil-related cues under the lighting of this photo.",
    action:
      "Keep a gentle cleanser and a comfortable moisturizer in the routine. Avoid adding several oil-control products at once.",
    step: "Cleanse → Lightweight hydration → Protect",
  },
  pore: {
    title: "Think comfort, then texture.",
    observation:
      "This scan assesses the visible appearance of pores. Pores are a normal part of skin.",
    action:
      "A consistent cleanse, moisturize and sunscreen routine is a useful starting point. Targeted treatments stay separate and require your opt-in.",
    step: "Cleanse → Hydrate → Protect",
  },
  acne: {
    title: "Give breakouts a thoughtful plan.",
    observation:
      "The scan highlights visible breakout cues; it cannot establish acne severity or a diagnosis.",
    action:
      "Keep the essentials gentle. Painful, deep, scarring or persistent breakouts need a clinician, rather than automatically adding a stronger serum.",
    step: "Gentle essentials → Assess comfort → Review treatments",
  },
};

/** Lower cosmetic scores become the first focus, without inventing a diagnosis. */
export function orderedSkinScores(analysis: SkinAnalysis) {
  return [...analysis.scores].sort((a, b) => a.score - b.score);
}
