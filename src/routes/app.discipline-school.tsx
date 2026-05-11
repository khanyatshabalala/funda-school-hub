import { createFileRoute } from "@tanstack/react-router";
import { DisciplinePage } from "@/components/funda/dashboards/DisciplinePage";

export const Route = createFileRoute("/app/discipline-school")({
  component: DisciplinePage,
});
