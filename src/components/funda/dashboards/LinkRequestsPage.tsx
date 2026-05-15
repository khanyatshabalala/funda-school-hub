import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/funda/dashboards/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, CheckCircle2, XCircle, Clock, ShieldAlert, Search, Loader2 } from "lucide-react";

type LinkRequest = {
  id: string;
  first_name: string;
  last_name: string;
  learner_number: string;
  relationship: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  parent_user_id: string;
  parent_name: string | null;
  parent_email: string | null;
};

export function LinkRequestsPage() {
  const { primaryRole, primarySchoolId, user } = useAuth();
  const canManage = ["principal", "school_admin", "super_admin"].includes(primaryRole);

  const [requests, setRequests]   = useState<LinkRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [acting, setActing]       = useState<string | null>(null);
  const [search, setSearch]       = useState("");
  const [tab, setTab]             = useState<"pending" | "resolved">("pending");

  // Reject dialog
  const [rejectOpen, setRejectOpen]   = useState(false);
  const [rejectTarget, setRejectTarget] = useState<LinkRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting]     = useState(false);

  const load = async () => {
    if (!primarySchoolId) { setLoading(false); return; }
    setLoading(true);

    const { data: reqData } = await (supabase as any)
      .from("parent_link_requests")
      .select("id, first_name, last_name, learner_number, relationship, status, rejection_reason, created_at, parent_user_id")
      .eq("school_id", primarySchoolId)
      .order("created_at", { ascending: false });

    const rows = (reqData ?? []) as Omit<LinkRequest, "parent_name" | "parent_email">[];

    // Enrich with parent profile info
    const parentIds = [...new Set(rows.map(r => r.parent_user_id))];
    let profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
    if (parentIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", parentIds);
      (profiles ?? []).forEach((p: any) => {
        profileMap[p.id] = { full_name: p.full_name, email: null };
      });
    }

    setRequests(rows.map(r => ({
      ...r,
      parent_name:  profileMap[r.parent_user_id]?.full_name ?? null,
      parent_email: profileMap[r.parent_user_id]?.email ?? null,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [primarySchoolId]);

  const onApprove = async (req: LinkRequest) => {
    setActing(req.id);
    const { data, error } = await supabase.rpc("approve_link_request", {
      _request_id:  req.id,
      _reviewer_id: user!.id,
    });
    setActing(null);
    if (error) return toast.error(error.message);
    const result = data as any;
    if (result?.error) return toast.error(result.error);
    toast.success(`${req.first_name} ${req.last_name} linked to parent successfully`);
    load();
  };

  const onRejectConfirm = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    const { data, error } = await (supabase as any).rpc("reject_link_request", {
      _request_id:  rejectTarget.id,
      _reviewer_id: user!.id,
      _reason:      rejectReason.trim() || undefined,
    });
    setRejecting(false);
    if (error) return toast.error(error.message);
    const result = data as any;
    if (result?.error) return toast.error(result.error);
    toast.success("Request rejected");
    setRejectOpen(false);
    setRejectTarget(null);
    setRejectReason("");
    load();
  };

  if (!canManage) {
    return (
      <div className="max-w-lg">
        <PageHeader title="Link requests" sub="Approve parent requests to link their children." />
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <ShieldAlert className="size-8 mx-auto mb-2 opacity-40" />
          Only principals and school admins can manage link requests.
        </Card>
      </div>
    );
  }

  const pending  = requests.filter(r => r.status === "pending");
  const resolved = requests.filter(r => r.status !== "pending");

  const filterRows = (rows: LinkRequest[]) => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) ||
      r.learner_number.toLowerCase().includes(q) ||
      (r.parent_name ?? "").toLowerCase().includes(q)
    );
  };

  const displayed = filterRows(tab === "pending" ? pending : resolved);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Link requests"
        sub="Parents submit requests to link their children. Verify and approve or reject below."
      />

      {/* Tabs + search */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={tab === "pending" ? "default" : "outline"}
            onClick={() => setTab("pending")}
            className={tab === "pending" ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}
          >
            Pending
            {pending.length > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {pending.length}
              </span>
            )}
          </Button>
          <Button
            size="sm"
            variant={tab === "resolved" ? "default" : "outline"}
            onClick={() => setTab("resolved")}
            className={tab === "resolved" ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}
          >
            History
          </Button>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search learner or parent…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-10 text-center">Loading…</div>
      ) : displayed.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <Users className="size-8 mx-auto mb-2 opacity-40" />
          {tab === "pending"
            ? "No pending requests. Parents can submit requests from the app."
            : "No resolved requests yet."}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Learner</th>
                <th className="p-3">Learner no.</th>
                <th className="p-3">Parent</th>
                <th className="p-3">Relationship</th>
                <th className="p-3">Submitted</th>
                <th className="p-3">Status</th>
                {tab === "pending" && <th className="p-3 w-36"></th>}
              </tr>
            </thead>
            <tbody>
              {displayed.map(r => (
                <tr key={r.id} className="border-t align-middle">
                  <td className="p-3 font-medium">
                    {r.first_name} {r.last_name}
                  </td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">
                    {r.learner_number}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {r.parent_name ?? "—"}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs capitalize">
                    {r.relationship}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString("en-ZA", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>
                  <td className="p-3">
                    {r.status === "pending" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full text-orange-500 bg-orange-500/10">
                        <Clock className="size-3" />Pending
                      </span>
                    )}
                    {r.status === "approved" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full text-green-600 bg-green-500/10">
                        <CheckCircle2 className="size-3" />Approved
                      </span>
                    )}
                    {r.status === "rejected" && (
                      <div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full text-red-500 bg-red-500/10">
                          <XCircle className="size-3" />Rejected
                        </span>
                        {r.rejection_reason && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[160px]">
                            {r.rejection_reason}
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                  {tab === "pending" && (
                    <td className="p-3">
                      <div className="flex gap-1.5 justify-end">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white h-7 px-2.5"
                          disabled={acting === r.id}
                          onClick={() => onApprove(r)}
                        >
                          {acting === r.id
                            ? <Loader2 className="size-3 animate-spin" />
                            : <><CheckCircle2 className="size-3 mr-1" />Approve</>}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-destructive text-destructive hover:bg-destructive/10 h-7 px-2.5"
                          disabled={acting === r.id}
                          onClick={() => { setRejectTarget(r); setRejectOpen(true); }}
                        >
                          <XCircle className="size-3 mr-1" />Reject
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={v => { setRejectOpen(v); if (!v) { setRejectTarget(null); setRejectReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Rejecting the request for <span className="font-medium text-foreground">
              {rejectTarget?.first_name} {rejectTarget?.last_name}
            </span>. The parent will be notified.
          </p>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Reason <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Learner number not found in our records"
                rows={3}
                maxLength={300}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                onClick={onRejectConfirm}
                disabled={rejecting}
              >
                {rejecting ? <Loader2 className="size-4 animate-spin mr-2" /> : <XCircle className="size-4 mr-2" />}
                Reject request
              </Button>
              <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={rejecting}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}