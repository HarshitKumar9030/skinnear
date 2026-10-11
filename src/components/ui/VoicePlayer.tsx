"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import type { NarrationCue } from "@/domain/narration";
import { ListeningMark } from "./ListeningMark";

function timestamp(value: number) {
  const seconds = Number.isFinite(value) ? Math.floor(value) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

interface Props {
  src: string;
  cues: NarrationCue[];
  timing: "aligned" | "estimated";
}

export function VoicePlayer({ src, cues, timing }: Props) {
  const audio = useRef<HTMLAudioElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [message, setMessage] = useState("");
  const [following, setFollowing] = useState(true);
  const activeIndex = Math.max(
    0,
    cues.findLastIndex((cue) => position >= cue.start),
  );

  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    let active = true;
    void element.play().catch(() => {
      if (active) setMessage("Ready. Press play to listen.");
    });
    return () => {
      active = false;
      element.pause();
    };
  }, [src]);

  useEffect(() => {
    if (!following) return;
    const container = transcript.current;
    const line = container?.querySelector<HTMLElement>(`[data-cue="${activeIndex}"]`);
    if (!container || !line) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    container.scrollTo({
      top: line.offsetTop - container.clientHeight / 2 + line.clientHeight / 2,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  }, [activeIndex, following]);

  function seek(next: number) {
    if (!audio.current || !duration) return;
    const time = Math.max(0, Math.min(duration, next));
    audio.current.currentTime = time;
    setPosition(time);
  }

  async function toggle() {
    const element = audio.current;
    if (!element) return;
    if (!element.paused) {
      element.pause();
      return;
    }
    if (element.ended) element.currentTime = 0;
    try {
      await element.play();
      setMessage("");
    } catch {
      setMessage("Playback unavailable. Try again or regenerate the audio.");
    }
  }

  return (
    <div className="voice-player" role="group" aria-label="Voice explanation player">
      <audio
        ref={audio}
        src={src}
        hidden
        preload="metadata"
        onLoadedMetadata={(event) =>
          setDuration(
            Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0,
          )
        }
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setMessage("Audio could not load. Regenerate to try again.");
        }}
      />
      <div className="voice-player-heading">
        <span>Listen & follow along</span>
        <ListeningMark playing={playing} />
      </div>
      <div
        className="voice-transcript"
        ref={transcript}
        role="region"
        aria-label="Playback transcript"
        tabIndex={0}
        onWheel={() => setFollowing(false)}
        onTouchStart={() => setFollowing(false)}
        onKeyDown={(event) => {
          if (
            event.target === event.currentTarget &&
            ["ArrowUp", "ArrowDown", "PageUp", "PageDown"].includes(event.key)
          )
            setFollowing(false);
        }}
      >
        {cues.map((cue, index) => (
          <button
            type="button"
            key={`${index}:${cue.start}`}
            data-cue={index}
            className={`transcript-line ${index === activeIndex ? "is-current" : index < activeIndex ? "is-past" : ""}`}
            aria-current={index === activeIndex ? "true" : undefined}
            aria-label={`Jump to ${timestamp(cue.start)}: ${cue.text}`}
            onClick={() => {
              seek(cue.start);
              setFollowing(true);
            }}
          >
            {cue.text}
          </button>
        ))}
      </div>
      <div className="transcript-meta">
        <span>{timing === "estimated" ? "Approximate transcript timing" : "Transcript"}</span>
        <button type="button" aria-pressed={following} onClick={() => setFollowing(!following)}>
          {following ? "Following audio" : "Follow audio"}
        </button>
      </div>
      <div className="voice-player-controls">
        <button
          type="button"
          className="voice-control voice-play"
          onClick={() => void toggle()}
          aria-label={playing ? "Pause narration" : "Play narration"}
        >
          {playing ? <Pause size={22} aria-hidden /> : <Play size={22} aria-hidden />}
        </button>
        <div className="voice-timeline">
          <input
            aria-label="Seek narration"
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={Math.min(position, duration || 1)}
            disabled={!duration}
            style={
              {
                "--voice-progress": `${duration ? Math.min(100, (position / duration) * 100) : 0}%`,
              } as CSSProperties
            }
            aria-valuetext={`${timestamp(position)} of ${timestamp(duration)}`}
            onChange={(event) => seek(Number(event.target.value))}
          />
          <div>
            <span>{timestamp(position)}</span>
            <span>{timestamp(duration)}</span>
          </div>
        </div>
        <button
          type="button"
          className="voice-control"
          aria-label="Restart narration"
          onClick={() => seek(0)}
        >
          <RotateCcw size={18} aria-hidden />
        </button>
        <button
          type="button"
          className="voice-control"
          aria-label={muted ? "Unmute narration" : "Mute narration"}
          aria-pressed={muted}
          onClick={() => {
            if (audio.current) audio.current.muted = !muted;
            setMuted(!muted);
          }}
        >
          {muted ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
        </button>
        <button
          type="button"
          className="voice-control voice-speed"
          aria-label={`Playback speed ${rate} times. Change speed`}
          onClick={() => {
            const next = rate === 1 ? 1.25 : rate === 1.25 ? 1.5 : 1;
            if (audio.current) audio.current.playbackRate = next;
            setRate(next);
          }}
        >
          {rate}×
        </button>
      </div>
      {message ? (
        <p className="field-note" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
