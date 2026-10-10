import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Product, SkinAnalysis } from "@/domain/schemas";

const entry = z.object({hash:z.string(),vector:z.array(z.number().finite()).length(768)});
const indexSchema = z.object({model:z.literal("gemini-embedding-001"), dimensions:z.literal(768), products:z.record(z.string(),entry), queries:z.record(z.string(),entry)});
type Index = z.infer<typeof indexSchema>;
let cached: Promise<Index | null> | undefined;

/** Offline semantic retrieval: only public catalog text was sent to the embedder. */
export class ProductRetrievalService {
  static document(product: Product) {
    return [product.brand,product.name,product.category,product.ingredientHighlights.join(" "),product.benefits.join(" ")].join(" | ");
  }
  private load() {
    cached ??= readFile(path.join(process.cwd(),"src/data/product-embeddings.json"),"utf8")
      .then((text)=>indexSchema.parse(JSON.parse(text))).catch(()=>null);
    return cached;
  }
  async rank(products: readonly Product[], analysis: SkinAnalysis): Promise<Map<string,number>> {
    const index = await this.load();
    const ranking = new Map<string,number>();
    if (!index) return ranking;
    const queries = analysis.scores.map((score)=>({vector:index.queries[score.concern]?.vector,weight:Math.max(1,100-score.score)})).filter((query)=>query.vector);
    for (const product of products) {
      const document = index.products[product.id];
      if (!document || document.hash !== createHash("sha256").update(ProductRetrievalService.document(product)).digest("hex")) continue;
      const weight = queries.reduce((sum,query)=>sum+query.weight,0);
      if (!weight) continue;
      const score = queries.reduce((sum,query)=>sum+query.weight*document.vector.reduce((dot,value,i)=>dot+value*query.vector![i],0),0)/weight;
      ranking.set(product.id,Math.max(0,Math.min(1,score)));
    }
    return ranking;
  }
  async retrieve(products: readonly Product[], analysis: SkinAnalysis, maximum = 8) {
    const ranking = await this.rank(products,analysis);
    return [...products].sort((a,b)=>(ranking.get(b.id)??0)-(ranking.get(a.id)??0)).slice(0,maximum);
  }
}
