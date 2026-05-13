import { createFileRoute } from "@tanstack/react-router";
import { ReportCardUploadPage } from "@/components/funda/dashboards/ReportCardUploadPage";

export const Route = createFileRoute("/app/marks-capture")({
  component: ReportCardUploadPage,
});
