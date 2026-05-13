import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/funda/dashboards/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Search, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type AuditRow = {
  id: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor_user_id: string | null;
  actor_name: string | null;
};

const ACTION_COLORS: Record<string, string> = {
  create:  "text-green-600 bg-green-500/10",
  insert:  "text-green-600 bg-green-500/10",
  update:  "text-blue-500 bg-blue-500/10",
  delete:  "text-red-500 bg-red-500/10",
  approve: "text-green-600 bg-green-500/10",
  reject:  "text-red-500 bg-red-500/10",
  login:   "text-purple-500 bg-purple-500/10",
  default: "text-muted-foreground bg-muted",
};

function actionColor(action: string) {
  const key = Object.keys(ACTION_COLORS).find(k => action.toLowerCase().includes(k));
  return key ? ACTION_COLORS[key] : ACTION_COLORS.default;
}

const PAGE_SIZE = 25;

export function AuditLogPage() {
  const { primaryRole, primarySchoolId } = useAuth();
  const canView = ["principal", "school_admin", "super_admin"].includes(primaryRole);

  const [rows, setRows]       = useState<AuditRow[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(0);
  const [search, setSearch]   = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [entities, setEntities] = useState<string[]>([]);

  const load = async (p = 0) => {
    if (!primarySchoolId) { setLoading(false); return; }
    setLoading(true);

    let q = supabase
      .from("audit_log")
      .select("id, action, entity, entity_id, metadata, created_at, actor_user_id", { count: "exact" })
      .eq("school_id", primarySchoolId)
      .order("created_at", { ascending: false })
      .range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1);

    if (entityFilter !== "all") q = q.eq("entity", entityFilter);
    if (search.trim()) q = q.ilike("action", `%${search.trim()}%`);

    const { data, count } = await q;
    const auditRows = (data ?? []) as Omit<AuditRow, "actor_name">[];

    // Enrich with actor names
    const actorIds = [...new Set(auditRows.map(r => r.actor_user_id).filter(Boolean))] as string[];
    let nameMap: Record<string, string> = {};
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", actorIds);
      nameMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.full_name ?? "Unknown"]));
    }

    setRows(auditRows.map(r => ({ ...r, actor_name: r.actor_user_id ? (nameMap[r.actor_user_id] ?? "Unknown") : null })));
    setTotal(count ?? 0);
    setLoading(false);
  };

  // Load distinct entities for filter
  useEffect(() => {
    if (!primarySchoolId) return;
    supabase
      .from("audit_log")
      .select("entity")
      .eq("school_id", primarySchoolId)
      .not("entity", "is", null)
      .then(({ data }) => {
        const unique = [...new Set((data ?? []).map((r: any) => r.entity).filter(Boolean))].sort();
        setEntities(unique as string[]);
      });
  }, [primarySchoolId]);

  useEffect(() => { setPage(0); load(0); }, [search, entityFilter, primarySchoolId]);

  const goPage = (p: number) => { setPage(p); load(p); };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (!canView) {
    return (
      <div className="max-w-lg">
        <PageHeader title="Audit log" sub="Compliance trail of all actions." />
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <ShieldAlert className="size-8 mx-auto mb-2 opacity-40" />
          Only principals and school admins can view the audit log.
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Audit log"
        sub={`Compliance trail · ${total.toLocaleString()} event${total !== 1 ? "s" : ""}`}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search action…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            {entities.map(e => (
              <SelectItem key={e} value={e} className="capitalize">{e.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-10 text-center">Loading…</div>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <FileText className="size-8 mx-auto mb-2 opacity-40" />
          {total === 0 ? "No audit events recorded yet." : "No events match your filters."}
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Details</th>
                  <th className="p-3 whitespace-nowrap">Date & time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-3">
                      <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${actionColor(r.action)}`}>
                        {r.action}
                      </span>
                    </td>
                    <td className="p-3">
                      {r.entity ? (
                        <Badge variant="outline" className="text-xs capitalize">
                          {r.entity.replace(/_/g, " ")}
                        </Badge>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {r.actor_name ?? "System"}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs max-w-[220px]">
                      {r.metadata
                        ? <span className="font-mono text-[10px] line-clamp-2 break-all">{JSON.stringify(r.metadata)}</span>
                        : r.entity_id
                        ? <span className="font-mono text-[10px] text-muted-foreground/60">{r.entity_id}</span>
                        : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("en-ZA", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>
                Page {page + 1} of {totalPages} · {total.toLocaleString()} events
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm" variant="outline"
                  disabled={page === 0}
                  onClick={() => goPage(page - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  size="sm" variant="outline"
                  disabled={page >= totalPages - 1}
                  onClick={() => goPage(page + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}