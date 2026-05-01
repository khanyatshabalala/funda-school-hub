import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/funda/dashboards/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Trophy, MapPin, GraduationCap, CalendarDays,
  Search, ChevronRight, FileText, Phone,
} from "lucide-react";

export const Route = createFileRoute("/app/schools")({
  component: SchoolExplorerPage,
});

const PROVINCES = [
  "Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo",
  "Mpumalanga","Northern Cape","North West","Western Cape",
] as const;

type School = {
  id: string;
  name: string;
  district: string;
  province: string;
  phase: string;
  school_type: string;
  city: string | null;
  grade_from: number | null;
  grade_to: number | null;
  application_open: string | null;
  application_close: string | null;
  admission_requirements: string | null;
  application_contact: string | null;
  performance_avg: number | null;
  performance_rank_district: number | null;
  performance_rank_province: number | null;
  learner_count: number | null;
  fees_annual: number | null;
  districts: { name: string } | null;
};

function gradeLabel(g: number | null) {
  if (g === null) return "?";
  if (g === 0) return "R";
  return String(g);
}

function isAppOpen(school: School) {
  const today = new Date().toISOString().slice(0, 10);
  return school.application_open && school.application_open <= today &&
    (!school.application_close || school.application_close >= today);
}

function isAppSoon(school: School) {
  if (!school.application_open) return false;
  const today = new Date();
  const open  = new Date(school.application_open);
  const diff  = (open.getTime() - today.getTime()) / 86400000;
  return diff > 0 && diff <= 30;
}

function SchoolExplorerPage() {
  const [schools, setSchools]     = useState<School[]>([]);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [province, setProvince]   = useState("");
  const [districtId, setDistrictId] = useState("");
  const [search, setSearch]       = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [selected, setSelected]   = useState<School | null>(null);

  useEffect(() => {
    let q = (supabase as any)
      .from("schools")
      .select("id,name,district,province,phase,school_type,city,grade_from,grade_to,application_open,application_close,admission_requirements,application_contact,performance_avg,performance_rank_district,performance_rank_province,learner_count,fees_annual,districts(name)")
      .order("performance_avg", { ascending: false, nullsFirst: false })
      .limit(100);

    if (province)    q = q.eq("province", province);
    if (districtId)  q = q.eq("district_id", districtId);

    q.then(({ data }: { data: any }) => setSchools((data ?? []) as School[]));
  }, [province, districtId]);

  useEffect(() => {
    if (!province) { setDistricts([]); setDistrictId(""); return; }
    supabase.from("districts").select("id,name").eq("province", province as any).order("name")
      .then(({ data }) => { setDistricts(data ?? []); setDistrictId(""); });
  }, [province]);

  const filtered = schools.filter(s => {
    if (search) {
      const q = search.toLowerCase();
      if (!s.name.toLowerCase().includes(q) && !s.city?.toLowerCase().includes(q)) return false;
    }
    if (gradeFilter) {
      const g = parseInt(gradeFilter);
      if (s.grade_from === null || s.grade_to === null) return false;
      if (g < s.grade_from || g > s.grade_to) return false;
    }
    return true;
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="School explorer"
        sub="Find top performing schools and check application dates."
      />

      {/* ── Filters ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Select value={province} onValueChange={setProvince}>
          <SelectTrigger><SelectValue placeholder="All provinces" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All provinces</SelectItem>
            {PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={districtId} onValueChange={setDistrictId} disabled={!province}>
          <SelectTrigger><SelectValue placeholder="All districts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All districts</SelectItem>
            {districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger><SelectValue placeholder="Any grade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any grade</SelectItem>
            <SelectItem value="0">Grade R</SelectItem>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
              <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search schools…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* ── Results ── */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          No schools found. Try adjusting your filters.
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((s, idx) => {
            const open  = isAppOpen(s);
            const soon  = isAppSoon(s);
            return (
              <Card
                key={s.id}
                className={`p-4 cursor-pointer transition-colors hover:border-accent/40
                  ${selected?.id === s.id ? "border-accent/60 bg-accent/5" : ""}
                `}
                onClick={() => setSelected(selected?.id === s.id ? null : s)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Rank badge */}
                    {s.performance_rank_province && (
                      <div className={`size-9 rounded-lg grid place-items-center shrink-0 text-sm font-bold
                        ${s.performance_rank_province <= 3
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                        }`}>
                        #{s.performance_rank_province}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold flex items-center gap-2 flex-wrap">
                        {s.name}
                        {open && <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0">Applications open</Badge>}
                        {soon && !open && <Badge variant="secondary" className="text-orange-500 text-[10px] px-1.5 py-0">Opening soon</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><MapPin className="size-3" />{s.districts?.name ?? s.district}, {s.province}</span>
                        {s.grade_from !== null && s.grade_to !== null && (
                          <span className="flex items-center gap-1">
                            <GraduationCap className="size-3" />
                            Grade {gradeLabel(s.grade_from)}–{gradeLabel(s.grade_to)}
                          </span>
                        )}
                        <span className="capitalize">{s.phase} · {s.school_type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {s.performance_avg !== null && (
                      <div className="flex items-center gap-1 text-sm font-semibold text-accent">
                        <Trophy className="size-3.5" />
                        {s.performance_avg}%
                      </div>
                    )}
                    <ChevronRight className={`size-4 text-muted-foreground mt-1 transition-transform ${selected?.id === s.id ? "rotate-90" : ""}`} />
                  </div>
                </div>

                {/* ── Expanded detail ── */}
                {selected?.id === s.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    {/* Application dates */}
                    {(s.application_open || s.application_close) && (
                      <div className="flex items-start gap-2 text-sm">
                        <CalendarDays className="size-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium">Applications: </span>
                          {s.application_open && (
                            <span>Opens {new Date(s.application_open + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</span>
                          )}
                          {s.application_close && (
                            <span> · Closes {new Date(s.application_close + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Requirements */}
                    {s.admission_requirements && (
                      <div className="flex items-start gap-2 text-sm">
                        <FileText className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium">Requirements: </span>
                          <span className="text-muted-foreground">{s.admission_requirements}</span>
                        </div>
                      </div>
                    )}

                    {/* How to apply */}
                    {s.application_contact && (
                      <div className="flex items-start gap-2 text-sm">
                        <Phone className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium">How to apply: </span>
                          <span className="text-muted-foreground">{s.application_contact}</span>
                        </div>
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="flex gap-4 text-xs text-muted-foreground pt-1">
                      {s.learner_count && <span>{s.learner_count.toLocaleString()} learners</span>}
                      {s.fees_annual !== null && (
                        <span>{s.fees_annual === 0 ? "No fees" : `R${s.fees_annual.toLocaleString()}/yr`}</span>
                      )}
                      {s.performance_rank_district && <span>District rank: #{s.performance_rank_district}</span>}
                    </div>

                    <Button asChild size="sm" variant="outline" className="mt-1">
                      <Link to="/schools/$schoolId" params={{ schoolId: s.id }}>
                        View full school profile
                      </Link>
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
