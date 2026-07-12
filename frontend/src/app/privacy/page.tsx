
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";
import { EvidenceNetwork3D } from "@/components/EvidenceNetwork3D";

export const metadata = {
  title: "Privacy Policy | Market Mind Live",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-start">
          {/* Left Column: Privacy content */}
          <div className="lg:col-span-8 space-y-6">
            <Reveal delay={0}>
              <h1 className="text-xl font-bold uppercase tracking-wider font-mono text-ink">Privacy Policy</h1>
              <p className="mt-1 font-mono text-xs uppercase tracking-wide text-ink-faint">Last updated: 2026</p>
            </Reveal>

            <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-ink-muted">
              <Reveal delay={0.06}>
                <p>
                  Market Mind Live is a market intelligence dashboard. This page summarizes, in plain language, what
                  data the platform handles and how.
                </p>
              </Reveal>
              
              <Reveal delay={0.12} className="space-y-2">
                <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-ink">Market data</h2>
                <p>
                  Quotes, charts, and indicators are fetched from third-party market data sources and cached
                  temporarily to serve the dashboard. This data is not personal data and is not linked to any
                  individual user.
                </p>
              </Reveal>
              
              <Reveal delay={0.18} className="space-y-2">
                <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-ink">AI Insights chat</h2>
                <p>
                  Messages you send to the AI Insights assistant are used only to generate a response grounded in
                  the market context you&rsquo;re viewing, and to improve the assistant&rsquo;s answers. Chat sessions are
                  held in memory and are not sold or shared with third parties for advertising.
                </p>
              </Reveal>
              
              <Reveal delay={0.24} className="space-y-2">
                <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-ink">Local preferences</h2>
                <p>
                  Display preferences (such as theme and default symbol) are stored locally in your browser and
                  are never transmitted to our servers.
                </p>
              </Reveal>
              
              <Reveal delay={0.3}>
                <p>
                  Questions about this policy can be sent via email to{" "}
                  <a href="mailto:support@marketmindlive.app" className="text-brand hover:underline font-mono text-2xs uppercase font-bold tracking-wider">
                    support@marketmindlive.app
                  </a>.
                </p>
              </Reveal>
            </div>
          </div>

          {/* Right Column: 3D visual representing data routing and privacy security */}
          <div className="lg:col-span-4 w-full flex items-center justify-center sticky top-24">
            <Reveal delay={0.3}>
              <EvidenceNetwork3D className="mx-auto max-w-[340px] w-full md:max-w-[400px] lg:max-w-none opacity-60 hover:opacity-100 transition-opacity duration-300" />
            </Reveal>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
