import { SettingsPanel } from "@/components/SettingsPanel";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function SettingsPage() {
  return (
    <>
      <header className="flex items-center justify-between border-b border-border bg-canvas px-6 py-4">
        <h1 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">Settings</h1>
        <ThemeToggle />
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          <SettingsPanel />
        </div>
      </main>
    </>
  );
}
