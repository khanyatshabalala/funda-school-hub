import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/funda/dashboards/SimplePage";
export const Route = createFileRoute("/app/learners")({
  component: () => <StubPage title="Learners" sub="Manage learners at your school." />,
});
