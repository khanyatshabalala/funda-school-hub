import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Building2, Map, Users, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function Stat({ icon: Icon, label, value, to }: { icon: any; label: string; value: number | string; to: any }) {
  return (
    <Link to={to}>
      <Card className="p-5 hover:border-accent/40 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="text-3xl font-bold mt-1">{value}</div>
          </div>
          <div className="size-10 rounded-lg bg-accent/15 text-accent grid place-items-center">
            <Icon className="size-5" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

function AdminOverview() {
  const [stats, setStats] = useState({ schools: 0, districts: 0, users: 0, learners: 0 });
  useEffect(() => {
    (async () => {
      const [s, d, u, l] = await Promise.all([
        supabase.from("schools").select("*", { count: "exact", head: true }),
        supabase.from("districts").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("learners").select("*", { count: "exact", head: true }),
      ]);
      setStats({
        schools: s.count ?? 0,
        districts: d.count ?? 0,
        users: u.count ?? 0,
        learners: l.count ?? 0,
      });
    })();
  }, []);

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Platform overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage the entire PASA network from here.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Building2} label="Schools" value={stats.schools} to="/admin/schools" />
        <Stat icon={Map} label="Districts" value={stats.districts} to="/admin/districts" />
        <Stat icon={Users} label="Users" value={stats.users} to="/admin/users" />
        <Stat icon={GraduationCap} label="Learners" value={stats.learners} to="/admin/schools" />
      </div>

      <Card className="p-6 mt-8">
        <h2 className="font-semibold mb-3">Quick start</h2>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-5">
          <li>Create a <Link to="/admin/districts" className="text-accent hover:underline">district</Link> for the area you're onboarding.</li>
          <li>Add a <Link to="/admin/schools" className="text-accent hover:underline">school</Link> and link it to that district.</li>
          <li>Find the school's principal in <Link to="/admin/users" className="text-accent hover:underline">Users & roles</Link> and assign them as principal of that school.</li>
        </ol>
      </Card>
    </div>
  );
}
