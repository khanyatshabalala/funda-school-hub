import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FundaLogo } from "@/components/funda/Logo";
import { BarefootLoader } from "@/components/funda/BarefootLoader";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { friendlyAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in · PASA" }] }),
});

const signInSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
});

const signUpSchema = z.object({
  first_name: z.string().trim().min(1, "Enter your first name").max(50),
  last_name:  z.string().trim().min(1, "Enter your last name").max(50),
  email:      z.string().trim().email().max(255),
  password:   z.string().min(6, "Password must be at least 6 characters").max(72),
  location:   z.string().trim().max(150).optional(),
});

const STAFF_ROLES = ["super_admin", "school_admin", "principal", "teacher"];

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  // If already signed in (e.g. page refresh), redirect immediately
  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/app" });
  }, [user, authLoading, navigate]);

  const onSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      setLoading(false);
      return toast.error(friendlyAuthError(error));
    }

    // Fetch roles immediately — we have the session right now
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    const roles = (roleRows ?? []).map((r) => r.role);
    const isStaff = roles.some((r) => STAFF_ROLES.includes(r));

    if (isStaff) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("Staff accounts sign in via the school portal.");
      navigate({ to: "/school/auth" });
      return;
    }

    // Parent — go straight to dashboard, no intermediate screen
    navigate({ to: "/app" });
  };

  const onSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      first_name: fd.get("first_name"),
      last_name:  fd.get("last_name"),
      email:      fd.get("email"),
      password:   fd.get("password"),
      location:   fd.get("location") || undefined,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setLoading(true);
    const fullName = `${parsed.data.first_name} ${parsed.data.last_name}`.trim();
    const { data, error } = await supabase.auth.signUp({
      email:    parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          full_name:  fullName,
          first_name: parsed.data.first_name,
          last_name:  parsed.data.last_name,
        },
      },
    });
    if (error) { setLoading(false); return toast.error(friendlyAuthError(error)); }

    // Save location to profile if provided
    if (data.user && parsed.data.location) {
      await supabase.from("profiles").update({
        first_name: parsed.data.first_name,
        last_name:  parsed.data.last_name,
        city:       parsed.data.location,
      } as any).eq("id", data.user.id);
    }

    setLoading(false);
    toast.success("Account created! Check your email to verify.");
  };

  const onGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) toast.error(friendlyAuthError(error));
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex bg-primary text-primary-foreground p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <FundaLogo light />
        <div className="relative flex flex-col items-center gap-8">
          <BarefootLoader size={140} theme="dark" />
          <div>
            <h2 className="text-3xl font-bold leading-tight">
              Every school. <br /><span className="text-accent">Every parent.</span> One app.
            </h2>
            <p className="mt-4 text-primary-foreground/70 max-w-sm">
              Marks, attendance, discipline and transfers — all in one place.
            </p>
          </div>
        </div>
        <div className="text-xs text-primary-foreground/50">© PASA · Made for South Africa</div>
      </div>

      <div className="flex items-center justify-center p-6 bg-background">
        <Card className="p-8 w-full max-w-md">
          <div className="lg:hidden mb-6"><FundaLogo /></div>
          <div className="mb-4">
            <h1 className="text-xl font-semibold">For parents</h1>
            <p className="text-xs text-muted-foreground mt-1">
              School staff: <a href="/school/auth" className="text-accent hover:underline">sign in here</a>
            </p>
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={onSignIn} className="space-y-4 mt-6">
                <div>
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="si-pw">Password</Label>
                  <Input id="si-pw" name="password" type="password" required autoComplete="current-password" />
                </div>
                <Button disabled={loading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  {loading
                    ? <BarefootLoader size={22} theme="light" />
                    : "Sign in"}
                </Button>
                <div className="text-center">
                  <Link to="/reset-password" className="text-xs text-muted-foreground hover:text-accent transition-colors">
                    Forgot your password?
                  </Link>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={onSignUp} className="space-y-4 mt-6">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="su-fn">First name</Label>
                    <Input id="su-fn" name="first_name" required autoComplete="given-name" placeholder="Sipho" />
                  </div>
                  <div>
                    <Label htmlFor="su-ln">Last name</Label>
                    <Input id="su-ln" name="last_name" required autoComplete="family-name" placeholder="Dlamini" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="su-pw">Password</Label>
                  <Input id="su-pw" name="password" type="password" required autoComplete="new-password" minLength={6} />
                </div>
                {/* Location — optional */}
                <div>
                  <Label htmlFor="su-location">
                    Location <span className="text-muted-foreground/60 font-normal text-xs">(optional)</span>
                  </Label>
                  <Input
                    id="su-location"
                    name="location"
                    placeholder="e.g. Soweto, Gauteng"
                    autoComplete="address-level2"
                    maxLength={150}
                  />
                </div>
                <Button disabled={loading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />OR<div className="h-px flex-1 bg-border" />
          </div>

          <Button onClick={onGoogle} variant="outline" className="w-full">
            <svg className="size-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0012 23z" />
              <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 015.5 12c0-.73.13-1.43.34-2.1V7.07H2.18A11 11 0 001 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            Continue with Google
          </Button>
        </Card>
      </div>
    </div>
  );
}
