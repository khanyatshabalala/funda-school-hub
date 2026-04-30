import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/funda/dashboards/SimplePage";
export const Route = createFileRoute("/app/discipline-school")({
  component: () => <StubPage title="Discipline" sub="Log incidents and merits." />,
});
