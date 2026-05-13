import { createFileRoute } from "@tanstack/react-router";
import { AttendanceCapturePage } from "@/components/funda/dashboards/AttendanceCapturePage";

export const Route = createFileRoute("/app/attendance-capture")({
  component: AttendanceCapturePage,
});
