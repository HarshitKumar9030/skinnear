import type { Product } from "@/domain/schemas";
import { CurrencyService } from "./CurrencyService";

/** Country collections are editorial discovery coverage, never a stock assertion. */
export class MarketCatalogService {
  constructor(private readonly currencies = new CurrencyService()) {}

  select(products: readonly Product[], country?: string): Product[] {
    if (!country) return [...products];
    return products.filter(
      (product) => !product.markets.length || product.markets.includes(country),
    );
  }

  async price(products: readonly Product[], currency: string, country?: string) {
    const estimates = products.map((product) => {
      const regional = product.regionalPrices.find((estimate) => estimate.country === country);
      return {
        product,
        price: regional?.price ?? product.referencePrice,
        base: regional?.currency ?? product.referenceCurrency,
        sourceUrl: regional?.sourceUrl ?? product.sourceUrl,
      };
    });
    const quotes = new Map(
      await Promise.all(
        [...new Set(estimates.map((estimate) => estimate.base))].map(
          async (base) => [base, await this.currencies.quote(currency, base)] as const,
        ),
      ),
    );
    return {
      products: estimates.map(({ product, price, base, sourceUrl }) => ({
        ...product,
        referencePrice: Math.ceil(price * quotes.get(base)!.rate * 100) / 100,
        referenceCurrency: currency,
        sourceUrl,
      })),
      date: [...quotes.values()].find((quote) => quote.date)?.date,
    };
  }
}
