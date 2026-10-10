"use client";

import type { SkinAnalysis } from "@/domain/schemas";
import type { SkinExplanation } from "@/services/SkinExplanationService";
import { CONCERN_LABELS } from "@/domain/sample";
import { SkinNearApi } from "@/lib/client-api";
import { VoiceExplanationPanel } from "@/components/ui/VoiceExplanationPanel";

const api = new SkinNearApi();

export function SkinExplainer({ analysis }: { analysis: SkinAnalysis }) {
  async function generate(signal: AbortSignal) {
    const result = await api.post<SkinExplanation>("/api/analysis/explain", {
      analysis: { mode: analysis.mode, scores: analysis.scores.map(({ concern, score }) => ({ concern, score })) }, consent: true,
    }, signal);
    return { ...result, sections: result.steps.map((step) => ({ heading: CONCERN_LABELS[step.id], text: step.explanation })) };
  }

  return <VoiceExplanationPanel title="First, let’s understand your skin." eyebrow={analysis.mode === "demo" ? "Sample report · illustrative scores" : "Your YouCam report, explained aloud"}
    description="Before choosing products, hear what the cosmetic scores describe and which areas stand out in this photo. This cannot diagnose a condition or determine your skin type."
    consentText="I agree to send my cosmetic skin scores and whether this is a sample or live report to Google Gemini to generate an explanation and its AI voice. My photo, overlays, location and health answers are not sent."
    actionLabel={analysis.mode === "demo" ? "Hear the sample report" : "Hear my skin report"} generate={generate} />;
}
