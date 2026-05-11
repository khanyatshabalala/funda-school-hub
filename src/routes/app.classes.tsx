import { createFileRoute } from "@tanstack/react-router";
import { ExamTimetablePage } from "@/components/funda/dashboards/ExamTimetablePage";

export const Route = createFileRoute("/app/classes")({
  component: ExamTimetablePage,
});
