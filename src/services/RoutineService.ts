import type { RoutineRequest } from "@/domain/schemas";
import { ProductRepository } from "@/repositories/ProductRepository";
import { MarketCatalogService } from "./MarketCatalogService";
import { RecommendationService } from "./RecommendationService";
import { BudgetComparisonService } from "./BudgetComparisonService";
import { ProductRetrievalService } from "./ProductRetrievalService";

export class RoutineService {
  private async prepare(input: RoutineRequest) {
    const catalog = await new ProductRepository().getCatalog();
    const markets = new MarketCatalogService();
    const priced = await markets.price(
      markets.select(catalog.products, input.preferences.country),
      input.preferences.currency,
      input.preferences.country,
    );
    const ranking = await new ProductRetrievalService().rank(priced.products, input.analysis);
    return {
      engine: new RecommendationService(priced.products, ranking),
      source: catalog.source,
      date: priced.date,
    };
  }
  async build(input: RoutineRequest) {
    const { engine, source, date } = await this.prepare(input);
    const routine = engine.build(input, source);
    return {
      ...routine,
      total: Math.round(routine.total * 100) / 100,
      currency: input.preferences.currency,
      exchangeRateDate: date,
    };
  }
  async compare(input: RoutineRequest) {
    const { engine, source, date } = await this.prepare(input);
    const comparison = new BudgetComparisonService(engine).compare(input, source);
    return {
      ...comparison,
      scenarios: comparison.scenarios.map((scenario) => ({
        ...scenario,
        routine: {
          ...scenario.routine,
          total: Math.round(scenario.routine.total * 100) / 100,
          currency: input.preferences.currency,
          exchangeRateDate: date,
        },
      })),
    };
  }
}
