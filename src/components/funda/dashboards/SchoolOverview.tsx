import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, ClipboardList, Shield, CalendarDays,
  ArrowRight, CheckCircle2, AlertCircle, BookOpen,
} from "lucide-react";

function currentTerm() {
  const m = new Date().getMonth() + 1;
  if (m <= 3) return 1;
  if (m <= 6) return 2;
  if (m <= 9) return 3;
  return 4;
}

function greetingTime() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function SchoolOverview() {
  const { primarySchoolId, primaryRole, displayName } = useAuth();

  const [school, setSchool]             = useState<any>(null);
  const [learnerCount, setLearnerCount] = useState(0);
  const [todayAttStats, setTodayAttStats] = useState({ present: 0, absent: 0, late: 0, total: 0, captured: false });
  const [recentDiscipline, setRecentDiscipline] = useState<any[]>([]);
  const [nextEvent, setNextEvent]       = useState<any>(null);
  const [weekEvents, setWeekEvents]     = useState<any[]>([]);

  useEffect(() => {
    if (!primarySchoolId) return;
    (async () => {
      const today = todayStr();
      const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

      const [
        { data: s },
        { count: lc },
        { data: learnerIds },
      ] = await Promise.all([
        supabase.from("schools").select("name, district, province").eq("id", primarySchoolId).maybeSingle(),
        supabase.from("learners").select("*", { count: "exact", head: true }).eq("school_id", primarySchoolId),
        supabase.from("learners").select("id").eq("school_id", primarySchoolId),
      ]);

      setSchool(s);
      setLearnerCount(lc ?? 0);

      const ids = (learnerIds ?? []).map((l: any) => l.id);

      await Promise.all([
        // Today's attendance summary
        ids.length
          ? supabase.from("attendance").select("status").in("learner_id", ids).eq("date", today)
              .then(({ data }) => {
                const rows = data ?? [];
                const present = rows.filter((r: any) => r.status === "present").length;
                const late    = rows.filter((r: any) => r.status === "late").length;
                const absent  = rows.filter((r: any) => r.status === "absent").length;
                setTodayAttStats({
                  present, late, absent,
                  total: lc ?? 0,
                  captured: rows.length > 0,
                });
              })
          : Promise.resolve(),

        // Recent discipline (last 5)
        ids.length
          ? supabase.from("discipline_records")
              .select("id, type, title, date, learners(first_name, last_name)")
              .in("learner_id", ids)
              .order("date", { ascending: false })
              .limit(5)
              .then(({ data }) => setRecentDiscipline(data ?? []))
          : Promise.resolve(),

        // Next event
        supabase.from("calendar_events")
          .select("id, title, event_date, event_time, event_type")
          .eq("school_id", primarySchoolId)
          .gte("event_date", today)
          .order("event_date").limit(1).maybeSingle()
          .then(({ data }) => setNextEvent(data)),

        // This week's events
        supabase.from("calendar_events")
          .select("id, title, event_date, event_time, event_type")
          .eq("school_id", primarySchoolId)
          .gte("event_date", today)
          .lte("event_date", weekEnd)
          .order("event_date").limit(5)
          .then(({ data }) => setWeekEvents(data ?? [])),
      ]);
    })();
  }, [primarySchoolId]);

  if (!primarySchoolId) {
    return (
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">No school assigned</h1>
          <p className="text-sm text-muted-foreground mt-1">Ask your administrator to grant you access to a school.</p>
        </div>
      </div>
    );
  }

  const firstName = displayName?.split(" ")[0] ?? "";
  const term      = currentTerm();
  const today     = new Date();
  const dateLabel = today.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
  const attPct    = todayAttStats.total > 0
    ? Math.round(((todayAttStats.present + todayAttStats.late) / todayAttStats.total) * 100)
    : 0;

  const DISC_COLORS: Record<string, string> = {
    merit:      "text-green-600 bg-green-500/10",
    warning:    "text-orange-500 bg-orange-500/10",
    detention:  "text-red-500 bg-red-500/10",
    suspension: "text-red-700 bg-red-700/10",
    incident:   "text-purple-600 bg-purple-500/10",
  };

  return (
    <div className="max-w-2xl space-y-4">

      {/* ── Greeting ── */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greetingTime()}{firstName ? `, ${firstName}` : ""} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {dateLabel} · Term {term}
            {school && ` · ${school.name}`}
          </p>
        </div>
        <Badge variant="secondary" className="capitalize shrink-0 mt-1">
          {primaryRole.replace("_", " ")}
        </Badge>
      </div>

      {/* ── Today's attendance ── */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-orange-500" />
            <h2 className="font-semibold text-sm">Today's attendance</h2>
          </div>
          <Link to="/app/attendance-capture" className="text-xs text-accent hover:underline flex items-center gap-1">
            {todayAttStats.captured ? "View" : "Capture"} <ArrowRight className="size-3" />
          </Link>
        </div>

        {!todayAttStats.captured ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="size-4 text-orange-400 shrink-0" />
            Attendance not captured yet for today.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Attendance rate</span>
              <span className={`font-bold ${attPct >= 80 ? "text-green-600" : attPct >= 60 ? "text-orange-500" : "text-red-500"}`}>
                {attPct}%
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${attPct >= 80 ? "bg-green-500" : attPct >= 60 ? "bg-orange-400" : "bg-red-500"}`}
                style={{ width: `${attPct}%` }}
              />
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-green-500" />{todayAttStats.present} present</span>
              {todayAttStats.late > 0 && <span className="text-orange-400">{todayAttStats.late} late</span>}
              {todayAttStats.absent > 0 && <span className="text-red-500">{todayAttStats.absent} absent</span>}
            </div>
          </div>
        )}
      </Card>

      {/* ── This week's events ── */}
      {weekEvents.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-blue-500" />
              <h2 className="font-semibold text-sm">This week</h2>
            </div>
            <Link to="/app/calendar" className="text-xs text-accent hover:underline flex items-center gap-1">
              Calendar <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {weekEvents.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.event_date + "T00:00:00").toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}
                    {e.event_time && ` · ${e.event_time.slice(0, 5)}`}
                  </p>
                </div>
                {e.event_type && (
                  <Badge variant="secondary" className="capitalize text-[10px] shrink-0">{e.event_type}</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Recent discipline ── */}
      {recentDiscipline.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-red-500" />
              <h2 className="font-semibold text-sm">Recent discipline</h2>
            </div>
            <Link to="/app/discipline-school" className="text-xs text-accent hover:underline flex items-center gap-1">
              View all <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentDiscipline.map((d: any) => (
              <div key={d.id} className="flex items-center gap-3">
                <span className={`text-[10px] font-semibold capitalize px-2 py-0.5 rounded-full ${DISC_COLORS[d.type] ?? "text-muted-foreground bg-muted"}`}>
                  {d.type}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{d.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {d.learners?.first_name} {d.learners?.last_name} · {new Date(d.date + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-3 gap-3">
        <QuickLink to="/app/learners"           icon={Users}         label="Learners"   color="text-accent bg-accent/10"         value={learnerCount} />
        <QuickLink to="/app/attendance-capture" icon={ClipboardList} label="Attendance" color="text-orange-500 bg-orange-500/10" alert={!todayAttStats.captured} />
        <QuickLink to="/app/discipline-school"  icon={Shield}        label="Discipline" color="text-red-500 bg-red-500/10" />
      </div>

      {(primaryRole === "principal" || primaryRole === "school_admin") && (
        <div className="grid grid-cols-2 gap-3">
          <QuickLink to="/app/staff"     icon={Users}     label="Staff"     color="text-purple-500 bg-purple-500/10" />
          <QuickLink to="/app/transfers" icon={BookOpen}  label="Transfers" color="text-blue-500 bg-blue-500/10" />
        </div>
      )}
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, color, value, alert }: {
  to: string; icon: any; label: string; color: string; value?: number; alert?: boolean;
}) {
  return (
    <Link to={to as any}>
      <Card className="p-3 flex flex-col items-center gap-2 hover:border-accent/40 transition-colors relative">
        {alert && (
          <span className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-orange-400 border-2 border-background" />
        )}
        <div className={`size-9 rounded-lg grid place-items-center ${color}`}>
          <Icon className="size-4" />
        </div>
        <div className="text-center">
          <div className="text-xs font-medium">{label}</div>
          {value !== undefined && (
            <div className="text-[10px] text-muted-foreground">{value}</div>
          )}
        </div>
      </Card>
    </Link>
  );
}
