import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/funda/dashboards/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Crown, BookOpen, ClipboardList, Shield, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { friendlyDbError } from "@/lib/db-errors";

export const Route = createFileRoute("/app/children")({ component: ChildrenPage });

const PROVINCES = [
  "Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo",
  "Mpumalanga","Northern Cape","North West","Western Cape",
] as const;

type ChildLink = {
  id: string;
  relationship: string;
  is_primary: boolean;
  learners: {
    id: string;
    first_name: string;
    last_name: string;
    grade_id: number;
    schools: { name: string } | null;
  } | null;
};

type LinkRequest = {
  id: string;
  first_name: string;
  last_name: string;
  learner_number: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  schools: { name: string } | null;
};

function ChildrenPage() {
  const { user, profile } = useAuth();
  const [children, setChildren]   = useState<ChildLink[]>([]);
  const [requests, setRequests]   = useState<LinkRequest[]>([]);
  const [open, setOpen]           = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Cascading dropdown state
  const [province, setProvince]   = useState("");
  const [districtId, setDistrictId] = useState("");
  const [schoolId, setSchoolId]   = useState("");
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [schools, setSchools]     = useState<{ id: string; name: string }[]>([]);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [learnerNo, setLearnerNo] = useState("");
  const [relationship, setRelationship] = useState("parent");

  const isPremium    = profile?.subscription_tier === "premium";
  const atChildLimit = !isPremium && children.length >= 1;

  const load = async () => {
    if (!user) return;
    const [{ data: links }, { data: reqs }] = await Promise.all([
      supabase
        .from("parent_links")
        .select("id, relationship, is_primary, learners(id, first_name, last_name, grade_id, schools(name))")
        .eq("parent_user_id", user.id),
      (supabase as any)
        .from("parent_link_requests")
        .select("id, first_name, last_name, learner_number, status, rejection_reason, created_at, schools(name)")
        .eq("parent_user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    setChildren((links ?? []) as ChildLink[]);
    setRequests((reqs ?? []) as LinkRequest[]);
  };

  useEffect(() => { load(); }, [user]);

  // Load districts when province changes
  useEffect(() => {
    if (!province) { setDistricts([]); setDistrictId(""); setSchools([]); setSchoolId(""); return; }
    supabase.from("districts").select("id, name").eq("province", province as any).order("name")
      .then(({ data }) => { setDistricts(data ?? []); setDistrictId(""); setSchools([]); setSchoolId(""); });
  }, [province]);

  // Load schools when district changes
  useEffect(() => {
    if (!districtId) { setSchools([]); setSchoolId(""); return; }
    supabase.from("schools").select("id, name").eq("district_id", districtId).order("name")
      .then(({ data }) => { setSchools(data ?? []); setSchoolId(""); });
  }, [districtId]);

  const resetDialog = () => {
    setProvince(""); setDistrictId(""); setSchoolId("");
    setDistricts([]); setSchools([]);
    setFirstName(""); setLastName(""); setLearnerNo("");
    setRelationship("parent");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId)          return toast.error("Select a school");
    if (!firstName.trim())  return toast.error("Enter the child's first name");
    if (!lastName.trim())   return toast.error("Enter the child's last name");
    if (!learnerNo.trim())  return toast.error("Enter the learner number");

    setSubmitting(true);
    const { error } = await (supabase as any).from("parent_link_requests").insert({
      parent_user_id: user!.id,
      school_id:      schoolId,
      first_name:     firstName.trim(),
      last_name:      lastName.trim(),
      learner_number: learnerNo.trim(),
      relationship,
    });
    setSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        return toast.error("You already have a pending request for this learner at this school.");
      }
      return toast.error(friendlyDbError(error));
    }

    toast.success("Request submitted. The school will review and approve it.");
    setOpen(false);
    resetDialog();
    load();
  };

  const pendingRequests  = requests.filter(r => r.status === "pending");
  const rejectedRequests = requests.filter(r => r.status === "rejected");

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="My children"
        sub="Submit a request to link your child. The school will verify and approve it."
        action={
          atChildLimit ? (
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/app/upgrade"><Crown className="size-4 mr-1.5" />Upgrade to add more</Link>
            </Button>
          ) : (
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setOpen(true)}>
              <Plus className="size-4 mr-1" /> Request to link a child
            </Button>
          )
        }
      />

      {!isPremium && children.length >= 1 && (
        <Card className="p-4 mb-5 flex items-center justify-between gap-4 bg-muted/50 border-accent/30">
          <p className="text-sm text-muted-foreground">
            Free accounts can link <span className="font-medium text-foreground">1 child</span>. Upgrade for unlimited.
          </p>
          <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0">
            <Link to="/app/upgrade"><Crown className="size-3.5 mr-1" />Upgrade</Link>
          </Button>
        </Card>
      )}

      {/* ── Pending requests ── */}
      {pendingRequests.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Pending approval</h2>
          <div className="space-y-2">
            {pendingRequests.map(r => (
              <Card key={r.id} className="p-4 flex items-center gap-3 border-orange-300/50 bg-orange-50/30 dark:bg-orange-950/10">
                <Clock className="size-4 text-orange-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.first_name} {r.last_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.schools?.name} · Learner no. {r.learner_number}
                  </p>
                </div>
                <Badge variant="secondary" className="text-orange-500 bg-orange-100 dark:bg-orange-950/30 shrink-0">
                  Pending
                </Badge>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Rejected requests ── */}
      {rejectedRequests.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Not approved</h2>
          <div className="space-y-2">
            {rejectedRequests.map(r => (
              <Card key={r.id} className="p-4 flex items-center gap-3 border-red-300/50 bg-red-50/30 dark:bg-red-950/10">
                <XCircle className="size-4 text-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.first_name} {r.last_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.schools?.name} · Learner no. {r.learner_number}
                  </p>
                  {r.rejection_reason && (
                    <p className="text-xs text-red-500 mt-0.5">{r.rejection_reason}</p>
                  )}
                </div>
                <Badge variant="secondary" className="text-red-500 bg-red-100 dark:bg-red-950/30 shrink-0">
                  Rejected
                </Badge>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Linked children ── */}
      {children.length === 0 && pendingRequests.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          No children linked yet. Click "Request to link a child" to get started.
        </Card>
      ) : children.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Linked children</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {children.map((c) => {
              const l = c.learners;
              if (!l) return null;
              return (
                <Card key={c.id} className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {l.first_name} {l.last_name}
                        <CheckCircle2 className="size-3.5 text-green-500" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{l.schools?.name}</div>
                    </div>
                    <Badge variant="secondary">Grade {l.grade_id === 0 ? "R" : l.grade_id}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 capitalize">
                    {c.relationship}{c.is_primary ? " · Primary" : ""}
                  </div>
                  <div className="mt-4 flex gap-2 flex-wrap">
                    <Button asChild size="sm" variant="outline" className="text-xs h-7">
                      <Link to="/app/marks"><BookOpen className="size-3 mr-1" />Reports</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="text-xs h-7">
                      <Link to="/app/attendance"><ClipboardList className="size-3 mr-1" />Attendance</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="text-xs h-7">
                      <Link to="/app/discipline"><Shield className="size-3 mr-1" />Discipline</Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Request dialog ── */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetDialog(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request to link a child</DialogTitle>
            <DialogDescription>
              Select your child's school and fill in their details. The school will verify and approve your request.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4 mt-2">
            {/* Province */}
            <div>
              <Label>Province</Label>
              <Select value={province} onValueChange={setProvince}>
                <SelectTrigger><SelectValue placeholder="Select province" /></SelectTrigger>
                <SelectContent>
                  {PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* District */}
            <div>
              <Label>District</Label>
              <Select value={districtId} onValueChange={setDistrictId} disabled={!province || districts.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={!province ? "Select province first" : districts.length === 0 ? "No districts found" : "Select district"} />
                </SelectTrigger>
                <SelectContent>
                  {districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* School */}
            <div>
              <Label>School</Label>
              <Select value={schoolId} onValueChange={setSchoolId} disabled={!districtId || schools.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={!districtId ? "Select district first" : schools.length === 0 ? "No schools in this district" : "Select school"} />
                </SelectTrigger>
                <SelectContent>
                  {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Enter your child's details exactly as registered at the school.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="fn">First name</Label>
                  <Input id="fn" value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="e.g. Sipho" />
                </div>
                <div>
                  <Label htmlFor="ln">Last name</Label>
                  <Input id="ln" value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="e.g. Dlamini" />
                </div>
              </div>
              <div>
                <Label htmlFor="lno">Learner number</Label>
                <Input id="lno" value={learnerNo} onChange={e => setLearnerNo(e.target.value)} required placeholder="e.g. 2024001" />
                <p className="text-xs text-muted-foreground mt-1">Ask your school admin if you don't have this.</p>
              </div>
              <div>
                <Label>Your relationship</Label>
                <Select value={relationship} onValueChange={setRelationship}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="grandparent">Grandparent</SelectItem>
                    <SelectItem value="sibling">Sibling</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting || !schoolId || !firstName || !lastName || !learnerNo}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {submitting ? "Submitting…" : "Submit request"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
