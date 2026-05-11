import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/funda/PublicHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, BookOpen, Users, Shield, Bell, GraduationCap, MapPin, TrendingUp, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Funda — School Management for South Africa" },
      { name: "description", content: "The home–school bridge for South African families. Marks, attendance, discipline, school transfers — all in one app." },
    ],
  }),
});

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl md:text-4xl font-bold text-accent">{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Feature({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <Card className="p-6 border-border/60 hover:border-accent/40 transition-colors">
      <div className="size-10 rounded-lg bg-accent/15 text-accent grid place-items-center mb-4">
        <Icon className="size-5" />
      </div>
      <h3 className="font-semibold text-base mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </Card>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[oklch(0.25_0.08_240)]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative container mx-auto px-4 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1 text-xs text-white/90 mb-6">
              <span className="size-1.5 rounded-full bg-accent animate-pulse" />
              Built for South African schools
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-[1.05]">
              Every school. <br />
              <span className="text-accent">Every parent.</span> One app.
            </h1>
            <p className="mt-6 text-lg text-white/70 max-w-2xl leading-relaxed">
              PASA — the Parent and School Alliance. See your child's marks, attendance and discipline in real time — and schools manage everything from one dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20">
                <Link to="/auth">Parent sign up / sign in <ArrowRight className="ml-2 size-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 text-white bg-white/5 hover:bg-white/10 hover:text-white">
                <Link to="/school/auth">Teacher / staff sign in</Link>
              </Button>
            </div>
            <div className="mt-4">
              <Button asChild size="sm" variant="ghost" className="text-white/50 hover:text-white/80 hover:bg-white/5 text-xs px-2">
                <Link to="/schools">Explore schools</Link>
              </Button>
            </div>
            <div className="mt-12 grid grid-cols-3 gap-8 max-w-md">
              <Stat value="8+" label="Cape Town schools" />
              <Stat value="4" label="Roles supported" />
              <Stat value="R0" label="To get started" />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mb-12">
          <div className="text-sm font-medium text-accent mb-2">EVERYTHING IN ONE PLACE</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">School life, simplified.</h2>
          <p className="text-muted-foreground mt-3">From the morning bell to the report card — PASA keeps everyone in sync.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Feature icon={BookOpen} title="Marks & reports" body="Real-time results vs class average. Download for bursary applications." />
          <Feature icon={Users} title="Attendance" body="Daily roll-call by teachers. Instant alerts to parents on absence." />
          <Feature icon={Shield} title="Discipline" body="Merits, warnings and detentions tracked transparently for everyone." />
          <Feature icon={Bell} title="Safety alerts" body="Always free. Parents get notified the moment something matters." />
          <Feature icon={MapPin} title="School Explorer" body="Browse 8+ Cape Town schools by district, fees, EMIS and phase." />
          <Feature icon={TrendingUp} title="Transfers" body="Request and approve learner transfers with full audit trail." />
          <Feature icon={GraduationCap} title="Multi-role" body="One school dashboard adapts for teachers, principals and admins." />
          <Feature icon={MessageCircle} title="AI assistant" body="ChatGPT-powered helper for parents and staff, in-context." />
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-24">
        <Card className="p-10 md:p-14 bg-primary text-primary-foreground border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/15 via-transparent to-transparent" />
          <div className="relative max-w-2xl">
            <h3 className="text-3xl md:text-4xl font-bold tracking-tight">Join the home–school revolution.</h3>
            <p className="mt-3 text-primary-foreground/70">Free for parents. Free for schools to list. Premium adds unlimited children, instant alerts and downloadable reports.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/auth">Create my account</Link></Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link to="/pricing">See pricing</Link></Button>
            </div>
          </div>
        </Card>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Funda. Made for South African schools.
      </footer>
    </div>
  );
}
