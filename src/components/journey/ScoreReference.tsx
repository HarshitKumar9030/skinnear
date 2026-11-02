import { cosmeticScoreBand, SCORE_GUIDE_URL } from "@/domain/score-reference";

export function ScoreReference({ score }: { score: number }) {
  return (
    <span className="score-reference">
      <span>{cosmeticScoreBand(score)}</span>
      <span>Cosmetic reference: 70–100</span>
    </span>
  );
}

export function ScoreReferenceGuide() {
  return (
    <details className="score-reference-guide">
      <summary>What is the reference range?</summary>
      <p>
        Perfect Corp.’s general cosmetic guide labels 0–39 Needs attention, 40–69 Average, 70–84
        Good and 85–100 Excellent. The 70–100 reference combines Good and Excellent; it is not a
        medical safety cutoff or a required personal target. Photo conditions can change a score,
        and a high score does not rule out a skin condition.
      </p>
      <a href={SCORE_GUIDE_URL} target="_blank" rel="noopener noreferrer">
        Read Perfect Corp.’s score guide
      </a>
    </details>
  );
}
