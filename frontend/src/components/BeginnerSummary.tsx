import { Lightbulb } from "lucide-react";

import { Panel } from "@/components/Panel";
import type { PredictionResult } from "@/types";

// Lightbulb, not Sparkles - this is a deterministic, rule-based summary of the
// prediction engine's own output, not generative AI. Sparkles is reserved for the
// actual Gemini/mock-provider chat surfaces (AIInsightsPanel, FullscreenChatShell,
// AIChatMessage's InsightCard) so the two are never visually conflated.
export function BeginnerSummary({ prediction }: { prediction: PredictionResult | null }) {
  return (
    <Panel eyebrow="For Beginners" title="What does this mean?">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-brand/10">
          <Lightbulb size={15} className="text-brand" />
        </div>
        <p className="text-sm leading-relaxed text-ink-muted">
          {prediction?.beginner_summary ?? "Select an asset to see a plain-language summary of what the model is seeing."}
        </p>
      </div>
    </Panel>
  );
}
