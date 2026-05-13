import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/funda/dashboards/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeftRight, Plus, Loader2, CheckCircle2, XCircle, Clock, ShieldAlert, Check, X } from "lucide-react";
import { friendlyDbError } from "@/lib/db-errors";

type TransferStatus = "pending" | "approved" | "rejected" | "completed";

type Transfer = {
  id: string;
  status: TransferStatus;
  reason: string | null;
  requested_at: string;
  resolved_at: string | null;
  learner_id: string;
  from_school_id: string;
  to_school_id: string;
  learners: { first_name: string; last_name: string; grade_id: number } | null;
  from_school: { name: string } | null;
  to_school: { name: string } | null;
};

type Learner = { id: string; first_name: string; last_name: string; grade_id: number };
type School  = { id: string; name: string };

const STATUS_CONFIG: Record<TransferStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: "Pending",   color: "text-orange-500 bg-orange-500/10", icon: <Clock className="size-3.5" /> },
  approved:  { label: "Approved",  color: "text-green-600 bg-green-500/10",   icon: <CheckCircle2 className="size-3.5" /> },
  rejected:  { label: "Rejected",  color: "text-red-500 bg-red-500/10",       icon: <XCircle className="size-3.5" /> },
  completed: { label: "Completed", color: "text-blue-500 bg-blue-500/10",     icon: <CheckCircle2 className="size-3.5" /> },
};

