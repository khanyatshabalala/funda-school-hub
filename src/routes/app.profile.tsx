import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/funda/dashboards/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Pencil, X } from "lucide-react";
import { friendlyDbError } from "@/lib/db-errors";
import { friendlyAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile & settings · PASA" }] }),
});

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    new_password: z.string().min(6, "New password must be at least 6 characters").max(72),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

function ProfilePage() {
  const { user, profile, primaryRole, refresh } = useAuth();

  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const onSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = profileSchema.safeParse({
      full_name: fd.get("full_name"),
      phone: fd.get("phone") || "",
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: parsed.data.full_name, phone: parsed.data.phone || null })
      .eq("id", user!.id);
    setSavingProfile(false);

    if (error) return toast.error(friendlyDbError(error));
    await refresh();
    setEditingProfile(false);
    toast.success("Profile updated");
  };

  const onChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = passwordSchema.safeParse({
      current_password: fd.get("current_password"),
      new_password: fd.get("new_password"),
      confirm_password: fd.get("confirm_password"),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setSavingPassword(true);

    // Verify current password by re-authenticating
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: parsed.data.current_password,
    });
    if (signInErr) {
      setSavingPassword(false);
      return toast.error("Current password is incorrect");
    }

    const { error: updateErr } = await supabase.auth.updateUser({
      password: parsed.data.new_password,
    });
    setSavingPassword(false);

    if (updateErr) return toast.error(friendlyAuthError(updateErr));

    toast.success("Password changed successfully");
    setEditingPassword(false);
  };

  const roleLabel = primaryRole.replace(/_/g, " ");

  return (
    <div className="max-w-2xl">
      <PageHeader title="Profile & settings" sub="Manage your account details and password." />

      {/* ── Personal details card ── */}
      <Card className="p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Personal details</h2>
          {!editingProfile && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditingProfile(true)}
            >
              <Pencil className="size-3.5 mr-1.5" /> Edit
            </Button>
          )}
        </div>

        {editingProfile ? (
          <form onSubmit={onSaveProfile} className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile?.full_name ?? ""}
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="phone">
                Phone number <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={profile?.phone ?? ""}
                placeholder="+27 82 000 0000"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                disabled={savingProfile}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {savingProfile && <Loader2 className="size-4 animate-spin mr-2" />}
                Save changes
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingProfile(false)}
                disabled={savingProfile}
              >
                <X className="size-4 mr-1" /> Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 text-sm">
            <Row label="Name" value={profile?.full_name ?? "—"} />
            <Separator />
            <Row label="Email" value={user?.email ?? "—"} />
            <Separator />
            <Row label="Phone" value={profile?.phone ?? "—"} />
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Role</span>
              <Badge variant="secondary" className="capitalize">{roleLabel}</Badge>
            </div>
          </div>
        )}
      </Card>

      {/* ── Password card ── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">Password</h2>
            {!editingPassword && (
              <p className="text-sm text-muted-foreground mt-0.5">••••••••</p>
            )}
          </div>
          {!editingPassword && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditingPassword(true)}
            >
              <Pencil className="size-3.5 mr-1.5" /> Change password
            </Button>
          )}
        </div>

        {editingPassword && (
          <form onSubmit={onChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="current_password">Current password</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  name="current_password"
                  type={showCurrent ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  autoFocus
                  className="pr-10"
                />
                <ToggleVisibility show={showCurrent} onToggle={() => setShowCurrent(v => !v)} />
              </div>
            </div>
            <div>
              <Label htmlFor="new_password">New password</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  name="new_password"
                  type={showNew ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <ToggleVisibility show={showNew} onToggle={() => setShowNew(v => !v)} />
              </div>
            </div>
            <div>
              <Label htmlFor="confirm_password">Confirm new password</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirm ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  className="pr-10"
                />
                <ToggleVisibility show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                disabled={savingPassword}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {savingPassword && <Loader2 className="size-4 animate-spin mr-2" />}
                Update password
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingPassword(false);
                  setShowCurrent(false);
                  setShowNew(false);
                  setShowConfirm(false);
                }}
                disabled={savingPassword}
              >
                <X className="size-4 mr-1" /> Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ToggleVisibility({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
      onClick={onToggle}
      tabIndex={-1}
    >
      {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
    </Button>
  );
}
