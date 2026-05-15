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
import { Loader2, Eye, EyeOff, Pencil, X, Bell, BellOff } from "lucide-react";
import { friendlyDbError } from "@/lib/db-errors";
import { friendlyAuthError } from "@/lib/auth-errors";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile & settings · PASA" }] }),
});

const profileSchema = z.object({
  first_name: z.string().trim().min(1, "Enter your first name").max(50),
  last_name:  z.string().trim().min(1, "Enter your last name").max(50),
  location:   z.string().trim().max(150).optional().or(z.literal("")),
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
  const { state: pushState, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushNotifications();

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
      first_name: fd.get("first_name"),
      last_name:  fd.get("last_name"),
      location:   fd.get("location") || "",
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setSavingProfile(true);
    const fullName = `${parsed.data.first_name} ${parsed.data.last_name}`.trim();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name:  fullName,
        city:       parsed.data.location || null,
      } as any)
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  defaultValue={(profile as any)?.first_name ?? profile?.full_name?.split(" ")[0] ?? ""}
                  required
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  defaultValue={(profile as any)?.last_name ?? profile?.full_name?.split(" ").slice(1).join(" ") ?? ""}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="location">
                Location <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="location"
                name="location"
                defaultValue={(profile as any)?.city ?? ""}
                placeholder="e.g. Soweto, Gauteng"
                maxLength={150}
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
            <Row label="Location" value={(profile as any)?.city ?? "—"} />
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

      {/* ── Push notifications card ── */}
      {pushState !== 'unsupported' && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Push notifications</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {pushState === 'subscribed'
                  ? 'You will receive alerts for marks, attendance and discipline.'
                  : pushState === 'denied'
                  ? 'Notifications are blocked. Enable them in your browser settings.'
                  : 'Get instant alerts when your school uploads new information.'}
              </p>
            </div>
            {pushState === 'subscribed' ? (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5 text-muted-foreground"
                onClick={async () => {
                  await unsubscribePush();
                  toast.success('Push notifications disabled');
                }}
              >
                <BellOff className="size-3.5" /> Turn off
              </Button>
            ) : (
              <Button
                size="sm"
                className="shrink-0 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={pushState === 'denied' || pushState === 'loading'}
                onClick={async () => {
                  const ok = await subscribePush();
                  if (ok) toast.success('Push notifications enabled');
                  else if (Notification.permission === 'denied') {
                    toast.error('Notifications blocked — enable them in browser settings');
                  }
                }}
              >
                {pushState === 'loading'
                  ? <Loader2 className="size-3.5 animate-spin" />
                  : <Bell className="size-3.5" />}
                {pushState === 'denied' ? 'Blocked' : 'Enable'}
              </Button>
            )}
          </div>
        </Card>
      )}
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
