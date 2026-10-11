import { z } from "zod";
import catalog from "@/data/products.json";
import { productSchema, type Product, type Routine } from "@/domain/schemas";
import { MongoDatabase } from "@/lib/mongodb";

export interface ProductCatalog {
  products: Product[];
  source: Routine["catalogSource"];
}

export class ProductRepository {
  async getCatalog(): Promise<ProductCatalog> {
    const bundled = z.array(productSchema).parse(catalog);
    if (process.env.MONGODB_URI) {
      try {
        const db = await MongoDatabase.connect();
        const documents = await db
          .collection("products")
          .find({}, { projection: { _id: 0 } })
          .limit(1000)
          .toArray();
        if (documents.length) {
          const reviewed = new Map(bundled.map((product) => [product.id, product]));
          const products = z
            .array(productSchema)
            .parse(documents)
            .map((product) => reviewed.get(product.id) ?? product);
          const ids = new Set(products.map((product) => product.id));
          const additions = bundled.filter((product) => !ids.has(product.id));
          return {
            products: [...products, ...additions],
            source: additions.length ? "mixed" : "mongodb",
          };
        }
      } catch {
        /* The reviewed read-only catalog remains usable; saving and public quotas still require MongoDB. */
      }
    }
    return { products: bundled, source: "bundled" };
  }
}
