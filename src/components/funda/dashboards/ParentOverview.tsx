import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "./PageHeader";
import { Crown, BookOpen, ClipboardList, Shield, Bell, ArrowRight, Plus } from "lucide-react";

export function ParentOverview() {
  const { user, profile } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [stats, setStats] = useState({ marks: 0, attRate: 0, discipline: 0, alerts: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: links } = await supabase.from("parent_links").select("learner_id, learners(*, schools(name))").eq("parent_user_id", user.id);
      const kids = (links ?? []).map((l: any) => l.learners).filter(Boolean);
      setChildren(kids);
      const ids = kids.map((k: any) => k.id);
      if (ids.length) {
        const [{ count: marks }, { data: att }, { count: disc }, { count: alerts }] = await Promise.all([
          supabase.from("marks").select("*", { count: "exact", head: true }).in("learner_id", ids),
          supabase.from("attendance").select("status").in("learner_id", ids),
          supabase.from("discipline_records").select("*", { count: "exact", head: true }).in("learner_id", ids),
          supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
        ]);
        const present = (att ?? []).filter((r: any) => r.status === "present" || r.status === "late").length;
        const total = (att ?? []).length || 1;
        setStats({ marks: marks ?? 0, attRate: Math.round((present / total) * 100), discipline: disc ?? 0, alerts: alerts ?? 0 });
      }
    })();
  }, [user]);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={`Hello, ${profile?.full_name?.split(" ")[0] ?? "there"} 👋`}
        sub={children.length ? `Following ${children.length} ${children.length === 1 ? "child" : "children"}` : "Let's connect you to your child's school."}
      />

      {profile?.subscription_tier !== "premium" && (
        <Card className="p-5 mb-6 bg-gradient-to-br from-primary to-[oklch(0.25_0.08_240)] text-primary-foreground border-0">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-accent grid place-items-center text-accent-foreground"><Crown className="size-5" /></div>
              <div>
                <div className="font-semibold">Unlock PASA Premium</div>
                <div className="text-sm text-primary-foreground/70">Unlimited children, instant alerts, downloadable reports — R19.99/mo</div>
              </div>
            </div>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/app/upgrade">Upgrade</Link></Button>
          </div>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BookOpen} label="Marks recorded" value={stats.marks} to="/app/marks" />
        <StatCard icon={ClipboardList} label="Attendance" value={`${stats.attRate}%`} to="/app/attendance" />
        <StatCard icon={Shield} label="Discipline records" value={stats.discipline} to="/app/discipline" />
        <StatCard icon={Bell} label="Unread alerts" value={stats.alerts} to="/app/alerts" />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Your children</h2>
        <Button asChild size="sm" variant="outline"><Link to="/app/children"><Plus className="size-4 mr-1"/>Add child</Link></Button>
      </div>
      {children.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="text-muted-foreground text-sm">No children connected yet.</div>
          <Button asChild className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/app/children">Connect a child</Link></Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((c: any) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{c.first_name} {c.last_name}</div>
                  <div className="text-xs text-muted-foreground">{c.schools?.name}</div>
                </div>
                <Badge variant="secondary">Grade {c.grade_id}</Badge>
              </div>
              <Button asChild variant="ghost" size="sm" className="mt-3 -ml-2"><Link to="/app/marks">View marks <ArrowRight className="size-3 ml-1"/></Link></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, to }: any) {
  return (
    <Link to={to as any}>
      <Card className="p-5 hover:border-accent/40 transition-colors h-full">
        <div className="flex items-center justify-between">
          <div className="size-9 rounded-lg bg-accent/15 text-accent grid place-items-center"><Icon className="size-4"/></div>
        </div>
        <div className="mt-4 text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </Card>
    </Link>
  );
}
