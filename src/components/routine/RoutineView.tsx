import { Download, Bookmark, Pencil, RotateCcw, Trash2, Sun, Moon, Check } from "lucide-react";
import type { Preferences, Routine } from "@/domain/schemas";
import { Button } from "@/components/ui/Button";
import { ProductRow } from "./ProductRow";

type Props = { routine: Routine; preferences: Preferences; busy: boolean; savedId: string | null; onEdit: () => void; onSave: () => Promise<void>; onDelete: () => Promise<void>; onSwap: (id: string) => Promise<void>; onResetChoices: () => Promise<void> };

export function RoutineView({ routine, preferences, busy, savedId, onEdit, onSave, onDelete, onSwap, onResetChoices }: Props) {
  function download() {
    const text = ["SkinNear — Your routine", `Location: ${preferences.city}`, `Budget: ₹${routine.budget}`, `Planning total: ₹${routine.total}`, "Prices are estimates; stock and delivery are unverified.", "", ...routine.items.flatMap(({ product, reason }) => [`${product.brand} ${product.name} (${product.size}) — ₹${product.referencePrice}`, reason, product.sourceUrl, ""]), "Check current labels. Cosmetic guidance, not a medical diagnosis."].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "skinnear-routine.txt"; link.click(); URL.revokeObjectURL(url);
  }

  return <section className="routine-view">
    <div className="routine-toolbar"><div><h2>Your everyday essentials.</h2><p>{routine.message}</p></div><Button variant="secondary" onClick={onEdit} disabled={busy}><Pencil size={15} /> Edit preferences</Button></div>
    {!routine.feasible ? <div className="empty-routine"><h3>Let’s adjust the plan.</h3><p>A complete routine needs products that match both your preferences and budget.</p><Button onClick={onEdit}>Adjust my preferences</Button><Button variant="text" loading={busy} onClick={onResetChoices}>Reset product choices</Button></div> : <>
      <div className="routine-timing"><span><Sun size={17} /> Morning: cleanse, hydrate, protect</span><span><Moon size={17} /> Evening: cleanse, hydrate</span></div>
      {routine.ownedCategories.length ? <p className="owned-note"><Check size={16} /> Already yours: {routine.ownedCategories.join(", ")}. These steps are excluded from the shopping total.</p> : null}
      <div className="product-list">{routine.items.map((item, index) => <ProductRow key={`${item.product.id}:${preferences.city}:${preferences.pincode}`} item={item} index={index} city={preferences.city} pincode={preferences.pincode} busy={busy} onSwap={onSwap} />)}</div>
      <div className="routine-bottom"><div className="budget-summary"><span>Your planning total</span><strong>₹{routine.total.toLocaleString("en-IN")}<small> / ₹{routine.budget.toLocaleString("en-IN")}</small></strong><div className="budget-track"><span style={{ width: `${Math.min(100, routine.total / routine.budget * 100)}%` }} /></div><p>₹{(routine.budget - routine.total).toLocaleString("en-IN")} within budget · excludes shipping</p></div><div className="routine-save"><Button onClick={onSave} loading={busy} disabled={!!savedId}><Bookmark size={17} /> {savedId ? "Routine saved" : "Save my routine"}</Button><Button variant="text" onClick={download}><Download size={16} /> Download plan</Button>{savedId ? <Button variant="text" onClick={onDelete} disabled={busy}><Trash2 size={15} /> Delete saved copy</Button> : null}</div></div>
      <div className="routine-footnote"><p>Estimates from the curated catalog, not live quotes. Selection uses brand descriptions and your preferences; it does not guarantee suitability. This pilot currently covers six products from one brand.</p><button disabled={busy} onClick={onResetChoices}><RotateCcw size={14} /> Reset product choices</button></div>
    </>}
  </section>;
}
