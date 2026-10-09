"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Camera, Upload, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ScanPanel({ onSample, onScan, onCancel, busy, liveEnabled }: { onSample: () => void; onScan: (file: File) => Promise<void>; onCancel: () => void; busy: boolean; liveEnabled: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function select(next: File | undefined) {
    if (!next) return;
    if (!["image/jpeg", "image/png"].includes(next.type) || next.size > 4 * 1024 * 1024) { setError("Choose a JPEG or PNG smaller than 4 MB."); return; }
    setError(""); setFile(next); setConsent(false);
  }

  return <section className={`scan-panel ${file ? "has-photo" : ""}`} aria-label="Skin scan">
    <input ref={input} type="file" accept="image/jpeg,image/png" className="visually-hidden" aria-label="Upload a selfie" onChange={(event) => select(event.target.files?.[0])} disabled={busy} />
    {file && preview ? <div className="photo-preview"><Image src={preview} alt="Your selected selfie" fill unoptimized sizes="120px" /><button className="photo-remove" aria-label="Remove selected photo" disabled={busy} onClick={() => { setFile(null); setPreview(null); if (input.current) input.current.value = ""; }}><X size={16} /></button></div> : <div className="camera-mark"><Camera size={36} strokeWidth={1.7} aria-hidden /></div>}
    <h2>{file ? "Ready for a fresh perspective?" : "Let’s get to know your skin"}</h2>
    <p>{file ? "Face forward. Natural light. No filters." : "Upload a clear, well-lit selfie to get started."}</p>
    {file ? <>
      <label className="consent-check"><input type="checkbox" checked={consent} disabled={busy} onChange={(e) => setConsent(e.target.checked)} /><span>I agree to send this photo to YouCam for skin analysis.</span></label>
      <Button onClick={() => onScan(file)} disabled={!consent || !liveEnabled} loading={busy}>Analyze my skin <Upload size={17} /></Button>
      {!liveEnabled ? <p className="setup-note">Live analysis needs a YouCam connection. Try the sample below.</p> : null}
      {busy ? <Button variant="text" onClick={onCancel}>Stop waiting</Button> : <Button variant="text" onClick={() => input.current?.click()}>Choose another photo</Button>}
    </> : <Button onClick={() => input.current?.click()} disabled={busy}>Upload a selfie <Upload size={17} /></Button>}
    <Button variant="text" onClick={onSample} disabled={busy}>Try a sample scan</Button>
    {error ? <p className="inline-error" role="alert">{error}</p> : null}
    <p className="privacy-note"><ShieldCheck size={15} aria-hidden /> {file ? "SkinNear does not save your photo. YouCam processes it under its own retention policy." : "Your photo stays on this device until you consent to analysis."}</p>
  </section>;
}
