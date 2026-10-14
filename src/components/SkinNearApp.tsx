"use client";

import { useSkinJourney } from "@/hooks/useSkinJourney";
import { Header } from "./layout/Header";
import { Footer } from "./layout/Footer";
import { Intro } from "./journey/Intro";
import { HowItWorks } from "./journey/HowItWorks";
import { StepIndicator } from "./journey/StepIndicator";
import { SkinReport } from "./journey/SkinReport";
import { SkinExplainer } from "./journey/SkinExplainer";
import { PreferencesForm } from "./journey/PreferencesForm";
import { RoutineView } from "./routine/RoutineView";
import dynamic from "next/dynamic";
import { useState } from "react";
import { StatusToast } from "./ui/StatusToast";
const ProductsLibrary = dynamic(() => import("./routine/ProductsLibrary"));

export function SkinNearApp({
  liveEnabled,
  saveEnabled,
}: {
  liveEnabled: boolean;
  saveEnabled: boolean;
}) {
  const journey = useSkinJourney();
  const [libraryOpen, setLibraryOpen] = useState(false);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header
        onHome={journey.reset}
        onRoutine={journey.restore}
        onSample={journey.sample}
        disabled={journey.busy}
      />
      {libraryOpen ? (
        <ProductsLibrary
          initialCountry={journey.preferences.country}
          initialCurrency={journey.preferences.currency}
          budget={journey.preferences.currency ? journey.preferences.budget : undefined}
          onClose={() => setLibraryOpen(false)}
        />
      ) : null}
      <main id="main-content" tabIndex={-1}>
        {journey.stage === "scan" ? (
          <Intro
            onSample={journey.sample}
            onScan={journey.scan}
            onCancel={journey.cancelScan}
            busy={journey.busy}
            liveEnabled={liveEnabled}
          />
        ) : (
          <section className="journey shell">
            {journey.stage === "preferences" ? (
              <>
                <StepIndicator step={1} />
                <div className="journey-title">
                  <h1>Your skin. Your kind of care.</h1>
                  <p>A few details to make your routine feel like you.</p>
                  {journey.analysis?.mode === "demo" ? (
                    <span className="demo-label">Sample experience · illustrative skin scores</span>
                  ) : null}
                </div>
              </>
            ) : null}
            {journey.analysis ? (
              journey.stage === "preferences" ? (
                <>
                  <SkinExplainer
                    key={JSON.stringify(journey.analysis)}
                    analysis={journey.analysis}
                  />
                  <div className="preferences-layout">
                    <PreferencesForm
                      key="preferences"
                      initial={journey.preferences}
                      busy={journey.busy}
                      onSubmit={journey.build}
                    />
                    <SkinReport analysis={journey.analysis} />
                  </div>
                </>
              ) : journey.routine ? (
                <RoutineView
                  saveEnabled={saveEnabled}
                  routine={journey.routine}
                  analysis={journey.analysis}
                  preferences={journey.preferences}
                  busy={journey.busy}
                  savedId={journey.savedId}
                  onEdit={journey.edit}
                  onSave={journey.save}
                  onDelete={journey.removeSaved}
                  onSwap={journey.swap}
                  onChoose={journey.choose}
                  onResetChoices={journey.resetChoices}
                  excludedProductIds={journey.excludedProductIds}
                  onApplyBudget={journey.applyBudgetScenario}
                />
              ) : null
            ) : null}
          </section>
        )}
        <HowItWorks />
      </main>
      <StatusToast
        message={journey.error || journey.notice}
        error={!!journey.error}
        scanning={journey.stage === "scan" && journey.busy}
        onCancel={journey.cancelScan}
        onDismiss={journey.dismissMessage}
      />
      <Footer
        disabled={journey.busy}
        onProducts={() => setLibraryOpen(true)}
        onRoutine={journey.restore}
      />
    </>
  );
}
