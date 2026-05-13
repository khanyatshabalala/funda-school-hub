import { createFileRoute } from "@tanstack/react-router";
import { AuditLogPage } from "@/components/funda/dashboards/AuditLogPage";

export const Route = createFileRoute("/app/audit")({
  component: AuditLogPage,
});
