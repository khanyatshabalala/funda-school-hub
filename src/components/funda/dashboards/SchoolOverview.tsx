import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "./PageHeader";
import { Users, GraduationCap, BookOpen, Shield } from "lucide-react";

export function SchoolOverview() {
  const { primarySchoolId, primaryRole, profile } = useAuth();
  const [school, setSchool] = useState<any>(null);
  const [stats, setStats] = useState({ learners: 0, classes: 0, marks: 0, discipline: 0 });

  useEffect(() => {
    if (!primarySchoolId) return;
    (async () => {
      const [{ data: s }, { count: learners }, { count: classes }, { data: learnersData }] = await Promise.all([
        supabase.from("schools").select("*").eq("id", primarySchoolId).maybeSingle(),
        supabase.from("learners").select("*", { count: "exact", head: true }).eq("school_id", primarySchoolId),
        supabase.from("classes").select("*", { count: "exact", head: true }).eq("school_id", primarySchoolId),
        supabase.from("learners").select("id").eq("school_id", primarySchoolId),
      ]);
      setSchool(s);
      const ids = (learnersData ?? []).map((l: any) => l.id);
      let marks = 0, discipline = 0;
      if (ids.length) {
        const [{ count: m }, { count: d }] = await Promise.all([
          supabase.from("marks").select("*", { count: "exact", head: true }).in("learner_id", ids),
          supabase.from("discipline_records").select("*", { count: "exact", head: true }).in("learner_id", ids),
        ]);
        marks = m ?? 0; discipline = d ?? 0;
      }
      setStats({ learners: learners ?? 0, classes: classes ?? 0, marks, discipline });
    })();
  }, [primarySchoolId]);

  if (!primarySchoolId) {
    return (
      <div className="max-w-2xl">
        <PageHeader title="No school assigned" sub="Ask your school administrator to grant you access." />
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={`Welcome, ${profile?.full_name?.split(" ")[0] ?? ""}`}
        sub={school ? `${school.name} · ${school.district}` : "Loading…"}
        action={<Badge variant="secondary" className="capitalize">{primaryRole.replace("_"," ")}</Badge>}
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Users} label="Learners" value={stats.learners} />
        <Stat icon={GraduationCap} label="Classes" value={stats.classes} />
        <Stat icon={BookOpen} label="Marks recorded" value={stats.marks} />
        <Stat icon={Shield} label="Discipline records" value={stats.discipline} />
      </div>
      <Card className="p-6 mt-6">
        <h3 className="font-semibold mb-2">Quick actions</h3>
        <p className="text-sm text-muted-foreground">Use the sidebar to manage learners, capture marks, take attendance, log discipline and {primaryRole !== "teacher" ? "process transfers." : "more."}</p>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <Card className="p-5">
      <div className="size-9 rounded-lg bg-accent/15 text-accent grid place-items-center"><Icon className="size-4"/></div>
      <div className="mt-4 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </Card>
  );
}
