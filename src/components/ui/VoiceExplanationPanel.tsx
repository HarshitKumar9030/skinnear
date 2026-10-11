"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines, RotateCcw } from "lucide-react";
import type { NarrationAudio } from "@/domain/narration";
import { Checkbox } from "./Checkbox";
import { VoicePlayer } from "./VoicePlayer";
import { ListeningMark } from "./ListeningMark";

export interface VoiceExplanation {
  summary: string;
  transcript: string;
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
export function VoiceExplanationPanel({
  title,
  eyebrow,
  description,
  consentText,
  actionLabel,
  generate,
}: Props) {
  const [consent, setConsent] = useState(false);
  const [explanation, setExplanation] = useState<VoiceExplanation | null>(null);
  const [busy, setBusy] = useState<"text" | "voice" | null>(null);
  const [error, setError] = useState("");
  const [audio, setAudio] = useState("");
  const [captions, setCaptions] = useState<Pick<NarrationAudio, "cues" | "timing"> | null>(null);
  const request = useRef<AbortController | null>(null);
  const audioUrl = useRef("");

  useEffect(
    () => () => {
      request.current?.abort();
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    },
    [],
  );

  function clear() {
    request.current?.abort();
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = "";
    setAudio("");
    setCaptions(null);
    setExplanation(null);
    setBusy(null);
    setError("");
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
      setExplanation(result);
      setBusy("voice");
      const response = await fetch("/api/routine/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: result.narrationToken, consent: true, captions: true }),
        signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status === 400) setExplanation(null);
        const body = await response.json();
        throw new Error(body.error || "Voice unavailable. Please retry.");
      }
      const narration: NarrationAudio = await response.json();
      if (controller.signal.aborted) return;
      if (
        narration.mimeType !== "audio/wav" ||
        !narration.audio ||
        narration.audio.length > 12 * 1024 * 1024 ||
        !Array.isArray(narration.cues)
      )
        throw new Error("The audio was incomplete. Please retry.");
      const bytes = Uint8Array.from(atob(narration.audio), (character) => character.charCodeAt(0));
      const blob = new Blob([bytes], { type: narration.mimeType });
      audioUrl.current = URL.createObjectURL(blob);
      setCaptions({ cues: narration.cues, timing: narration.timing });
      setAudio(audioUrl.current);
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : "Voice unavailable. Please retry.");
    } finally {
      if (!controller.signal.aborted) setBusy(null);
    }
  }

  return (
    <section className="routine-explainer" aria-label={title}>
      <div className="explainer-title">
        <span className="explainer-icon">
          <AudioLines size={26} aria-hidden />
        </span>
        <div>
          <small>{eyebrow}</small>
          <h2>{title}</h2>
        </div>
      </div>
      <p>{description}</p>
      <Checkbox
        checked={consent}
        onChange={(event) => {
          setConsent(event.target.checked);
          if (!event.target.checked) clear();
        }}
      >
        {consentText}
      </Checkbox>
      {audio && captions ? (
        <VoicePlayer key={audio} src={audio} cues={captions.cues} timing={captions.timing} />
      ) : busy ? (
        <div className="voice-loading" role="status">
          <ListeningMark playing />
          <span>
            {busy === "text" ? "Finding the words…" : "Preparing your voice & transcript…"}
          </span>
        </div>
      ) : null}
      <div className="workspace-actions">
        <button
          type="button"
          className={audio ? "voice-regenerate" : "solid-action"}
          disabled={!consent || !!busy}
          aria-busy={!!busy}
          onClick={() => void listen(!!explanation && !audio)}
        >
          {audio ? <RotateCcw size={17} aria-hidden /> : <AudioLines size={17} aria-hidden />}
          {busy
            ? "Preparing your audio…"
            : audio
              ? "Regenerate audio"
              : explanation
                ? "Retry voice"
                : actionLabel}
        </button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {explanation ? (
        <>
          <details className="explainer-sources">
            <summary>Sources</summary>
            {explanation.sources.map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                {source.name} ↗
              </a>
            ))}
          </details>
        </>
      ) : null}
    </section>
  );
}
