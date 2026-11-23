import { Outlet, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Radar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// Auth gate for the whole protected subtree.
// Unauthenticated visitors are redirected to /auth before any child route renders.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw redirect({ to: "/auth" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Radar className="h-4.5 w-4.5" />
            </span>
            <span className="font-mono text-sm font-semibold tracking-wide text-foreground">
              AEGIS<span className="text-primary">SCAN</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              to="/dashboard"
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              Dashboard
            </Link>
            <Link
              to="/history"
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              History
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="ml-2">
              Sign out
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border/70 py-4">
        <p className="text-center font-mono text-xs text-muted-foreground">
          AegisScan · passive header checks only · no intrusive testing
        </p>
      </footer>
    </div>
  );
}
