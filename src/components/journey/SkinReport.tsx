import { Droplets, Leaf, Sparkles, Sun } from "lucide-react";
import type { SkinAnalysis } from "@/domain/schemas";
import { CONCERN_LABELS } from "@/domain/sample";

const icons = { moisture: Droplets, redness: Leaf, oiliness: Sun, pore: Sparkles };

export function SkinReport({ analysis, compact = false }: { analysis: SkinAnalysis; compact?: boolean }) {
  return <section className={`skin-report ${compact ? "compact" : ""}`} aria-label="Your skin report">
    <div className="report-heading"><h2>{compact ? "Made for your skin" : "Your skin, a little clearer."}</h2><span>{analysis.mode === "demo" ? "Sample report" : "YouCam report"}</span></div>
    <p>{analysis.mode === "demo" ? "Illustrative scores to explore the experience. These are not an analysis of your photo." : "Visible skin insights from your YouCam scan."}</p>
    <div className="score-list">{analysis.scores.map((result) => {
      const Icon = icons[result.concern];
      return <div className="score-row" key={result.concern}>
        <Icon size={20} aria-hidden /><div className="score-content"><div><span>{CONCERN_LABELS[result.concern]}</span><strong>{result.score}<small>/100</small></strong></div><div className="score-track"><span style={{ width: `${result.score}%` }} /></div></div>
      </div>;
    })}</div>
    <p className="report-note">Higher scores indicate a more favorable cosmetic assessment. Lighting and image quality can affect results.</p>
    {analysis.scores.some((score) => score.maskUrl) ? <details className="mask-links"><summary>View analysis overlays</summary>{analysis.scores.filter((s) => s.maskUrl).map((score) => <a key={score.concern} href={score.maskUrl} target="_blank" rel="noreferrer">{CONCERN_LABELS[score.concern]} overlay</a>)}</details> : null}
  </section>;
}
