import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/funda/dashboards/SimplePage";

export const Route = createFileRoute("/app/marks-capture")({
  component: () => (
    <StubPage
      title="Report cards"
      sub="This feature is not available yet."
    />
  ),
});
