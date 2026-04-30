import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/funda/dashboards/PageHeader";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/app/alerts")({
  component: () => {
    const { user } = useAuth();
    const [items, setItems] = useState<any[]>([]);
    useEffect(() => { if (user) supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at",{ascending:false}).limit(50).then(({data})=>setItems(data ?? [])); }, [user]);
    return (
      <div className="max-w-3xl">
        <PageHeader title="Alerts" sub="Safety alerts are always free." />
        {items.length === 0 ? <Card className="p-10 text-center text-muted-foreground text-sm">No alerts. You're all caught up.</Card> :
        <div className="space-y-2">{items.map((n:any) => (
          <Card key={n.id} className={`p-4 flex items-start gap-3 ${!n.read_at && "border-accent/50"}`}>
            <div className="size-9 rounded-lg bg-accent/15 text-accent grid place-items-center shrink-0"><Bell className="size-4"/></div>
            <div className="flex-1"><div className="font-medium text-sm">{n.title}</div><div className="text-xs text-muted-foreground mt-0.5">{n.body}</div><div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div></div>
          </Card>))}</div>}
      </div>
    );
  },
});
