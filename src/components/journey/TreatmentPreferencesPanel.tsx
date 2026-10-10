"use client";

import { DEFAULT_TREATMENT_PREFERENCES, type TreatmentPreferences } from "@/domain/schemas";
import { Checkbox } from "@/components/ui/Checkbox";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

const goals = [
  { value: "none", label: "No extra goal" },
  { value: "hydration", label: "Persistent dry-feeling skin" },
  { value: "oil-balance", label: "Persistent shine or visible pores" },
  { value: "fine-lines", label: "Persistent fine lines · consider OTC retinol" },
];

export function TreatmentPreferencesPanel({ value = DEFAULT_TREATMENT_PREFERENCES, onChange }: { value?: TreatmentPreferences; onChange: (value: TreatmentPreferences) => void }) {
  const update = (patch: Partial<TreatmentPreferences>) => onChange({ ...value, ...patch });
  return <section className="treatment-preferences" aria-label="Optional treatment consent">
    <div><span className="treatment-eyebrow">Only if it adds value</span><h3>Keep it simple. Or explore one extra.</h3><p>Essentials come first. We only consider one suitable add-on within your remaining budget, and may recommend none.</p></div>
    <Checkbox checked={value.consent} onChange={(event) => onChange(event.target.checked ? { ...value, consent: true } : { ...DEFAULT_TREATMENT_PREFERENCES })}>I want optional treatment suggestions and consent to considering an extra product.</Checkbox>
    {value.consent ? <div className="treatment-options">
      <SearchableSelect label="What concern still bothers you?" value={value.goal} options={goals} onChange={(goal) => update({ goal: goal as TreatmentPreferences["goal"], retinoidConsent: false, dailySunscreen: false })} />
      <Checkbox checked={value.basicsEstablished} onChange={(event) => update({ basicsEstablished: event.target.checked })}>I already use the basics consistently, and this concern still persists.</Checkbox>
      <Checkbox checked={value.adult} onChange={(event) => update({ adult: event.target.checked })}>I am 18 or older.</Checkbox>
      <Checkbox checked={value.healthClear} onChange={(event) => update({ healthClear: event.target.checked })}>I am not pregnant, trying to conceive or breastfeeding, and have no active skin condition or prescribed skin treatment.</Checkbox>
      <Checkbox checked={value.alreadyUsingTreatment} onChange={(event) => update({ alreadyUsingTreatment: event.target.checked })}>I already use a serum, retinoid or exfoliating treatment. Skip another active.</Checkbox>
      {value.goal === "fine-lines" ? <div className="retinol-consent"><p>Retinol can irritate skin and should not be used during pregnancy. Our scan does not assess fine lines. Prescription retinoids require a clinician.</p>
        <Checkbox checked={value.retinoidConsent} onChange={(event) => update({ retinoidConsent: event.target.checked })}>I understand and separately consent to considering an OTC retinol for my stated goal.</Checkbox>
        <Checkbox checked={value.dailySunscreen} onChange={(event) => update({ dailySunscreen: event.target.checked })}>I use broad-spectrum SPF 30+ every day.</Checkbox>
        <a href="https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/retinoid-retinol" target="_blank" rel="noreferrer">Read dermatologist guidance on retinol ↗</a>
      </div> : null}
      <p className="field-note">Missing confirmations, sensitive skin, a redness signal, duplicate ingredients or a tight budget mean no add-on. Test new products first and follow their labels.</p>
    </div> : null}
  </section>;
}
