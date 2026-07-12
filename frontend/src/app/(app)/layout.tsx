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
            <Sidebar />
            <SidebarExpandButton />
            <div className="flex min-w-0 flex-1 flex-col">
              <MobileNav />
              {children}
            </div>
          </div>
        </SidebarCollapseProvider>
      </GeminiKeyProvider>
    </CurrencyProvider>
  );
}
