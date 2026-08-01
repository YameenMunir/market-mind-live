import { MobileNav } from "@/components/MobileNav";
import { Sidebar } from "@/components/Sidebar";
import { SidebarExpandButton } from "@/components/SidebarExpandButton";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { GeminiKeyProvider } from "@/contexts/GeminiKeyContext";
import { SidebarCollapseProvider } from "@/contexts/SidebarCollapseContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CurrencyProvider>
      <GeminiKeyProvider>
        <SidebarCollapseProvider>
          <div className="flex min-h-screen">
            {/* Keyboard users previously had to tab through the entire sidebar and
                topbar on every page load before reaching page content. */}
            <a
              href="#main-content"
              className="sr-only rounded-sm bg-brand px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-canvas focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100]"
            >
              Skip to main content
            </a>
            <Sidebar />
            <SidebarExpandButton />
            <div id="main-content" className="flex min-w-0 flex-1 flex-col">
              <MobileNav />
              {children}
            </div>
          </div>
        </SidebarCollapseProvider>
      </GeminiKeyProvider>
    </CurrencyProvider>
  );
}
