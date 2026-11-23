import { createFileRoute, useNavigate, type ErrorComponentProps } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Loader2, Radar, ScanSearch } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { GradeBadge, gradeTone } from "@/components/grade-badge";
import { runScan } from "@/lib/scans.functions";
import { scanHistoryQueryOptions, formatDate } from "@/lib/scan-queries";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(scanHistoryQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Dashboard — AegisScan" },
      {
        name: "description",
        content: "Run a website security scan and get an A–F grade with plain-language fixes.",
      },
      { property: "og:title", content: "Dashboard — AegisScan" },
      {
        property: "og:description",
        content: "Run a website security scan and get an A–F grade with plain-language fixes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
  errorComponent: ScanError,
});

function ScanError({ error }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-foreground">Couldn't load your scans</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");

  const runScanFn = useServerFn(runScan);
  const scan = useMutation({
    mutationFn: (target: string) => runScanFn({ data: { url: target } }),
    onSuccess: (row) => {
      navigate({ to: "/scans/$id", params: { id: row.id } });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "The scan could not run. Please try again.");
    },
  });

  const { data: history } = useSuspenseQuery(scanHistoryQueryOptions);
  const recent = history.slice(0, 5);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || scan.isPending) return;
    scan.mutate(url);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Scan a website
        </h1>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          Enter a public web address. AegisScan checks its live security headers and returns a grade
          from A to F.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <ScanSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="example.com"
              className="h-12 pl-9 font-mono text-base"
              autoComplete="url"
              spellCheck={false}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-12 glow-primary"
            disabled={scan.isPending || !url.trim()}
          >
            {scan.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Scanning…
              </>
            ) : (
              <>
                <Radar className="h-4 w-4" /> Scan
              </>
            )}
          </Button>
        </div>
        {scan.isPending && (
          <p className="mt-3 text-center font-mono text-xs text-primary radar-pulse">
            Probing security headers…
          </p>
        )}
      </form>

      {recent.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent scans
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <span>
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {recent.map((row) => (
              <Card
                key={row.id}
                className="border-border/70 bg-card/70 transition-colors hover:border-primary/40"
              >
                <CardContent className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <a
                      href={`/scans/${row.id}`}
                      className="block truncate font-mono text-sm text-foreground hover:text-primary"
                    >
                      {row.url}
                    </a>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(row.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-sm font-semibold ${gradeTone(row.grade)}`}>
                      {row.score}/100
                    </span>
                    <GradeBadge grade={row.grade} className="h-9 w-9 text-sm" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
