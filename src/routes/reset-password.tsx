import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Radar } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — AegisScan" },
      {
        name: "description",
        content: "Choose a new password for your AegisScan account.",
      },
      { property: "og:title", content: "Set a new password — AegisScan" },
      {
        property: "og:description",
        content: "Choose a new password for your AegisScan account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [isRecovery, setIsRecovery] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Recovery links carry the session in the URL hash; verify the signed-in
  // state before offering the form.
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsRecovery(Boolean(user));
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password updated. You're signed in.");
      navigate({ to: "/dashboard", replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid-overlay flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Radar className="h-5 w-5" />
          </span>
          <span className="font-mono text-lg font-bold tracking-wide text-foreground">
            AEGIS<span className="text-primary">SCAN</span>
          </span>
        </div>

        <Card className="border-border/80 bg-card/90">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Set a new password</CardTitle>
            <CardDescription>
              {isRecovery === null
                ? "Checking your reset link…"
                : isRecovery
                  ? "Choose a new password for your account."
                  : "This reset link is missing or expired. Request a new one from the sign-in page."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isRecovery && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Update password
                </Button>
              </form>
            )}
            <div className="mt-4 text-center">
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/auth" })}>
                Back to sign in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
