import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import {
  Home, Users, BookOpen, CalendarDays, Bell, Shield,
  ArrowLeftRight, GraduationCap, ClipboardList, FileText,
  MessageCircle, Crown, Settings, LogOut, MoreHorizontal,
  ShieldCheck, X, UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Nav item type ──────────────────────────────────────────────────────────
type NavItem = {
  to: string;
  title: string;
  icon: React.ElementType;
  exact?: boolean;
};

// ── Role-based nav definitions ─────────────────────────────────────────────
// First 4 items appear in the bottom bar. The rest go in the "More" sheet.
const parentPrimary: NavItem[] = [
  { to: "/app",              title: "Home",       icon: Home,        exact: true },
  { to: "/app/calendar",     title: "Calendar",   icon: CalendarDays },
  { to: "/app/discipline",   title: "Discipline", icon: Shield },
  { to: "/app/alerts",       title: "Notifications", icon: Bell },
  { to: "/app/assistant",    title: "Assistant",  icon: MessageCircle },
];
const parentMore: NavItem[] = [
  { to: "/app/children",   title: "Children",   icon: Users },
  { to: "/app/marks",      title: "Report cards", icon: BookOpen },
  { to: "/app/attendance", title: "Attendance", icon: ClipboardList },
  { to: "/app/schools",    title: "Schools",    icon: GraduationCap },
  { to: "/app/upgrade",    title: "Premium",    icon: Crown },
  { to: "/app/profile",    title: "Profile",    icon: Settings },
];

const schoolPrimary: NavItem[] = [
  { to: "/app",                    title: "Home",       icon: Home,        exact: true },
  { to: "/app/learners",           title: "Learners",   icon: Users },
  { to: "/app/marks-capture",      title: "Reports",    icon: BookOpen },
  { to: "/app/attendance-capture", title: "Attendance", icon: ClipboardList },
];
const schoolMore: NavItem[] = [
  { to: "/app/classes",            title: "Classes",    icon: GraduationCap },
  { to: "/app/discipline-school",  title: "Discipline", icon: Shield },
  { to: "/app/calendar",           title: "Calendar",   icon: CalendarDays },
  { to: "/app/assistant",          title: "Assistant",  icon: MessageCircle },
  { to: "/app/transfers",          title: "Transfers",  icon: ArrowLeftRight },
  { to: "/app/staff",              title: "Staff",      icon: UserCog },
  { to: "/app/audit",              title: "Audit",      icon: FileText },
  { to: "/app/profile",            title: "Profile",    icon: Settings },
];

// ── Helper: is this path active ────────────────────────────────────────────
function isActive(path: string, to: string, exact?: boolean) {
  return exact ? path === to : path === to || path.startsWith(to + "/");
}

// ── Single bottom bar tab ──────────────────────────────────────────────────
function BottomTab({
  item,
  path,
  onClick,
}: {
  item: NavItem;
  path: string;
  onClick?: () => void;
}) {
  const active = isActive(path, item.to, item.exact);
  return (
    <Link
      to={item.to as any}
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 flex-1 py-2 text-[9px] font-medium transition-colors ${
        active
          ? "text-accent"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <item.icon className={`size-[18px] ${active ? "stroke-[2.5]" : ""}`} />
      <span>{item.title}</span>
    </Link>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function MobileBottomNav() {
  const { primaryRole, displayName, signOut } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);

  const isParent = primaryRole === "parent";
  const primaryItems = isParent ? parentPrimary : schoolPrimary;
  const moreItems = isParent ? parentMore : schoolMore;

  // Check if current path is in the "more" list so we can highlight the More button
  const moreActive = moreItems.some((it) => isActive(path, it.to, it.exact));

  return (
    <>
      {/* ── Bottom bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border safe-area-pb md:hidden">
        <div className="flex items-stretch h-16">
          {primaryItems.map((item) => (
            <BottomTab key={item.to} item={item} path={path} />
          ))}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-0.5 flex-1 py-2 text-[9px] font-medium transition-colors ${
              moreActive && !moreOpen
                ? "text-accent"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MoreHorizontal className="size-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* ── More sheet (slides in from left) ── */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMoreOpen(false)}
          />

          {/* Sheet */}
          <div className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-background border-l border-border md:hidden animate-in slide-in-from-right duration-200 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
              <span className="text-sm font-semibold">Menu</span>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => setMoreOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* List of items */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {moreItems.map((item) => {
                const active = isActive(path, item.to, item.exact);
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-4 px-3 py-3.5 rounded-xl transition-colors ${
                      active
                        ? "bg-accent/15 text-accent"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className={`size-9 rounded-lg grid place-items-center shrink-0 ${
                      active ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                    }`}>
                      <item.icon className={`size-4 ${active ? "stroke-[2.5]" : ""}`} />
                    </div>
                    <span className="text-sm font-medium">{item.title}</span>
                    {active && <div className="ml-auto size-1.5 rounded-full bg-accent" />}
                  </Link>
                );
              })}

              {/* Admin console shortcut for super_admin */}
              {primaryRole === "super_admin" && (
                <Link
                  to="/admin"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-4 px-3 py-3.5 rounded-xl text-accent hover:bg-accent/10 transition-colors"
                >
                  <div className="size-9 rounded-lg bg-accent/15 text-accent grid place-items-center shrink-0">
                    <ShieldCheck className="size-4" />
                  </div>
                  <span className="text-sm font-medium">Admin Console</span>
                </Link>
              )}
            </div>

            {/* User row + sign out */}
            <div className="mx-3 mb-4 shrink-0 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{displayName ?? "User"}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {primaryRole.replace("_", " ")}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setMoreOpen(false); signOut(); }}
                className="text-muted-foreground hover:text-destructive gap-1.5"
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
