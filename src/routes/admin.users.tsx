import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Loader2, Trash2, Users, Eye, EyeOff, Copy, Check } from "lucide-react";

import { friendlyDbError, friendlyEdgeError } from "@/lib/db-errors";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
});

type Profile = { id: string; full_name: string | null; phone: string | null; created_at: string };
type RoleRow = { id: string; user_id: string; role: string; school_id: string | null; schools?: { name: string } | null };
type School = { id: string; name: string };

// Roles the super_admin can create via this page
const CREATABLE_ROLES = ["principal", "school_admin"] as const;

const createSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  role: z.enum(CREATABLE_ROLES),
  school_id: z.string().uuid("Pick a school"),
});

function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [search, setSearch] = useState("");

  // Create account dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [role, setRole] = useState<string>("principal");
  const [schoolId, setSchoolId] = useState<string>("");
  const [pwValue, setPwValue] = useState("");

  const load = async () => {
    const [{ data: p }, { data: r }, { data: s }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("id, user_id, role, school_id, schools(name)"),
      supabase.from("schools").select("id, name").order("name"),
    ]);
    setProfiles((p ?? []) as Profile[]);
    setRoles((r ?? []) as any);
    setSchools((s ?? []) as School[]);
  };

  useEffect(() => { load(); }, []);

  const onCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = createSchema.safeParse({
      full_name: fd.get("full_name"),
      email: fd.get("email"),
      password: fd.get("password"),
      role,
      school_id: schoolId,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-staff-account`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(parsed.data),
      },
    );
    setSaving(false);

    const json = await res.json();
    if (!res.ok) return toast.error(friendlyEdgeError(json.error));

    toast.success(`Account created for ${parsed.data.full_name}. Share the temporary password with them.`);
    setCreateOpen(false);
    setRole("principal");
    setSchoolId("");
    setPwValue("");
    load();
  };

  const onRevoke = async (id: string) => {
    if (!confirm("Revoke this role?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) return toast.error(friendlyDbError(error));
    toast.success("Role revoked");
    load();
  };

  const copyPassword = () => {
    if (!pwValue) return;
    navigator.clipboard.writeText(pwValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = profiles.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.full_name ?? "").toLowerCase().includes(q) || p.id.includes(q);
  });

  const rolesByUser = roles.reduce<Record<string, RoleRow[]>>((acc, r) => {
    (acc[r.user_id] ??= []).push(r);
    return acc;
  }, {});

  // Only show staff accounts (non-parent) in this view — parents are managed separately
  const staffProfiles = filtered.filter((p) => {
    const userRoles = rolesByUser[p.id] ?? [];
    return userRoles.some((r) => r.role !== "parent");
  });

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">School accounts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create principal and school admin accounts. They can then add their own staff.
          </p>
        </div>
        <Button
          className="bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={() => setCreateOpen(true)}
        >
          <UserPlus className="size-4 mr-1.5" /> Create account
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {staffProfiles.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <Users className="size-8 mx-auto mb-2 opacity-50" />
          No school accounts yet. Create the first principal or school admin above.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Roles & schools</th>
                <th className="p-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {staffProfiles.map((p) => {
                const userRoles = (rolesByUser[p.id] ?? []).filter((r) => r.role !== "parent");
                return (
                  <tr key={p.id} className="border-t align-top">
                    <td className="p-3">
                      <div className="font-medium">{p.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{p.id.slice(0, 8)}…</div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {userRoles.map((r) => (
                          <div
                            key={r.id}
                            className="inline-flex items-center gap-1 bg-muted rounded-md pl-2 pr-1 py-0.5 text-xs"
                          >
                            <Badge variant="outline" className="capitalize border-0 bg-transparent px-0">
                              {r.role.replace("_", " ")}
                            </Badge>
                            {r.schools?.name && (
                              <span className="text-muted-foreground">@ {r.schools.name}</span>
                            )}
                            <button
                              onClick={() => onRevoke(r.id)}
                              className="hover:text-destructive ml-1"
                              title="Revoke role"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-right text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("en-ZA")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── Create account dialog ── */}
      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) { setRole("principal"); setSchoolId(""); setPwValue(""); setShowPw(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create school account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Creates a login for a principal or school admin. Share the temporary password with them — they can change it after signing in.
          </p>
          <form onSubmit={onCreateAccount} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="ca-name">Full name</Label>
              <Input id="ca-name" name="full_name" required placeholder="e.g. Thabo Nkosi" />
            </div>
            <div>
              <Label htmlFor="ca-email">Work email</Label>
              <Input id="ca-email" name="email" type="email" required placeholder="principal@school.co.za" />
            </div>
            <div>
              <Label htmlFor="ca-pw">Temporary password</Label>
              <div className="relative">
                <Input
                  id="ca-pw"
                  name="password"
                  type={showPw ? "text" : "password"}
                  required
                  minLength={6}
                  value={pwValue}
                  onChange={(e) => setPwValue(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="pr-20"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => setShowPw((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={copyPassword}
                    tabIndex={-1}
                    title="Copy password"
                  >
                    {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="principal">Principal</SelectItem>
                  <SelectItem value="school_admin">School Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>School</Label>
              <Select value={schoolId} onValueChange={setSchoolId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a school" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={saving}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {saving && <Loader2 className="size-4 animate-spin mr-2" />}
              Create account
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
