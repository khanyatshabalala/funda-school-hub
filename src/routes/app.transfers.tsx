import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/funda/dashboards/SimplePage";
export const Route = createFileRoute("/app/transfers")({
  component: () => <StubPage title="Transfers" sub="Process learner transfer requests." />,
});
