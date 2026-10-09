import Image from "next/image";
import { StepIndicator } from "./StepIndicator";
import { ScanPanel } from "./ScanPanel";

type Props = Parameters<typeof ScanPanel>[0];
export function Intro(props: Props) {
  return <section className="intro shell">
    <div className="intro-content">
      <h1>Good skin starts<br />with understanding.</h1>
      <p className="intro-description">A little insight. A simpler routine. Skincare that fits your skin, your budget, and your world.</p>
      <StepIndicator />
      <ScanPanel {...props} />
    </div>
    <figure className="portrait"><div className="portrait-image"><Image src="/images/skin-portrait.webp" alt="Natural skin in a softly lit editorial portrait" fill priority sizes="(max-width: 900px) 100vw, 42vw" /></div><figcaption>Your skin. A fresh perspective.</figcaption></figure>
  </section>;
}
