import type { RoutineRequest } from "@/domain/schemas";
import { ProductRepository } from "@/repositories/ProductRepository";
import { MarketCatalogService } from "./MarketCatalogService";
import { RecommendationService } from "./RecommendationService";

export class RoutineService {
  async build(input: RoutineRequest) {
    const catalog = await new ProductRepository().getCatalog();
    const markets = new MarketCatalogService();
    const priced = await markets.price(
      markets.select(catalog.products, input.preferences.country),
      input.preferences.currency,
      input.preferences.country,
    );
    const routine = new RecommendationService(priced.products).build(
      input,
      catalog.source,
    );
    return {
      ...routine,
      total: Math.round(routine.total * 100) / 100,
      currency: input.preferences.currency,
      exchangeRateDate: priced.date,
    };
  }
}
