import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { FundaLogo } from "@/components/funda/Logo";
import { Building2, Map, Users, LayoutDashboard, LogOut, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ title: "PASA Admin Console" }] }),
});

const items = [
  { to: "/admin", title: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/schools", title: "Schools", icon: Building2 },
  { to: "/admin/districts", title: "Districts", icon: Map },
  { to: "/admin/users", title: "Users & roles", icon: Users },
];

function AdminLayout() {
  const { user, loading, primaryRole, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: r => r.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/school/auth" });
    else if (primaryRole !== "super_admin") navigate({ to: "/app" });
  }, [user, loading, primaryRole, navigate]);

  if (loading || !user || primaryRole !== "super_admin") {
    return <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">Loading…</div>;
  }

  return (
    <div className="min-h-screen flex w-full bg-muted/30">
      <aside className="w-64 bg-primary text-primary-foreground flex flex-col">
        <div className="p-4 border-b border-white/10"><FundaLogo light /></div>
        <div className="px-4 pt-4 pb-2 text-[10px] uppercase tracking-wider text-accent font-semibold">
          Admin Console
        </div>
        <nav className="flex-1 px-2 py-2 space-y-1">
          {items.map(it => {
            const active = it.exact ? path === it.to : path === it.to || path.startsWith(it.to + "/");
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active ? "bg-accent text-accent-foreground" : "text-primary-foreground/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                <it.icon className="size-4" />
                {it.title}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <Link to="/app" className="flex items-center gap-2 text-xs text-primary-foreground/60 hover:text-white px-2 py-1.5">
            <ArrowLeft className="size-3.5" /> Back to dashboard
          </Link>
        </div>
        <div className="p-3 border-t border-white/10 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{profile?.full_name ?? "Admin"}</div>
            <div className="text-[10px] text-accent">Super Admin</div>
          </div>
          <Button size="icon" variant="ghost" onClick={() => signOut()} className="text-primary-foreground hover:bg-white/10">
            <LogOut className="size-4" />
          </Button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b bg-background flex items-center px-6">
          <div className="text-sm font-medium">PASA Admin</div>
        </header>
        <main className="flex-1 p-6 overflow-auto"><Outlet /></main>
      </div>
    </div>
  );
}
