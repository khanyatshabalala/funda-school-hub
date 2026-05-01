import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/funda/dashboards/PageHeader";
import { Check, Crown, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/app/upgrade")({
  component: () => {
    const { primaryRole } = useAuth();
    const benefits = [
      "Unlimited children at any school",
      "Instant mark & detention alerts",
      "Full performance graphs vs class average",
      "Download reports for bursaries",
      "R10 of your fee supports SA schools every month",
    ];
    return (
      <div className="max-w-2xl">
        {primaryRole !== "parent" ? (
          <Card className="p-10 text-center text-muted-foreground text-sm">
            <ShieldAlert className="size-8 mx-auto mb-2 opacity-40" />
            Premium plans are for parent accounts only.
          </Card>
        ) : (
          <>
            <PageHeader title="Go Premium" sub="Unlock the full Funda experience." />
            <Card className="p-8 bg-gradient-to-br from-primary to-[oklch(0.25_0.08_240)] text-primary-foreground border-0">
              <div className="flex items-center gap-3 mb-2"><Crown className="size-6 text-accent"/><div className="text-2xl font-bold">PASA Premium</div></div>
              <div className="flex items-baseline gap-1 mb-6"><span className="text-4xl font-bold">R19.99</span><span className="text-primary-foreground/70">/month</span></div>
              <ul className="space-y-2.5">{benefits.map(b => <li key={b} className="flex gap-2 text-sm"><Check className="size-4 text-accent shrink-0 mt-0.5"/>{b}</li>)}</ul>
              <div className="mt-6 p-3 rounded-lg bg-white/10 text-sm">Every month, a portion of your subscription supports a public school in need.</div>
              <div className="mt-6 space-y-2">
                <Button onClick={() => toast.info("Card payments coming soon.")} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-11">Upgrade with Card</Button>
                <Button onClick={() => toast.info("Ozow integration coming soon.")} variant="outline" className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white h-11">Pay with Ozow</Button>
                <Button asChild variant="ghost" className="w-full text-white/70 hover:text-white hover:bg-white/5"><Link to="/app">Maybe Later</Link></Button>
              </div>
              <div className="text-xs text-primary-foreground/60 text-center mt-4">Cancel anytime. Safety alerts always free.</div>
            </Card>
          </>
        )}
      </div>
    );
  },
});
