"use client";

import { useState } from "react";
import { Droplets, Moon } from "lucide-react";
import { DEFAULT_TREATMENT_PREFERENCES, type TreatmentPreferences } from "@/domain/schemas";
import { Checkbox } from "@/components/ui/Checkbox";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

const serumGoals = [
  { value: "hydration", label: "Hydration" },
  { value: "oil-balance", label: "Shine & visible pores" },
  { value: "breakouts", label: "Mild blackheads & breakouts" },
];

interface Props {
  value?: TreatmentPreferences;
  onChange: (value: TreatmentPreferences) => void;
}

export function TreatmentPreferencesPanel({
  value = DEFAULT_TREATMENT_PREFERENCES,
  onChange,
}: Props) {
  const [kind, setKind] = useState<"serum" | "retinol" | null>(
    value.consent ? (value.goal === "fine-lines" ? "retinol" : "serum") : null,
  );
  const update = (patch: Partial<TreatmentPreferences>) => onChange({ ...value, ...patch });

  function choose(next: "serum" | "retinol") {
    const selected = kind === next ? null : next;
    setKind(selected);
    onChange({
      ...DEFAULT_TREATMENT_PREFERENCES,
      breakoutSeverity: value.breakoutSeverity,
      goal: selected === "retinol" ? "fine-lines" : selected === "serum" ? "hydration" : "none",
    });
  }

  return (
    <section className="treatment-preferences" aria-label="Serum and retinol choices">
      <div className="treatment-heading">
        <h3>Add a focused step.</h3>
        <p>Choose one extra. Your essentials and budget come first.</p>
      </div>
      <div className="treatment-choices">
        <button type="button" aria-pressed={kind === "serum"} onClick={() => choose("serum")}>
          <Droplets size={24} aria-hidden />
          <strong>Serum</strong>
          <span>Hydration, shine or mild breakouts</span>
        </button>
        <button type="button" aria-pressed={kind === "retinol"} onClick={() => choose("retinol")}>
          <Moon size={24} aria-hidden />
          <strong>Retinol</strong>
          <span>A separate evening step for fine lines</span>
        </button>
      </div>
      {kind ? (
        <div className="treatment-options">
          {kind === "serum" ? (
            <SearchableSelect
              label="Serum goal"
              value={value.goal}
              options={serumGoals}
              onChange={(goal) =>
                update({ goal: goal as TreatmentPreferences["goal"], dailySunscreen: false })
              }
            />
          ) : null}
          <Checkbox
            checked={value.consent}
            onChange={(event) => {
              const checked = event.target.checked;
              if (!checked)
                onChange({
                  ...DEFAULT_TREATMENT_PREFERENCES,
                  goal: value.goal,
                  breakoutSeverity: value.breakoutSeverity,
                });
              else update({ consent: true, retinoidConsent: kind === "retinol" });
            }}
          >
            {kind === "serum"
              ? "Include a serum if it fits my skin and budget."
              : "I consent to considering OTC retinol for my fine-line goal."}
          </Checkbox>
          {value.consent ? (
            <>
              {kind === "serum" && value.goal === "breakouts" ? (
                <SearchableSelect
                  label="Breakout severity"
                  value={value.breakoutSeverity}
                  options={[
                    { value: "none", label: "No breakouts" },
                    { value: "mild", label: "Small spots or blackheads" },
                    { value: "severe", label: "Deep, painful or scarring spots" },
                    { value: "unsure", label: "Unsure" },
                  ]}
                  onChange={(severity) =>
                    update({
                      breakoutSeverity: severity as TreatmentPreferences["breakoutSeverity"],
                    })
                  }
                />
              ) : null}
              {["severe", "unsure"].includes(value.breakoutSeverity) ? (
                <p className="retinol-consent">
                  Ask a dermatologist before adding an active for deep, painful, scarring or
                  uncertain breakouts.
                </p>
              ) : null}
              <details className="treatment-confirmations">
                <summary>Check this step fits you</summary>
                <Checkbox
                  checked={value.basicsEstablished}
                  onChange={(event) => update({ basicsEstablished: event.target.checked })}
                >
                  I use the basics consistently and this concern persists.
                </Checkbox>
                <Checkbox
                  checked={value.adult}
                  onChange={(event) => update({ adult: event.target.checked })}
                >
                  I am 18 or older.
                </Checkbox>
                <Checkbox
                  checked={value.healthClear}
                  onChange={(event) => update({ healthClear: event.target.checked })}
                >
                  I am not pregnant, trying to conceive or breastfeeding, and have no broken skin,
                  diagnosed skin condition or prescribed skin treatment.
                </Checkbox>
                <Checkbox
                  checked={value.alreadyUsingTreatment}
                  onChange={(event) => update({ alreadyUsingTreatment: event.target.checked })}
                >
                  I already use an active. Skip another.
                </Checkbox>
                {kind === "retinol" || value.goal === "breakouts" ? (
                  <Checkbox
                    checked={value.dailySunscreen}
                    onChange={(event) => update({ dailySunscreen: event.target.checked })}
                  >
                    I use broad-spectrum SPF 30+ daily.
                  </Checkbox>
                ) : null}
                {kind === "retinol" ? (
                  <p className="field-note">
                    Evening use. Avoid during pregnancy. Prescription retinoids are handled by a
                    clinician.
                  </p>
                ) : null}
              </details>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
