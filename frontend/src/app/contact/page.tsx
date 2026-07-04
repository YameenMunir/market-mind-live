import { Mail } from "lucide-react";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "Contact | Market Mind Live",
};

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Navbar />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 sm:py-14">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Contact</h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-muted">
          Questions, feedback, or bug reports about Market Mind Live are welcome. Reach out and we'll get back
          to you.
        </p>

        <a
          href="mailto:support@marketmindlive.app"
          className="mt-8 flex w-fit items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand/30"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10">
            <Mail size={18} className="text-brand" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Email</p>
            <p className="mt-0.5 text-sm font-medium text-ink">support@marketmindlive.app</p>
          </div>
        </a>
      </main>

      <Footer />
    </div>
  );
}
