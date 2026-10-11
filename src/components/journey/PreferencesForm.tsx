"use client";

import {
  COUNTRIES,
  CURRENCIES,
  defaultCurrency,
  formatMoney,
  budgetPresets,
} from "@/domain/regions";
import { useState } from "react";
import { ArrowRight, MapPin, LocateFixed, SlidersHorizontal } from "lucide-react";
import { preferencesSchema, type EssentialCategory, type Preferences } from "@/domain/schemas";
import { TreatmentPreferencesPanel } from "./TreatmentPreferencesPanel";
import { ClientLocationService } from "@/services/ClientLocationService";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ToggleButton } from "@/components/ui/ToggleButton";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

const locationService = new ClientLocationService();
const countryOptions = COUNTRIES.map((country) => ({
  value: country.code,
  label: country.name,
  detail: country.code,
}));
const currencyNames = new Intl.DisplayNames(["en"], { type: "currency" });
const currencyOptions = CURRENCIES.map((currency) => ({
  value: currency,
  label: currency,
  detail: currencyNames.of(currency),
}));
export function PreferencesForm({
  initial,
  busy,
  onSubmit,
}: {
  initial: Preferences;
  busy: boolean;
  onSubmit: (preferences: Preferences) => Promise<void>;
}) {
  const [values, setValues] = useState(initial);
  const [exclusions, setExclusions] = useState(initial.exclusions.join(", "));
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  async function locate() {
    setLocating(true);
    setLocationMessage("");
    try {
      const result = await locationService.suggest();
      setValues((old) => ({
        ...old,
        city: result.city,
        country: result.country,
        currency: result.currency,
        budget: old.currency === result.currency ? old.budget : budgetPresets(result.currency)[1],
        pincode: "",
      }));
      setLocationMessage("Suggested from your IP. Check the city before continuing.");
    } catch (err) {
      setLocationMessage(err instanceof Error ? err.message : "Enter your city manually.");
    } finally {
      setLocating(false);
    }
  }

  function toggleOwned(category: EssentialCategory) {
    setValues((old) => ({
      ...old,
      ownedCategories: old.ownedCategories.includes(category)
        ? old.ownedCategories.filter((c) => c !== category)
        : [...old.ownedCategories, category],
    }));
  }

  return (
    <form
      className="preferences-form"
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = preferencesSchema.safeParse({
          ...values,
          exclusions: exclusions
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        });
        if (!parsed.success) {
          setError(parsed.error.issues[0].message);
          return;
        }
        setError("");
        void onSubmit(parsed.data);
      }}
    >
      <fieldset disabled={busy}>
        <div className="preferences-card-heading">
          <span>
            <SlidersHorizontal size={18} /> Make it personal
          </span>
          <small>A few choices, a better fit.</small>
        </div>
        <div className="region-fields">
          <SearchableSelect
            label="Country"
            value={values.country}
            options={countryOptions}
            disabled={busy}
            onChange={(country) => {
              const currency = defaultCurrency(country) as Preferences["currency"];
              setValues({
                ...values,
                country,
                currency,
                pincode: "",
                budget: budgetPresets(currency)[1],
              });
            }}
          />
          <SearchableSelect
            label="Budget currency"
            value={values.currency}
            options={currencyOptions}
            disabled={busy}
            onChange={(currency) =>
              setValues({ ...values, currency, budget: budgetPresets(currency)[1] })
            }
          />
        </div>
        <div className="field-heading">
          <label htmlFor="budget">Your routine budget</label>
          <span>
            {values.currency ? `${values.currency} · planning estimate` : "Choose a currency first"}
          </span>
        </div>
        <div className="budget-control">
          <span>{values.currency || "—"}</span>
          <input
            disabled={!values.currency}
            id="budget"
            type="number"
            min={1}
            max={10000000}
            step="0.01"
            placeholder="Your budget"
            required
            value={values.currency ? values.budget : ""}
            onChange={(e) => setValues({ ...values, budget: Number(e.target.value) })}
          />
        </div>
        <div className="budget-presets">
          {(values.currency ? budgetPresets(values.currency) : []).map((budget) => (
            <ToggleButton
              key={budget}
              selected={values.budget === budget}
              onClick={() => setValues({ ...values, budget })}
            >
              {formatMoney(budget, values.currency)}
            </ToggleButton>
          ))}
        </div>
        <div className="field-heading location-label">
          <label htmlFor="city">Where are you shopping?</label>
          <button type="button" onClick={locate} disabled={locating} className="locate-button">
            <LocateFixed size={14} /> {locating ? "Locating…" : "Suggest my city"}
          </button>
        </div>
        <div className="location-fields">
          <div className="icon-input">
            <MapPin size={18} />
            <input
              id="city"
              required
              placeholder="City, e.g. London or Singapore"
              maxLength={80}
              value={values.city}
              onChange={(e) => setValues({ ...values, city: e.target.value })}
            />
          </div>
          <input
            aria-label="Postal code (optional)"
            placeholder="Postal code (optional)"
            maxLength={20}
            value={values.pincode}
            onChange={(e) => setValues({ ...values, pincode: e.target.value })}
          />
        </div>
        {locationMessage ? (
          <p className="field-note" role="status">
            {locationMessage}
          </p>
        ) : null}
        <p className="field-note">Confirm price and delivery with the seller.</p>
        <div className="preference-toggles">
          <Checkbox
            checked={values.sensitive}
            onChange={(event) => setValues({ ...values, sensitive: event.target.checked })}
          >
            My skin feels sensitive
          </Checkbox>
          <Checkbox
            checked={values.fragranceFree}
            onChange={(event) => setValues({ ...values, fragranceFree: event.target.checked })}
          >
            Prefer fragrance-free products
          </Checkbox>
        </div>
        <label htmlFor="exclusions" className="field-label">
          Ingredients to avoid <span>(optional)</span>
        </label>
        <input
          id="exclusions"
          placeholder="e.g. oat, niacinamide"
          maxLength={500}
          value={exclusions}
          onChange={(e) => setExclusions(e.target.value)}
        />
        <p className="field-note">Separate ingredients with commas.</p>
        <div className="field-label">
          I already own <span>(skip a new purchase)</span>
        </div>
        <div className="owned-options">
          {(["cleanser", "moisturizer", "sunscreen"] as EssentialCategory[]).map((category) => (
            <ToggleButton
              selected={values.ownedCategories.includes(category)}
              key={category}
              onClick={() => toggleOwned(category)}
            >
              {category}
            </ToggleButton>
          ))}
        </div>
        <TreatmentPreferencesPanel
          value={values.treatments}
          onChange={(treatments) => setValues((old) => ({ ...old, treatments }))}
        />
      </fieldset>
      {error ? (
        <p className="inline-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="form-submit" type="submit" loading={busy}>
        {busy ? "Building your routine…" : "Find my routine"} <ArrowRight size={18} />
      </Button>
    </form>
  );
}
