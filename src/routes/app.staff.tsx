import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/funda/dashboards/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Loader2, Trash2, Users, Eye, EyeOff, Copy, Check, ShieldAlert } from "lucide-react";

import { friendlyDbError, friendlyEdgeError } from "@/lib/db-errors";

export const Route = createFileRoute("/app/staff")({
  component: StaffPage,
});

type StaffMember = {
  id: string;
  full_name: string | null;
  created_at: string;
  roles: { id: string; role: string }[];
};

// Roles a principal/school_admin can create for their school
const CREATABLE_ROLES = ["teacher", "school_admin"] as const;

const createSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  role: z.enum(CREATABLE_ROLES),
});

function StaffPage() {
  const { primaryRole, primarySchoolId, user } = useAuth();
  const canManage = primaryRole === "principal" || primaryRole === "school_admin" || primaryRole === "super_admin";

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [schoolName, setSchoolName] = useState("");
  const [loading, setLoading] = useState(true);

  // Remove role dialog state
  const [removeOpen, setRemoveOpen]   = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ roleId: string; name: string | null } | null>(null);
  const [removing, setRemoving]       = useState(false);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [role, setRole] = useState<string>("teacher");
  const [pwValue, setPwValue] = useState("");

  const load = async () => {
    if (!primarySchoolId) return;
    setLoading(true);

    // Get all non-parent roles for this school
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("id, user_id, role")
      .eq("school_id", primarySchoolId)
      .neq("role", "parent");

    if (!roleRows?.length) { setStaff([]); setLoading(false); return; }

    const userIds = [...new Set(roleRows.map((r) => r.user_id))];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .in("id", userIds);

    const rolesByUser = roleRows.reduce<Record<string, { id: string; role: string }[]>>((acc, r) => {
      (acc[r.user_id] ??= []).push({ id: r.id, role: r.role });
      return acc;
    }, {});

    const members: StaffMember[] = (profiles ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      created_at: p.created_at,
      roles: rolesByUser[p.id] ?? [],
    }));

    // Don't show the current user in the list
    setStaff(members.filter((m) => m.id !== user?.id));
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (primarySchoolId) {
      supabase.from("schools").select("name").eq("id", primarySchoolId).maybeSingle()
        .then(({ data }) => setSchoolName(data?.name ?? ""));
    }
  }, [primarySchoolId]);

  const onCreateStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = createSchema.safeParse({
      full_name: fd.get("full_name"),
      email: fd.get("email"),
      password: fd.get("password"),
      role,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!primarySchoolId) return toast.error("No school assigned to your account");

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
        body: JSON.stringify({ ...parsed.data, school_id: primarySchoolId }),
      },
    );
    setSaving(false);

    const json = await res.json();
    if (!res.ok) return toast.error(friendlyEdgeError(json.error));

    toast.success(`Account created for ${parsed.data.full_name}. Share the temporary password with them.`);
    setCreateOpen(false);
    setRole("teacher");
    setPwValue("");
    setShowPw(false);
    load();
  };

  const onRemoveRole = (roleId: string, memberName: string | null) => {
    setRemoveTarget({ roleId, name: memberName });
    setRemoveOpen(true);
  };

  const onRemoveConfirm = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    const { error } = await supabase.from("user_roles").delete().eq("id", removeTarget.roleId);
    setRemoving(false);
    setRemoveOpen(false);
    setRemoveTarget(null);
    if (error) return toast.error(friendlyDbError(error));
    toast.success("Role removed. The account still exists but this person can no longer access this school.");
    load();
  };

  const copyPassword = () => {
    if (!pwValue) return;
    navigator.clipboard.writeText(pwValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetDialog = () => {
    setRole("teacher");
    setPwValue("");
    setShowPw(false);
    setCopied(false);
  };

  if (!canManage) {
    return (
      <div className="max-w-lg">
        <PageHeader title="Staff" sub="Manage your school's staff accounts." />
        <Card className="p-8 text-center text-muted-foreground text-sm">
          <ShieldAlert className="size-8 mx-auto mb-2 opacity-40" />
          Only principals and school admins can manage staff.
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Staff"
        sub={schoolName ? `Managing staff at ${schoolName}` : "Manage your school's staff accounts."}
        action={
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => setCreateOpen(true)}
          >
            <UserPlus className="size-4 mr-1.5" /> Add staff member
          </Button>
        }
      />

      <Card className="p-4 mb-6 bg-muted/40 border-border/60 text-sm text-muted-foreground">
        Staff members sign in at <span className="font-medium text-foreground">/school/auth</span> using the email and temporary password you set. They can change their password after signing in.
      </Card>

      {loading ? (
        <div className="text-sm text-muted-foreground py-10 text-center">Loading…</div>
      ) : staff.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <Users className="size-8 mx-auto mb-2 opacity-50" />
          No staff added yet. Click "Add staff member" to get started.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Role</th>
                <th className="p-3">Added</th>
                <th className="p-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((m) => (
                <tr key={m.id} className="border-t align-middle">
                  <td className="p-3 font-medium">{m.full_name ?? "—"}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {m.roles.map((r) => (
                        <Badge key={r.id} variant="secondary" className="capitalize">
                          {r.role.replace("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {new Date(m.created_at).toLocaleDateString("en-ZA")}
                  </td>
                  <td className="p-3 text-right">
                    {m.roles.map((r) => (
                      <Button
                        key={r.id}
                        size="icon"
                        variant="ghost"
                        onClick={() => onRemoveRole(r.id, m.full_name)}
                        title="Remove role"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── Create staff dialog ── */}
      <Dialog
        open={createOpen}
        onOpenChange={(v) => { setCreateOpen(v); if (!v) resetDialog(); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add staff member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Creates a login for a teacher or school admin at <span className="font-medium text-foreground">{schoolName}</span>. Share the temporary password with them directly.
          </p>
          <form onSubmit={onCreateStaff} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="sf-name">Full name</Label>
              <Input id="sf-name" name="full_name" required placeholder="e.g. Nomsa Dlamini" />
            </div>
            <div>
              <Label htmlFor="sf-email">Work email</Label>
              <Input id="sf-email" name="email" type="email" required placeholder="teacher@school.co.za" />
            </div>
            <div>
              <Label htmlFor="sf-pw">Temporary password</Label>
              <div className="relative">
                <Input
                  id="sf-pw"
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
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="school_admin">School Admin</SelectItem>
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

      {/* ── Remove role confirmation dialog ── */}
      <Dialog open={removeOpen} onOpenChange={(v) => { setRemoveOpen(v); if (!v) setRemoveTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove staff member?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove <span className="font-medium text-foreground">{removeTarget?.name ?? "this person"}</span>'s access to your school. Their account will still exist — they just won't be able to sign in to this school anymore.
          </p>
          <div className="flex gap-2 mt-2">
            <Button
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={onRemoveConfirm}
              disabled={removing}
            >
              {removing ? <Loader2 className="size-4 animate-spin mr-2" /> : <Trash2 className="size-4 mr-2" />}
              Remove access
            </Button>
            <Button variant="outline" onClick={() => setRemoveOpen(false)} disabled={removing}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
