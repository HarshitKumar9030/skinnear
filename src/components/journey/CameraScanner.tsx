"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, SwitchCamera, X, Pause, Play, RotateCcw } from "lucide-react";
import {
  CameraCaptureService,
  cameraErrorMessage,
  type CameraFacing,
} from "@/services/CameraCaptureService";

export default function CameraScanner({
  onCapture,
  onClose,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const camera = useRef<CameraCaptureService | null>(null);
  const captureLock = useRef(false);
  const [facing, setFacing] = useState<CameraFacing>("user");
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [remaining, setRemaining] = useState(5);
  const [multiple, setMultiple] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const callback = useRef(onCapture);
  useEffect(() => {
    callback.current = onCapture;
  }, [onCapture]);

  useEffect(() => {
    let active = true;
    closeButton.current?.focus();
    const element = video.current;
    if (!navigator.mediaDevices?.getUserMedia) return;
    const service = camera.current ?? new CameraCaptureService(navigator.mediaDevices);
    camera.current = service;
    async function connect() {
      try {
        const stream = await service.open(facing);
        if (!active || !stream || !element) return;
        element.srcObject = stream;
        await element.play();
        if (!active) return;
        const multipleCameras = await service.hasMultipleCameras();
        if (active) setMultiple(multipleCameras);
      } catch (err) {
        if (active) {
          setError(cameraErrorMessage(err));
          service.stop();
        }
      }
    }
    const connectionTimeout = window.setTimeout(() => {
      if (!active || (element && element.readyState >= 2)) return;
      service.stop();
      setError("The camera is taking too long to open. Retry or upload a selfie below.");
    }, 20000);
    void connect();
    function suspend() {
      if (document.visibilityState === "hidden") {
        service.stop();
        setReady(false);
        setPaused(true);
        setError("Camera paused while you were away. Reopen it when you're ready.");
      }
    }
    function ended() {
      service.stop();
    }
    document.addEventListener("visibilitychange", suspend);
    window.addEventListener("pagehide", ended);
    return () => {
      active = false;
      window.clearTimeout(connectionTimeout);
      service.stop();
      if (element) element.srcObject = null;
      document.removeEventListener("visibilitychange", suspend);
      window.removeEventListener("pagehide", ended);
    };
  }, [facing, attempt]);

  async function capture() {
    if (captureLock.current || !video.current || !camera.current || !ready) return;
    captureLock.current = true;
    setPaused(true);
    try {
      const photo = await camera.current.capture(video.current);
      camera.current.stop();
      callback.current(photo);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(cameraErrorMessage(err));
      camera.current.stop();
      setReady(false);
      captureLock.current = false;
    }
  }
  const captureRef = useRef(capture);
  useEffect(() => {
    captureRef.current = capture;
  });
  useEffect(() => {
    if (!ready || paused || error) return;
    const timer = window.setTimeout(() => {
      if (remaining <= 1) void captureRef.current();
      else setRemaining((value) => value - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [ready, paused, remaining, error]);

  function restart(nextFacing = facing) {
    camera.current?.stop();
    setReady(false);
    setError("");
    setRemaining(5);
    setPaused(false);
    captureLock.current = false;
    setFacing(nextFacing);
    setAttempt((value) => value + 1);
  }
  const supported = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  return (
    <div
      className="camera-scanner"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          camera.current?.stop();
          onClose();
        }
      }}
    >
      <div className="camera-viewfinder" data-facing={facing} data-ready={ready}>
        <video
          ref={video}
          autoPlay
          muted
          playsInline
          aria-label="Live camera preview"
          onPlaying={() => setReady(true)}
        />
        <svg className="camera-face-guide" viewBox="0 0 400 400" fill="none" aria-hidden="true">
          <ellipse
            cx="200"
            cy="190"
            rx="128"
            ry="143"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="12 9"
          />
          <path
            d="M40 85V55q0-15 15-15h30m230 0h30q15 0 15 15v30M40 315v30q0 15 15 15h30m230 0h30q15 0 15-15v-30"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            className="camera-scan-line"
            d="M100 190h200"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
        <button
          type="button"
          ref={closeButton}
          className="camera-close"
          aria-label="Close camera"
          onClick={() => {
            camera.current?.stop();
            onClose();
          }}
        >
          <X size={19} />
        </button>
        <span className="camera-live-label">
          <i /> Camera preview
        </span>
        {ready && !error ? (
          <div className="camera-countdown" key={paused ? "paused" : remaining} aria-hidden="true">
            {paused ? <Pause size={24} /> : remaining}
          </div>
        ) : null}
        {!ready && !error && supported ? (
          <div className="camera-connecting">Opening your camera…</div>
        ) : null}
      </div>
      <div className="camera-caption" role="status" aria-live="polite">
        <strong>
          {error || !supported
            ? "Let's try another way."
            : paused
              ? "Take your time."
              : ready
                ? `Capturing in ${remaining}…`
                : "A moment to connect."}
        </strong>
        <p>
          {error ||
            (!supported
              ? "Camera access needs HTTPS or localhost and a supported browser. Upload a selfie below."
              : "Fit your whole face in the oval. Face a light source and hold still. One photo, one scan.")}
        </p>
      </div>
      <div className="camera-controls">
        {error ? (
          <button type="button" onClick={() => restart()}>
            <RotateCcw size={18} /> Reopen camera
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={!ready}
              aria-label={paused ? "Resume automatic capture" : "Pause automatic capture"}
              onClick={() => {
                setPaused(!paused);
                setRemaining(5);
              }}
            >
              {paused ? <Play size={19} /> : <Pause size={19} />}
            </button>
            <button
              type="button"
              className="camera-shutter"
              disabled={!ready}
              onClick={() => void capture()}
            >
              <Camera size={20} /> Capture now
            </button>
            <button
              type="button"
              disabled={!multiple || !ready}
              aria-label="Switch front and rear cameras"
              title={multiple ? "Switch camera" : "Only one camera available"}
              onClick={() => restart(facing === "user" ? "environment" : "user")}
            >
              <SwitchCamera size={21} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
