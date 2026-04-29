import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { ParentOverview } from "@/components/funda/dashboards/ParentOverview";
import { SchoolOverview } from "@/components/funda/dashboards/SchoolOverview";

export const Route = createFileRoute("/_app/")({
  component: () => {
    const { primaryRole } = useAuth();
    return primaryRole === "parent" ? <ParentOverview /> : <SchoolOverview />;
  },
});
