import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/funda/AppSidebar";
import { MobileBottomNav } from "@/components/funda/MobileBottomNav";
import { useAuth } from "@/lib/auth-context";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">Loading…</div>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        {/* Sidebar — hidden on mobile */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-background flex items-center px-4 gap-3 sticky top-0 z-30">
            {/* Sidebar trigger only on desktop */}
            <div className="hidden md:block">
              <SidebarTrigger />
            </div>
            <div className="text-sm font-medium text-muted-foreground">PASA</div>
          </header>

          {/* Extra bottom padding on mobile so content clears the bottom nav */}
          <main className={`flex-1 p-4 md:p-6 ${isMobile ? "pb-24" : ""}`}>
            <Outlet />
          </main>
        </div>
      </div>

      {/* Bottom nav — mobile only */}
      <MobileBottomNav />
    </SidebarProvider>
  );
}
