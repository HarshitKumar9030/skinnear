import { DEFAULT_TREATMENT_PREFERENCES, type RoutineRequest, type Routine } from "@/domain/schemas";
import type { BudgetComparison } from "@/domain/budget-lab";
import { RecommendationService } from "./RecommendationService";

/** Counterfactual baskets reuse identical regional prices and eligibility rules. */
export class BudgetComparisonService {
  constructor(private readonly recommendations: RecommendationService) {}

  compare(input: RoutineRequest, source: Routine["catalogSource"] = "bundled"): BudgetComparison {
    const cap = input.preferences.budget;
    const definitions = [
      {
        id: "essentials" as const,
        label: "Lean essentials",
        description: "Lowest-cost matching basics. No extra active.",
        budget: cap,
        treatments: {
          ...DEFAULT_TREATMENT_PREFERENCES,
          breakoutSeverity: input.preferences.treatments?.breakoutSeverity ?? "none",
        },
        strategy: "cost" as const,
      },
      {
        id: "balanced" as const,
        label: "Save some room",
        description: "Explore a cap up to 30% lower.",
        budget: Math.max(1, Math.floor(cap * 0.7 * 100) / 100),
        treatments: input.preferences.treatments,
        strategy: "relevance" as const,
      },
      {
        id: "full" as const,
        label: "Your full cap",
        description: "Best matching selection within your current cap.",
        budget: cap,
        treatments: input.preferences.treatments,
        strategy: "relevance" as const,
      },
    ];
    return {
      cap,
      currency: input.preferences.currency,
      scenarios: definitions.map(({ id, label, description, budget, treatments, strategy }) => ({
        id,
        label,
        description,
        treatments,
        routine: this.recommendations.build(
          {
            ...input,
            selectedProductIds: [],
            preferences: { ...input.preferences, budget, treatments },
          },
          source,
          strategy,
        ),
      })),
    };
  }
}
