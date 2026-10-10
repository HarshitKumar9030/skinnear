"use client";

import { formatMoney, countryName } from "@/domain/regions";
import { useState } from "react";
import { Download, Bookmark, Pencil, RotateCcw, Trash2, Sun, Moon, Check, MapPin, ArrowRight } from "lucide-react";
import type { Preferences, Routine, SkinAnalysis } from "@/domain/schemas";
import { Button } from "@/components/ui/Button";
import { SkinReport } from "@/components/journey/SkinReport";
import { StepIndicator } from "@/components/journey/StepIndicator";
import { ProductRow } from "./ProductRow";

type Props = { saveEnabled: boolean; routine: Routine; analysis: SkinAnalysis; preferences: Preferences; busy: boolean; savedId: string | null; onEdit: () => void; onSave: () => Promise<void>; onDelete: () => Promise<void>; onSwap: (id: string) => Promise<void>; onChoose: (id: string) => Promise<void>; onResetChoices: () => Promise<void> };

export function RoutineView({ saveEnabled, routine, analysis, preferences, busy, savedId, onEdit, onSave, onDelete, onSwap, onChoose, onResetChoices }: Props) {
  const money = (value: number) => formatMoney(value, routine.currency ?? preferences.currency);
  const [time, setTime] = useState<"morning" | "evening">("morning");
  const visibleItems = routine.items.filter((item) => time === "morning" ? item.product.category !== "retinoid" : item.product.category !== "sunscreen");

  function download() {
    const text = ["SkinNear — Your routine", `Location: ${preferences.city}`, `Budget: ${money(routine.budget)}`, `Planning total: ${money(routine.total)}`, "Prices are estimates; stock and delivery are unverified.", routine.treatmentMessage ?? "", "", ...routine.items.flatMap(({ product, reason }) => [`${product.brand} ${product.name} (${product.size}) — ${money(product.referencePrice)}`, reason, product.usageNote ?? "", ...(product.benefits ?? []).map((benefit) => `Brand-described benefit: ${benefit}`), product.sourceUrl, ""]), "Check current labels. Cosmetic guidance, not a medical diagnosis."].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "skinnear-routine.txt"; link.click(); URL.revokeObjectURL(url);
  }

  return <section className="routine-workspace">
    <aside className="routine-sidebar">
      <SkinReport analysis={analysis} compact />
      <div className="sidebar-budget"><div className="budget-summary"><span>Your budget</span><strong>{money(routine.total)}<small> / {money(routine.budget)}</small></strong><div className="budget-track"><span style={{ width: `${Math.min(100, routine.total / routine.budget * 100)}%` }} /></div><p>{routine.feasible ? `${money(routine.budget - routine.total)} within budget · excludes shipping` : "Adjust preferences to find a complete plan"}</p></div></div>
      <div className="sidebar-location"><span>Your city</span><div><MapPin size={20} /><strong>{preferences.city}, {countryName(preferences.country)}</strong>{preferences.pincode ? <small>{preferences.pincode}</small> : null}</div></div>
      <Button variant="secondary" className="sidebar-edit" onClick={onEdit} disabled={busy}><Pencil size={15} /> Edit preferences</Button>
    </aside>
    <div className="routine-main">
      <div className="journey-title"><h1>Your routine, within reach.</h1><p>Thoughtful care. A comfortable budget. Your everyday essentials.</p></div>
      <StepIndicator step={2} />
      {!routine.feasible ? <div className="empty-routine"><h2>Let&apos;s adjust the plan.</h2><p>{routine.message}</p><Button onClick={onEdit}>Adjust my preferences</Button><Button variant="text" loading={busy} onClick={onResetChoices}>Reset product choices</Button></div> : <>
        <div className="routine-time-tabs" aria-label="Routine time of day"><button aria-pressed={time === "morning"} onClick={() => setTime("morning")}><Sun size={18} /> Morning</button><button aria-pressed={time === "evening"} onClick={() => setTime("evening")}><Moon size={18} /> Evening</button><span>{time === "morning" ? "Cleanse. Hydrate. Protect." : "Cleanse. Hydrate. Unwind."}</span></div>
        {routine.treatmentMessage ? <div className="treatment-summary"><strong>Optional care</strong><p>{routine.treatmentMessage}</p>{routine.items.some((item) => item.product.category === "retinoid") ? <small>Your optional retinol is shown in the evening plan.</small> : null}</div> : null}
        {routine.ownedCategories.length ? <p className="owned-note"><Check size={16} /> Already yours: {routine.ownedCategories.join(", ")}. These steps are excluded from the shopping total.</p> : null}
        {visibleItems.length ? <div className="product-list">{visibleItems.map((item) => <ProductRow key={`${item.product.id}:${preferences.city}:${preferences.pincode}:${preferences.country}:${preferences.currency}`} item={item} country={preferences.country} currency={preferences.currency} city={preferences.city} pincode={preferences.pincode} busy={busy} onSwap={onSwap} onChoose={onChoose} />)}</div> : <div className="empty-routine"><h2>You have the essentials.</h2><p>No new purchases needed for this part of your routine.</p></div>}
        <div className="workspace-actions">{saveEnabled ? <Button onClick={onSave} loading={busy} disabled={!!savedId}>{savedId ? <Bookmark size={17} /> : null}{savedId ? "Routine saved" : "Save my routine"}<ArrowRight size={17} /></Button> : null}<Button variant={saveEnabled ? "secondary" : "primary"} onClick={download}><Download size={17} /> Download plan</Button>{savedId ? <Button variant="text" onClick={onDelete} disabled={busy}><Trash2 size={15} /> Delete saved copy</Button> : null}</div>
        <div className="routine-footnote"><p>Prices are planning estimates, converted when needed; actual local prices may differ. Images and benefit summaries come from official brand pages. Packaging, sizes, and formulas can vary by country. Confirm the current label, stock, and delivery with the seller. Text ingredient filters do not guarantee suitability.</p>{routine.exchangeRateDate ? <p>Conversion dated {new Date(routine.exchangeRateDate).toLocaleDateString("en-GB")}. Rates by <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">ExchangeRate-API</a>.</p> : null}<button disabled={busy} onClick={onResetChoices}><RotateCcw size={14} /> Reset choices</button></div>
      </>}
    </div>
  </section>;
}
