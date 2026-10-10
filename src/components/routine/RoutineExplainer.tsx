"use client";
import type { Routine } from "@/domain/schemas";
import type { RoutineExplanation } from "@/domain/explanations";
import { SkinNearApi } from "@/lib/client-api";
import { PortableRoutineService } from "@/services/PortableRoutineService";
import { VoiceExplanationPanel } from "@/components/ui/VoiceExplanationPanel";
const api = new SkinNearApi();
export function RoutineExplainer({ routine, currency }: { routine: Routine; currency: string }) {
  async function generate(signal: AbortSignal) {
    const portable = new PortableRoutineService();
    const result = await api.post<RoutineExplanation>("/api/routine/explain", {
      plan: portable.encode(portable.fromRoutine(routine, currency)), consent: true,
    }, signal);
    return { ...result, sections: result.steps.map((step) => ({
      heading: routine.items.find((item) => item.product.id === step.id)?.product.name ?? "Routine step", text: step.explanation,
    })) };
  }
  return <VoiceExplanationPanel title="Let’s talk through your routine." eyebrow="Your routine, explained aloud"
    description="Hear why each step is here and how it may help. Generate once, then listen at your own pace."
    consentText="I agree to send selected product names, estimates and routine budget to Google Gemini to generate an explanation and its AI voice. My selfie, skin scores and location stay out of this request."
    actionLabel="Hear my routine" generate={generate} />;
}
