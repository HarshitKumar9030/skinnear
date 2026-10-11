import type { Product, RoutineRequest } from "@/domain/schemas";
import { AppError } from "@/lib/errors";

type Selection = { product?: Product; alternatives: Product[]; message: string };

/** Conservative cosmetic add-ons, never a diagnosis or an essential purchase. */
export class TreatmentRecommendationService {
  select(
    request: RoutineRequest,
    essentials: readonly Product[],
    candidates: readonly Product[],
    remaining: number,
    pinnedId?: string,
  ): Selection {
    const options = request.preferences.treatments;
    const skip = (message: string): Selection => {
      if (pinnedId)
        throw new AppError(
          "That optional treatment no longer matches your consent, preferences or remaining budget. Reset choices.",
          400,
        );
      return { alternatives: [], message };
    };
    if (options?.breakoutSeverity === "severe")
      return skip(
        "Deep, painful or scarring breakouts need a dermatologist. No acne serum or retinoid prescribed from this scan; keep the basics gentle while arranging care.",
      );
    if (options?.breakoutSeverity === "unsure")
      return skip(
        "Uncertain breakout symptoms need professional advice before adding an active. Keep your routine gentle and ask a dermatologist.",
      );
    if (!options?.consent) return skip("No targeted serum added without your consent.");
    if (options.goal === "none") return skip("No extra product needed without a specific goal.");
    if (!options.basicsEstablished)
      return skip(
        "Start with consistent cleansing, moisturizing and sun protection. Revisit extras only if your concern persists.",
      );
    if (!options.adult || !options.healthClear)
      return skip(
        "Optional treatments skipped: the safety confirmations are incomplete. Ask a dermatologist about suitable options.",
      );
    if (options.alreadyUsingTreatment)
      return skip("You already use a treatment. No additional active or duplicate purchase added.");
    if (
      request.preferences.sensitive ||
      request.analysis.scores.some((score) => score.concern === "redness" && score.score < 60)
    )
      return skip(
        "Keep this routine gentle. Optional actives skipped because of sensitivity or the redness insight.",
      );
    if (request.analysis.mode !== "live")
      return skip(
        "Sample scores cannot justify a treatment recommendation. Use a live scan and your own persistent concern.",
      );
    if (options.goal === "fine-lines") {
      if (!options.retinoidConsent || !options.dailySunscreen)
        return skip(
          "Retinol skipped: separate retinol consent and daily sunscreen confirmation are required.",
        );
    } else if (options.goal === "breakouts") {
      if (options.breakoutSeverity !== "mild")
        return skip(
          "Confirm mild blackheads or occasional small breakouts first. Severe or uncertain symptoms need a dermatologist, not a product prescription.",
        );
      if (!options.dailySunscreen)
        return skip(
          "Confirm daily broad-spectrum SPF 30+ before considering an exfoliating serum.",
        );
      if (!request.analysis.scores.some((score) => score.concern === "acne" && score.score < 60))
        return skip(
          "The scan does not provide a matching breakout insight. No acne serum added; a photo cannot establish a diagnosis.",
        );
    } else {
      const concerns = options.goal === "hydration" ? ["moisture"] : ["oiliness", "pore"];
      // A product-selection threshold, not a clinically validated need assessment.
      if (
        !request.analysis.scores.some(
          (score) => concerns.includes(score.concern) && score.score < 60,
        )
      )
        return skip(
          "Your goal and scan do not support adding another product. Keep the essentials and save the remaining budget.",
        );
    }
    const matching = candidates
      .filter((product) => product.treatmentGoal === options.goal)
      .filter(
        (product) => product.category === (options.goal === "fine-lines" ? "retinoid" : "serum"),
      )
      .filter((product) => !this.duplicatesActive(product, essentials))
      .filter((product) => product.referencePrice <= remaining)
      .sort((a, b) => a.referencePrice - b.referencePrice || a.id.localeCompare(b.id));
    const product = pinnedId ? matching.find((product) => product.id === pinnedId) : matching[0];
    if (!product)
      return skip(
        "No suitable extra fits after your essentials, ingredient preferences and remaining budget. Nothing added; your budget stays unchanged.",
      );
    return {
      product,
      alternatives: matching.filter((candidate) => candidate.id !== product.id),
      message: "One focused step fits your goal and remaining budget. Introduce it gradually.",
    };
  }

  duplicatesActive(product: Product, essentials: readonly Product[]): boolean {
    const active = product.primaryActive?.toLowerCase();
    if (!active) return true;
    return essentials.some((essential) =>
      [...essential.ingredients, ...essential.ingredientHighlights]
        .join(" ")
        .toLowerCase()
        .includes(active),
    );
  }
}
