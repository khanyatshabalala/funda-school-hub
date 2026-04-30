import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/funda/dashboards/SimplePage";
export const Route = createFileRoute("/app/audit")({
  component: () => <StubPage title="Audit log" sub="Compliance trail of all actions." />,
});
