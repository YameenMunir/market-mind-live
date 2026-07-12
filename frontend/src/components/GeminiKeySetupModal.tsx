"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, X } from "lucide-react";

import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog";
import { Input } from "@/components/Input";
import { StatusBanner } from "@/components/StatusBanner";
import { useGeminiKey } from "@/hooks/useGeminiKey";
import { ApiError } from "@/types";

interface GeminiKeySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Shown for the dismissible first-run prompt; pass false when opening from Settings
   * to edit/replace an existing key, where "skip" doesn't make sense. */
  allowSkip?: boolean;
  /** "Skip for now" for the first-run prompt, "Cancel" when editing from Settings. */
  cancelLabel?: string;
}

export function GeminiKeySetupModal({
  isOpen,
  onClose,
  allowSkip = true,
  cancelLabel = "Skip for now",
}: GeminiKeySetupModalProps) {
  const { save } = useGeminiKey();
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setApiKey("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!apiKey.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await save(apiKey.trim());
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that key. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      variant="centered"
      labelledBy="gemini-key-modal-title"
      closeOnEscape={allowSkip}
      closeOnScrimClick={allowSkip}
      elevated
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10">
            <KeyRound size={17} className="text-brand" />
          </div>
          <div>
            <p id="gemini-key-modal-title" className="text-sm font-semibold text-ink">
              Connect your Gemini API key
            </p>
            <p className="text-xs text-ink-faint">Powers the AI Insights assistant</p>
          </div>
        </div>
        {allowSkip && (
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X size={16} />
          </Button>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-ink-muted">
        Bring your own Gemini API key so AI Insights answers with live Gemini responses instead of the built-in
        offline assistant. Get a free key from{" "}
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noreferrer"
          className="text-brand underline underline-offset-2"
        >
          Google AI Studio
        </a>
        .
      </p>

      <label htmlFor="gemini-api-key" className="mb-1.5 mt-4 block text-xs font-medium text-ink-muted">
        Gemini API key
      </label>
      <Input
        id="gemini-api-key"
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="AIza..."
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
        }}
      />

      <div className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-faint">
        <ShieldCheck size={13} className="mt-0.5 shrink-0" aria-hidden />
        <span>Encrypted and stored only for this browser. It is never shown again after saving.</span>
      </div>

      {error && <StatusBanner message={error} tone="warning" icon="warning" className="mt-3" />}

      <div className="mt-5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
        {allowSkip && (
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
            {cancelLabel}
          </Button>
        )}
        <Button variant="primary" onClick={handleSave} loading={isSubmitting} disabled={!apiKey.trim()} className="w-full sm:w-auto">
          Save key
        </Button>
      </div>
    </Dialog>
  );
}
