import { createFileRoute } from "@tanstack/react-router";
import { PublicHeader } from "@/components/funda/PublicHeader";

export const Route = createFileRoute("/about")({
  component: About,
  head: () => ({ meta: [{ title: "About PASA — South African School Management" }, { name: "description", content: "Why we built PASA: every parent and every school in one app, focused on the South African education system." }]}),
});

function About() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <section className="container mx-auto px-4 py-16 max-w-3xl">
        <div className="text-sm text-accent font-medium mb-2">ABOUT PASA</div>
        <h1 className="text-4xl font-bold tracking-tight">Built for South African schools.</h1>
        <div className="mt-8 space-y-5 text-muted-foreground leading-relaxed">
          <p>South African parents juggle WhatsApp groups, paper notes and confusing portals. PASA — the Parent and School Alliance — replaces that chaos with one app that connects every parent to every school.</p>
          <p>We support the four roles that actually run a school: parents, teachers, principals and school administrators. Each gets a dashboard tuned for what they actually do.</p>
          <p>The base product is free for parents and free for schools to list. Premium features (unlimited children, instant alerts, downloadable reports for bursaries) help us sustain a portion of the cost for no-fee schools — every R10 supports SA education.</p>
          <p className="text-foreground/60 text-sm pt-4 border-t border-border/40">
            PASA is built and maintained by{" "}
            <a href="https://barefootlabs.io" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-medium">
              Barefoot Labs
            </a>
            {" "}— a South African software company building tools that matter.
          </p>
        </div>
      </section>
    </div>
  );
}
