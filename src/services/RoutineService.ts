import type { RoutineRequest } from "@/domain/schemas";
import { ProductRepository } from "@/repositories/ProductRepository";
import { CurrencyService } from "./CurrencyService";
import { RecommendationService } from "./RecommendationService";

export class RoutineService {
  async build(input: RoutineRequest) {
    const [catalog, quote] = await Promise.all([new ProductRepository().getCatalog(), new CurrencyService().quote(input.preferences.currency)]);
    const products = catalog.products.map((product) => ({ ...product, referencePrice: Math.ceil(product.referencePrice * quote.rate * 100) / 100 }));
    const routine = new RecommendationService(products).build(input, catalog.source);
    return { ...routine, total: Math.round(routine.total * 100) / 100, currency: input.preferences.currency, exchangeRateDate: quote.date };
  }
}
