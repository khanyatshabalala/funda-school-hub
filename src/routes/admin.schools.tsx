import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2, Building2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { friendlyDbError } from "@/lib/db-errors";

export const Route = createFileRoute("/admin/schools")({
  component: SchoolsPage,
});

const PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "Northern Cape", "North West", "Western Cape",
] as const;
const PHASES = ["primary", "secondary", "combined", "ecd"] as const;
const PHASE_LABELS: Record<string, string> = { primary: "Primary", secondary: "Secondary", combined: "Combined", ecd: "ECD" };
const TYPES = ["public", "independent", "private", "special"] as const;

const schema = z.object({
  name: z.string().trim().min(2).max(200),
  emis_number: z.string().trim().min(3).max(20),
  district: z.string().trim().min(2).max(100),
  province: z.enum(PROVINCES),
  phase: z.enum(PHASES),
  school_type: z.enum(TYPES),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

type School = { id: string; name: string; emis_number: string; district: string; province: string; phase: string; school_type: string; learner_count: number | null; district_id: string | null; districts?: { name: string } | null };
type District = { id: string; name: string; province: string };

function SchoolsPage() {
  const [rows, setRows] = useState<School[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [province, setProvince] = useState<string>("Western Cape");
  const [phase, setPhase] = useState<string>("Primary");
  const [type, setType] = useState<string>("public");
  const [districtId, setDistrictId] = useState<string>("");
  const [districtText, setDistrictText] = useState<string>("");

  const load = async () => {
    const [{ data: s }, { data: d }] = await Promise.all([
      supabase.from("schools").select("*, districts(name)").order("name"),
      supabase.from("districts").select("id,name,province").order("name"),
    ]);
    setRows((s ?? []) as any);
    setDistricts((d ?? []) as District[]);
  };
  useEffect(() => { load(); }, []);

  const onCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const linked = districts.find(d => d.id === districtId);
    // If a linked district is chosen, derive province + district name from it (source of truth).
    const effectiveProvince = linked?.province ?? province;
    const effectiveDistrictName = linked?.name ?? districtText.trim();
    const parsed = schema.safeParse({
      name: fd.get("name"),
      emis_number: fd.get("emis_number"),
      district: effectiveDistrictName,
      province: effectiveProvince,
      phase,
      school_type: type,
      city: fd.get("city") || "",
      email: fd.get("email") || "",
      phone: fd.get("phone") || "",
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!linked && !districtText.trim()) {
      return toast.error("Pick a district from the list or type one in.");
    }
    setSaving(true);
    const { error } = await supabase.from("schools").insert({
      name: parsed.data.name,
      emis_number: parsed.data.emis_number,
      district: parsed.data.district,
      province: parsed.data.province as any,
      phase: parsed.data.phase as any,
      school_type: parsed.data.school_type as any,
      city: parsed.data.city || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      district_id: districtId || null,
    });
    setSaving(false);
    if (error) return toast.error(friendlyDbError(error, { duplicate: "A school with that EMIS number already exists." }));
    toast.success("School created");
    setOpen(false);
    setDistrictId("");
    setDistrictText("");
    load();
  };

  const districtOptions = districts.filter(d => d.province === province);
  const linkedDistrict = districts.find(d => d.id === districtId);

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Schools</h1>
          <p className="text-muted-foreground text-sm mt-1">All schools on the PASA network.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="size-4 mr-1" /> New school</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create school</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label htmlFor="s-name">Name</Label><Input id="s-name" name="name" required /></div>
                <div><Label htmlFor="s-emis">EMIS number</Label><Input id="s-emis" name="emis_number" required /></div>
                <div>
                  <Label>Province</Label>
                  <Select
                    value={province}
                    onValueChange={(v) => { setProvince(v); setDistrictId(""); }}
                    disabled={!!linkedDistrict}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                  {linkedDistrict && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Set automatically from the linked district.
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  <Label>Link to district</Label>
                  <Select value={districtId || "_none"} onValueChange={(v) => setDistrictId(v === "_none" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={districtOptions.length ? "Pick a district" : `No districts in ${province}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— Type a custom district below —</SelectItem>
                      {districtOptions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {!linkedDistrict && (
                  <div className="col-span-2">
                    <Label htmlFor="s-district-text">District name</Label>
                    <Input
                      id="s-district-text"
                      value={districtText}
                      onChange={(e) => setDistrictText(e.target.value)}
                      required
                      placeholder="e.g. Metro Central"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Tip: create the district under <strong>Districts</strong> first to link it properly.
                    </p>
                  </div>
                )}
                <div>
                  <Label>Phase</Label>
                  <Select value={phase} onValueChange={setPhase}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PHASES.map(p => <SelectItem key={p} value={p}>{PHASE_LABELS[p]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label htmlFor="s-city">City</Label><Input id="s-city" name="city" /></div>
                <div><Label htmlFor="s-email">Email</Label><Input id="s-email" name="email" type="email" /></div>
                <div><Label htmlFor="s-phone">Phone</Label><Input id="s-phone" name="phone" /></div>
              </div>
              <Button disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                {saving && <Loader2 className="size-4 animate-spin mr-2" />}Create school
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {rows.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <Building2 className="size-8 mx-auto mb-2 opacity-50" />
          No schools yet. Click "New school" to add the first one.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                  <th className="p-3">School</th>
                  <th className="p-3">EMIS</th>
                  <th className="p-3">District</th>
                  <th className="p-3">Province</th>
                  <th className="p-3">Phase</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Learners</th>
                  <th className="p-3 w-16"></th>
                </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-muted-foreground">{r.emis_number}</td>
                  <td className="p-3">{r.districts?.name ?? r.district}</td>
                  <td className="p-3 text-muted-foreground">{r.province}</td>
                  <td className="p-3"><Badge variant="secondary">{PHASE_LABELS[r.phase] ?? r.phase}</Badge></td>
                  <td className="p-3 capitalize text-muted-foreground">{r.school_type}</td>
                  <td className="p-3">{r.learner_count ?? 0}</td>
                  <td className="p-3 text-right">
                    <Button asChild size="icon" variant="ghost" className="size-7">
                      <Link to="/admin/schools/$schoolId" params={{ schoolId: r.id }}>
                        <Pencil className="size-3.5" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
