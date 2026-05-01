import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PublicHeader } from "@/components/funda/PublicHeader";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Search, Users, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/schools")({
  component: SchoolsPage,
  head: () => ({
    meta: [
      { title: "Find a school — Funda" },
      { name: "description", content: "Search South African schools by district, phase, type and fees. EMIS-verified school profiles." },
    ],
  }),
});

interface School {
  id: string; name: string; emis_number: string; district: string; province: string;
  phase: string; school_type: string; city: string | null; learner_count: number | null;
  fees_annual: number | null; motto: string | null; principal_name: string | null;
}

function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [q, setQ] = useState("");
  const [phase, setPhase] = useState<string>("all");
  const [province, setProvince] = useState<string>("all");
  const [district, setDistrict] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("schools").select("*").order("name").then(({ data }) => {
      setSchools((data ?? []) as School[]);
      setLoading(false);
    });
  }, []);

  const provinces = useMemo(
    () => Array.from(new Set(schools.map(s => s.province))).sort(),
    [schools],
  );
  const districts = useMemo(
    () =>
      Array.from(
        new Set(
          schools
            .filter(s => province === "all" || s.province === province)
            .map(s => s.district),
        ),
      ).sort(),
    [schools, province],
  );

  const filtered = schools.filter(s => {
    const matchQ = !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.emis_number.includes(q);
    const matchPhase = phase === "all" || s.phase === phase;
    const matchProvince = province === "all" || s.province === province;
    const matchDistrict = district === "all" || s.district === district;
    return matchQ && matchPhase && matchProvince && matchDistrict;
  });

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <section className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-16">
          <div className="text-sm text-accent font-medium mb-2">SCHOOL EXPLORER</div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Find a school in South Africa.</h1>
          <p className="mt-3 text-primary-foreground/70 max-w-xl">EMIS-verified profiles. Filter by district, phase and fees.</p>
          <div className="mt-8 grid md:grid-cols-4 gap-3">
            <div className="md:col-span-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search name or EMIS…"
                className="pl-10 bg-white text-foreground border-0 h-11"
              />
            </div>
            <Select
              value={province}
              onValueChange={(v) => {
                setProvince(v);
                setDistrict("all");
              }}
            >
              <SelectTrigger className="bg-white text-foreground border-0 h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All provinces</SelectItem>
                {provinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={phase} onValueChange={setPhase}>
              <SelectTrigger className="bg-white text-foreground border-0 h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All phases</SelectItem>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="combined">Combined</SelectItem>
              </SelectContent>
            </Select>
            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger className="bg-white text-foreground border-0 h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All districts</SelectItem>
                {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="text-sm text-muted-foreground mb-4">{loading ? "Loading…" : `${filtered.length} schools`}</div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <Link key={s.id} to="/schools/$schoolId" params={{ schoolId: s.id }} className="block group">
              <Card className="p-6 h-full hover:border-accent/40 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="size-11 rounded-lg bg-accent/15 grid place-items-center text-accent">
                    <GraduationCap className="size-6" />
                  </div>
                  <Badge variant="secondary" className="capitalize text-[10px]">{s.phase}</Badge>
                </div>
                <h3 className="font-semibold leading-tight group-hover:text-accent transition-colors">{s.name}</h3>
                {s.motto && <p className="text-xs italic text-muted-foreground mt-1">"{s.motto}"</p>}
                <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5"><MapPin className="size-3" /> {s.city}, {s.district}</div>
                  <div className="flex items-center gap-1.5"><Users className="size-3" /> {s.learner_count?.toLocaleString()} learners</div>
                  <div className="flex items-center gap-1.5">EMIS: <span className="font-mono">{s.emis_number}</span></div>
                </div>
                <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs">
                  <span className="text-muted-foreground capitalize">{s.school_type}</span>
                  <span className="font-semibold text-foreground">{s.fees_annual ? `R${s.fees_annual.toLocaleString()}/yr` : "No fees"}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
