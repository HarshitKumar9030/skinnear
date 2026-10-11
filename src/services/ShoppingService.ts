import { z } from "zod";
import { countryName } from "@/domain/regions";
import type { Listing, Product, ShoppingResult, Retailer } from "@/domain/schemas";
import { fetchJson, safeHttpsUrl } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { RetailerLookupService } from "./RetailerLookupService";

const resultSchema = z.object({
  error: z.string().optional(),
  shopping_results: z
    .array(
      z.object({
        title: z.string(),
        source: z.string().optional(),
        link: z.string().optional(),
        product_link: z.string().optional(),
        price: z.string().optional(),
      }),
    )
    .optional(),
});
const organicSchema = z.object({
  error: z.string().optional(),
  organic_results: z
    .array(z.object({ title: z.string(), link: z.string(), source: z.string().optional() }))
    .optional(),
});

export class ShoppingService {
  private readonly retailers = new RetailerLookupService();

  async lookup(
    product: Product,
    city: string,
    country: string,
    retailer?: Retailer,
  ): Promise<ShoppingResult> {
    const lookups = this.retailers
      .forProduct(product, country)
      .filter((lookup) => !retailer || lookup.retailer === retailer);
    if (!process.env.SERPAPI_API_KEY)
      return {
        listings: [],
        lookups,
        mode: "retailer-lookup",
        message:
          "Open a retailer to check today's price and availability at your delivery address.",
      };
    try {
      const listings = await this.search(product, city, country, retailer);
      return {
        listings,
        lookups,
        mode: "live-search",
        message: listings.length
          ? "Fresh search listings. Check the exact product variant and delivery address with the seller."
          : "No additional listings found. Try the retailer links below.",
      };
    } catch {
      // A provider outage must not disable direct retailer lookup.
      return {
        listings: [],
        lookups,
        mode: "retailer-lookup",
        message:
          "Additional seller search is temporarily unavailable. Use the shopping links below to check sellers directly.",
      };
    }
  }

  private async search(
    product: Product,
    city: string,
    country: string,
    retailer?: Retailer,
  ): Promise<Listing[]> {
    const key = process.env.SERPAPI_API_KEY;
    if (!key)
      throw new AppError(
        "Live shopping search is not connected yet. The brand page is available below.",
        503,
      );
    const url = new URL("https://serpapi.com/search.json");
    if (retailer) {
      const domain = retailer === "blinkit" ? "blinkit.com" : "zepto.com";
      url.search = new URLSearchParams({
        engine: "google",
        q: `site:${domain} ${product.brand} ${product.name} ${product.size}`,
        location: `${city}, ${countryName(country)}`,
        gl: country.toLowerCase(),
        hl: "en",
        api_key: key,
      }).toString();
      const result = organicSchema.parse(await fetchJson<unknown>(url));
      if (result.error) throw new AppError("Seller search is unavailable.", 502);
      return (result.organic_results ?? [])
        .filter((item) => {
          try {
            const parsed = new URL(item.link);
            return (
              parsed.protocol === "https:" &&
              (parsed.hostname === domain || parsed.hostname === `www.${domain}`)
            );
          } catch {
            return false;
          }
        })
        .slice(0, 5)
        .map((item) => ({
          title: item.title,
          seller: retailer === "blinkit" ? "Blinkit" : "Zepto",
          url: item.link,
          price: null,
          availability: "listing discovered",
          checkedAt: new Date().toISOString(),
        }));
    }
    url.search = new URLSearchParams({
      engine: "google_shopping",
      q: `${product.brand} ${product.name} ${product.size}`,
      location: `${city}, ${countryName(country)}`,
      gl: country.toLowerCase(),
      hl: "en",
      api_key: key,
    }).toString();
    const parsed = resultSchema.parse(await fetchJson<unknown>(url));
    if (parsed.error)
      throw new AppError(
        "Shopping search could not resolve this location. Try a larger nearby city.",
        502,
      );
    const seen = new Set<string>();
    return (parsed.shopping_results ?? [])
      .flatMap((result) => {
        const link = result.product_link || result.link;
        if (!link || !safeHttpsUrl(link) || seen.has(link)) return [];
        seen.add(link);
        return [
          {
            title: result.title,
            seller: result.source || "Seller listing",
            url: link,
            price: result.price || null,
            availability: "listing discovered" as const,
            checkedAt: new Date().toISOString(),
          },
        ];
      })
      .slice(0, 5);
  }
}
