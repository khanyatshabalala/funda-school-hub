import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/funda/dashboards/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GraduationCap, ShieldAlert, Search, Bell, Loader2 } from "lucide-react";
import { friendlyDbError } from "@/lib/db-errors";

export const Route = createFileRoute("/app/admissions")({
  component: AdmissionsPage,
});

type School = {
  id: string; name: string; district: string; province: string;
  grade_from: number | null; grade_to: number | null;
  application_open: string | null; application_close: string | null;
  application_contact: string | null;
};

function AdmissionsPage() {
  const { primaryRole } = useAuth();
  const isSuperAdmin = primaryRole === "super_admin";

  const [schools, setSchools]   = useState<School[]>([]);
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState<string | null>(null);
  const [editing, setEditing]   = useState<Record<string, Partial<School>>>({});

  useEffect(() => {
    supabase.from("schools")
      .select("id, name, district, province, grade_from, grade_to, application_open, application_close, application_contact")
      .order("name")
      .then(({ data }) => { setSchools((data ?? []) as School[]); setLoading(false); });
  }, []);

  const setField = (id: string, field: keyof School, value: string) => {
    setEditing(prev => ({ ...prev, [id]: { ...prev[id], [field]: value || null } }));
  };

  const onSave = async (school: School) => {
    const changes = editing[school.id];
    if (!changes) return;
    setSaving(school.id);
    const { error } = await (supabase as any).from("schools").update(changes).eq("id", school.id);
    setSaving(null);
    if (error) return toast.error(friendlyDbError(error));
    toast.success(`${school.name} updated. Parents of Grade ${(changes.grade_from ?? school.grade_from ?? 1) - 1} learners will be notified.`);
    setEditing(prev => { const n = { ...prev }; delete n[school.id]; return n; });
    // Refresh
    supabase.from("schools")
      .select("id, name, district, province, grade_from, grade_to, application_open, application_close, application_contact")
      .order("name")
      .then(({ data }) => setSchools((data ?? []) as School[]));
  };

  const filtered = schools.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.district.toLowerCase().includes(q);
  });

  const today = new Date().toISOString().slice(0, 10);
  const isOpen = (s: School) =>
    s.application_open && s.application_open <= today &&
    (!s.application_close || s.application_close >= today);

  if (!isSuperAdmin) {
    return (
      <div className="max-w-lg">
        <PageHeader title="Admissions" sub="Manage school application dates." />
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <ShieldAlert className="size-8 mx-auto mb-2 opacity-40" />
          Super admin only.
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Admissions"
        sub="Set application open/close dates. Parents of learners in the graduating grade are notified automatically."
      />

      <Card className="p-4 mb-5 bg-accent/5 border-accent/20 text-sm text-muted-foreground flex items-start gap-3">
        <Bell className="size-4 text-accent shrink-0 mt-0.5" />
        <span>
          When you set or update an <strong className="text-foreground">application open date</strong>, PASA automatically notifies all parents whose child is in the grade just below the school's entry grade — e.g. setting Grade 8 entry notifies Grade 7 parents.
        </span>
      </Card>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search schools…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-10 text-center">Loading…</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const e = editing[s.id] ?? {};
            const open = isOpen({ ...s, ...e });
            const appOpen  = e.application_open  !== undefined ? e.application_open  : s.application_open;
            const appClose = e.application_close !== undefined ? e.application_close : s.application_close;
            const contact  = e.application_contact !== undefined ? e.application_contact : s.application_contact;
            const isDirty  = !!editing[s.id];

            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-accent/10 grid place-items-center shrink-0">
                      <GraduationCap className="size-4 text-accent" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-2">
                        {s.name}
                        {open && <Badge className="text-[10px] bg-green-500/15 text-green-600 border-green-500/30">Open</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.district} · {s.province}
                        {s.grade_from !== null && s.grade_to !== null && ` · Grade ${s.grade_from === 0 ? "R" : s.grade_from}–${s.grade_to}`}
                      </div>
                    </div>
                  </div>
                  {isDirty && (
                    <Button
                      size="sm"
                      className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0"
                      disabled={saving === s.id}
                      onClick={() => onSave(s)}
                    >
                      {saving === s.id ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
                      Save & notify
                    </Button>
                  )}
                </div>

                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Applications open</label>
                    <Input
                      type="date"
                      value={appOpen ?? ""}
                      onChange={e => setField(s.id, "application_open", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Applications close</label>
                    <Input
                      type="date"
                      value={appClose ?? ""}
                      onChange={e => setField(s.id, "application_close", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Contact / apply at</label>
                    <Input
                      value={contact ?? ""}
                      onChange={e => setField(s.id, "application_contact", e.target.value)}
                      placeholder="e.g. admin@school.co.za"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}