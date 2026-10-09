"use client";

import { useSkinJourney } from "@/hooks/useSkinJourney";
import { Header } from "./layout/Header";
import { Footer } from "./layout/Footer";
import { Intro } from "./journey/Intro";
import { HowItWorks } from "./journey/HowItWorks";
import { StepIndicator } from "./journey/StepIndicator";
import { SkinReport } from "./journey/SkinReport";
import { PreferencesForm } from "./journey/PreferencesForm";
import { RoutineView } from "./routine/RoutineView";

export function SkinNearApp({ liveEnabled }: { liveEnabled: boolean }) {
  const journey = useSkinJourney();
  return <>
    <Header onHome={journey.reset} onRoutine={journey.restore} onSample={journey.sample} disabled={journey.busy} />
    <main>
      {journey.error || journey.notice ? <div className={`global-message shell ${journey.error ? "error" : ""}`} role={journey.error ? "alert" : "status"}>{journey.error || journey.notice}</div> : null}
      {journey.stage === "scan" ? <Intro onSample={journey.sample} onScan={journey.scan} onCancel={journey.cancelScan} busy={journey.busy} liveEnabled={liveEnabled} /> : <section className="journey shell">
        <StepIndicator step={journey.stage === "preferences" ? 1 : 2} />
        <div className="journey-title"><h1>{journey.stage === "preferences" ? "Your skin. Your kind of care." : "Less guesswork. More good care."}</h1><p>{journey.stage === "preferences" ? "A few details to make your routine feel like you." : "A simple plan, with room for real life."}</p>{journey.analysis?.mode === "demo" ? <span className="demo-label">Sample experience · illustrative skin scores</span> : null}</div>
        {journey.analysis ? journey.stage === "preferences" ? <div className="preferences-layout"><PreferencesForm key="preferences" initial={journey.preferences} busy={journey.busy} onSubmit={journey.build} /><SkinReport analysis={journey.analysis} /></div> : journey.routine ? <RoutineView routine={journey.routine} preferences={journey.preferences} busy={journey.busy} savedId={journey.savedId} onEdit={journey.edit} onSave={journey.save} onDelete={journey.removeSaved} onSwap={journey.swap} onResetChoices={journey.resetChoices} /> : null : null}
      </section>}
      <HowItWorks />
    </main>
    <Footer />
  </>;
}