export function TransfersPage() {
  const { primaryRole, primarySchoolId, user } = useAuth();
  const canManage = ["principal", "school_admin", "super_admin"].includes(primaryRole);

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [learners, setLearners]   = useState<Learner[]>([]);
  const [schools, setSchools]     = useState<School[]>([]);
  const [loading, setLoading]     = useState(true);
  const [acting, setActing]       = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving]       = useState(false);

  // Form
  const [learnerId, setLearnerId] = useState("");
  const [toSchoolId, setToSchoolId] = useState("");
  const [reason, setReason]       = useState("");

  const load = async () => {
    if (!primarySchoolId) { setLoading(false); return; }
    setLoading(true);

    const [{ data: tData }, { data: lData }, { data: sData }] = await Promise.all([
      supabase
        .from("transfers")
        .select("id, status, reason, requested_at, resolved_at, learner_id, from_school_id, to_school_id, learners(first_name, last_name, grade_id), from_school:schools!transfers_from_school_id_fkey(name), to_school:schools!transfers_to_school_id_fkey(name)")
        .or(`from_school_id.eq.${primarySchoolId},to_school_id.eq.${primarySchoolId}`)
        .order("requested_at", { ascending: false }),
      supabase
        .from("learners")
        .select("id, first_name, last_name, grade_id")
        .eq("school_id", primarySchoolId)
        .order("last_name"),
      supabase
        .from("schools")
        .select("id, name")
        .neq("id", primarySchoolId)
        .order("name")
        .limit(200),
    ]);

    setTransfers((tData ?? []) as Transfer[]);
    setLearners((lData ?? []) as Learner[]);
    setSchools((sData ?? []) as School[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [primarySchoolId]);

  const onRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!learnerId)   return toast.error("Select a learner");
    if (!toSchoolId)  return toast.error("Select destination school");
    if (!primarySchoolId) return;
    setSaving(true);
    const { error } = await supabase.from("transfers").insert({
      learner_id:     learnerId,
      from_school_id: primarySchoolId,
      to_school_id:   toSchoolId,
      reason:         reason.trim() || null,
      requested_by:   user?.id,
    });
    setSaving(false);
    if (error) return toast.error(friendlyDbError(error));
    toast.success("Transfer request submitted");
    setDialogOpen(false);
    setLearnerId(""); setToSchoolId(""); setReason("");
    load();
  };

  const updateStatus = async (id: string, status: TransferStatus) => {
    setActing(id);
    const { error } = await supabase
      .from("transfers")
      .update({ status, approved_by: user?.id, resolved_at: new Date().toISOString() })
      .eq("id", id);
    setActing(null);
    if (error) return toast.error(friendlyDbError(error));
    toast.success(`Transfer ${status}`);
    load();
  };

  if (!canManage) {
    return (
      <div className="max-w-lg">
        <PageHeader title="Transfers" sub="Process learner transfer requests." />
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <ShieldAlert className="size-8 mx-auto mb-2 opacity-40" />
          Only principals and school admins can manage transfers.
        </Card>
      </div>
    );
  }

  const pending   = transfers.filter(t => t.status === "pending");
  const resolved  = transfers.filter(t => t.status !== "pending");

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Transfers"
        sub="Manage learner transfer requests between schools."
        action={
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-4 mr-1.5" /> Request transfer
          </Button>
        }
      />

      {loading ? (
        <div className="text-sm text-muted-foreground py-10 text-center">Loading…</div>
      ) : transfers.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <ArrowLeftRight className="size-8 mx-auto mb-2 opacity-40" />
          <p className="font-medium text-foreground mb-1">No transfers yet</p>
          <p>Submit a transfer request to move a learner to another school.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Pending · {pending.length}
              </h2>
              <Card className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="p-3">Learner</th>
                      <th className="p-3">From</th>
                      <th className="p-3">To</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Requested</th>
                      <th className="p-3 w-28"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map(t => (
                      <tr key={t.id} className="border-t align-middle">
                        <td className="p-3 font-medium">
                          {t.learners?.first_name} {t.learners?.last_name}
                          <div className="text-xs text-muted-foreground">
                            Grade {t.learners?.grade_id === 0 ? "R" : t.learners?.grade_id}
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">{(t.from_school as any)?.name ?? "—"}</td>
                        <td className="p-3 text-muted-foreground text-xs">{(t.to_school as any)?.name ?? "—"}</td>
                        <td className="p-3 text-muted-foreground text-xs max-w-[160px]">
                          <span className="line-clamp-2">{t.reason ?? "—"}</span>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                          {new Date(t.requested_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1.5 justify-end">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white h-7 px-2"
                              disabled={acting === t.id}
                              onClick={() => updateStatus(t.id, "approved")}
                            >
                              {acting === t.id ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3 mr-1" />}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive text-destructive hover:bg-destructive/10 h-7 px-2"
                              disabled={acting === t.id}
                              onClick={() => updateStatus(t.id, "rejected")}
                            >
                              <X className="size-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* Resolved */}
          {resolved.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                History
              </h2>
              <Card className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="p-3">Learner</th>
                      <th className="p-3">From → To</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Resolved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolved.map(t => {
                      const cfg = STATUS_CONFIG[t.status];
                      return (
                        <tr key={t.id} className="border-t align-middle">
                          <td className="p-3 font-medium">
                            {t.learners?.first_name} {t.learners?.last_name}
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">
                            {(t.from_school as any)?.name} → {(t.to_school as any)?.name}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                              {cfg.icon}{cfg.label}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">
                            {t.resolved_at
                              ? new Date(t.resolved_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Request transfer dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setLearnerId(""); setToSchoolId(""); setReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Request transfer</DialogTitle>
          </DialogHeader>
          <form onSubmit={onRequest} className="space-y-4 mt-1">
            <div>
              <Label>Learner</Label>
              <Select value={learnerId} onValueChange={setLearnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select learner" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {learners.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.first_name} {l.last_name} · Grade {l.grade_id === 0 ? "R" : l.grade_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Destination school</Label>
              <Select value={toSchoolId} onValueChange={setToSchoolId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select school" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {schools.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Family relocation"
                rows={3}
                maxLength={500}
              />
            </div>
            <Button
              type="submit"
              disabled={saving || !learnerId || !toSchoolId}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {saving ? <><Loader2 className="size-4 animate-spin mr-2" />Submitting…</> : <><Plus className="size-4 mr-2" />Submit request</>}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}