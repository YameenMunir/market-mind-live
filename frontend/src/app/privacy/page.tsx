import Link from "next/link";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "Privacy Policy | Market Mind Live",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Navbar />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 sm:py-14">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Privacy Policy</h1>
        <p className="mt-2 text-sm text-ink-faint">Last updated: 2026</p>

        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-ink-muted">
          <p>
            Market Mind Live is a market intelligence dashboard. This page summarizes, in plain language, what
            data the platform handles and how.
          </p>
          <section>
            <h2 className="text-base font-semibold text-ink">Market data</h2>
            <p className="mt-2">
              Quotes, charts, and indicators are fetched from third-party market data sources and cached
              temporarily to serve the dashboard. This data is not personal data and is not linked to any
              individual user.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-ink">AI Insights chat</h2>
            <p className="mt-2">
              Messages you send to the AI Insights assistant are used only to generate a response grounded in
              the market context you're viewing, and to improve the assistant's answers. Chat sessions are
              held in memory and are not sold or shared with third parties for advertising.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-ink">Local preferences</h2>
            <p className="mt-2">
              Display preferences (such as theme and default symbol) are stored locally in your browser and
              are never transmitted to our servers.
            </p>
          </section>
          <p>
            Questions about this policy can be sent via the <Link href="/contact" className="text-brand hover:underline">contact page</Link>.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
