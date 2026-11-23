import { createFileRoute, Link, notFound, type ErrorComponentProps } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Info,
  Wrench,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GradeBadge, gradeTone } from "@/components/grade-badge";
import type { CheckStatus, ScanCheck } from "@/lib/scan-types";
import { getScan } from "@/lib/scans.functions";
import { formatDate } from "@/lib/scan-queries";

export const Route = createFileRoute("/_authenticated/scans/$id")({
  loader: async ({ params }) => {
    const row = await getScan({ data: { id: params.id } });
    if (!row) {
      throw notFound();
    }
    return { scan: row };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `Scan result ${loaderData?.scan ? `— ${loaderData.scan.url}` : "— AegisScan"}`,
      },
      {
        name: "description",
        content:
          "Security scan results: grade, score, passed and failed checks with plain-language fixes.",
      },
      {
        property: "og:title",
        content: loaderData?.scan
          ? `Security grade ${loaderData.scan.grade} — ${loaderData.scan.url}`
          : "Scan result — AegisScan",
      },
      {
        property: "og:description",
        content:
          "Security scan results: grade, score, passed and failed checks with plain-language fixes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScanResultPage,
  errorComponent: ScanResultError,
});

function ScanResultError({ error }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-foreground">Couldn't load this scan</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

const STATUS_ICON: Record<CheckStatus, typeof CheckCircle2> = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
  info: Info,
};

function statusClasses(status: CheckStatus): string {
  switch (status) {
    case "pass":
      return "text-success border-success/40 bg-success/10";
    case "warn":
      return "text-warning border-warning/40 bg-warning/10";
    case "fail":
      return "text-destructive border-destructive/40 bg-destructive/10";
    default:
      return "text-accent border-accent/40 bg-accent/10";
  }
}

const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: "Passed",
  warn: "Warning",
  fail: "Failed",
  info: "Info",
};

function CheckRow({ check }: { check: ScanCheck }) {
  const Icon = STATUS_ICON[check.status] ?? Info;
  const showFix = check.status !== "pass" && check.fix && check.fix.length > 0;
  return (
    <Card className="border-border/70 bg-card/70">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${statusClasses(check.status)}`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground">{check.label}</h3>
              <Badge
                variant="outline"
                className={`font-mono text-xs ${statusClasses(check.status)}`}
              >
                {STATUS_LABEL[check.status]}
              </Badge>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{check.detail}</p>
            {showFix && (
              <div className="mt-3 rounded-md border border-primary/25 bg-primary/5 px-3 py-2.5">
                <p className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                  <Wrench className="h-3.5 w-3.5" /> How to fix
                </p>
                <p className="mt-1.5 text-sm text-foreground/90">{check.fix}</p>
              </div>
            )}
          </div>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {check.earned}/{check.weight}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ScanResultPage() {
  const { scan } = Route.useLoaderData();
  const checks: ScanCheck[] = Array.isArray(scan.checks)
    ? (scan.checks as unknown as ScanCheck[])
    : [];

  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const warned = checks.filter((c) => c.status === "warn").length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
      <Button variant="ghost" size="sm" className="mb-6 -ml-2" asChild>
        <Link to="/history">
          <ArrowLeft className="h-4 w-4" /> All scans
        </Link>
      </Button>

      {scan.status === "error" ? (
        <Card className="border-destructive/40 bg-card/70">
          <CardContent className="py-10 text-center">
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold text-foreground">Scan couldn't complete</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {scan.error_message ?? "The target site could not be checked."}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{scan.url}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Grade summary */}
          <Card className="grid-overlay relative overflow-hidden border-primary/30 bg-card/80">
            <CardContent className="relative flex flex-col items-center gap-6 py-10 sm:flex-row sm:justify-center">
              <GradeBadge grade={scan.grade} className="h-28 w-28 text-5xl" />
              <div className="text-center sm:text-left">
                <p className="font-mono text-sm text-muted-foreground">SECURITY GRADE</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                  <span className={`font-mono ${gradeTone(scan.grade)}`}>{scan.score}/100</span>
                  {" · "}
                  <span className={gradeTone(scan.grade)}>{scan.grade}</span>
                </p>
                <a
                  href={scan.final_url ?? scan.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex max-w-[280px] items-center gap-1.5 truncate font-mono text-sm text-primary hover:underline"
                >
                  {scan.final_url ?? scan.url}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
                <p className="mt-1 text-xs text-muted-foreground">
                  Scanned {formatDate(scan.created_at)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tally */}
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-success/30 bg-success/5 py-3">
              <p className="font-mono text-2xl font-bold text-success">{passed}</p>
              <p className="text-xs text-muted-foreground">passed</p>
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning/5 py-3">
              <p className="font-mono text-2xl font-bold text-warning">{warned}</p>
              <p className="text-xs text-muted-foreground">warnings</p>
            </div>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 py-3">
              <p className="font-mono text-2xl font-bold text-destructive">{failed}</p>
              <p className="text-xs text-muted-foreground">failed</p>
            </div>
          </div>

          {/* Checks */}
          <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Checks
          </h2>
          <div className="mt-3 space-y-3">
            {checks.map((check) => (
              <CheckRow key={check.key} check={check} />
            ))}
          </div>

          <div className="mt-8 text-center">
            <Button asChild className="glow-primary">
              <Link to="/dashboard">Scan another site</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
