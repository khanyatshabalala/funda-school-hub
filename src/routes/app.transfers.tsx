import { createFileRoute } from "@tanstack/react-router";
import { TransfersPage } from "@/components/funda/dashboards/TransfersPage";

export const Route = createFileRoute("/app/transfers")({
  component: TransfersPage,
});
