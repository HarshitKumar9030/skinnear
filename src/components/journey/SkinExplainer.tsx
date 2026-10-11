"use client";

import type { SkinAnalysis } from "@/domain/schemas";
import type { SkinExplanation } from "@/services/SkinExplanationService";
import { SkinNearApi } from "@/lib/client-api";
import { VoiceExplanationPanel } from "@/components/ui/VoiceExplanationPanel";

const api = new SkinNearApi();

export function SkinExplainer({ analysis }: { analysis: SkinAnalysis }) {
  async function generate(signal: AbortSignal) {
    const result = await api.post<SkinExplanation>(
      "/api/analysis/explain",
      {
        analysis: {
          mode: analysis.mode,
          scores: analysis.scores.map(({ concern, score }) => ({ concern, score })),
        },
        consent: true,
      },
      signal,
    );
    return result;
  }

  return (
    <VoiceExplanationPanel
      title="First, let’s understand your skin."
      eyebrow={
        analysis.mode === "demo"
          ? "Sample report · illustrative scores"
          : "Your YouCam report, explained aloud"
      }
      description="Listen to the main insights from your scan before choosing products."
      consentText="Use Google Gemini to explain my skin scores and narrate them. My photo stays out of this request."
      actionLabel={analysis.mode === "demo" ? "Hear the sample report" : "Hear my skin report"}
      generate={generate}
    />
  );
}
