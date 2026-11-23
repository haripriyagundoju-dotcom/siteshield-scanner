// Shared, client-safe types for the security scan engine and results UI.

export type CheckStatus = "pass" | "warn" | "fail" | "info";

export interface ScanCheck {
  key: string;
  label: string;
  status: CheckStatus;
  /** Weight this check contributes to the total score (0-100 across all checks). */
  weight: number;
  /** Points earned for this check. */
  earned: number;
  /** What was found on the scanned site, in plain language. */
  detail: string;
  /** How to fix it, when the check did not fully pass. */
  fix: string;
}

export interface EngineResult {
  url: string;
  finalUrl: string | null;
  grade: string;
  score: number;
  checks: ScanCheck[];
  error: string | null;
}
