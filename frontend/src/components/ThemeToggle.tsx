"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, isReady } = useTheme();

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <Button variant="secondary" size="icon" onClick={toggleTheme} aria-label={label} title={label} className={className}>
      {/* Icon withheld until the real persisted theme is known - every useTheme()
       * caller starts from a "dark" placeholder (see the hook's isReady doc), so
       * rendering immediately would show the Sun/Moon icon backwards for a split
       * second whenever the actual stored preference is "light". */}
      {isReady && (theme === "dark" ? <Sun size={16} /> : <Moon size={16} />)}
    </Button>
  );
}
