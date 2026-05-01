import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/funda/dashboards/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, FileText, Download, Loader2, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/app/marks")({
  component: ReportCardsPage,
});

const CURRENT_YEAR = new Date().getFullYear();

type ReportCard = {
  id: string;
  learner_id: string;
  academic_year: number;
  term: number;
  file_path: string;
  file_name: string;
  notes: string | null;
  uploaded_at: string;
  learners: {
    first_name: string;
    last_name: string;
    grade_id: number;
    schools: { name: string } | null;
  } | null;
};

function ReportCardsPage() {
  const { user, primaryRole } = useAuth();
  const isParent = primaryRole === "parent";

  const [reports, setReports]       = useState<ReportCard[]>([]);
  const [loading, setLoading]       = useState(true);
  const [yearFilter, setYearFilter] = useState(String(CURRENT_YEAR));
  const [termFilter, setTermFilter] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isParent) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      // Get all learners this parent is linked to
      const { data: links } = await supabase
        .from("parent_links")
        .select("learner_id")
        .eq("parent_user_id", user.id);

      const learnerIds = (links ?? []).map(l => l.learner_id);
      if (!learnerIds.length) { setReports([]); setLoading(false); return; }

      const { data } = await (supabase as any)
        .from("report_cards")
        .select("id, learner_id, academic_year, term, file_path, file_name, notes, uploaded_at, learners(first_name, last_name, grade_id, schools(name))")
        .in("learner_id", learnerIds)
        .order("academic_year", { ascending: false })
        .order("term", { ascending: false });

      setReports((data ?? []) as ReportCard[]);
      setLoading(false);
    })();
  }, [user, isParent]);

  const onDownload = async (report: ReportCard) => {
    setDownloading(report.id);
    // Generate a signed URL valid for 60 seconds
    const { data, error } = await supabase.storage
      .from("report-cards")
      .createSignedUrl(report.file_path, 60);

    setDownloading(null);

    if (error || !data?.signedUrl) {
      return;
    }

    // Open in new tab — browser will either display or download the PDF
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  if (!isParent) {
    return (
      <div className="max-w-lg">
        <PageHeader title="Report cards" sub="View your children's term report cards." />
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <ShieldAlert className="size-8 mx-auto mb-2 opacity-40" />
          This page is for parents only.
        </Card>
      </div>
    );
  }

  // Filter
  const filtered = reports.filter(r => {
    if (yearFilter && r.academic_year !== parseInt(yearFilter)) return false;
    if (termFilter && r.term !== parseInt(termFilter)) return false;
    return true;
  });

  // Group by learner for a cleaner layout
  const grouped = filtered.reduce<Record<string, { learner: ReportCard["learners"]; cards: ReportCard[] }>>((acc, r) => {
    if (!acc[r.learner_id]) acc[r.learner_id] = { learner: r.learners, cards: [] };
    acc[r.learner_id].cards.push(r);
    return acc;
  }, {});

  // Available years from data
  const years = [...new Set(reports.map(r => r.academic_year))].sort((a, b) => b - a);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Report cards"
        sub="Your children's term report cards, uploaded by the school."
      />

      {/* ── Filters ── */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All years</SelectItem>
            {(years.length ? years : [CURRENT_YEAR]).map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={termFilter} onValueChange={setTermFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All terms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All terms</SelectItem>
            {[1, 2, 3, 4].map(t => (
              <SelectItem key={t} value={String(t)}>Term {t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-10 text-center">Loading…</div>
      ) : reports.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <FileText className="size-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-foreground mb-1">No report cards yet</p>
          <p>Your school will upload report cards here at the end of each term.</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          No report cards match your filters.
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([learnerId, { learner, cards }]) => (
            <div key={learnerId}>
              {/* Learner header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="size-8 rounded-full bg-accent/15 text-accent grid place-items-center shrink-0">
                  <GraduationCap className="size-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">
                    {learner?.first_name} {learner?.last_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {learner?.schools?.name} · Grade {learner?.grade_id === 0 ? "R" : learner?.grade_id}
                  </div>
                </div>
              </div>

              {/* Report cards grid */}
              <div className="grid sm:grid-cols-2 gap-3">
                {cards.map(card => (
                  <Card key={card.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="size-10 rounded-lg bg-muted grid place-items-center shrink-0">
                        <FileText className="size-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                          Term {card.term}
                          <Badge variant="secondary" className="text-[10px]">{card.academic_year}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {card.file_name}
                        </div>
                        {card.notes && (
                          <div className="text-xs text-muted-foreground italic mt-1 line-clamp-2">
                            {card.notes}
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground mt-1">
                          Uploaded {new Date(card.uploaded_at).toLocaleDateString("en-ZA", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1.5"
                      disabled={downloading === card.id}
                      onClick={() => onDownload(card)}
                    >
                      {downloading === card.id
                        ? <Loader2 className="size-3.5 animate-spin" />
                        : <Download className="size-3.5" />}
                      View
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
