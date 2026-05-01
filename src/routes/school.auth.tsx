import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/school/auth")({
  component: SchoolAuth,
  head: () => ({ meta: [{ title: "School staff sign in · PASA" }] }),
});

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
});

function SchoolAuth() {
  const navigate = useNavigate();
  const { user, roles, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  // Once we have a signed-in user AND their roles loaded, gate by role.
  useEffect(() => {
    if (authLoading || !user) return;
    const staffRoles = ["super_admin", "school_admin", "principal", "teacher"];
    const isStaff = roles.some((r) => staffRoles.includes(r.role));
    if (!isStaff) {
      // Parent account tried to use the staff portal — kick them out.
      supabase.auth.signOut().then(() => {
        toast.error("This portal is for school staff only. Please use the parent sign-in.");
        navigate({ to: "/auth" });
      });
      return;
    }
    if (roles.some((r) => r.role === "super_admin")) {
      navigate({ to: "/admin" });
    } else {
      navigate({ to: "/app" });
    }
  }, [user, roles, authLoading, navigate]);

  const onSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in — checking access…");
    // The useEffect above will redirect once roles load.
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex bg-primary text-primary-foreground p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <FundaLogo light />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 border border-accent/30 px-3 py-1 text-xs text-accent mb-4">
            <ShieldCheck className="size-3.5" /> Staff portal
          </div>
          <h2 className="text-3xl font-bold leading-tight">For teachers, principals & school admins.</h2>
          <p className="mt-4 text-primary-foreground/70 max-w-sm">
            Capture marks, take roll-call, manage discipline and run your school from one place.
          </p>
        </div>
        <div className="text-xs text-primary-foreground/50">© PASA · Made for South Africa</div>
      </div>
      <div className="flex items-center justify-center p-6 bg-background">
        <Card className="p-8 w-full max-w-md">
          <div className="lg:hidden mb-6"><FundaLogo /></div>
          <h1 className="text-xl font-semibold">School staff sign in</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Parents: <Link to="/auth" className="text-accent hover:underline">sign up here</Link>
          </p>
          <form onSubmit={onSignIn} className="space-y-4 mt-6">
            <div><Label htmlFor="se">Work email</Label><Input id="se" name="email" type="email" required autoComplete="email" /></div>
            <div><Label htmlFor="sp">Password</Label><Input id="sp" name="password" type="password" required autoComplete="current-password" /></div>
            <Button disabled={loading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              {loading && <Loader2 className="size-4 animate-spin mr-2" />}Sign in
            </Button>
          </form>
          <div className="mt-6 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
            School accounts are created by your principal or a PASA administrator. Need access? Ask your school admin to invite you.
          </div>
        </Card>
      </div>
    </div>
  );
}
