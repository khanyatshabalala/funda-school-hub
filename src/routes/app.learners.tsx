import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/funda/dashboards/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, CheckCircle2, XCircle, Clock, Search } from "lucide-react";
import { friendlyDbError } from "@/lib/db-errors";

export const Route = createFileRoute("/app/learners")({
  component: LearnersPage,
});

type Learner = {
  id: string;
  first_name: string;
  last_name: string;
  grade_id: number;
  learner_number: string | null;
  gender: string | null;
};

type LinkRequest = {
  id: string;
  first_name: string;
  last_name: string;
  learner_number: string;
  relationship: string;
  status: string;
  created_at: string;
  parent_user_id: string;
  profiles: { full_name: string | null } | null;
};

function LearnersPage() {
  const { primarySchoolId, primaryRole, user } = useAuth();
  const canManage = primaryRole === "principal" || primaryRole === "school_admin" || primaryRole === "super_admin";

  const [learners, setLearners]     = useState<Learner[]>([]);
  const [requests, setRequests]     = useState<LinkRequest[]>([]);
  const [search, setSearch]         = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  // Reject dialog
  const [rejectOpen, setRejectOpen]   = useState(false);
  const [rejectId, setRejectId]       = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    if (!primarySchoolId) return;
    const [{ data: l }, { data: r }] = await Promise.all([
      supabase.from("learners")
        .select("id, first_name, last_name, grade_id, learner_number, gender")
        .eq("school_id", primarySchoolId)
        .order("last_name"),
      canManage
        ? (supabase as any).from("parent_link_requests")
            .select("id, first_name, last_name, learner_number, relationship, status, created_at, parent_user_id, profiles(full_name)")
            .eq("school_id", primarySchoolId)
            .eq("status", "pending")
            .order("created_at")
        : Promise.resolve({ data: [] }),
    ]);
    setLearners((l ?? []) as Learner[]);
    setRequests((r ?? []) as LinkRequest[]);
  };

  useEffect(() => { load(); }, [primarySchoolId]);

  const onApprove = async (requestId: string) => {
    if (!user) return;
    setProcessing(requestId);
    const { data, error } = await (supabase as any).rpc("approve_link_request", {
      _request_id:  requestId,
      _reviewer_id: user.id,
    });
    setProcessing(null);
    if (error || (data as any)?.error) {
      return toast.error((data as any)?.error ?? friendlyDbError(error));
    }
    toast.success("Request approved — parent can now view their child's records.");
    load();
  };

  const onRejectConfirm = async () => {
    if (!rejectId || !user) return;
    setProcessing(rejectId);
    const { data, error } = await (supabase as any).rpc("reject_link_request", {
      _request_id:  rejectId,
      _reviewer_id: user.id,
      _reason:      rejectReason.trim() || null,
    });
    setProcessing(null);
    setRejectOpen(false);
    setRejectId(null);
    setRejectReason("");
    if (error || (data as any)?.error) {
      return toast.error((data as any)?.error ?? friendlyDbError(error));
    }
    toast.success("Request rejected. Parent has been notified.");
    load();
  };

  const filtered = learners.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${l.first_name} ${l.last_name}`.toLowerCase().includes(q)
      || (l.learner_number ?? "").toLowerCase().includes(q);
  });

  if (!primarySchoolId) {
    return (
      <div className="max-w-2xl">
        <PageHeader title="Learners" sub="No school assigned to your account." />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Learners"
        sub={`${learners.length} learner${learners.length !== 1 ? "s" : ""} registered`}
      />

      <Tabs defaultValue={requests.length > 0 ? "requests" : "learners"}>
        <TabsList className="mb-4">
          <TabsTrigger value="learners">
            Learners
            <Badge variant="secondary" className="ml-2 text-[10px]">{learners.length}</Badge>
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="requests">
              Link requests
              {requests.length > 0 && (
                <Badge className="ml-2 text-[10px] bg-accent text-accent-foreground">{requests.length}</Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Learners list ── */}
        <TabsContent value="learners">
          <div className="mb-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or learner number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 max-w-sm"
            />
          </div>

          {filtered.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground text-sm">
              <Users className="size-8 mx-auto mb-2 opacity-40" />
              {search ? "No learners match your search." : "No learners registered yet."}
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Learner no.</th>
                    <th className="p-3">Grade</th>
                    <th className="p-3">Gender</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(l => (
                    <tr key={l.id} className="border-t">
                      <td className="p-3 font-medium">{l.first_name} {l.last_name}</td>
                      <td className="p-3 text-muted-foreground font-mono text-xs">{l.learner_number ?? "—"}</td>
                      <td className="p-3"><Badge variant="secondary">Grade {l.grade_id === 0 ? "R" : l.grade_id}</Badge></td>
                      <td className="p-3 text-muted-foreground capitalize">{l.gender ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        {/* ── Pending link requests ── */}
        {canManage && (
          <TabsContent value="requests">
            {requests.length === 0 ? (
              <Card className="p-10 text-center text-muted-foreground text-sm">
                <Clock className="size-8 mx-auto mb-2 opacity-40" />
                No pending requests.
              </Card>
            ) : (
              <div className="space-y-3">
                {requests.map(r => (
                  <Card key={r.id} className="p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="font-semibold">
                          {r.first_name} {r.last_name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                          <div>Learner no: <span className="font-mono font-medium text-foreground">{r.learner_number}</span></div>
                          <div>Requested by: <span className="font-medium text-foreground">{r.profiles?.full_name ?? "Unknown"}</span></div>
                          <div>Relationship: <span className="capitalize">{r.relationship}</span></div>
                          <div>Submitted: {new Date(r.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                          disabled={processing === r.id}
                          onClick={() => onApprove(r.id)}
                        >
                          <CheckCircle2 className="size-3.5" />
                          {processing === r.id ? "…" : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-300 hover:bg-red-50 gap-1.5"
                          disabled={processing === r.id}
                          onClick={() => { setRejectId(r.id); setRejectOpen(true); }}
                        >
                          <XCircle className="size-3.5" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* ── Reject dialog ── */}
      <Dialog open={rejectOpen} onOpenChange={v => { setRejectOpen(v); if (!v) { setRejectId(null); setRejectReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Learner number not found in our records"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">The parent will be notified with this reason.</p>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={onRejectConfirm}
                disabled={!!processing}
              >
                {processing ? "…" : "Reject request"}
              </Button>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
