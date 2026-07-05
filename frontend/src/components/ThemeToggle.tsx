"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <Button variant="secondary" size="icon" onClick={toggleTheme} aria-label={label} title={label}>
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </Button>
  );
}
