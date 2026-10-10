"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines, RotateCcw } from "lucide-react";
import { Button } from "./Button";
import { Checkbox } from "./Checkbox";
import { VoicePlayer } from "./VoicePlayer";

export interface VoiceExplanation {
  summary: string;
  sections: { heading: string; text: string }[];
  caution: string;
  sources: { name: string; url: string }[];
  narrationToken: string;
}

interface Props {
  title: string;
  eyebrow: string;
  description: string;
  consentText: string;
  actionLabel: string;
  generate: (signal: AbortSignal) => Promise<VoiceExplanation>;
}

/** One consented action generates text privately, then its approved narration. */
export function VoiceExplanationPanel({ title, eyebrow, description, consentText, actionLabel, generate }: Props) {
  const [consent, setConsent] = useState(false);
  const [explanation, setExplanation] = useState<VoiceExplanation | null>(null);
  const [busy, setBusy] = useState<"text" | "voice" | null>(null);
  const [error, setError] = useState("");
  const [audio, setAudio] = useState("");
  const request = useRef<AbortController | null>(null);
  const audioUrl = useRef("");

  useEffect(() => () => {
    request.current?.abort();
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
  }, []);

  function clear() {
    request.current?.abort();
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = "";
    setAudio(""); setExplanation(null); setBusy(null); setError("");
  }

  async function listen(reuseExplanation = false) {
    if (!consent || busy) return;
    clear();
    const controller = new AbortController();
    request.current = controller;
    let result = reuseExplanation ? explanation : null;
    try {
      if (!result) {
        setBusy("text");
        result = await generate(controller.signal);
      }
      if (controller.signal.aborted) return;
      setExplanation(result); setBusy("voice");
      const response = await fetch("/api/routine/voice", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: result.narrationToken, consent: true }), signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status === 400) setExplanation(null);
        const body = await response.json();
        throw new Error(body.error || "Voice unavailable. Please retry.");
      }
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      if (!blob.size || !blob.type.startsWith("audio/")) throw new Error("The audio was incomplete. Please retry.");
      audioUrl.current = URL.createObjectURL(blob);
      setAudio(audioUrl.current);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Voice unavailable. Please retry.");
    } finally {
      if (!controller.signal.aborted) setBusy(null);
    }
  }

  return <section className="routine-explainer" aria-label={title}>
    <div className="explainer-title"><span className="explainer-icon"><AudioLines size={26} aria-hidden /></span>
      <div><small>{eyebrow}</small><h2>{title}</h2></div>
    </div>
    <p>{description}</p>
    <Checkbox checked={consent} onChange={(event) => { setConsent(event.target.checked); if (!event.target.checked) clear(); }}>{consentText}</Checkbox>
    {audio ? <VoicePlayer key={audio} src={audio} title={title} /> : <div className="voice-placeholder" aria-live="polite">
      <AudioLines size={32} aria-hidden /><div><strong>{busy === "text" ? "Putting your explanation together…" : busy === "voice" ? "Giving it a voice…" : "A little clarity. Just press listen."}</strong>
        <span>{busy ? "Your audio will appear here when it’s ready." : "AI-generated voice · cosmetic guidance"}</span></div>
    </div>}
    <div className="workspace-actions">
      <Button disabled={!consent || !!busy} loading={!!busy} onClick={() => void listen(!!explanation && !audio)}>
        {audio ? <RotateCcw size={17} aria-hidden /> : <AudioLines size={17} aria-hidden />}
        {busy ? "Preparing your audio…" : audio ? "Regenerate audio" : explanation ? "Retry voice" : actionLabel}
      </Button>
    </div>
    {error ? <p role="alert">{error}</p> : null}
    {explanation ? <>
      <p className="field-note">AI cosmetic guidance, not a diagnosis or prescription.</p>
      <details className="explainer-response"><summary>Read transcript & sources</summary>
        <p>{explanation.summary}</p>
        {explanation.sections.map((section) => <div key={section.heading}><h3>{section.heading}</h3><p>{section.text}</p></div>)}
        <p>{explanation.caution}</p>
        {explanation.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name} ↗</a>)}
      </details>
    </> : null}
  </section>;
}
