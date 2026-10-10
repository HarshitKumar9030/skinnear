"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Upload, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { AnimatedScanMark } from "./AnimatedScanMark";

export function ScanPanel({ onSample, onScan, onCancel, busy, liveEnabled }: { onSample: () => void; onScan: (file: File) => Promise<void>; onCancel: () => void; busy: boolean; liveEnabled: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function select(next: File | undefined) {
    if (!next) return;
    if (!["image/jpeg", "image/png"].includes(next.type) || !next.size || next.size > 8 * 1024 * 1024) { setError("Choose a JPEG or PNG smaller than 8 MB."); setFile(null); setPreview(null); setConsent(false); if (input.current) input.current.value = ""; return; }
    setError(""); setFile(next); setPreview(URL.createObjectURL(next)); setConsent(false);
  }

  return <section className={`scan-panel ${file ? "has-photo" : ""} ${dragging ? "is-dragging" : ""}`} aria-label="Skin scan"
    onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }}
    onDragLeave={() => setDragging(false)}
    onDrop={(event) => { event.preventDefault(); setDragging(false); if (busy) return; if (event.dataTransfer.files.length !== 1) { setError("Drop one JPEG or PNG photo at a time."); return; } select(event.dataTransfer.files[0]); }}>
    <input ref={input} type="file" accept="image/jpeg,image/png" className="visually-hidden" aria-label="Upload a selfie" onChange={(event) => select(event.target.files?.[0])} disabled={busy} />
    {file && preview ? <div className="photo-preview"><Image src={preview} alt="Your selected selfie" fill unoptimized sizes="120px" /><button className="photo-remove" aria-label="Remove selected photo" disabled={busy} onClick={() => { setFile(null); setPreview(null); if (input.current) input.current.value = ""; }}><X size={16} /></button></div> : <AnimatedScanMark />}
    <h2>{file ? "Ready for a fresh perspective?" : "Let's get to know your skin"}</h2>
    <p>{file ? "Face forward. Fill most of the photo with your face. Natural light, no filters." : "Choose or drop a close-up, front-facing selfie. JPEG or PNG, up to 8 MB."}</p>
    {file ? <>
      <Checkbox className="consent-check" checked={consent} disabled={busy} onChange={(event) => setConsent(event.target.checked)}>I agree to send this photo to YouCam for skin analysis.</Checkbox>
      <Button onClick={() => onScan(file)} disabled={!consent || !liveEnabled} loading={busy}>Analyze my skin <Upload size={17} /></Button>
      {!liveEnabled ? <p className="setup-note">Live analysis needs a YouCam connection. Try the sample below.</p> : null}
      {busy ? <Button variant="text" onClick={onCancel}>Stop waiting</Button> : <Button variant="text" onClick={() => input.current?.click()}>Choose another photo</Button>}
    </> : <Button onClick={() => input.current?.click()} disabled={busy}>Upload a selfie <Upload size={17} /></Button>}
    <Button variant="text" onClick={onSample} disabled={busy}>Try a sample scan</Button>
    {error ? <p className="inline-error" role="alert">{error}</p> : null}
    <p className="privacy-note"><ShieldCheck size={15} aria-hidden /> {file ? "SkinNear does not save your photo. YouCam processes it under its own retention policy." : "Your photo stays on this device until you consent to analysis."}</p>
  </section>;
}
