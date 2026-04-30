import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/funda/dashboards/SimplePage";
export const Route = createFileRoute("/app/marks-capture")({
  component: () => <StubPage title="Marks capture" sub="Record assessment results." />,
});
