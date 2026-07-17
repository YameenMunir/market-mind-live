import { Sparkles } from "lucide-react";

import { Button } from "@/components/Button";

interface AIInsightsButtonProps {
  onClick: () => void;
}

// Lives in Topbar's toolbar row next to AlertsBellButton/DashboardViewMenu, not a
// floating FAB - a fixed-position launcher previously sat in the same bottom-right
// corner as MobileNav's bottom tab bar on every viewport under `lg`, and the
// rounded-full brand-filled pill read as a generic chat-widget launcher inconsistent
// with the flat/bordered idiom used everywhere else, including the panel it opens.
export function AIInsightsButton({ onClick }: AIInsightsButtonProps) {
  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={onClick}
      aria-label="Open AI Insights"
      data-tour="ai-insights-button"
    >
      <Sparkles size={16} />
    </Button>
  );
}
