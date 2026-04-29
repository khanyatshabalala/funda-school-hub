import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/funda/PublicHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  component: Pricing,
  head: () => ({ meta: [{ title: "Pricing — Funda" }, { name: "description", content: "Free for parents. Premium R19.99/month adds unlimited children, instant alerts and downloadable reports." }]}),
});

function Tier({ name, price, items, cta, highlight }: any) {
  return (
    <Card className={`p-8 ${highlight ? "border-accent/60 shadow-lg shadow-accent/10 relative" : ""}`}>
      {highlight && <div className="absolute -top-3 left-8 bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full">PASA Premium</div>}
      <div className="text-sm text-muted-foreground">{name}</div>
      <div className="mt-2 flex items-baseline gap-1"><span className="text-4xl font-bold">{price}</span><span className="text-muted-foreground text-sm">/month</span></div>
      <ul className="mt-6 space-y-3 text-sm">
        {items.map((it: string) => <li key={it} className="flex gap-2"><Check className="size-4 text-accent mt-0.5 shrink-0"/>{it}</li>)}
      </ul>
      <Button asChild className={`mt-8 w-full ${highlight ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`} variant={highlight ? "default" : "outline"}>
        <Link to="/auth">{cta}</Link>
      </Button>
    </Card>
  );
}

function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <section className="container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-sm text-accent font-medium mb-2">PRICING</div>
          <h1 className="text-4xl font-bold tracking-tight">Free for everyone. Premium for power.</h1>
          <p className="mt-3 text-muted-foreground">Safety alerts are always free. Always.</p>
        </div>
        <div className="mt-12 grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Tier name="Parent (Free)" price="R0" cta="Sign up free" items={[
            "Connect to one child",
            "View marks and attendance",
            "Free safety alerts",
            "School calendar access",
          ]}/>
          <Tier highlight name="PASA Premium" price="R19.99" cta="Upgrade with Card" items={[
            "Unlimited children at any school",
            "Instant mark & detention alerts",
            "Full performance graphs vs class average",
            "Download reports for bursaries",
            "R10 of your fee supports SA schools every month",
            "AI assistant for any question",
          ]}/>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">Cancel anytime. Safety alerts always free.</p>
      </section>
    </div>
  );
}
