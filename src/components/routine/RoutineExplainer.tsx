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
    const result = await api.post<RoutineExplanation>(
      "/api/routine/explain",
      {
        plan: portable.encode(portable.fromRoutine(routine, currency)),
        consent: true,
      },
      signal,
    );
    return result;
  }
  return (
    <VoiceExplanationPanel
      title="Let’s talk through your routine."
      eyebrow="Your routine, explained aloud"
      description="Listen to what each step brings to your routine."
      consentText="Use Google Gemini to explain my products and budget aloud. My photo and skin scores stay private."
      actionLabel="Hear my routine"
      generate={generate}
    />
  );
}
