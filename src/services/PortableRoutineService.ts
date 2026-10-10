import { z } from "zod";
import { CURRENCIES, formatMoney } from "@/domain/regions";
import type { Product, Routine } from "@/domain/schemas";
import { CATEGORY_LABELS } from "@/domain/sample";

const portableSchema = z
  .object({
    version: z.literal(1),
    kind: z.enum(["routine", "list"]),
    currency: z.string().refine((value) => CURRENCIES.includes(value)),
    budget: z.number().positive().max(10000000).optional(),
    items: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z0-9-]{1,80}$/),
          price: z.number().positive().max(10000000),
        }),
      )
      .min(1)
      .max(50),
  })
  .superRefine((value, context) => {
    if (new Set(value.items.map((item) => item.id)).size !== value.items.length)
      context.addIssue({ code: "custom", message: "Duplicate products" });
    if (
      value.kind === "routine" &&
      (!value.budget ||
        value.items.reduce((total, item) => total + item.price, 0) >
          value.budget + 0.001)
    )
      context.addIssue({
        code: "custom",
        message: "Routine exceeds its budget",
      });
  });
export type PortableRoutine = z.infer<typeof portableSchema>;
const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );

/** Portable projection deliberately contains no analysis, consent, city or identity. */
export class PortableRoutineService {
  fromRoutine(routine: Routine, currency: string): PortableRoutine {
    return portableSchema.parse({
      version: 1,
      kind: "routine",
      currency,
      budget: routine.budget,
      items: routine.items.map(({ product }) => ({
        id: product.id,
        price: product.referencePrice,
      })),
    });
  }
  fromProducts(
    products: readonly Product[],
    currency: string,
  ): PortableRoutine {
    return portableSchema.parse({
      version: 1,
      kind: "list",
      currency,
      items: products.map((product) => ({
        id: product.id,
        price: product.referencePrice,
      })),
    });
  }
  encode(snapshot: PortableRoutine): string {
    return btoa(JSON.stringify(portableSchema.parse(snapshot)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }
  decode(encoded: string, catalog: readonly Product[]): PortableRoutine {
    if (!/^[A-Za-z0-9_-]{1,16000}$/.test(encoded))
      throw new Error("This shared plan is invalid or too large.");
    const snapshot = portableSchema.parse(
      JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/"))),
    );
    if (
      snapshot.items.some(
        (item) => !catalog.some((product) => product.id === item.id),
      )
    )
      throw new Error(
        "This plan contains products no longer available in this catalog.",
      );
    return snapshot;
  }
  resolve(snapshot: PortableRoutine, catalog: readonly Product[]): Product[] {
    return snapshot.items.map((item) => {
      const product = catalog.find((product) => product.id === item.id);
      if (!product) throw new Error("Product unavailable in this catalog.");
      return { ...product, referencePrice: item.price, referenceCurrency: snapshot.currency };
    });
  }
  shareUrl(snapshot: PortableRoutine, origin: string): string {
    const url = new URL("/shared", origin);
    url.hash = `plan=${this.encode(snapshot)}`;
    return url.toString();
  }
  html(snapshot: PortableRoutine, catalog: readonly Product[]): string {
    const products = this.resolve(snapshot, catalog);
    const total = products.reduce(
      (sum, product) => sum + product.referencePrice,
      0,
    );
    const cards = products
      .map(
        (product, index) =>
          `<article data-evening="${product.category === "retinoid" || product.eveningOnly}" data-sunscreen="${product.category === "sunscreen"}"><label class="check"><input type="checkbox" aria-label="Mark ${escapeHtml(product.name)} complete"> ${String(index + 1).padStart(2, "0")} · ${escapeHtml(CATEGORY_LABELS[product.category])}</label><small>${escapeHtml(product.brand)} · ${escapeHtml(product.size)}</small><h2>${escapeHtml(product.name)}</h2><strong>${escapeHtml(formatMoney(product.referencePrice, snapshot.currency))} <small>estimate</small></strong><p>${escapeHtml(product.usageNote || "Follow the current product label. Check ingredients before use.")}</p><ul>${product.benefits.map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join("")}</ul><a href="${escapeHtml(product.sourceUrl)}" target="_blank" rel="noreferrer">Brand & ingredients ↗</a></article>`,
      )
      .join("");
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SkinNear · ${snapshot.kind === "routine" ? "Your routine" : "Saved products"}</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f2f8;color:#272138;font:15px/1.7 Poppins,Arial,sans-serif}main{max-width:1000px;margin:auto;padding:32px 20px}h1{font-size:clamp(30px,6vw,54px);line-height:1.1;margin:20px 0}h2{font-size:21px;line-height:1.3}small{color:#70697d}button,a{color:inherit}button{border:0;border-radius:30px;background:#e4daf6;padding:12px 20px;cursor:pointer;font:inherit}button[aria-pressed=true]{background:#7959c7;color:white}.actions{display:flex;gap:10px;flex-wrap:wrap;margin:24px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}article{background:white;padding:25px;border-radius:25px}article.hidden{display:none}.check{display:flex;gap:10px;align-items:center;font-size:12px;color:#7959c7;margin-bottom:16px}input{accent-color:#7959c7;width:19px;height:19px}article.done{opacity:.55}article.done h2{text-decoration:line-through}p,li{color:#70697d;font-size:13px}a{display:inline-block;margin-top:12px;font-size:13px}.summary{background:#e5eee7;padding:20px;border-radius:20px}.print-only{display:none}@media print{body{background:white}.actions{display:none}article{break-inside:avoid}.grid{display:block}article.hidden{display:block}article{margin-bottom:18px}.print-only{display:block}}
</style></head><body><main><small>SkinNear · ${snapshot.kind === "routine" ? "A routine within reach" : "Your saved product list"}</small><h1>Care, made manageable.</h1><div class="summary"><strong>Planning total: ${escapeHtml(formatMoney(total, snapshot.currency))}${snapshot.budget ? ` / ${escapeHtml(formatMoney(snapshot.budget, snapshot.currency))}` : ""}</strong><p>${snapshot.kind === "list" ? "A wishlist, not a recommendation. It may exceed your routine budget." : "Shared product plan, not a personal medical assessment."} Prices are estimates; confirm stock, shipping, formulas and local prices with the seller.</p></div><div class="actions"><button data-time="all" aria-pressed="true">All products</button><button data-time="morning" aria-pressed="false">Morning</button><button data-time="evening" aria-pressed="false">Evening</button><button id="print">Print / Save as PDF</button><button id="reset">Reset checklist</button></div><p id="progress" aria-live="polite">0 of ${products.length} checked</p><div class="grid">${cards}</div><p>Test new products first. Avoid retinoids during pregnancy. Deep, painful or scarring acne needs a dermatologist. Follow current labels and seek professional advice when needed.</p><small>No selfie, skin scores, health answers or location are included in this file. Checklist state lasts while this file is open.</small></main><script>
const cards=[...document.querySelectorAll('article')];const update=()=>{cards.forEach(c=>c.classList.toggle('done',c.querySelector('input').checked));document.getElementById('progress').textContent=cards.filter(c=>c.querySelector('input').checked).length+' of '+cards.length+' checked'};document.querySelectorAll('input').forEach(c=>c.addEventListener('change',update));document.querySelectorAll('[data-time]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-time]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));cards.forEach(c=>c.classList.toggle('hidden',b.dataset.time==='morning'?c.dataset.evening==='true':b.dataset.time==='evening'?c.dataset.sunscreen==='true':false))}));document.getElementById('print').addEventListener('click',()=>window.print());document.getElementById('reset').addEventListener('click',()=>{document.querySelectorAll('input').forEach(c=>c.checked=false);update()});
</script></body></html>`;
  }
}
