import type { EssentialCategory, Product, Routine, RoutineItem, RoutineRequest } from "@/domain/schemas";
import { formatMoney } from "@/domain/regions";
import { CONCERN_LABELS } from "@/domain/sample";
import { AppError } from "@/lib/errors";
import { TreatmentRecommendationService } from "./TreatmentRecommendationService";

const CATEGORIES: EssentialCategory[] = ["cleanser", "moisturizer", "sunscreen"];
const STEP_ORDER = { cleanser: 0, serum: 1, retinoid: 1, moisturizer: 2, sunscreen: 3 };

/** Pure domain service. No network, database, or React dependencies. */
export class RecommendationService {
  constructor(private readonly products: readonly Product[]) {}

  build(request: RoutineRequest, catalogSource: Routine["catalogSource"] = "bundled"): Routine {
    const { preferences, analysis, excludedProductIds } = request;
    const categories = CATEGORIES.filter((category) => !preferences.ownedCategories.includes(category));
    const eligible = this.products
      .filter((product) => !excludedProductIds.includes(product.id))
      .filter((product) => !preferences.fragranceFree || product.fragranceFree)
      .filter((product) => !preferences.sensitive || product.category === "sunscreen" || product.sensitive)
      .filter((product) => this.matchesExclusions(product, preferences.exclusions));
    const treatmentIds = (request.selectedProductIds ?? []).filter((id) => this.products.some((product) => product.id === id && ["serum", "retinoid"].includes(product.category)));
    if (treatmentIds.length > 1) throw new AppError("Choose at most one optional treatment.", 400);
    const candidates = categories.map((category) => eligible
      .filter((product) => product.category === category)
      .sort((a, b) => this.relevance(b, analysis) - this.relevance(a, analysis) || a.referencePrice - b.referencePrice));
    const chosen = (request.selectedProductIds ?? []).filter((id) => !treatmentIds.includes(id)).map((id) => {
      const product = candidates.flat().find((candidate) => candidate.id === id);
      if (!product) throw new AppError("That product no longer matches your preferences. Reset choices and try again.", 400);
      return product;
    });
    if (new Set(chosen.map((product) => product.category)).size !== chosen.length) {
      throw new AppError("Choose only one product for each routine step.", 400);
    }
    const selectionPools = candidates.map((pool, index) => {
      const pinned = chosen.find((product) => product.category === categories[index]);
      return pinned ? [pinned] : pool;
    });

    // Exhaustive combinations are intentional: the small curated catalog permits
    // optimizing the entire basket, instead of greedily overspending one step.
    let best: Product[] | null = null;
    let bestScore = -Infinity;
    let minimum = Infinity;
    const visit = (index: number, selected: Product[], cost: number, score: number) => {
      if (index === candidates.length) {
        minimum = Math.min(minimum, cost);
        if (cost <= preferences.budget && (score > bestScore || (score === bestScore && cost < (best?.reduce((n, p) => n + p.referencePrice, 0) ?? Infinity)))) {
          best = [...selected];
          bestScore = score;
        }
        return;
      }
      for (const product of selectionPools[index]) {
        visit(index + 1, [...selected, product], cost + product.referencePrice, score + this.relevance(product, analysis));
      }
    };
    visit(0, [], 0, 0);
    const selected: Product[] = best ?? [];
    const feasible = best !== null;
    const essentialTotal = selected.reduce((sum, product) => sum + product.referencePrice, 0);
    const treatmentService = new TreatmentRecommendationService();
    const treatment = feasible ? treatmentService.select(request, selected, eligible, preferences.budget - essentialTotal, treatmentIds[0])
      : { alternatives: [], message: "Optional treatments skipped: cover your essentials first." };
    const total = essentialTotal + (treatment.product?.referencePrice ?? 0);
    const items: RoutineItem[] = selected.map((product) => ({
      product,
      reason: this.explain(product, analysis),
      alternatives: candidates[categories.indexOf(product.category as EssentialCategory)]
        .filter((candidate) => candidate.id !== product.id && total - product.referencePrice + candidate.referencePrice <= preferences.budget)
        .filter((candidate) => !treatment.product || !treatmentService.duplicatesActive(treatment.product, [candidate])),
    }));
    if (treatment.product) items.push({
      product: treatment.product,
      reason: treatment.product.category === "retinoid"
        ? "Optional OTC retinol for your stated persistent fine-line goal, with separate consent. The scan does not assess fine lines or establish a medical need."
        : "Optional serum for your stated persistent concern and matching skin insight; no medical need is inferred.",
      alternatives: treatment.alternatives,
    });
    return {
      items: items.sort((a, b) => STEP_ORDER[a.product.category] - STEP_ORDER[b.product.category]),
      total,
      budget: preferences.budget,
      feasible,
      message: feasible ? (categories.length ? "A simple starting point, selected within your planning budget." : "You already own all three essentials. No new purchases needed.")
        : Number.isFinite(minimum) ? `The lowest matching routine is ${formatMoney(minimum, preferences.currency)}. Increase your budget or mark products you already own.`
          : "No complete routine matches these preferences. Try fewer exclusions or review your existing products. Products with incomplete ingredient data are excluded when you specify ingredients to avoid.",
      ownedCategories: preferences.ownedCategories,
      catalogSource,
      treatmentMessage: treatment.message,
    };
  }

  private matchesExclusions(product: Product, exclusions: string[]): boolean {
    if (!exclusions.length) return true;
    if (!product.ingredientsComplete) return false;
    const normalized = product.ingredients.join(" ").toLowerCase();
    return exclusions.every((word) => !normalized.includes(word.toLowerCase()));
  }

  private relevance(product: Product, analysis: RoutineRequest["analysis"]): number {
    return analysis.scores.reduce((score, result) => score + (product.concerns.includes(result.concern) ? 100 - result.score : 0), 0);
  }

  private explain(product: Product, analysis: RoutineRequest["analysis"]): string {
    if (product.category === "sunscreen") return "The daytime protection step. Selected for your preferences and planning budget; check the current label before use.";
    const matching = analysis.scores.filter((score) => product.concerns.includes(score.concern)).sort((a, b) => a.score - b.score);
    const focus = matching[0];
    return focus ? `Selected with your ${CONCERN_LABELS[focus.concern].toLowerCase()} insight in mind. ${product.ingredientHighlights.slice(0, 2).join(" and ")} are listed by the brand.` : "A simple everyday essential that matches your stated preferences.";
  }
}
