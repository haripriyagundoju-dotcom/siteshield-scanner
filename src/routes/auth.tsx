import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mail, Phone, Radar, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

type AuthMode = "signin" | "signup" | "forgot";
type AuthMethod = "email" | "phone";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — AegisScan" },
      {
        name: "description",
        content: "Sign in to AegisScan to run website security scans and view your scan history.",
      },
      { property: "og:title", content: "Sign in — AegisScan" },
      {
        property: "og:description",
        content: "Sign in to AegisScan to run website security scans and view your scan history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [method, setMethod] = useState<AuthMethod>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // If already authenticated, redirect straight to the dashboard
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        navigate({ to: "/dashboard", replace: true });
      }
    });
  }, [navigate]);

  function formatPhoneNumber(raw: string): string {
    const cleaned = raw.trim().replace(/[\s\-()]/g, "");
    if (!cleaned.startsWith("+")) {
      return `+${cleaned}`;
    }
    return cleaned;
  }

  async function handleGoogleSignIn() {
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        toast.error(
          error.message ||
            "Could not start Google sign in. Ensure Google OAuth is enabled in Supabase.",
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);

    try {
      if (mode === "forgot") {
        if (!email.trim()) {
          toast.error("Please enter your email address.");
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        setNotice("Password reset link sent! Check your inbox.");
        return;
      }

      if (method === "email") {
        if (!email.trim() || !password) {
          toast.error("Please provide both email and password.");
          return;
        }

        if (mode === "signin") {
          const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (error) {
            if (error.message.toLowerCase().includes("invalid login credentials")) {
              toast.error(
                "Account not found or password incorrect. If you don't have an account, please sign up first!",
              );
            } else {
              toast.error(error.message);
            }
            return;
          }
          toast.success("Welcome back!");
          navigate({ to: "/dashboard", replace: true });
        } else {
          // Sign Up
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/dashboard`,
            },
          });
          if (error) {
            toast.error(error.message);
            return;
          }

          if (data.session) {
            toast.success("Account created successfully!");
            navigate({ to: "/dashboard", replace: true });
            return;
          }

          // Try immediate login in case auto-confirm is active
          const retry = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (retry.data?.session) {
            toast.success("Account created and signed in!");
            navigate({ to: "/dashboard", replace: true });
            return;
          }

          // Email confirmation is required by Supabase settings
          setNotice(
            "Account created! In your Supabase Dashboard (Authentication ➔ Providers ➔ Email), turn OFF 'Confirm email' to allow immediate login, or verify the link in your inbox.",
          );
          setMode("signin");
        }
      } else {
        // Phone method
        if (!phone.trim() || !password) {
          toast.error("Please provide both phone number and password.");
          return;
        }

        const formatted = formatPhoneNumber(phone);
        if (formatted.length < 8) {
          toast.error("Please enter a valid phone number with country code (e.g. +1234567890).");
          return;
        }

        if (mode === "signin") {
          const { error } = await supabase.auth.signInWithPassword({
            phone: formatted,
            password,
          });
          if (error) {
            if (
              error.message.toLowerCase().includes("sms_provider_not_configured") ||
              error.message.toLowerCase().includes("phone provider is not enabled")
            ) {
              toast.error(
                "Phone login requires enabling the Phone provider in your Supabase Dashboard.",
              );
            } else if (error.message.toLowerCase().includes("invalid login credentials")) {
              toast.error("Phone account not found or password incorrect. Please sign up first!");
            } else {
              toast.error(error.message);
            }
            return;
          }
          toast.success("Signed in with phone!");
          navigate({ to: "/dashboard", replace: true });
        } else {
          // Phone Sign Up
          const { data, error } = await supabase.auth.signUp({
            phone: formatted,
            password,
          });
          if (error) {
            if (
              error.message.toLowerCase().includes("sms_provider_not_configured") ||
              error.message.toLowerCase().includes("phone provider is not enabled")
            ) {
              toast.error(
                "Phone auth requires enabling the Phone provider in your Supabase Dashboard (Authentication ➔ Providers ➔ Phone).",
              );
            } else {
              toast.error(error.message);
            }
            return;
          }

          if (data.session) {
            toast.success("Phone account created!");
            navigate({ to: "/dashboard", replace: true });
            return;
          }

          setNotice("Account created! You can now sign in with your phone number and password.");
          setMode("signin");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid-overlay flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary glow-primary">
            <Radar className="h-5 w-5" />
          </span>
          <span className="font-mono text-xl font-bold tracking-wide text-foreground text-glow">
            AEGIS<span className="text-primary">SCAN</span>
          </span>
        </div>

        <Card className="border-border/80 bg-card/90 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">
              {mode === "signin"
                ? "Sign in to your account"
                : mode === "signup"
                  ? "Create your account"
                  : "Reset your password"}
            </CardTitle>
            <CardDescription className="text-sm">
              {mode === "signin"
                ? "Sign in to run website security scans and access your dashboard."
                : mode === "signup"
                  ? "Sign up first to unlock the website scanner and save scan reports."
                  : "Enter your email and we'll send you a password reset link."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* 1-Click Google Sign In */}
            {mode !== "forgot" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 border-border/80 hover:bg-accent/40 font-medium"
                  disabled={busy}
                  onClick={handleGoogleSignIn}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Continue with Google Account
                </Button>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/80" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground font-mono">
                      or continue with
                    </span>
                  </div>
                </div>

                {/* Switch between Email and Phone tabs */}
                <Tabs
                  value={method}
                  onValueChange={(val) => setMethod(val as AuthMethod)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="email" className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4" /> Email / Gmail
                    </TabsTrigger>
                    <TabsTrigger value="phone" className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4" /> Phone Number
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "forgot" || method === "email" ? (
                <div className="space-y-2">
                  <Label htmlFor="email">Email or Gmail address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number (with country code)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    placeholder="+1 234 567 8900"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Include your country code, e.g.{" "}
                    <span className="font-mono text-primary">+1</span> (US) or{" "}
                    <span className="font-mono text-primary">+91</span> (India).
                  </p>
                </div>
              )}

              {mode !== "forgot" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signin" && method === "email" && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode("forgot");
                          setNotice(null);
                        }}
                        className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 glow-primary font-medium"
                disabled={busy}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "signin"
                  ? method === "email"
                    ? "Sign In with Email"
                    : "Sign In with Phone"
                  : mode === "signup"
                    ? method === "email"
                      ? "Create Account with Email"
                      : "Create Account with Phone"
                    : "Send Reset Link"}
              </Button>
            </form>

            {notice && (
              <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-primary leading-relaxed">
                {notice}
              </div>
            )}

            {/* Mode Switcher */}
            <div className="border-t border-border/70 pt-4 text-center text-sm">
              {mode === "signin" ? (
                <p className="text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setNotice(null);
                    }}
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Sign up first
                  </button>
                </p>
              ) : mode === "signup" ? (
                <p className="text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setNotice(null);
                    }}
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Sign in here
                  </button>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setNotice(null);
                  }}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Back to sign in
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
