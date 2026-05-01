import { Link, useRouterState } from "@tanstack/react-router";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { FundaLogo } from "./Logo";
import { useAuth } from "@/lib/auth-context";
import { Home, Users, BookOpen, CalendarDays, Bell, Shield, ArrowLeftRight, GraduationCap, ClipboardList, FileText, MessageCircle, Crown, LogOut, ShieldCheck, Settings, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";

const parentItems = [
  { to: "/app", title: "Overview", icon: Home, exact: true },
  { to: "/app/children", title: "My children", icon: Users },
  { to: "/app/marks", title: "Report cards", icon: BookOpen },
  { to: "/app/attendance", title: "Attendance", icon: ClipboardList },
  { to: "/app/discipline", title: "Discipline", icon: Shield },
  { to: "/app/calendar", title: "Calendar", icon: CalendarDays },
  { to: "/app/alerts", title: "Notifications", icon: Bell },
  { to: "/app/schools", title: "Schools", icon: GraduationCap },
  { to: "/app/assistant", title: "AI Assistant", icon: MessageCircle },
];

const schoolBaseItems = [
  { to: "/app", title: "Overview", icon: Home, exact: true },
  { to: "/app/learners", title: "Learners", icon: Users },
  { to: "/app/classes", title: "Classes", icon: GraduationCap },
  { to: "/app/marks-capture", title: "Report cards", icon: BookOpen },
  { to: "/app/attendance-capture", title: "Attendance", icon: ClipboardList },
  { to: "/app/discipline-school", title: "Discipline", icon: Shield },
  { to: "/app/calendar", title: "Calendar", icon: CalendarDays },
  { to: "/app/assistant", title: "AI Assistant", icon: MessageCircle },
];

const adminExtra = [
  { to: "/app/transfers", title: "Transfers", icon: ArrowLeftRight },
  { to: "/app/staff", title: "Staff", icon: UserCog },
  { to: "/app/audit", title: "Audit log", icon: FileText },
];

export function AppSidebar() {
  const { primaryRole, profile, displayName, signOut } = useAuth();
  const path = useRouterState({ select: r => r.location.pathname });
  const isParent = primaryRole === "parent";
  const items = isParent ? parentItems : schoolBaseItems;
  const showAdmin = primaryRole === "principal" || primaryRole === "school_admin" || primaryRole === "super_admin";
  const isSuper = primaryRole === "super_admin";

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4"><FundaLogo light /></SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isParent ? "Parent" : "School"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(it => {
                const active = it.exact ? path === it.to : path === it.to || path.startsWith(it.to + "/");
                return (
                  <SidebarMenuItem key={it.to}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={it.to as any}><it.icon className="size-4" /><span>{it.title}</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {showAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminExtra.map(it => {
                  const active = path === it.to || path.startsWith(it.to + "/");
                  return (
                    <SidebarMenuItem key={it.to}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link to={it.to as any}><it.icon className="size-4" /><span>{it.title}</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {isParent && profile?.subscription_tier !== "premium" && (
          <SidebarGroup>
            <SidebarGroupContent className="px-2">
              <Link to="/app/upgrade" className="block rounded-lg p-3 bg-accent/15 border border-accent/30 hover:bg-accent/20 transition-colors">
                <div className="flex items-center gap-2 text-accent font-semibold text-sm"><Crown className="size-4"/>Go Premium</div>
                <div className="text-[11px] text-sidebar-foreground/60 mt-1">R19.99/mo · Unlimited children, instant alerts</div>
              </Link>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {isSuper && (
          <SidebarGroup>
            <SidebarGroupContent className="px-2">
              <Link to="/admin" className="block rounded-lg p-3 bg-accent/15 border border-accent/30 hover:bg-accent/20 transition-colors">
                <div className="flex items-center gap-2 text-accent font-semibold text-sm"><ShieldCheck className="size-4"/>Admin Console</div>
                <div className="text-[11px] text-sidebar-foreground/60 mt-1">Manage schools, districts & roles</div>
              </Link>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center justify-between text-xs gap-2">
          <Link
            to="/app/profile"
            className="flex items-center gap-2 min-w-0 flex-1 rounded-md px-2 py-1.5 hover:bg-sidebar-accent transition-colors"
          >
            <div className="size-7 rounded-full bg-accent/20 text-accent grid place-items-center shrink-0">
              <Settings className="size-3.5" />
            </div>
            <div className="truncate">
              <div className="font-medium text-sidebar-foreground truncate">{displayName ?? "User"}</div>
              <div className="text-sidebar-foreground/60 capitalize">{primaryRole.replace("_", " ")}</div>
            </div>
          </Link>
          <Button size="icon" variant="ghost" onClick={() => signOut()} className="text-sidebar-foreground hover:bg-sidebar-accent shrink-0" title="Sign out">
            <LogOut className="size-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
