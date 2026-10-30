"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Camera, Upload, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { AnimatedScanMark } from "./AnimatedScanMark";

const CameraScanner = dynamic(() => import("./CameraScanner"), { ssr: false });

export function ScanPanel({
  onSample,
  onScan,
  onCancel,
  busy,
  liveEnabled,
}: {
  onSample: () => void;
  onScan: (file: File) => Promise<void>;
  onCancel: () => void;
  busy: boolean;
  liveEnabled: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function select(next: File | undefined) {
    if (!next) return;
    if (
      !["image/jpeg", "image/png"].includes(next.type) ||
      !next.size ||
      next.size > 8 * 1024 * 1024
    ) {
      setError("Choose a JPEG or PNG smaller than 8 MB.");
      setFile(null);
      setPreview(null);
      setConsent(false);
      if (input.current) input.current.value = "";
      return;
    }
    setCameraOpen(false);
    setError("");
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setConsent(false);
  }

  return (
    <section
      className={`scan-panel ${file ? "has-photo" : ""} ${dragging ? "is-dragging" : ""}`}
      aria-label="Skin scan"
      onDragOver={(event) => {
        event.preventDefault();
        if (!busy && !cameraOpen) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (busy || cameraOpen) return;
        if (event.dataTransfer.files.length !== 1) {
          setError("Drop one JPEG or PNG photo at a time.");
          return;
        }
        select(event.dataTransfer.files[0]);
      }}
    >
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png"
        className="visually-hidden"
        aria-label="Upload a selfie"
        onChange={(event) => select(event.target.files?.[0])}
        disabled={busy}
      />
      {cameraOpen ? (
        <CameraScanner
          onClose={() => {
            setCameraOpen(false);
            requestAnimationFrame(() => document.getElementById("open-scan-camera")?.focus());
          }}
          onCapture={(photo) => {
            setCameraOpen(false);
            setFile(photo);
            setPreview(URL.createObjectURL(photo));
            void onScan(photo);
          }}
        />
      ) : file && preview ? (
        <div className="photo-preview">
          <Image src={preview} alt="Your selected selfie" fill unoptimized sizes="120px" />
          <button
            className="photo-remove"
            aria-label="Remove selected photo"
            disabled={busy}
            onClick={() => {
              setFile(null);
              setPreview(null);
              setConsent(false);
              if (input.current) input.current.value = "";
            }}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <AnimatedScanMark />
      )}
      {!cameraOpen ? (
        <>
          <h2>{file ? "Ready for a fresh perspective?" : "Let's get to know your skin"}</h2>
          <p>
            {file
              ? "Face forward. Fill most of the photo with your face. Natural light, no filters."
              : "Open your camera for a five-second capture. Pause anytime."}
          </p>
          {file ? (
            <>
              <Checkbox
                className="consent-check"
                checked={consent}
                disabled={busy}
                onChange={(event) => setConsent(event.target.checked)}
              >
                I agree to send this photo to YouCam for skin analysis.
              </Checkbox>
              <Button
                onClick={() => onScan(file)}
                disabled={!consent || !liveEnabled}
                loading={busy}
              >
                Analyze my skin <Upload size={17} />
              </Button>
              {!liveEnabled ? (
                <p className="setup-note">
                  Live analysis needs a YouCam connection. Try the sample below.
                </p>
              ) : null}
              {busy ? (
                <Button variant="text" onClick={onCancel}>
                  Stop waiting
                </Button>
              ) : (
                <Button variant="text" onClick={() => input.current?.click()}>
                  Choose another photo
                </Button>
              )}
            </>
          ) : (
            <>
              <Checkbox
                className="consent-check"
                checked={consent}
                disabled={busy}
                onChange={(event) => setConsent(event.target.checked)}
              >
                I agree to send one captured photo to YouCam for skin analysis.
              </Checkbox>
              <Button
                id="open-scan-camera"
                onClick={() => {
                  setError("");
                  setCameraOpen(true);
                }}
                disabled={busy || !consent || !liveEnabled}
              >
                Open camera & scan <Camera size={18} />
              </Button>
              {!liveEnabled ? (
                <p className="setup-note">
                  Live analysis needs a YouCam connection. Try the sample below.
                </p>
              ) : null}
            </>
          )}
        </>
      ) : null}
      {!busy ? (
        <Button
          variant="secondary"
          onClick={() => {
            setCameraOpen(false);
            input.current?.click();
          }}
        >
          Upload a selfie instead <Upload size={16} />
        </Button>
      ) : null}
      <Button
        variant="text"
        onClick={() => {
          setCameraOpen(false);
          onSample();
        }}
        disabled={busy}
      >
        Try a sample scan
      </Button>
      {error ? (
        <p className="inline-error" role="alert">
          {error}
        </p>
      ) : null}
      <p className="privacy-note">
        <ShieldCheck size={15} aria-hidden />{" "}
        {file
          ? "SkinNear does not save your photo. YouCam processes it under its own retention policy."
          : "Your photo stays on this device until you consent to analysis."}
      </p>
    </section>
  );
}
