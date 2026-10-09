import { z } from "zod";
import catalog from "@/data/products.json";
import { productSchema, type Product } from "@/domain/schemas";
import { MongoDatabase } from "@/lib/mongodb";

export interface ProductCatalog { products: Product[]; source: "bundled" | "mongodb" }

export class ProductRepository {
  async getCatalog(): Promise<ProductCatalog> {
    if (process.env.MONGODB_URI) {
      const db = await MongoDatabase.connect();
      const documents = await db.collection("products").find({}, { projection: { _id: 0 } }).limit(100).toArray();
      if (documents.length) return { products: z.array(productSchema).parse(documents), source: "mongodb" };
    }
    return { products: z.array(productSchema).parse(catalog), source: "bundled" };
  }
}
