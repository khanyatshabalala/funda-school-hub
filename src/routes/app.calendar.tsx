import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/funda/dashboards/PageHeader";
import { CalendarDays } from "lucide-react";

export const Route = createFileRoute("/app/calendar")({
  component: () => {
    const [events, setEvents] = useState<any[]>([]);
    useEffect(() => { supabase.from("calendar_events").select("*, schools(name)").gte("event_date", new Date().toISOString().slice(0,10)).order("event_date").limit(50).then(({data}) => setEvents(data ?? [])); }, []);
    return (
      <div className="max-w-4xl">
        <PageHeader title="Calendar" sub="Upcoming school events." />
        {events.length === 0 ? <Card className="p-10 text-center text-muted-foreground text-sm">No upcoming events.</Card> :
        <div className="space-y-3">{events.map((e:any) => (
          <Card key={e.id} className="p-4 flex items-start gap-4">
            <div className="size-10 rounded-lg bg-accent/15 text-accent grid place-items-center"><CalendarDays className="size-5"/></div>
            <div className="flex-1"><div className="font-semibold">{e.title}</div><div className="text-xs text-muted-foreground">{e.event_date} · {e.schools?.name}</div>{e.description && <p className="text-sm mt-1">{e.description}</p>}</div>
          </Card>))}</div>}
      </div>
    );
  },
});
