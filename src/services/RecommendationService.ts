import type { Category, Product, Routine, RoutineRequest } from "@/domain/schemas";
import { formatMoney } from "@/domain/regions";
import { CONCERN_LABELS } from "@/domain/sample";

const CATEGORIES: Category[] = ["cleanser", "moisturizer", "sunscreen"];

/** Pure domain service. No network, database, or React dependencies. */
export class RecommendationService {
  constructor(private readonly products: readonly Product[]) {}

  build(request: RoutineRequest, catalogSource: Routine["catalogSource"] = "bundled"): Routine {
    const { preferences, analysis, excludedProductIds } = request;
    const categories = CATEGORIES.filter((category) => !preferences.ownedCategories.includes(category));
    const candidates = categories.map((category) => this.products
      .filter((product) => product.category === category && !excludedProductIds.includes(product.id))
      .filter((product) => !preferences.fragranceFree || product.fragranceFree)
      .filter((product) => !preferences.sensitive || category === "sunscreen" || product.sensitive)
      .filter((product) => this.matchesExclusions(product, preferences.exclusions))
      .sort((a, b) => this.relevance(b, analysis) - this.relevance(a, analysis) || a.referencePrice - b.referencePrice));

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
      for (const product of candidates[index]) {
        visit(index + 1, [...selected, product], cost + product.referencePrice, score + this.relevance(product, analysis));
      }
    };
    visit(0, [], 0, 0);
    const selected: Product[] = best ?? [];
    const feasible = best !== null;
    return {
      items: selected.map((product) => ({
        product,
        reason: this.explain(product, analysis),
        alternatives: candidates[categories.indexOf(product.category)].filter((p) => p.id !== product.id),
      })),
      total: selected.reduce((sum, product) => sum + product.referencePrice, 0),
      budget: preferences.budget,
      feasible,
      message: feasible ? (categories.length ? "A simple starting point, selected within your planning budget." : "You already own all three essentials. No new purchases needed.")
        : Number.isFinite(minimum) ? `The lowest matching routine is ${formatMoney(minimum, preferences.currency)}. Increase your budget or mark products you already own.`
          : "No complete routine matches these preferences. Try fewer exclusions or review your existing products. Products with incomplete ingredient data are excluded when you specify ingredients to avoid.",
      ownedCategories: preferences.ownedCategories,
      catalogSource,
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
