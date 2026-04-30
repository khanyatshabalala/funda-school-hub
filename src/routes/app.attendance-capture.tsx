import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/funda/dashboards/SimplePage";
export const Route = createFileRoute("/app/attendance-capture")({
  component: () => <StubPage title="Attendance capture" sub="Daily roll call." />,
});
