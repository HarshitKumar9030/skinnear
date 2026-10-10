"use client";
import { useEffect, useRef, useState } from "react";
import { AudioLines, Sparkles } from "lucide-react";
import type { Routine } from "@/domain/schemas";
import type { RoutineExplanation } from "@/domain/explanations";
import { SkinNearApi } from "@/lib/client-api";
import { PortableRoutineService } from "@/services/PortableRoutineService";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
const api = new SkinNearApi();
export function RoutineExplainer({routine,currency}:{routine:Routine;currency:string}) {
  const [consent,setConsent] = useState(false);
  const [explanation,setExplanation] = useState<RoutineExplanation | null>(null);
  const [busy,setBusy] = useState<"text"|"voice"|null>(null);
  const [error,setError] = useState("");
  const [audio,setAudio] = useState("");
  const request = useRef<AbortController | null>(null);
  const audioUrl = useRef("");
  useEffect(()=>()=>{request.current?.abort();if(audioUrl.current) URL.revokeObjectURL(audioUrl.current);},[]);
  const revoke = () => {request.current?.abort();if(audioUrl.current) URL.revokeObjectURL(audioUrl.current);audioUrl.current="";setAudio("");setExplanation(null);setBusy(null);setError("");};
  const explain = async () => {
    if(audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current="";setAudio("");setExplanation(null);
    const controller = new AbortController();request.current=controller;setBusy("text");setError("");
    try {
      const portable = new PortableRoutineService();
      const result = await api.post<RoutineExplanation>("/api/routine/explain",{plan:portable.encode(portable.fromRoutine(routine,currency)),consent:true},controller.signal);
      if (!controller.signal.aborted) setExplanation(result);
    } catch (error) {if(!controller.signal.aborted) setError(error instanceof Error ? error.message : "Explanation unavailable.");}
    finally {if(!controller.signal.aborted) setBusy(null);}
  };
  const narrate = async () => {
    if(!explanation) return;
    const controller=new AbortController();request.current=controller;setBusy("voice");setError("");
    try {
      const response=await fetch("/api/routine/voice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:explanation.narrationToken,consent:true}),signal:controller.signal});
      if(!response.ok) throw new Error((await response.json()).error || "Voice unavailable.");
      const blob=await response.blob();
      if(controller.signal.aborted) return;
      audioUrl.current=URL.createObjectURL(blob);setAudio(audioUrl.current);
    } catch(error) {if(!controller.signal.aborted) setError(error instanceof Error?error.message:"Voice unavailable.");}
    finally {if(!controller.signal.aborted) setBusy(null);}
  };
  return <section className="routine-explainer" aria-label="AI routine explanation">
    <div className="explainer-title"><span className="explainer-icon"><AudioLines size={26}/></span><div><small>A little clarity, in your own time</small><h2>Let&apos;s talk through your routine.</h2></div></div>
    <p>Hear why each step is here and how it may help, in a warm, natural AI voice. Cosmetic guidance, not a doctor&apos;s diagnosis.</p>
    <Checkbox checked={consent} onChange={(event)=>{setConsent(event.target.checked);if(!event.target.checked) revoke();}}>I agree to send selected product names, estimates and routine budget to Google Gemini for an explanation. Voice playback also sends the explanation text. My selfie, skin scores and location stay out of this request.</Checkbox>
    <div className="workspace-actions"><Button variant="secondary" disabled={!consent||!!busy} loading={busy==="text"} onClick={explain}><Sparkles size={16}/>{explanation?"Refresh explanation":"Explain my routine"}</Button>{explanation&&!audio?<Button disabled={!consent||!!busy} loading={busy==="voice"} onClick={narrate}><AudioLines size={17}/>Generate natural voice</Button>:null}</div>
    {error?<p role="alert">{error}</p>:null}
    {explanation?<div className="explainer-response"><p>{explanation.summary}</p>{explanation.steps.map((step)=><div key={step.id}><h3>{routine.items.find((item)=>item.product.id===step.id)?.product.name}</h3><p>{step.explanation}</p></div>)}<p className="field-note">{explanation.caution}</p><details><summary>Product sources</summary>{explanation.sources.map((source)=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name} ↗</a>)}</details>{audio?<><audio controls src={audio} aria-label="AI-generated routine narration" preload="metadata"/><small>AI-generated voice · use the player to listen, pause or replay</small></>:null}</div>:null}
  </section>;
}
