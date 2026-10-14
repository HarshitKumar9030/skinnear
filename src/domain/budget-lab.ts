import type { Routine, TreatmentPreferences } from "./schemas";

export interface BudgetScenario {
  id: "essentials" | "balanced" | "full";
  label: string;
  description: string;
  routine: Routine;
  treatments?: TreatmentPreferences;
}

export interface BudgetComparison {
  scenarios: BudgetScenario[];
  currency: string;
  cap: number;
}
