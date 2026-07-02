import { Sparkles } from "lucide-react";

interface AIInsightsButtonProps {
  onClick: () => void;
}

export function AIInsightsButton({ onClick }: AIInsightsButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Open AI Insights"
      className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-canvas shadow-glow transition-transform hover:-translate-y-0.5 lg:bottom-6 lg:right-6"
    >
      <Sparkles size={16} />
      <span className="hidden sm:inline">AI Insights</span>
    </button>
  );
}
