"use client";

import { useEffect, useRef, useState } from "react";
import { Check, RotateCw, RotateCcw, ZoomIn, X, Move } from "lucide-react";
import { DEFAULT_CROP, cropGeometry, panCrop, type CropSettings } from "@/domain/photo-crop";
import { PhotoCropService } from "@/services/PhotoCropService";
import { Button } from "@/components/ui/Button";

export default function PhotoCropEditor({
  file,
  initial = DEFAULT_CROP,
  onApply,
  onCancel,
}: {
  file: File;
  initial?: CropSettings;
  onApply: (file: File, settings: CropSettings) => void;
  onCancel: () => void;
}) {
  const [engine, setEngine] = useState<PhotoCropService | null>(null);
  const [settings, setSettings] = useState({ ...initial });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const active = useRef(false);
  const drag = useRef<{ x: number; y: number; pointer: number } | null>(null);

  useEffect(() => {
    let disposed = false;
    let service: PhotoCropService | undefined;
    active.current = true;
    cancel.current?.focus();
    void PhotoCropService.open(file)
      .then((opened) => {
        if (disposed) {
          opened.close();
          return;
        }
        service = opened;
        setEngine(opened);
      })
      .catch((err: unknown) => {
        if (!disposed)
          setError(err instanceof Error ? err.message : "The photo could not be opened.");
      });
    return () => {
      disposed = true;
      active.current = false;
      service?.close();
    };
  }, [file]);

  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!engine || !context) return;
    engine.draw(context, settings, 720);
  }, [engine, settings]);

  const geometry = engine ? cropGeometry(engine.width, engine.height, settings) : null;
  async function apply() {
    if (!engine || saving) return;
    setSaving(true);
    setError("");
    try {
      const photo = await engine.export(settings);
      if (active.current) onApply(photo, settings);
    } catch (err) {
      if (active.current)
        setError(err instanceof Error ? err.message : "This crop could not be saved.");
    } finally {
      if (active.current) setSaving(false);
    }
  }

  return (
    <div
      className="photo-crop-editor"
      aria-label="Photo crop editor"
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
    >
      <div className="crop-heading">
        <div>
          <span>MAKE IT A CLEARER FIT</span>
          <h2>A little closer. All of you.</h2>
        </div>
        <button
          type="button"
          ref={cancel}
          className="crop-icon-button"
          aria-label="Cancel photo crop"
          onClick={onCancel}
        >
          <X size={19} />
        </button>
      </div>
      <p className="crop-description">
        Keep your forehead, chin and both cheeks in the frame. Leave just one face visible.
      </p>
      <div className="crop-stage" data-loading={!engine}>
        <canvas
          ref={canvas}
          width={720}
          height={720}
          tabIndex={engine && !saving ? 0 : -1}
          role="group"
          aria-label="Crop preview. Drag to reposition, or use arrow keys."
          aria-describedby="crop-help"
          aria-busy={!engine}
          onPointerDown={(event) => {
            if (!engine || saving) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.focus();
            drag.current = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
          }}
          onPointerMove={(event) => {
            const previous = drag.current;
            if (!previous || previous.pointer !== event.pointerId || !engine || saving) return;
            const dx = event.clientX - previous.x;
            const dy = event.clientY - previous.y;
            const size = event.currentTarget.getBoundingClientRect().width;
            setSettings((value) => panCrop(engine.width, engine.height, value, dx, dy, size));
            drag.current = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
          onKeyDown={(event) => {
            if (
              saving ||
              event.altKey ||
              event.ctrlKey ||
              event.metaKey ||
              !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
            )
              return;
            event.preventDefault();
            if (!engine) return;
            const step = event.shiftKey ? 24 : 8;
            const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
            const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
            const size = event.currentTarget.getBoundingClientRect().width;
            setSettings((value) => panCrop(engine.width, engine.height, value, dx, dy, size));
          }}
        />
        {engine ? (
          <svg viewBox="0 0 400 400" className="crop-face-guide" fill="none" aria-hidden="true">
            <ellipse
              cx="200"
              cy="195"
              rx="128"
              ry="151"
              stroke="white"
              strokeWidth="1.5"
              strokeDasharray="8 8"
            />
            <path d="M0 133h400M0 267h400M133 0v400M267 0v400" stroke="white" strokeOpacity=".18" />
          </svg>
        ) : (
          <span className="crop-loading">
            {error ? "Choose another photo to continue." : "Preparing your photo…"}
          </span>
        )}
        <span className="crop-frame-label">
          <Move size={13} /> Drag to reframe
        </span>
      </div>
      <div className="crop-adjustments">
        <label className="crop-zoom">
          <ZoomIn size={17} />
          <span>Zoom</span>
          <input
            type="range"
            min="1"
            max={geometry?.maxZoom ?? 1}
            step="0.01"
            value={geometry?.zoom ?? 1}
            disabled={!engine || saving || geometry?.maxZoom === 1}
            onChange={(event) => setSettings({ ...settings, zoom: Number(event.target.value) })}
            aria-label="Crop zoom"
          />
          <output>{(geometry?.zoom ?? 1).toFixed(1)}×</output>
        </label>
        <div className="crop-tools">
          <button
            type="button"
            disabled={!engine || saving}
            onClick={() => setSettings({ ...DEFAULT_CROP, turns: (settings.turns + 1) % 4 })}
          >
            <RotateCw size={16} /> Rotate
          </button>
          <button
            type="button"
            disabled={!engine || saving}
            onClick={() => setSettings({ ...DEFAULT_CROP })}
          >
            <RotateCcw size={16} /> Reset
          </button>
        </div>
      </div>
      <p id="crop-help" className="crop-help">
        Drag or use arrow keys to move the photo. The square frame is saved; the oval is a guide.
      </p>
      {geometry && geometry.side < 480 ? (
        <p className="crop-quality-note">
          This crop has limited detail. We can resize it, but a sharper photo will give YouCam more
          detail.
        </p>
      ) : null}
      {error ? (
        <p className="inline-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="crop-actions">
        <Button disabled={!engine} loading={saving} onClick={() => void apply()}>
          Use this crop <Check size={17} />
        </Button>
        <button type="button" onClick={onCancel}>
          Keep current photo
        </button>
      </div>
      <p className="crop-local-note">
        Edited on your device. Applying a crop does not start a scan.
      </p>
    </div>
  );
}
