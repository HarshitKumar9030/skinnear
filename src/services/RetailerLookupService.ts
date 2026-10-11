import links from "@/data/retailer-links.json";
import type { Product, Retailer, RetailerLookup } from "@/domain/schemas";

/** Public retailer destinations; no API key, inventory claims, or location leakage. */
export class RetailerLookupService {
  private readonly links = links as Record<string, Partial<Record<Retailer, string>>>;

  forProduct(product: Product, country: string): RetailerLookup[] {
    if (country !== "IN") {
      const url = new URL("https://www.google.com/search");
      url.search = new URLSearchParams({
        tbm: "shop",
        q: `${product.brand} ${product.name} ${product.size}`,
        gl: country.toLowerCase(),
        hl: "en",
      }).toString();
      return [
        {
          retailer: "google-shopping",
          name: "Google Shopping",
          url: url.toString(),
          kind: "retailer search",
          sizeNote: `Confirm ${product.size} and delivery with the seller.`,
          availability: "check with retailer",
        },
      ];
    }
    return (["blinkit", "zepto"] as Retailer[]).map((retailer) => {
      const direct = this.links[product.id]?.[retailer];
      const query = `${product.brand} ${product.name}`;
      const searchUrl =
        retailer === "blinkit"
          ? new URL("https://blinkit.com/s/")
          : new URL("https://www.zepto.com/search");
      searchUrl.searchParams.set(retailer === "blinkit" ? "q" : "query", query);
      return {
        retailer,
        name: retailer === "blinkit" ? "Blinkit" : "Zepto",
        url: direct || searchUrl.toString(),
        kind: direct ? "product page" : "retailer search",
        sizeNote: `Look for ${product.size}; confirm the selected variant.`,
        availability: "check with retailer",
      };
    });
  }
}
