import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-4 text-muted-foreground">This page doesn't exist.</p>
        <a href="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Go home</a>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PASA — Parent and School Alliance" },
      { name: "description", content: "PASA (Parent and School Alliance) connects parents, teachers and principals across South African schools. Marks, attendance, discipline and transfers — all in one place." },
      { property: "og:title", content: "PASA — Parent and School Alliance" },
      { property: "og:description", content: "One platform for parents and schools. Marks, attendance, discipline and more." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "icon",
        type: "image/svg+xml",
        // Barefoot Labs concept-4 mark — foot pad + toes, navy bg, sky blue accent toe
        href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230f172a'/%3E%3Cellipse cx='32' cy='40' rx='14' ry='16' fill='%23ffffff'/%3E%3Ccircle cx='20' cy='22' r='5' fill='%23ffffff' opacity='.9'/%3E%3Ccircle cx='29' cy='18' r='5' fill='%2338bdf8'/%3E%3Ccircle cx='38' cy='20' r='5' fill='%23ffffff' opacity='.9'/%3E%3Ccircle cx='46' cy='26' r='4' fill='%23ffffff' opacity='.45'/%3E%3C/svg%3E",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
