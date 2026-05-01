import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";
import { friendlyDbError } from "@/lib/db-errors";

export const Route = createFileRoute("/admin/schools/$schoolId")({
  component: SchoolEditPage,
});

const admissionsSchema = z.object({
  grade_from: z.coerce.number().int().min(0).max(12).nullable(),
  grade_to:   z.coerce.number().int().min(0).max(12).nullable(),
  application_open:  z.string().optional().or(z.literal("")),
  application_close: z.string().optional().or(z.literal("")),
  admission_requirements: z.string().max(2000).optional().or(z.literal("")),
  application_contact:    z.string().max(500).optional().or(z.literal("")),
});

function SchoolEditPage() {
  const { schoolId } = Route.useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    supabase.from("schools").select("*").eq("id", schoolId).maybeSingle()
      .then(({ data }) => setSchool(data));
  }, [schoolId]);

  const onSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = admissionsSchema.safeParse({
      grade_from:             fd.get("grade_from") || null,
      grade_to:               fd.get("grade_to")   || null,
      application_open:       fd.get("application_open")  || "",
      application_close:      fd.get("application_close") || "",
      admission_requirements: fd.get("admission_requirements") || "",
      application_contact:    fd.get("application_contact")    || "",
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setSaving(true);
    const { error } = await (supabase as any).from("schools").update({
      grade_from:             parsed.data.grade_from,
      grade_to:               parsed.data.grade_to,
      application_open:       parsed.data.application_open  || null,
      application_close:      parsed.data.application_close || null,
      admission_requirements: parsed.data.admission_requirements || null,
      application_contact:    parsed.data.application_contact    || null,
    }).eq("id", schoolId);
    setSaving(false);

    if (error) return toast.error(friendlyDbError(error));
    toast.success("School updated");
    // Refresh
    supabase.from("schools").select("*").eq("id", schoolId).maybeSingle()
      .then(({ data }) => setSchool(data));
  };

  const onRecalculate = async () => {
    setRecalculating(true);
    const { error } = await (supabase as any).rpc("recalculate_school_performance", {
      _school_id: schoolId,
    });
    setRecalculating(false);
    if (error) return toast.error(friendlyDbError(error));
    toast.success("Performance rankings updated");
    supabase.from("schools").select("*").eq("id", schoolId).maybeSingle()
      .then(({ data }) => setSchool(data));
  };

  if (!school) return (
    <div className="text-sm text-muted-foreground py-10 text-center">Loading…</div>
  );

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="icon" className="size-8">
          <Link to="/admin/schools"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{school.name}</h1>
          <p className="text-sm text-muted-foreground">{school.district} · {school.province}</p>
        </div>
      </div>

      {/* ── Performance summary ── */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Trophy className="size-4 text-accent" /> Performance
          </h2>
          <Button size="sm" variant="outline" onClick={onRecalculate} disabled={recalculating}>
            {recalculating && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
            Recalculate
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-accent">
              {school.performance_avg != null ? `${school.performance_avg}%` : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Avg mark</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {school.performance_rank_district != null ? `#${school.performance_rank_district}` : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">District rank</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {school.performance_rank_province != null ? `#${school.performance_rank_province}` : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Province rank</div>
          </div>
        </div>
        {school.performance_rank_national != null && (
          <div className="mt-3 text-center">
            <Badge variant="secondary">National rank: #{school.performance_rank_national}</Badge>
          </div>
        )}
      </Card>

      {/* ── Admissions info ── */}
      <Card className="p-6">
        <h2 className="font-semibold mb-4">Admissions information</h2>
        <p className="text-sm text-muted-foreground mb-4">
          This information is shown to parents browsing schools. Setting an application open date will automatically notify parents whose children are finishing the previous phase.
        </p>
        <form onSubmit={onSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="gf">Grade from</Label>
              <Input id="gf" name="grade_from" type="number" min={0} max={12}
                defaultValue={school.grade_from ?? ""}
                placeholder="e.g. 8" />
              <p className="text-[10px] text-muted-foreground mt-1">0 = Grade R</p>
            </div>
            <div>
              <Label htmlFor="gt">Grade to</Label>
              <Input id="gt" name="grade_to" type="number" min={0} max={12}
                defaultValue={school.grade_to ?? ""}
                placeholder="e.g. 12" />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ao">Applications open</Label>
              <Input id="ao" name="application_open" type="date"
                defaultValue={school.application_open ?? ""} />
            </div>
            <div>
              <Label htmlFor="ac">Applications close</Label>
              <Input id="ac" name="application_close" type="date"
                defaultValue={school.application_close ?? ""} />
            </div>
          </div>

          <div>
            <Label htmlFor="ar">Admission requirements</Label>
            <Textarea id="ar" name="admission_requirements" rows={4}
              defaultValue={school.admission_requirements ?? ""}
              placeholder="e.g. Grade 7 report, birth certificate, proof of residence, previous school transfer letter…" />
          </div>

          <div>
            <Label htmlFor="ac2">How to apply</Label>
            <Input id="ac2" name="application_contact"
              defaultValue={school.application_contact ?? ""}
              placeholder="e.g. Visit the school office or call 021 000 0000" />
            <p className="text-[10px] text-muted-foreground mt-1">
              This is shown to parents — keep it clear and actionable.
            </p>
          </div>

          <Button disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {saving && <Loader2 className="size-4 animate-spin mr-2" />}
            Save admissions info
          </Button>
        </form>
      </Card>
    </div>
  );
}
