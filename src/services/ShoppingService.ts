import { z } from "zod";
import type { Listing, Product } from "@/domain/schemas";
import { fetchJson, safeHttpsUrl } from "@/lib/http";
import { AppError } from "@/lib/errors";

const resultSchema = z.object({ error: z.string().optional(), shopping_results: z.array(z.object({ title: z.string(), source: z.string().optional(), link: z.string().optional(), product_link: z.string().optional(), price: z.string().optional() })).optional() });

export class ShoppingService {
  async search(product: Product, city: string): Promise<Listing[]> {
    const key = process.env.SERPAPI_API_KEY;
    if (!key) throw new AppError("Live shopping search is not connected yet. The brand page is available below.", 503);
    const url = new URL("https://serpapi.com/search.json");
    url.search = new URLSearchParams({ engine: "google_shopping", q: `${product.brand} ${product.name} ${product.size}`, location: `${city}, India`, gl: "in", hl: "en", api_key: key }).toString();
    const parsed = resultSchema.parse(await fetchJson<unknown>(url));
    if (parsed.error) throw new AppError("Shopping search could not resolve this location. Try a larger nearby city.", 502);
    const seen = new Set<string>();
    return (parsed.shopping_results ?? []).flatMap((result) => {
      const link = result.product_link || result.link;
      if (!link || !safeHttpsUrl(link) || seen.has(link)) return [];
      seen.add(link);
      return [{ title: result.title, seller: result.source || "Seller listing", url: link, price: result.price || null, availability: "listing discovered" as const, checkedAt: new Date().toISOString() }];
    }).slice(0, 5);
  }
}
