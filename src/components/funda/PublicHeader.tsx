import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { FundaLogo } from "./Logo";
import { useAuth } from "@/lib/auth-context";

export function PublicHeader() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <FundaLogo />
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link to="/schools" className="hover:text-foreground transition-colors">Find a school</Link>
          <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
          <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm"><Link to="/app">Open dashboard</Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/school/auth">Teacher sign in</Link></Button>
              <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/auth">Parent sign in</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
