import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { FundaLogo } from "@/components/funda/Logo";
import { toast } from "sonner";
import { Loader2, ShieldAlert } from "lucide-react";
import { friendlyAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/superadmin/auth")({
  component: AdminAuth,
  head: () => ({ meta: [{ title: "Admin · PASA" }] }),
});

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
});

function AdminAuth() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/admin" });
  }, [user, authLoading, navigate]);

  const onSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      setLoading(false);
      return toast.error(friendlyAuthError(error));
    }

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    console.log("user id:", data.user.id);
    console.log("role rows:", roleRows);
    console.log("role error:", roleError);

    const isSuperAdmin = (roleRows ?? []).some((r) => r.role === "super_admin");

    if (!isSuperAdmin) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("Access denied. This portal is for super admins only.");
      return;
    }

    navigate({ to: "/admin" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="size-12 rounded-xl bg-destructive/10 text-destructive grid place-items-center">
            <ShieldAlert className="size-6" />
          </div>
          <FundaLogo />
          <div>
            <h1 className="text-lg font-semibold">Super admin</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Restricted access — authorised personnel only</p>
          </div>
        </div>

        <Card className="p-6">
          <form onSubmit={onSignIn} className="space-y-4">
            <div>
              <Label htmlFor="ae">Email</Label>
              <Input id="ae" name="email" type="email" required autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="ap">Password</Label>
              <Input id="ap" name="password" type="password" required autoComplete="current-password" />
            </div>
            <Button
              disabled={loading}
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <a href="/" className="hover:text-foreground transition-colors">← Back to home</a>
        </p>
      </div>
    </div>
  );
}
