import { Sparkles } from "lucide-react";

import { Panel } from "@/components/Panel";
import type { PredictionResult } from "@/types";

export function BeginnerSummary({ prediction }: { prediction: PredictionResult | null }) {
  return (
    <Panel eyebrow="For Beginners" title="What does this mean?">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10">
          <Sparkles size={15} className="text-brand" />
        </div>
        <p className="text-sm leading-relaxed text-ink-muted">
          {prediction?.beginner_summary ?? "Select an asset to see a plain-language summary of what the model is seeing."}
        </p>
      </div>
    </Panel>
  );
}
