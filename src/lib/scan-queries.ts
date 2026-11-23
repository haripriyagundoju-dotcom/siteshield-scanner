import { queryOptions } from "@tanstack/react-query";

import { getScanHistory, type ScanSummary } from "@/lib/scans.functions";

export const scanHistoryKey = ["scan-history"] as const;

export const scanHistoryQueryOptions = queryOptions({
  queryKey: scanHistoryKey,
  queryFn: async (): Promise<ScanSummary[]> => getScanHistory(),
});

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
