import { Card } from "@/components/ui/card";
import { PageHeader } from "./PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ShieldAlert } from "lucide-react";

// ── Parent-only guard wrapper ──────────────────────────────────────────────
function ParentOnly({ children }: { children: React.ReactNode }) {
  const { primaryRole, loading } = useAuth();
  if (loading) return null;
  if (primaryRole !== "parent") {
    return (
      <div className="max-w-lg">
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <ShieldAlert className="size-8 mx-auto mb-2 opacity-40" />
          This page is for parents only.
        </Card>
      </div>
    );
  }
  return <>{children}</>;
}

// ── ParentDataList ─────────────────────────────────────────────────────────
export function ParentDataList({
  title,
  sub,
  table,
  columns,
  parentField = "learner_id",
  orderBy = "created_at",
}: {
  title: string;
  sub: string;
  table: string;
  columns: { key: string; label: string; format?: (v: any, r: any) => any }[];
  parentField?: string;
  orderBy?: string;
}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: links } = await supabase
        .from("parent_links")
        .select("learner_id")
        .eq("parent_user_id", user.id);
      const ids = (links ?? []).map((l: any) => l.learner_id);
      if (!ids.length) return setRows([]);
      const { data } = await supabase
        .from(table as any)
        .select("*, learners(first_name,last_name)")
        .in(parentField, ids)
        .order(orderBy as any, { ascending: false } as any)
        .limit(100);
      setRows(data ?? []);
    })();
  }, [user, table, parentField, orderBy]);

  return (
    <ParentOnly>
      <div className="max-w-6xl">
        <PageHeader title={title} sub={sub} />
        <Card className="overflow-hidden">
          {rows.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">No records yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Learner</th>
                  {columns.map((c) => (
                    <th key={c.key + c.label} className="p-3">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-medium">
                      {r.learners?.first_name} {r.learners?.last_name}
                    </td>
                    {columns.map((c) => (
                      <td key={c.key + c.label} className="p-3">
                        {c.format ? c.format(r[c.key], r) : r[c.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </ParentOnly>
  );
}

// ── StubPage ───────────────────────────────────────────────────────────────
export function StubPage({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="max-w-3xl">
      <PageHeader title={title} sub={sub} />
      <Card className="p-10 text-center text-muted-foreground text-sm">
        This area is coming in the next release.
      </Card>
    </div>
  );
}
