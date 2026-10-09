"use client";

import { useState } from "react";
import { ArrowRight, MapPin, LocateFixed } from "lucide-react";
import { preferencesSchema, type Category, type Preferences } from "@/domain/schemas";
import { SkinNearApi } from "@/lib/client-api";
import { Button } from "@/components/ui/Button";

const api = new SkinNearApi();
export function PreferencesForm({ initial, busy, onSubmit }: { initial: Preferences; busy: boolean; onSubmit: (preferences: Preferences) => Promise<void> }) {
  const [values, setValues] = useState(initial);
  const [exclusions, setExclusions] = useState(initial.exclusions.join(", "));
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  async function locate() {
    setLocating(true); setLocationMessage("");
    try { const result = await api.request<{ city: string }>("/api/location"); setValues((old) => ({ ...old, city: result.city })); setLocationMessage("Approximate city from your IP. Please confirm it below."); }
    catch (err) { setLocationMessage(err instanceof Error ? err.message : "Enter your city manually."); }
    finally { setLocating(false); }
  }

  function toggleOwned(category: Category) {
    setValues((old) => ({ ...old, ownedCategories: old.ownedCategories.includes(category) ? old.ownedCategories.filter((c) => c !== category) : [...old.ownedCategories, category] }));
  }

  return <form className="preferences-form" onSubmit={(event) => {
    event.preventDefault();
    const parsed = preferencesSchema.safeParse({ ...values, exclusions: exclusions.split(",").map((s) => s.trim()).filter(Boolean) });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setError(""); void onSubmit(parsed.data);
  }}>
    <fieldset disabled={busy}>
      <div className="field-heading"><label htmlFor="budget">Your routine budget</label><span>INR · total purchase estimate</span></div>
      <div className="budget-control"><span>₹</span><input id="budget" type="number" min={100} max={50000} required value={values.budget} onChange={(e) => setValues({ ...values, budget: Number(e.target.value) })} /></div>
      <div className="budget-presets">{[1000, 1500, 2500].map((budget) => <button type="button" key={budget} className={values.budget === budget ? "selected" : ""} aria-pressed={values.budget === budget} onClick={() => setValues({ ...values, budget })}>₹{budget.toLocaleString("en-IN")}</button>)}</div>
      <div className="field-heading location-label"><label htmlFor="city">Where are you shopping?</label><button type="button" onClick={locate} disabled={locating} className="locate-button"><LocateFixed size={14} /> {locating ? "Locating…" : "Suggest my city"}</button></div>
      <div className="location-fields"><div className="icon-input"><MapPin size={18} /><input id="city" required placeholder="City, e.g. Bengaluru" maxLength={80} value={values.city} onChange={(e) => setValues({ ...values, city: e.target.value })} /></div><input aria-label="PIN code (optional)" placeholder="PIN code (optional)" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={values.pincode} onChange={(e) => setValues({ ...values, pincode: e.target.value })} /></div>
      {locationMessage ? <p className="field-note" role="status">{locationMessage}</p> : null}
      <p className="field-note">India pilot. Stock and PIN-code delivery are checked on the retailer’s site.</p>
      <div className="preference-toggles"><label><input type="checkbox" checked={values.sensitive} onChange={(e) => setValues({ ...values, sensitive: e.target.checked })} /><span>My skin feels sensitive</span></label><label><input type="checkbox" checked={values.fragranceFree} onChange={(e) => setValues({ ...values, fragranceFree: e.target.checked })} /><span>Prefer fragrance-free products</span></label></div>
      <label htmlFor="exclusions" className="field-label">Ingredients to avoid <span>(optional)</span></label><input id="exclusions" placeholder="e.g. oat, niacinamide" maxLength={500} value={exclusions} onChange={(e) => setExclusions(e.target.value)} /><p className="field-note">Comma-separated label terms. This is a text filter, not an allergy guarantee. Check the current ingredient label.</p>
      <div className="field-label">I already own</div><div className="owned-options">{(["cleanser", "moisturizer", "sunscreen"] as Category[]).map((category) => <button type="button" className={values.ownedCategories.includes(category) ? "selected" : ""} key={category} aria-pressed={values.ownedCategories.includes(category)} onClick={() => toggleOwned(category)}>{category}</button>)}</div>
    </fieldset>
    {error ? <p className="inline-error" role="alert">{error}</p> : null}
    <Button className="form-submit" type="submit" loading={busy}>Find my routine <ArrowRight size={18} /></Button>
  </form>;
}
