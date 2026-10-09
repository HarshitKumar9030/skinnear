import { Flower2, ArrowUpRight } from "lucide-react";

export function Footer() {
  return <footer className="site-footer shell">
    <div className="footer-brand"><Flower2 size={24} /><span>SkinNear</span></div>
    <p>Cosmetic insights, thoughtfully connected.<br />Not a medical diagnosis. Check product labels before use.</p>
    <a href="https://docs.perfectcorp.com/reference/ai_skin_analysis" target="_blank" rel="noreferrer">Built for the YouCam hackathon <ArrowUpRight size={16} /></a>
  </footer>;
}
