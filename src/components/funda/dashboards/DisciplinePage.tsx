import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/lib/auth-context";
import { PageHeader } from "@/components/funda/dashboards/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Loader2,
  Search,
  Shield,
  Star,
  AlertTriangle,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { friendlyDbError } from "@/lib/db-errors";

// ── Types ──────────────────────────────────────────────────────────────────

type DisciplineType = "merit" | "warning" | "detention" | "suspension" | "incident";

interface DisciplineRow {
  id: string;
  date: string;
  title: string;
  description: string | null;
  type: DisciplineType;
  points: number | null;
  recorded_at: string;
  recorded_by: string | null;
  learner_id: string;
  learners: { first_name: string; last_name: string; grade_id: number } | null;
}

interface Learner {
  id: string;
  first_name: string;
  last_name: string;
  grade_id: number;
  learner_number: string | null;
}

interface LogRecordFormState {
  learnerId: string;
  type: DisciplineType | "";
  title: string;
  description: string;
  points: string;
  date: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getTermWindow(year: number): { termStart: string; termEnd: string; term: number } {
  const m = new Date().getMonth() + 1;
  if (m <= 3)  return { term: 1, termStart: `${year}-01-01`, termEnd: `${year}-03-31` };
  if (m <= 6)  return { term: 2, termStart: `${year}-04-01`, termEnd: `${year}-06-30` };
  if (m <= 9)  return { term: 3, termStart: `${year}-07-01`, termEnd: `${year}-09-30` };
  return       { term: 4, termStart: `${year}-10-01`, termEnd: `${year}-12-31` };
}

function filterRecords(
  records: DisciplineRow[],
  search: string,
  typeFilter: DisciplineType | "",
  dateFrom: string,
  dateTo: string,
): DisciplineRow[] {
  const q = search.trim().toLowerCase();
  return records.filter((r) => {
    if (typeFilter && r.type !== typeFilter) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    if (q) {
      const name = `${r.learners?.first_name ?? ""} ${r.learners?.last_name ?? ""}`.toLowerCase();
      if (!name.includes(q)) return false;
    }
    return true;
  });
}

interface TermStats {
  merits: number;
  warnings: number;
  seriousCount: number;
  incidents: number;
}

function computeTermStats(records: DisciplineRow[], termStart: string, termEnd: string): TermStats {
  const inWindow = records.filter((r) => r.date >= termStart && r.date <= termEnd);
  return {
    merits:       inWindow.filter((r) => r.type === "merit").length,
    warnings:     inWindow.filter((r) => r.type === "warning").length,
    seriousCount: inWindow.filter((r) => r.type === "detention" || r.type === "suspension").length,
    incidents:    inWindow.filter((r) => r.type === "incident").length,
  };
}

function canDelete(record: DisciplineRow, userId: string, primaryRole: UserRole): boolean {
  return (
    record.recorded_by === userId ||
    primaryRole === "principal" ||
    primaryRole === "school_admin" ||
    primaryRole === "super_admin"
  );
}

// ── Colour maps ────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<DisciplineType, string> = {
  merit:      "text-green-600 bg-green-500/10",
  warning:    "text-orange-500 bg-orange-500/10",
  detention:  "text-red-500 bg-red-500/10",
  suspension: "text-red-700 bg-red-700/10",
  incident:   "text-purple-600 bg-purple-500/10",
};

