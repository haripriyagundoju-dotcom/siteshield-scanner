import { createFileRoute, Link, type ErrorComponentProps } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronLeft,
  Info,
  Loader2,
  ScanSearch,
  Trash2,
  XCircle,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GradeBadge, gradeTone } from "@/components/grade-badge";
import { deleteScan } from "@/lib/scans.functions";
import { scanHistoryKey, scanHistoryQueryOptions, formatDate } from "@/lib/scan-queries";

export const Route = createFileRoute("/_authenticated/history")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(scanHistoryQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Scan history — AegisScan" },
      {
        name: "description",
        content: "Every security scan you've run, with grades and results.",
      },
      { property: "og:title", content: "Scan history — AegisScan" },
      {
        property: "og:description",
        content: "Every security scan you've run, with grades and results.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
  errorComponent: HistoryError,
});

function HistoryError({ error }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-foreground">Couldn't load your history</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function HistoryPage() {
  const queryClient = useQueryClient();
  const { data: rows } = useSuspenseQuery(scanHistoryQueryOptions);

  const deleteScanFn = useServerFn(deleteScan);
  const del = useMutation({
    mutationFn: (id: string) => deleteScanFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scanHistoryKey });
      toast.success("Scan deleted.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Could not delete that scan.");
    },
  });

  const statusBadge = (status: string) => {
    if (status === "completed") {
      return (
        <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
          Completed
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
        Error
      </Badge>
    );
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Scan history</h1>
          <p className="mt-2 text-muted-foreground">
            Your last 100 scans. Results stay visible to you alone.
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard">
            <ScanSearch className="h-4 w-4" /> New scan
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card className="mt-8 border-dashed border-border/70 bg-card/50">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <ScanSearch className="h-10 w-10 text-muted-foreground/60" />
            <p className="mt-4 font-medium text-foreground">No scans yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Run your first scan from the dashboard.
            </p>
            <Button className="mt-6" asChild>
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-8 overflow-hidden border-border/70 bg-card/70">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Website</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-24 text-right">Score</TableHead>
                <TableHead className="w-20 text-center">Grade</TableHead>
                <TableHead className="w-44">Scanned</TableHead>
                <TableHead className="w-16 text-right">Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <a
                      href={`/scans/${row.id}`}
                      className="block max-w-[280px] truncate font-mono text-sm text-foreground hover:text-primary"
                    >
                      {row.url}
                    </a>
                  </TableCell>
                  <TableCell>{statusBadge(row.status)}</TableCell>
                  <TableCell className="text-right">
                    {row.status === "completed" ? (
                      <span className={`font-mono text-sm font-semibold ${gradeTone(row.grade)}`}>
                        {row.score}/100
                      </span>
                    ) : (
                      <span className="font-mono text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.status === "completed" ? (
                      <GradeBadge grade={row.grade} className="mx-auto h-8 w-8 text-sm" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(row.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={del.isPending}
                      onClick={() => del.mutate(row.id)}
                      aria-label={`Delete scan of ${row.url}`}
                    >
                      {del.isPending && del.variables === row.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ChevronLeft className="h-3.5 w-3.5" />
        Grades are a snapshot of the response headers at scan time — sites change, so re-scan after
        applying fixes.
      </p>
    </div>
  );
}
