import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/domain/schemas";
import { RetailerLookupService } from "@/services/RetailerLookupService";

const lookup = new RetailerLookupService();

export function RetailerLinks({ product, country = "IN", detailed = false }: { product: Product; country?: string; detailed?: boolean }) {
  return <div className={`retailer-links ${detailed ? "detailed" : ""}`}>
    {lookup.forProduct(product, country).map((retailer) => <a key={retailer.retailer} className={`retailer-link ${retailer.retailer}`} href={retailer.url} target="_blank" rel="noreferrer" aria-label={`Look up ${product.name} on ${retailer.name}`}>
      <span className="retailer-name">{retailer.name}</span>{detailed ? <span className="retailer-description">{retailer.kind === "product page" ? "View product" : "Search product"} · confirm {product.size}</span> : null}<ArrowUpRight size={15} aria-hidden />
    </a>)}
  </div>;
}
