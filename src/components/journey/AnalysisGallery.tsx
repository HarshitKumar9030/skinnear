"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Expand, Minimize2, Layers, Eye, ImageOff } from "lucide-react";
import type { SkinAnalysis } from "@/domain/schemas";
import { CONCERN_LABELS } from "@/domain/sample";
import { orderedSkinScores, SKIN_FOCUS } from "@/domain/skin-focus";

export function AnalysisGallery({
  analysis,
  photo,
}: {
  analysis: SkinAnalysis;
  photo?: string | null;
}) {
  const scores = orderedSkinScores(analysis);
  const [index, setIndex] = useState(0);
  const original = photo;
  const [split, setSplit] = useState(50);
  const [zoomed, setZoomed] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const touchStart = useRef<number | null>(null);
  const active = scores[index % scores.length];
  const focus = SKIN_FOCUS[active.concern];
  const overlay = active.maskUrl && !failed.includes(active.maskUrl) ? active.maskUrl : null;
  const base = original && !failed.includes(original) ? original : null;
  const hasImage = !!(base || overlay);
  const compare = !!(base && overlay && showOverlay);

  function select(next: number) {
    setIndex((next + scores.length) % scores.length);
    setShowOverlay(true);
    setSplit(50);
    setZoomed(false);
  }
  function failedImage(url: string) {
    setFailed((previous) => (previous.includes(url) ? previous : [...previous, url]));
  }

  return (
    <section className="analysis-gallery" aria-label="Interactive skin insights">
      <div className="gallery-heading">
        <div>
          <span className="eyebrow">THE SKIN LENS</span>
          <h2>Your skin, layer by layer.</h2>
        </div>
        <span className="gallery-mode">
          {analysis.mode === "demo" ? "Sample insights" : "Your scan"}
        </span>
      </div>
      <p className="gallery-intro">Explore a concern. See what it means for your everyday care.</p>
      <div className="gallery-layout">
        <div className="gallery-visual">
          <div
            className="analysis-viewer"
            tabIndex={0}
            role="group"
            aria-label={`${CONCERN_LABELS[active.concern]} image viewer. Use left and right arrow keys to change concern.`}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                select(index + (event.key === "ArrowRight" ? 1 : -1));
              }
            }}
            onTouchStart={(event) => {
              touchStart.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              if (
                compare ||
                touchStart.current === null ||
                event.target instanceof HTMLInputElement
              )
                return;
              const delta =
                (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
              if (Math.abs(delta) > 55) select(index + (delta < 0 ? 1 : -1));
              touchStart.current = null;
            }}
          >
            <div className="analysis-image-layer" data-zoomed={zoomed}>
              {base ? (
                <Image
                  src={base}
                  alt="Your original scan photo"
                  fill
                  sizes="(max-width: 720px) 90vw, 40vw"
                  unoptimized
                  onError={() => failedImage(base)}
                />
              ) : null}
              {overlay && (showOverlay || !base) ? (
                <div
                  className="analysis-overlay"
                  style={{ clipPath: compare ? `inset(0 0 0 ${split}%)` : undefined }}
                >
                  <Image
                    key={overlay}
                    src={overlay}
                    alt={`YouCam ${CONCERN_LABELS[active.concern].toLowerCase()} overlay`}
                    fill
                    sizes="(max-width: 720px) 90vw, 40vw"
                    unoptimized
                    referrerPolicy="no-referrer"
                    onError={() => failedImage(overlay)}
                  />
                </div>
              ) : null}
            </div>
            {!hasImage ? (
              <div className="gallery-image-empty">
                <ImageOff size={32} strokeWidth={1.4} />
                <strong>
                  {analysis.mode === "demo"
                    ? "Your face. Your insights."
                    : "This layer isn't available."}
                </strong>
                <p>
                  {analysis.mode === "demo"
                    ? "A live scan reveals your own concern overlays here. Explore the sample insights alongside."
                    : "YouCam did not return a viewable image for this concern, or its link has expired. Your score is still available."}
                </p>
              </div>
            ) : null}
            {hasImage ? (
              <>
                <span className="viewer-label">
                  {compare
                    ? "Original"
                    : showOverlay && overlay
                      ? "YouCam overlay"
                      : "Original photo"}
                </span>
                {compare ? (
                  <>
                    <span className="viewer-label viewer-label-right">
                      {CONCERN_LABELS[active.concern]}
                    </span>
                    <div className="comparison-divider" style={{ left: `${split}%` }}>
                      <span>↔</span>
                    </div>
                  </>
                ) : null}
                <button
                  type="button"
                  className="viewer-zoom"
                  aria-label={zoomed ? "Reset image zoom" : "Zoom image"}
                  aria-pressed={zoomed}
                  onClick={() => setZoomed(!zoomed)}
                >
                  {zoomed ? <Minimize2 size={18} /> : <Expand size={18} />}
                </button>
              </>
            ) : null}
          </div>
          {compare ? (
            <label className="overlay-comparison">
              Original{" "}
              <input
                type="range"
                min="0"
                max="100"
                value={split}
                onChange={(event) => setSplit(Number(event.target.value))}
                aria-label="Original and overlay comparison"
              />{" "}
              Overlay
            </label>
          ) : null}
          <div className="gallery-toolbar">
            <div>
              <button
                type="button"
                aria-label="Previous skin concern"
                onClick={() => select(index - 1)}
              >
                <ArrowLeft size={18} />
              </button>
              <span>
                {index + 1} / {scores.length}
              </span>
              <button
                type="button"
                aria-label="Next skin concern"
                onClick={() => select(index + 1)}
              >
                <ArrowRight size={18} />
              </button>
            </div>
            {base && overlay ? (
              <button
                type="button"
                aria-pressed={showOverlay}
                onClick={() => setShowOverlay(!showOverlay)}
              >
                {showOverlay ? <Eye size={16} /> : <Layers size={16} />}
                {showOverlay ? "Original only" : "Show overlay"}
              </button>
            ) : null}
          </div>
          {!overlay && base ? (
            <small className="gallery-image-note">
              Original photo shown. No viewable overlay is available for this concern.
            </small>
          ) : null}
          {compare ? (
            <small className="gallery-image-note">
              Slide to compare. YouCam may resize its output; framing can differ slightly.
            </small>
          ) : null}
        </div>
        <div className="gallery-focus">
          <div className="gallery-concerns" aria-label="Choose a skin concern">
            {scores.map((score, position) => (
              <button
                type="button"
                key={score.concern}
                aria-pressed={position === index}
                onClick={() => select(position)}
              >
                <span>{CONCERN_LABELS[score.concern]}</span>
                <strong>
                  {score.score}
                  <small>/100</small>
                </strong>
                {position === 0 ? <i>First focus</i> : null}
              </button>
            ))}
          </div>
          <div className="skin-focus-story" key={active.concern} aria-live="polite">
            <span className="eyebrow">
              {CONCERN_LABELS[active.concern]} · {active.score}/100
            </span>
            <h3>{focus.title}</h3>
            <p>{focus.observation}</p>
            <div className="focus-next-step">
              <span>WHAT TO DO WITH THIS</span>
              <p>{focus.action}</p>
              <strong>{focus.step}</strong>
            </div>
          </div>
          <small className="gallery-image-note">
            First focus is your lowest cosmetic score, not a diagnosis. Higher scores are more
            favorable.
          </small>
        </div>
      </div>
    </section>
  );
}
