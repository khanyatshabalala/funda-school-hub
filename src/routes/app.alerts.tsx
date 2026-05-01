import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/funda/dashboards/PageHeader";
import {
  Bell, CalendarDays, BookOpen, ClipboardList,
  Shield, AlertTriangle, CheckCheck,
} from "lucide-react";

export const Route = createFileRoute("/app/alerts")({
  component: AlertsPage,
});

type Notification = {
  id: string;
  title: string;
  body: string | null;
  category: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

// Icon + colour per category
function CategoryIcon({ category }: { category: string | null }) {
  switch (category) {
    case "calendar":
      return <div className="size-9 rounded-lg bg-blue-500/15 text-blue-500 grid place-items-center shrink-0"><CalendarDays className="size-4" /></div>;
    case "marks":
      return <div className="size-9 rounded-lg bg-green-500/15 text-green-600 grid place-items-center shrink-0"><BookOpen className="size-4" /></div>;
    case "attendance":
      return <div className="size-9 rounded-lg bg-orange-500/15 text-orange-500 grid place-items-center shrink-0"><ClipboardList className="size-4" /></div>;
    case "discipline":
      return <div className="size-9 rounded-lg bg-red-500/15 text-red-500 grid place-items-center shrink-0"><Shield className="size-4" /></div>;
    case "safety":
      return <div className="size-9 rounded-lg bg-red-600/15 text-red-600 grid place-items-center shrink-0"><AlertTriangle className="size-4" /></div>;
    default:
      return <div className="size-9 rounded-lg bg-accent/15 text-accent grid place-items-center shrink-0"><Bell className="size-4" /></div>;
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

function AlertsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(60);
    setItems((data ?? []) as Notification[]);
  }, [user]);

  useEffect(() => {
    load();

    // Real-time: new notifications arrive instantly
    if (!user) return;
    const channel = supabase
      .channel("alerts-" + user.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  const markRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    setItems(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  };

  const markAllRead = async () => {
    const unread = items.filter(n => !n.read_at).map(n => n.id);
    if (!unread.length) return;
    setMarkingAll(true);
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unread);
    setMarkingAll(false);
    setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  };

  const unreadCount = items.filter(n => !n.read_at).length;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Notifications"
        sub="Stay up to date with your children's school activity."
        action={
          unreadCount > 0 ? (
            <Button
              size="sm"
              variant="outline"
              onClick={markAllRead}
              disabled={markingAll}
              className="gap-1.5"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {unreadCount > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Badge className="bg-accent text-accent-foreground">{unreadCount} unread</Badge>
        </div>
      )}

      {items.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <Bell className="size-8 mx-auto mb-2 opacity-40" />
          No alerts yet. You're all caught up.
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card
              key={n.id}
              onClick={() => !n.read_at && markRead(n.id)}
              className={`p-4 flex items-start gap-3 transition-colors cursor-pointer
                ${!n.read_at
                  ? "border-accent/40 bg-accent/5 hover:bg-accent/10"
                  : "hover:bg-muted/40"
                }`}
            >
              <CategoryIcon category={n.category} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-sm leading-snug ${!n.read_at ? "font-semibold" : "font-medium"}`}>
                    {n.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                    {timeAgo(n.created_at)}
                  </span>
                </div>
                {n.body && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {n.body}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  {n.category && (
                    <Badge variant="secondary" className="capitalize text-[10px] px-1.5 py-0">
                      {n.category}
                    </Badge>
                  )}
                  {!n.read_at && (
                    <span className="size-1.5 rounded-full bg-accent inline-block" />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
