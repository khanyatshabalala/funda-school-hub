import { createFileRoute } from "@tanstack/react-router";
import { ParentDataList } from "@/components/funda/dashboards/SimplePage";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/discipline")({
  component: () => <ParentDataList
    title="Discipline"
    sub="Merits, warnings and detentions."
    table="discipline_records"
    orderBy="date"
    columns={[
      {
        key: "date", label: "Date",
        format: (v) => v ? new Date(v + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—",
      },
      {
        key: "type", label: "Type",
        format: (v) => (
          <Badge
            variant={v === "merit" ? "default" : v === "warning" ? "secondary" : "destructive"}
            className="capitalize"
          >
            {v}
          </Badge>
        ),
      },
      { key: "title", label: "Title" },
      { key: "points", label: "Points", format: (v) => v ?? "—" },
    ]}
  />,
});
