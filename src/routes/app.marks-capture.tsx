import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/funda/dashboards/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Upload, FileText, Trash2, Loader2, Search,
  ShieldAlert, CheckCircle2, AlertCircle,
} from "lucide-react";
import { friendlyDbError } from "@/lib/db-errors";

export const Route = createFileRoute("/app/marks-capture")({
  component: ReportCardUploadPage,
});

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1];
const TERMS = [1, 2, 3, 4];

type Learner = { id: string; first_name: string; last_name: string; grade_id: number; learner_number: string | null };
type ReportCard = {
  id: string;
  learner_id: string;
  academic_year: number;
  term: number;
  file_path: string;
  file_name: string;
  notes: string | null;
  uploaded_at: string;
  learners: { first_name: string; last_name: string; grade_id: number } | null;
};

function ReportCardUploadPage() {
  const { primaryRole, primarySchoolId, user } = useAuth();
  const canUpload = ["principal", "school_admin", "teacher", "super_admin"].includes(primaryRole);

  const [learners, setLearners]     = useState<Learner[]>([]);
  const [reports, setReports]       = useState<ReportCard[]>([]);
  const [search, setSearch]         = useState("");
  const [yearFilter, setYearFilter] = useState(String(CURRENT_YEAR));
  const [termFilter, setTermFilter] = useState("");
  const [loading, setLoading]       = useState(true);

  // Upload dialog
  const [uploadOpen, setUploadOpen]     = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [selectedLearner, setSelectedLearner] = useState("");
  const [selectedTerm, setSelectedTerm]       = useState("1");
  const [selectedYear, setSelectedYear]       = useState(String(CURRENT_YEAR));
  const [notes, setNotes]                     = useState("");
  const [file, setFile]                       = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Delete state
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    if (!primarySchoolId) return;
    setLoading(true);
    const [{ data: l }, { data: r }] = await Promise.all([
      supabase.from("learners")
        .select("id, first_name, last_name, grade_id, learner_number")
        .eq("school_id", primarySchoolId)
        .order("last_name"),
      (supabase as any)
        .from("report_cards")
        .select("id, learner_id, academic_year, term, file_path, file_name, notes, uploaded_at, learners(first_name, last_name, grade_id)")
        .eq("school_id", primarySchoolId)
        .order("uploaded_at", { ascending: false }),
    ]);
    setLearners((l ?? []) as Learner[]);
    setReports((r ?? []) as ReportCard[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [primarySchoolId]);

  const onUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file)             return toast.error("Select a PDF file");
    if (!selectedLearner)  return toast.error("Select a learner");
    if (!primarySchoolId)  return toast.error("No school assigned");

    // Validate file type
    if (file.type !== "application/pdf") return toast.error("Only PDF files are allowed");
    if (file.size > 10 * 1024 * 1024)    return toast.error("File must be under 10 MB");

    setUploading(true);

    const year = parseInt(selectedYear);
    const term = parseInt(selectedTerm);
    const filePath = `${primarySchoolId}/${selectedLearner}/${year}_T${term}.pdf`;

    // Upload to storage
    const { error: storageErr } = await supabase.storage
      .from("report-cards")
      .upload(filePath, file, { upsert: true, contentType: "application/pdf" });

    if (storageErr) {
      setUploading(false);
      return toast.error("Upload failed: " + storageErr.message);
    }

    // Save record to DB (upsert — replace if same learner/year/term)
    const { error: dbErr } = await (supabase as any)
      .from("report_cards")
      .upsert({
        learner_id:    selectedLearner,
        school_id:     primarySchoolId,
        academic_year: year,
        term,
        file_path:     filePath,
        file_name:     file.name,
        uploaded_by:   user?.id,
        notes:         notes.trim() || null,
      }, { onConflict: "learner_id,academic_year,term" });

    setUploading(false);

    if (dbErr) {
      // Clean up the uploaded file if DB insert failed
      await supabase.storage.from("report-cards").remove([filePath]);
      return toast.error(friendlyDbError(dbErr));
    }

    toast.success("Report card uploaded. Parent has been notified.");
    setUploadOpen(false);
    resetUploadForm();
    load();
  };

  const onDelete = async (report: ReportCard) => {
    setDeleting(report.id);

    // Delete from storage
    await supabase.storage.from("report-cards").remove([report.file_path]);

    // Delete DB record
    const { error } = await (supabase as any)
      .from("report_cards")
      .delete()
      .eq("id", report.id);

    setDeleting(null);
    if (error) return toast.error(friendlyDbError(error));
    toast.success("Report card deleted");
    load();
  };

  const resetUploadForm = () => {
    setSelectedLearner("");
    setSelectedTerm("1");
    setSelectedYear(String(CURRENT_YEAR));
    setNotes("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  // Filter reports
  const filtered = reports.filter(r => {
    if (yearFilter && r.academic_year !== parseInt(yearFilter)) return false;
    if (termFilter && r.term !== parseInt(termFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = `${r.learners?.first_name ?? ""} ${r.learners?.last_name ?? ""}`.toLowerCase();
      if (!name.includes(q)) return false;
    }
    return true;
  });

  // Learner search for upload dialog
  const filteredLearners = learners.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${l.first_name} ${l.last_name}`.toLowerCase().includes(q)
      || (l.learner_number ?? "").toLowerCase().includes(q);
  });

  if (!canUpload) {
    return (
      <div className="max-w-lg">
        <PageHeader title="Report cards" sub="Upload term report cards for learners." />
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <ShieldAlert className="size-8 mx-auto mb-2 opacity-40" />
          Only school staff can upload report cards.
        </Card>
      </div>
    );
  }

  if (!primarySchoolId) {
    return (
      <div className="max-w-lg">
        <PageHeader title="Report cards" sub="Upload term report cards for learners." />
        <Card className="p-10 text-center text-muted-foreground text-sm">
          No school assigned to your account.
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Report cards"
        sub="Upload PDF report cards per learner per term. Parents are notified automatically."
        action={
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="size-4 mr-1.5" /> Upload report card
          </Button>
        }
      />

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search learner…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All years</SelectItem>
            {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={termFilter} onValueChange={setTermFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All terms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All terms</SelectItem>
            {TERMS.map(t => <SelectItem key={t} value={String(t)}>Term {t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* ── Report cards list ── */}
      {loading ? (
        <div className="text-sm text-muted-foreground py-10 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <FileText className="size-8 mx-auto mb-2 opacity-40" />
          {reports.length === 0
            ? "No report cards uploaded yet. Click \"Upload report card\" to get started."
            : "No report cards match your filters."}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Learner</th>
                <th className="p-3">Grade</th>
                <th className="p-3">Period</th>
                <th className="p-3">File</th>
                <th className="p-3">Uploaded</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-t align-middle">
                  <td className="p-3 font-medium">
                    {r.learners?.first_name} {r.learners?.last_name}
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary">
                      Grade {r.learners?.grade_id === 0 ? "R" : r.learners?.grade_id ?? "—"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <span className="font-medium">Term {r.term}</span>
                    <span className="text-muted-foreground ml-1">{r.academic_year}</span>
                  </td>
                  <td className="p-3">
                    <span className="text-xs text-muted-foreground font-mono truncate max-w-[160px] block">
                      {r.file_name}
                    </span>
                    {r.notes && (
                      <span className="text-xs text-muted-foreground italic block mt-0.5">{r.notes}</span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {new Date(r.uploaded_at).toLocaleDateString("en-ZA", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={deleting === r.id}
                      onClick={() => onDelete(r)}
                      title="Delete report card"
                    >
                      {deleting === r.id
                        ? <Loader2 className="size-4 animate-spin" />
                        : <Trash2 className="size-4 text-destructive" />}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── Upload dialog ── */}
      <Dialog open={uploadOpen} onOpenChange={v => { setUploadOpen(v); if (!v) resetUploadForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload report card</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            PDF only · max 10 MB. If a report card already exists for this learner/term it will be replaced.
          </p>

          <form onSubmit={onUpload} className="space-y-4 mt-2">
            {/* Learner select */}
            <div>
              <Label>Learner</Label>
              <Select value={selectedLearner} onValueChange={setSelectedLearner}>
                <SelectTrigger>
                  <SelectValue placeholder={learners.length === 0 ? "No learners registered" : "Select learner"} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {learners.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.first_name} {l.last_name}
                      <span className="text-muted-foreground ml-2 text-xs">
                        Gr {l.grade_id === 0 ? "R" : l.grade_id}
                        {l.learner_number ? ` · ${l.learner_number}` : ""}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year + Term */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Academic year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Term</Label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TERMS.map(t => <SelectItem key={t} value={String(t)}>Term {t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* File picker */}
            <div>
              <Label>Report card PDF</Label>
              <div
                className={`mt-1 border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors
                  ${file ? "border-accent/60 bg-accent/5" : "border-border hover:border-accent/40 hover:bg-muted/30"}`}
                onClick={() => fileRef.current?.click()}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                    <span className="font-medium truncate max-w-[220px]">{file.name}</span>
                    <span className="text-muted-foreground text-xs shrink-0">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    <Upload className="size-5 mx-auto mb-1.5 opacity-50" />
                    Click to select a PDF
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
              {file && file.type !== "application/pdf" && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="size-3" /> Only PDF files are accepted
                </p>
              )}
            </div>

            {/* Optional note */}
            <div>
              <Label>
                Note <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Please note the school closed early in Term 2"
                rows={2}
                maxLength={500}
              />
            </div>

            <Button
              type="submit"
              disabled={uploading || !selectedLearner || !file}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {uploading
                ? <><Loader2 className="size-4 animate-spin mr-2" />Uploading…</>
                : <><Upload className="size-4 mr-2" />Upload report card</>}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
