import { createFileRoute } from "@tanstack/react-router";
import { ParentDataList } from "@/components/funda/dashboards/SimplePage";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/attendance")({
  component: () => <ParentDataList
    title="Attendance"
    sub="Daily attendance for your children."
    table="attendance"
    orderBy="date"
    columns={[
      {
        key: "date", label: "Date",
        format: (v) => v ? new Date(v + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—",
      },
      {
        key: "status", label: "Status",
        format: (v) => (
          <Badge
            variant={v === "present" ? "default" : v === "late" ? "secondary" : "destructive"}
            className="capitalize"
          >
            {v}
          </Badge>
        ),
      },
      { key: "notes", label: "Notes", format: (v) => v ?? "—" },
    ]}
  />,
});
