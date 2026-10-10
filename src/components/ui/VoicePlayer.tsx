"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Button } from "./Button";

function timestamp(value: number) {
  const seconds = Number.isFinite(value) ? Math.floor(value) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Accessible controls wrap a real HTML audio element; its events own playback state. */
export function VoicePlayer({ src, title }: { src: string; title: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    let active = true;
    // Generation may outlast browser user activation. Manual play remains available.
    void element.play().catch(() => { if (active) setMessage("Ready to listen. Press play."); });
    return () => { active = false; element.pause(); };
  }, [src]);

  async function toggle() {
    const element = audio.current;
    if (!element) return;
    if (element.paused) {
      if (element.ended) element.currentTime = 0;
      try { await element.play(); setMessage(""); }
      catch { setMessage("Audio could not play. Try again or regenerate it."); }
    } else element.pause();
  }

  return <div className={`voice-player ${playing ? "is-playing" : ""}`} role="group" aria-label="Voice explanation player">
    <audio ref={audio} src={src} preload="metadata" aria-label="AI-generated narration" hidden
      onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
      onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
      onError={() => { setPlaying(false); setMessage("Audio could not load. Please regenerate it."); }} />
    <div className="voice-player-heading"><div><small>AI voice · your personal listen</small><h3>{title}</h3></div>
      <svg className="voice-wave" viewBox="0 0 132 36" aria-hidden>{Array.from({ length: 18 }, (_, index) => {
        const height = 8 + ((index * 13) % 27);
        return <rect key={index} x={index * 7.3} y={(36 - height) / 2} width="3.5" height={height} rx="1.75" style={{ animationDelay: `${index * -0.07}s` }} />;
      })}</svg>
    </div>
    <div className="voice-player-controls">
      <Button className="voice-play" onClick={() => void toggle()} aria-label={playing ? "Pause narration" : "Play narration"}>
        {playing ? <Pause size={22} aria-hidden /> : <Play size={22} aria-hidden />}
      </Button>
      <div className="voice-timeline">
        <input aria-label="Seek narration" type="range" min="0" max={duration || 1} step="0.1" value={Math.min(position, duration || 1)} disabled={!duration}
          style={{ "--voice-progress": `${duration ? Math.min(100, position / duration * 100) : 0}%` } as CSSProperties}
          aria-valuetext={`${timestamp(position)} of ${timestamp(duration)}`} onChange={(event) => { const next = Number(event.target.value); if (audio.current) audio.current.currentTime = next; setPosition(next); }} />
        <div><span>{timestamp(position)}</span><span>{timestamp(duration)}</span></div>
      </div>
      <Button variant="secondary" className="voice-small" aria-label="Restart narration" onClick={() => { if (audio.current) audio.current.currentTime = 0; setPosition(0); }}><RotateCcw size={18} aria-hidden /></Button>
      <Button variant="secondary" className="voice-small" aria-label={muted ? "Unmute narration" : "Mute narration"} aria-pressed={muted}
        onClick={() => { if (audio.current) audio.current.muted = !muted; setMuted(!muted); }}>{muted ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}</Button>
      <Button variant="secondary" className="voice-speed" aria-label={`Playback speed ${rate} times. Change speed`} onClick={() => {
        const next = rate === 1 ? 1.25 : rate === 1.25 ? 1.5 : 1;
        if (audio.current) audio.current.playbackRate = next;
        setRate(next);
      }}>{rate}×</Button>
    </div>
    {message ? <p className="field-note" role="status">{message}</p> : null}
  </div>;
}
