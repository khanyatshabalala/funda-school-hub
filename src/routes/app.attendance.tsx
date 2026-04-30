import { createFileRoute } from "@tanstack/react-router";
import { ParentDataList } from "@/components/funda/dashboards/SimplePage";
import { Badge } from "@/components/ui/badge";
export const Route = createFileRoute("/app/attendance")({
  component: () => <ParentDataList title="Attendance" sub="Daily attendance for your children." table="attendance"
    columns={[
      { key: "date", label: "Date" },
      { key: "status", label: "Status", format: (v) => <Badge variant={v==="present"?"default":v==="late"?"secondary":"destructive"} className="capitalize">{v}</Badge> },
      { key: "notes", label: "Notes", format: (v) => v ?? "—" },
    ]} />,
});
