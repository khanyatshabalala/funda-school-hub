import { createFileRoute } from "@tanstack/react-router";
import { ParentDataList } from "@/components/funda/dashboards/SimplePage";
import { Badge } from "@/components/ui/badge";
export const Route = createFileRoute("/app/marks")({
  component: () => <ParentDataList title="Marks & reports" sub="All assessments for your children." table="marks"
    columns={[
      { key: "assessment_name", label: "Assessment" },
      { key: "term", label: "Term", format: (v) => `T${v}` },
      { key: "score", label: "Score", format: (v, r) => <span className="font-semibold">{v}/{r.max_score}</span> },
      { key: "class_average", label: "Class avg", format: (v) => v ?? "—" },
      { key: "score", label: "Result", format: (v, r) => {
        const pct = (Number(v)/Number(r.max_score))*100;
        return <Badge variant={pct >= 70 ? "default" : pct >= 50 ? "secondary" : "destructive"}>{pct.toFixed(0)}%</Badge>;
      }},
    ]} />,
});
