import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Cookie,
  EyeOff,
  Gauge,
  Lock,
  Radar,
  ShieldAlert,
  ShieldCheck,
  Server,
  ScanSearch,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import heroImg from "@/assets/hero-shield.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AegisScan — Website Security Scanner" },
      {
        name: "description",
        content:
          "Scan any website for security weaknesses and get a grade from A to F, with plain-language fixes for everything that's wrong.",
      },
      { property: "og:title", content: "AegisScan — Website Security Scanner" },
      {
        property: "og:description",
        content:
          "Scan any website for security weaknesses and get a grade from A to F, with plain-language fixes for everything that's wrong.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  {
    icon: Lock,
    title: "Encryption & redirects",
    body: "HTTPS, HTTP→HTTPS redirects and HSTS so visitors can't be downgraded to unencrypted traffic.",
  },
  {
    icon: ShieldAlert,
    title: "Script & framing protection",
    body: "Content-Security-Policy and clickjacking defenses that limit what pages can load and embed you.",
  },
  {
    icon: Cookie,
    title: "Cookie hygiene",
    body: "Secure, HttpOnly and SameSite flags on every cookie, so session data can't leak or be hijacked.",
  },
  {
    icon: EyeOff,
    title: "Information leaks",
    body: "Referrer policy and server software disclosure — the small details attackers use for reconnaissance.",
  },
  {
    icon: Gauge,
    title: "Weighted A–F grade",
    body: "Every check is weighted by real-world impact and rolled into one clear grade you can act on.",
  },
  {
    icon: ShieldCheck,
    title: "Plain-language fixes",
    body: "No jargon walls. Every failed check comes with a concrete, actionable fix you can hand to your host.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Enter your address",
    body: "Type in the website you want checked — your own site, or one you're about to deploy.",
  },
  {
    n: "02",
    title: "AegisScan runs the checks",
    body: "Ten targeted security checks run against the live response headers, weighted by impact.",
  },
  {
    n: "03",
    title: "Fix what's flagged",
    body: "Get your grade, see exactly what passed and failed, and apply the suggested fixes.",
  },
];

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Radar className="h-4.5 w-4.5" />
            </span>
            <span className="font-mono text-sm font-semibold tracking-wide text-foreground">
              AEGIS<span className="text-primary">SCAN</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="grid-overlay relative overflow-hidden border-b border-border/60">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
            <div>
              <Badge
                variant="outline"
                className="border-primary/40 bg-primary/10 font-mono text-primary"
              >
                <ScanSearch className="mr-1.5 h-3.5 w-3.5" />
                Website security scanner
              </Badge>
              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
                A health check-up for your website's{" "}
                <span className="text-primary text-glow">security</span>
              </h1>
              <p className="mt-4 max-w-lg text-base text-muted-foreground md:text-lg">
                Type in an address, hit scan, and get a grade from A to F — with a clear list of
                what's wrong and how to fix it.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild className="glow-primary">
                  <Link to="/dashboard">
                    Scan your site <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/auth">Create free account</Link>
                </Button>
              </div>
              <p className="mt-4 font-mono text-xs text-muted-foreground">
                10 checks · weighted A–F grading · fix suggestions included
              </p>
            </div>
            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-border/80 shadow-2xl">
                <img
                  src={heroImg}
                  alt="AegisScan scanning a website's defenses"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* What we check */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 md:py-20">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            What we check
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Ten targeted checks against the site's live response headers — the same signals a
            security auditor starts with.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <Card
                key={title}
                className="border-border/70 bg-card/70 transition-colors hover:border-primary/40"
              >
                <CardContent className="pt-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-y border-border/60 bg-card/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 md:py-20">
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              How it works
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {STEPS.map(({ n, title, body }) => (
                <div key={n} className="relative rounded-xl border border-border/70 bg-card/70 p-6">
                  <span className="font-mono text-3xl font-bold text-primary/60">{n}</span>
                  <h3 className="mt-3 font-semibold text-foreground">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 md:py-20">
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card/80 p-8 text-center md:p-12">
            <div className="grid-overlay pointer-events-none absolute inset-0 opacity-40" />
            <div className="relative">
              <Server className="mx-auto h-8 w-8 text-primary" />
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                What grade does your site get?
              </h2>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                Find out in seconds — then fix what's flagged and watch your grade climb.
              </p>
              <Button size="lg" className="mt-6 glow-primary" asChild>
                <Link to="/dashboard">
                  Run your first scan <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-6">
        <p className="text-center font-mono text-xs text-muted-foreground">
          AegisScan · passive header checks only · we never touch your site's data
        </p>
      </footer>
    </div>
  );
}
