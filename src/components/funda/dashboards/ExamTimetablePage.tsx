import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
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
  CalendarDays,
  Clock,
  MapPin,
} from "lucide-react";
import { friendlyDbError } from "@/lib/db-errors";

// ── Types ──────────────────────────────────────────────────────────────────

interface ExamEntry {
  id: string;
  subject: string;
  grade_id: number | null;
  exam_date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  notes: string | null;
  term: number;
  academic_year: number;
  created_by: string | null;
}

interface Grade {
  id: number;
  label: string;
}

interface FormState {
  subject: string;
  gradeId: string;
  examDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  notes: string;
  term: string;
  academicYear: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR - 1];
const TERMS = [1, 2, 3, 4];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function currentTerm() {
  const m = new Date().getMonth() + 1;
  if (m <= 3) return 1;
  if (m <= 6) return 2;
  if (m <= 9) return 3;
  return 4;
}

function formatTime(t: string | null) {
  if (!t) return null;
  return t.slice(0, 5); // "HH:MM"
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-ZA", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

// ── Add Exam Dialog ────────────────────────────────────────────────────────

function AddExamDialog({
  open,
  grades,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  grades: Grade[];
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { user, primarySchoolId } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    subject: "",
    gradeId: "all",
    examDate: todayIso(),
    startTime: "",
    endTime: "",
    venue: "",
    notes: "",
    term: String(currentTerm()),
    academicYear: String(CURRENT_YEAR),
  });

  const reset = () =>
    setForm({
      subject: "",
      gradeId: "all",
      examDate: todayIso(),
      startTime: "",
      endTime: "",
      venue: "",
      notes: "",
      term: String(currentTerm()),
      academicYear: String(CURRENT_YEAR),
    });

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim()) return toast.error("Enter a subject");
    if (!form.examDate)       return toast.error("Select an exam date");
    if (!primarySchoolId)     return toast.error("No school assigned");

    setSaving(true);
    const { error } = await (supabase as any).from("exam_timetables").insert({
      school_id:    primarySchoolId,
      subject:      form.subject.trim(),
      grade_id:     form.gradeId !== "all" ? parseInt(form.gradeId) : null,
      exam_date:    form.examDate,
      start_time:   form.startTime || null,
      end_time:     form.endTime || null,
      venue:        form.venue.trim() || null,
      notes:        form.notes.trim() || null,
      term:         parseInt(form.term),
      academic_year: parseInt(form.academicYear),
      created_by:   user?.id,
    });
    setSaving(false);

    if (error) return toast.error(friendlyDbError(error));

    toast.success("Exam added to timetable");
    reset();
    onOpenChange(false);
    onSaved();
  };

  const set = (k: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add exam</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          {/* Subject */}
          <div>
            <Label>Subject</Label>
            <Input
              value={form.subject}
              onChange={(e) => set("subject")(e.target.value)}
              placeholder="e.g. Mathematics"
              maxLength={100}
            />
          </div>

          {/* Grade */}
          <div>
            <Label>Grade <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Select value={form.gradeId} onValueChange={set("gradeId")}>
              <SelectTrigger>
                <SelectValue placeholder="All grades" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">All grades</SelectItem>
                {grades.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Term + Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Term</Label>
              <Select value={form.term} onValueChange={set("term")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TERMS.map((t) => (
                    <SelectItem key={t} value={String(t)}>Term {t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Year</Label>
              <Select value={form.academicYear} onValueChange={set("academicYear")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date */}
          <div>
            <Label>Exam date</Label>
            <Input
              type="date"
              value={form.examDate}
              onChange={(e) => set("examDate")(e.target.value)}
            />
          </div>

          {/* Start + End time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start time <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => set("startTime")(e.target.value)}
              />
            </div>
            <div>
              <Label>End time <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => set("endTime")(e.target.value)}
              />
            </div>
          </div>

          {/* Venue */}
          <div>
            <Label>Venue <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              value={form.venue}
              onChange={(e) => set("venue")(e.target.value)}
              placeholder="e.g. Hall A"
              maxLength={100}
            />
          </div>

          {/* Notes */}
          <div>
            <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
              placeholder="Any additional information…"
              rows={2}
              maxLength={500}
            />
          </div>

          <Button
            type="submit"
            disabled={saving || !form.subject.trim() || !form.examDate}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {saving
              ? <><Loader2 className="size-4 animate-spin mr-2" />Saving…</>
              : <><Plus className="size-4 mr-2" />Add exam</>}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function ExamTimetablePage() {
  const { primaryRole, primarySchoolId, user } = useAuth();

  const canManage = ["principal", "school_admin", "super_admin"].includes(primaryRole);

  const [exams, setExams]   = useState<ExamEntry[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filters
  const [search, setSearch]         = useState("");
  const [termFilter, setTermFilter] = useState(String(currentTerm()));
  const [yearFilter, setYearFilter] = useState(String(CURRENT_YEAR));
  const [gradeFilter, setGradeFilter] = useState("all");

  const load = async () => {
    if (!primarySchoolId) return;
    setLoading(true);

    const [{ data: schoolData }, { data: g }, { data: e }] = await Promise.all([
      supabase.from("schools").select("phase").eq("id", primarySchoolId).maybeSingle(),
      supabase.from("grades").select("id, label").order("id"),
      (supabase as any)
        .from("exam_timetables")
        .select("id, subject, grade_id, exam_date, start_time, end_time, venue, notes, term, academic_year, created_by")
        .eq("school_id", primarySchoolId)
        .order("exam_date", { ascending: true })
        .order("start_time", { ascending: true }),
    ]);

    // Filter grades to those matching the school's phase
    const schoolPhase: string = (schoolData as any)?.phase ?? "";
    const allGrades = (g ?? []) as Grade[];
    const filteredGrades = schoolPhase === "combined" || !schoolPhase
      ? allGrades
      : allGrades.filter((gr) => {
          if (schoolPhase === "primary")   return gr.id <= 7;
          if (schoolPhase === "secondary") return gr.id >= 8;
          return true;
        });

    setGrades(filteredGrades);
    setExams((e ?? []) as ExamEntry[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [primarySchoolId]);

  const handleDelete = async (exam: ExamEntry) => {
    setDeleting(exam.id);
    const { error } = await (supabase as any)
      .from("exam_timetables")
      .delete()
      .eq("id", exam.id);
    setDeleting(null);
    if (error) return toast.error(friendlyDbError(error));
    toast.success("Exam removed");
    load();
  };

  if (!primarySchoolId) {
    return (
      <div className="max-w-lg">
        <PageHeader title="Exam timetable" sub="View and manage exam schedules." />
        <Card className="p-10 text-center text-muted-foreground text-sm">
          No school assigned to your account.
        </Card>
      </div>
    );
  }

  // Apply filters
  const filtered = exams.filter((e) => {
    if (termFilter !== "all" && e.term !== parseInt(termFilter)) return false;
    if (yearFilter !== "all" && e.academic_year !== parseInt(yearFilter)) return false;
    if (gradeFilter !== "all") {
      if (gradeFilter === "all_grades") {
        // show entries with no specific grade
        if (e.grade_id !== null) return false;
      } else if (e.grade_id !== parseInt(gradeFilter)) return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const haystack = [e.subject, e.venue ?? ""].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  // Group by date for display
  const grouped: Record<string, ExamEntry[]> = {};
  for (const exam of filtered) {
    if (!grouped[exam.exam_date]) grouped[exam.exam_date] = [];
    grouped[exam.exam_date].push(exam);
  }
  const sortedDates = Object.keys(grouped).sort();

  const gradeLabel = (id: number | null) => {
    if (id === null) return null;
    return grades.find((g) => g.id === id)?.label ?? `Grade ${id}`;
  };

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Exam timetable"
        sub="Schedule and view upcoming exams."
        action={
          canManage ? (
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="size-4 mr-1.5" /> Add exam
            </Button>
          ) : undefined
        }
      />

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search subject or venue…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={termFilter} onValueChange={setTermFilter}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All terms</SelectItem>
            {TERMS.map((t) => (
              <SelectItem key={t} value={String(t)}>Term {t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All grades" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="all">All grades</SelectItem>
            {grades.map((g) => (
              <SelectItem key={g.id} value={String(g.id)}>{g.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="text-sm text-muted-foreground py-10 text-center">Loading…</div>
      ) : sortedDates.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <CalendarDays className="size-8 mx-auto mb-2 opacity-40" />
          {exams.length === 0
            ? canManage
              ? "No exams scheduled yet. Click \"Add exam\" to get started."
              : "No exams scheduled yet."
            : "No exams match your filters."}
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="size-4 text-accent shrink-0" />
                <span className="text-sm font-semibold">{formatDate(date)}</span>
              </div>

              <Card className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Grade</th>
                      <th className="p-3">Time</th>
                      <th className="p-3">Venue</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[date].map((exam) => (
                      <tr key={exam.id} className="border-t align-middle">
                        <td className="p-3">
                          <div className="font-medium">{exam.subject}</div>
                          {exam.notes && (
                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1 italic">
                              {exam.notes}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          {gradeLabel(exam.grade_id) ? (
                            <Badge variant="secondary" className="text-xs">
                              {gradeLabel(exam.grade_id)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">All</span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                          {formatTime(exam.start_time) ? (
                            <span className="flex items-center gap-1">
                              <Clock className="size-3 shrink-0" />
                              {formatTime(exam.start_time)}
                              {formatTime(exam.end_time) && ` – ${formatTime(exam.end_time)}`}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {exam.venue ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3 shrink-0" />
                              {exam.venue}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {canManage && (
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={deleting === exam.id}
                              onClick={() => handleDelete(exam)}
                              title="Remove exam"
                            >
                              {deleting === exam.id
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
            </div>
          ))}
        </div>
      )}

      <AddExamDialog
        open={dialogOpen}
        grades={grades}
        onOpenChange={setDialogOpen}
        onSaved={load}
      />
    </div>
  );
}
