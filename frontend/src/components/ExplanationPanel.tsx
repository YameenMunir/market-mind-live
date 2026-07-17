import { InfoTooltip } from "@/components/InfoTooltip";
import { Panel } from "@/components/Panel";
import type { PredictionResult } from "@/types";

export function ExplanationPanel({ prediction }: { prediction: PredictionResult | null }) {
  return (
    <Panel eyebrow="Model Reasoning" title="Plain-English Explanation">
      <p className="mb-3 flex items-center gap-1.5 font-mono text-2xs font-bold uppercase tracking-wider text-ink-faint">
        Rule-based scoring, not machine learning
        <InfoTooltip articleId="prediction_methodology" />
      </p>
      <p className="text-sm leading-relaxed text-ink-muted">
        {prediction?.plain_english_explanation ?? "Reasoning will appear here once a prediction has been generated."}
      </p>

      {prediction && prediction.reasoning.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-border pt-4">
          {prediction.reasoning.map((reason, i) => (
            <li key={i} className="flex gap-2.5 text-xs leading-relaxed text-ink-muted">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
              {reason}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