const DISCIPLINE_TYPES: { value: DisciplineType; label: string }[] = [
  { value: "merit",      label: "Merit" },
  { value: "warning",    label: "Warning" },
  { value: "detention",  label: "Detention" },
  { value: "suspension", label: "Suspension" },
  { value: "incident",   label: "Incident" },
];

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  colorClass,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
}) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`size-9 rounded-lg grid place-items-center shrink-0 ${colorClass}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </div>
    </Card>
  );
}

// ── Log Record Dialog ──────────────────────────────────────────────────────

function LogRecordDialog({
  open,
  learners,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  learners: Learner[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [form, setForm] = useState<LogRecordFormState>({
    learnerId: "",
    type: "",
    title: "",
    description: "",
    points: "",
    date: todayIso(),
  });

  // Derive sorted unique grades from the learner list
  const gradeOptions = Array.from(new Set(learners.map((l) => l.grade_id)))
    .sort((a, b) => a - b);

  // When grade filter changes, clear the selected learner
  const handleGradeChange = (v: string) => {
    setGradeFilter(v);
    setForm((f) => ({ ...f, learnerId: "" }));
  };

  // Learners visible in the dropdown — filtered by selected grade
  const visibleLearners = gradeFilter === "all"
    ? learners
    : learners.filter((l) => l.grade_id === parseInt(gradeFilter));

  const resetForm = () => {
    setGradeFilter("all");
    setForm({ learnerId: "", type: "", title: "", description: "", points: "", date: todayIso() });
  };

  const handleClose = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.learnerId) return toast.error("Select a learner");
    if (!form.type)      return toast.error("Select a type");
    if (!form.title.trim()) return toast.error("Enter a title");

    const points =
      form.points.trim() !== "" ? parseInt(form.points, 10) : null;
    if (points !== null && (isNaN(points) || points < 0))
      return toast.error("Points must be a non-negative number");

    setSaving(true);
    const { error } = await supabase.from("discipline_records").insert({
      learner_id:  form.learnerId,
      type:        form.type as DisciplineType,
      title:       form.title.trim(),
      description: form.description.trim() || null,
      points,
      date:        form.date,
      recorded_by: user?.id,
    });
    setSaving(false);

    if (error) return toast.error(friendlyDbError(error));

    toast.success("Record logged successfully");
    resetForm();
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log discipline record</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          {/* Step 1: Grade filter → Step 2: Learner */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Grade</Label>
              <Select value={gradeFilter} onValueChange={handleGradeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All grades" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All grades</SelectItem>
                  {gradeOptions.map((g) => (
                    <SelectItem key={g} value={String(g)}>
                      Grade {g === 0 ? "R" : g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Learner</Label>
              <Select
                value={form.learnerId}
                onValueChange={(v) => setForm((f) => ({ ...f, learnerId: v }))}
                disabled={visibleLearners.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      gradeFilter === "all"
                        ? "Pick a grade first"
                        : visibleLearners.length === 0
                        ? "No learners in this grade"
                        : "Select learner"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {visibleLearners.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.first_name} {l.last_name}
                      {l.learner_number && (
                        <span className="text-muted-foreground ml-1.5 text-xs">· {l.learner_number}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {gradeFilter !== "all" && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {visibleLearners.length} learner{visibleLearners.length !== 1 ? "s" : ""} in this grade
                </p>
              )}
            </div>
          </div>

          {/* Type + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as DisciplineType }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DISCIPLINE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                max={todayIso()}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Disruptive behaviour in class"
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div>
            <Label>
              Description <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Additional details…"
              rows={3}
              maxLength={1000}
            />
          </div>

          {/* Points */}
          <div>
            <Label>
              Points <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              type="number"
              min={0}
              value={form.points}
              onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))}
              placeholder="e.g. 5"
              className="w-32"
            />
          </div>

          <Button
            type="submit"
            disabled={saving || !form.learnerId || !form.type || !form.title.trim()}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {saving ? (
              <><Loader2 className="size-4 animate-spin mr-2" />Saving…</>
            ) : (
              <><Plus className="size-4 mr-2" />Log record</>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function DisciplinePage() {
  const { primaryRole, primarySchoolId, user } = useAuth();

  const [learners, setLearners] = useState<Learner[]>([]);
  const [records, setRecords]   = useState<DisciplineRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filters
  const [search, setSearch]       = useState("");
  const [typeFilter, setTypeFilter] = useState<DisciplineType | "">("");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");

  const load = async () => {
    if (!primarySchoolId) return;
    setLoading(true);

    // Fetch learners first to get IDs for the records query
    const { data: lData } = await supabase
      .from("learners")
      .select("id, first_name, last_name, grade_id, learner_number")
      .eq("school_id", primarySchoolId)
      .order("last_name");

    const learnerList = (lData ?? []) as Learner[];
    setLearners(learnerList);

    const ids = learnerList.map((l) => l.id);

    if (ids.length > 0) {
      const { data: rData } = await supabase
        .from("discipline_records")
        .select("id, date, title, description, type, points, recorded_at, recorded_by, learner_id, learners(first_name, last_name, grade_id)")
        .in("learner_id", ids)
        .order("date", { ascending: false });
      setRecords((rData ?? []) as DisciplineRow[]);
    } else {
      setRecords([]);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, [primarySchoolId]);

  const handleDelete = async (record: DisciplineRow) => {
    if (!user) return;
    setDeleting(record.id);
    const { error } = await supabase
      .from("discipline_records")
      .delete()
      .eq("id", record.id);
    setDeleting(null);
    if (error) return toast.error(friendlyDbError(error));
    toast.success("Record deleted");
    load();
  };

  // No school guard
  if (!primarySchoolId) {
    return (
      <div className="max-w-lg">
        <PageHeader title="Discipline" sub="Log incidents and merits." />
        <Card className="p-10 text-center text-muted-foreground text-sm">
          No school assigned to your account.
        </Card>
      </div>
    );
  }

  const year = new Date().getFullYear();
  const { termStart, termEnd, term } = getTermWindow(year);
  const stats = computeTermStats(records, termStart, termEnd);
  const filtered = filterRecords(records, search, typeFilter, dateFrom, dateTo);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Discipline"
        sub={`Log incidents and merits · Term ${term} ${year}`}
        action={
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-4 mr-1.5" /> Log record
          </Button>
        }
      />

      {/* ── Term stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Merits this term"
          value={stats.merits}
          icon={<Star className="size-4" />}
          colorClass="text-green-600 bg-green-500/10"
        />
        <StatCard
          label="Warnings this term"
          value={stats.warnings}
          icon={<AlertTriangle className="size-4" />}
          colorClass="text-orange-500 bg-orange-500/10"
        />
        <StatCard
          label="Detentions / suspensions"
          value={stats.seriousCount}
          icon={<ShieldAlert className="size-4" />}
          colorClass="text-red-500 bg-red-500/10"
        />
        <StatCard
          label="Incidents this term"
          value={stats.incidents}
          icon={<Zap className="size-4" />}
          colorClass="text-purple-600 bg-purple-500/10"
        />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search learner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter || "all"}
          onValueChange={(v) => setTypeFilter(v === "all" ? "" : v as DisciplineType)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {DISCIPLINE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-36"
          title="From date"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-36"
          title="To date"
        />
      </div>

      {/* ── Records table ── */}
      {loading ? (
        <div className="text-sm text-muted-foreground py-10 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <Shield className="size-8 mx-auto mb-2 opacity-40" />
          {records.length === 0
            ? "No discipline records yet. Click \"Log record\" to get started."
            : "No records match your filters."}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Learner</th>
                <th className="p-3">Type</th>
                <th className="p-3">Title</th>
                <th className="p-3">Date</th>
                <th className="p-3">Points</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t align-middle">
                  <td className="p-3 font-medium">
                    <div>{r.learners?.first_name} {r.learners?.last_name}</div>
                    <div className="text-xs text-muted-foreground">
                      Grade {r.learners?.grade_id === 0 ? "R" : r.learners?.grade_id ?? "—"}
                    </div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-[11px] font-semibold capitalize px-2 py-0.5 rounded-full ${TYPE_COLORS[r.type] ?? "text-muted-foreground bg-muted"}`}
                    >
                      {r.type}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{r.title}</div>
                    {r.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.description}</div>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(r.date + "T00:00:00").toLocaleDateString("en-ZA", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {r.points ?? "—"}
                  </td>
                  <td className="p-3 text-right">
                    {user && canDelete(r, user.id, primaryRole) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={deleting === r.id}
                        onClick={() => handleDelete(r)}
                        title="Delete record"
                      >
                        {deleting === r.id
                          ? <Loader2 className="size-4 animate-spin" />
                          : <Trash2 className="size-4 text-destructive" />}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── Log record dialog ── */}
      <LogRecordDialog
        open={dialogOpen}
        learners={learners}
        onOpenChange={setDialogOpen}
        onSaved={load}
      />
    </div>
  );
}
