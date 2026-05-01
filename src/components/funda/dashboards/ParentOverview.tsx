import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Crown, Bell, CalendarDays, ClipboardList,
  Shield, ArrowRight, Plus, UserPlus, CheckCircle2,
  XCircle, Clock, AlertCircle,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────
function currentTerm(): number {
  const m = new Date().getMonth() + 1; // 1-12
  if (m <= 3)  return 1;
  if (m <= 6)  return 2;
  if (m <= 9)  return 3;
  return 4;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function greetingTime() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const ATT_ICON: Record<string, React.ReactNode> = {
  present:  <CheckCircle2 className="size-4 text-green-500" />,
  late:     <Clock        className="size-4 text-orange-400" />,
  absent:   <XCircle      className="size-4 text-red-500" />,
  excused:  <AlertCircle  className="size-4 text-blue-400" />,
};
const ATT_LABEL: Record<string, string> = {
  present: "Present today",
  late:    "Late today",
  absent:  "Absent today",
  excused: "Excused today",
};

// ── Component ──────────────────────────────────────────────────────────────
export function ParentOverview() {
  const { user, profile, displayName } = useAuth();

  const [children, setChildren]         = useState<any[]>([]);
  const [todayAtt, setTodayAtt]         = useState<Record<string, string>>({});
  const [unreadCount, setUnreadCount]   = useState(0);
  const [nextEvent, setNextEvent]       = useState<any>(null);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // 1. Children
      const { data: links } = await supabase
        .from("parent_links")
        .select("learner_id, learners(id, first_name, last_name, grade_id, school_id, schools(name, id))")
        .eq("parent_user_id", user.id);
      const kids = (links ?? []).map((l: any) => l.learners).filter(Boolean);
      setChildren(kids);

      const ids      = kids.map((k: any) => k.id);
      const schoolIds = [...new Set(kids.map((k: any) => k.school_id).filter(Boolean))];

      await Promise.all([
        // 2. Today's attendance per child
        ids.length
          ? supabase.from("attendance").select("learner_id, status")
              .in("learner_id", ids).eq("date", todayStr())
              .then(({ data }) => {
                const map: Record<string, string> = {};
                (data ?? []).forEach((r: any) => { map[r.learner_id] = r.status; });
                setTodayAtt(map);
              })
          : Promise.resolve(),

        // 3. Unread alerts
        supabase.from("notifications").select("*", { count: "exact", head: true })
          .eq("user_id", user.id).is("read_at", null)
          .then(({ count }) => setUnreadCount(count ?? 0)),

        // 4. Next upcoming event across all children's schools
        schoolIds.length
          ? supabase.from("calendar_events").select("id, title, event_date, event_time, event_type, schools(name)")
              .in("school_id", schoolIds as string[])
              .gte("event_date", todayStr())
              .order("event_date").limit(1).maybeSingle()
              .then(({ data }) => setNextEvent(data))
          : Promise.resolve(),

        // 5. 3 most recent unread alerts for preview
        supabase.from("notifications").select("id, title, body, category, created_at")
          .eq("user_id", user.id).is("read_at", null)
          .order("created_at", { ascending: false }).limit(3)
          .then(({ data }) => setRecentAlerts(data ?? [])),
      ]);
    })();
  }, [user]);

  const firstName = displayName?.split(" ")[0] ?? "there";
  const term      = currentTerm();
  const today     = new Date();
  const dateLabel = today.toLocaleDateString("en-ZA", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="max-w-2xl space-y-4">

      {/* ── Greeting ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greetingTime()}, {firstName} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {dateLabel} · Term {term}
        </p>
      </div>

      {/* ── No children CTA ── */}
      {children.length === 0 && (
        <Card className="p-6 border-dashed border-2 text-center">
          <UserPlus className="size-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm font-medium">No children linked yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Ask your school admin for your child's learner number, then link them here.
          </p>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/app/children"><Plus className="size-4 mr-1.5" />Link a child</Link>
          </Button>
        </Card>
      )}

      {/* ── Today's attendance ── */}
      {children.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Today's attendance</h2>
            <Link to="/app/attendance" className="text-xs text-accent hover:underline flex items-center gap-1">
              View all <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {children.map((c: any) => {
              const status = todayAtt[c.id];
              return (
                <div key={c.id} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">{c.first_name} {c.last_name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{c.schools?.name}</span>
                  </div>
                  {status ? (
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {ATT_ICON[status]}
                      <span className="capitalize">{ATT_LABEL[status] ?? status}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not recorded yet</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Unread alerts ── */}
      {unreadCount > 0 && (
        <Card className="p-4 border-accent/40 bg-accent/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-accent" />
              <h2 className="font-semibold text-sm">
                {unreadCount} unread {unreadCount === 1 ? "notification" : "notifications"}
              </h2>
            </div>
            <Link to="/app/alerts" className="text-xs text-accent hover:underline flex items-center gap-1">
              See all <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentAlerts.map((n: any) => (
              <div key={n.id} className="flex items-start gap-2">
                <span className="size-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground truncate">{n.body}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Next event ── */}
      {nextEvent && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-blue-500" />
              <h2 className="font-semibold text-sm">Next event</h2>
            </div>
            <Link to="/app/calendar" className="text-xs text-accent hover:underline flex items-center gap-1">
              Calendar <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{nextEvent.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(nextEvent.event_date + "T00:00:00").toLocaleDateString("en-ZA", {
                  weekday: "short", day: "numeric", month: "short",
                })}
                {nextEvent.event_time && ` · ${nextEvent.event_time.slice(0, 5)}`}
                {nextEvent.schools?.name && ` · ${nextEvent.schools.name}`}
              </p>
            </div>
            {nextEvent.event_type && (
              <Badge variant="secondary" className="capitalize text-[10px] shrink-0">
                {nextEvent.event_type}
              </Badge>
            )}
          </div>
        </Card>
      )}

      {/* ── Quick links ── */}
      {children.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <QuickLink to="/app/attendance" icon={ClipboardList} label="Attendance" color="text-orange-500 bg-orange-500/10" />
          <QuickLink to="/app/discipline" icon={Shield}        label="Discipline"  color="text-red-500 bg-red-500/10" />
          <QuickLink to="/app/alerts"     icon={Bell}          label="Notifications" color="text-accent bg-accent/10"
            badge={unreadCount > 0 ? String(unreadCount) : undefined} />
        </div>
      )}

      {/* ── Premium upsell ── */}
      {profile?.subscription_tier !== "premium" && children.length > 0 && (
        <Card className="p-4 bg-gradient-to-br from-primary to-[oklch(0.25_0.08_240)] text-primary-foreground border-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Crown className="size-5 text-accent shrink-0" />
              <div>
                <div className="text-sm font-semibold">Go Premium</div>
                <div className="text-xs text-primary-foreground/70">Unlimited children · R19.99/mo</div>
              </div>
            </div>
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0">
              <Link to="/app/upgrade">Upgrade</Link>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, color, badge }: {
  to: string; icon: any; label: string; color: string; badge?: string;
}) {
  return (
    <Link to={to as any}>
      <Card className="p-3 flex flex-col items-center gap-2 hover:border-accent/40 transition-colors relative">
        {badge && (
          <span className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold grid place-items-center">
            {parseInt(badge) > 9 ? "9+" : badge}
          </span>
        )}
        <div className={`size-9 rounded-lg grid place-items-center ${color}`}>
          <Icon className="size-4" />
        </div>
        <span className="text-xs font-medium">{label}</span>
      </Card>
    </Link>
  );
}
