import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { Json, Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ScanCheck } from "@/lib/scan-types";

type ScanRow = Database["public"]["Tables"]["scans"]["Row"];
export type ScanSummary = Pick<ScanRow, "id" | "url" | "grade" | "score" | "status" | "created_at">;

// In-memory cache for guest/anonymous scans (no email login required)
const guestScans = new Map<string, ScanRow>();

export const runScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { url: string }) => {
    if (!input || typeof input.url !== "string") {
      throw new Error("A website URL is required.");
    }
    return { url: input.url.trim().slice(0, 2048) };
  })
  .handler(async ({ data, context }) => {
    const { runScanForUrl } = await import("@/lib/scan-engine.server");
    const result = await runScanForUrl(data.url);

    // If a logged-in Supabase user exists, try saving to Supabase
    if (context.supabase && context.userId && context.userId !== "guest") {
      try {
        const { data: row, error } = await context.supabase
          .from("scans")
          .insert({
            user_id: context.userId,
            url: result.url,
            final_url: result.finalUrl,
            grade: result.grade,
            score: result.score,
            checks: result.checks as unknown as Json,
            status: result.error ? "error" : "completed",
            error_message: result.error,
          })
          .select()
          .single();

        if (!error && row) {
          return row as ScanRow;
        }
      } catch (err) {
        console.warn("Could not save to Supabase, falling back to local memory store:", err);
      }
    }

    // Guest scan (runs without email or database login)
    const guestRow: ScanRow = {
      id: crypto.randomUUID(),
      user_id: "00000000-0000-0000-0000-000000000000",
      url: result.url,
      final_url: result.finalUrl,
      grade: result.grade,
      score: result.score,
      checks: result.checks as unknown as Json,
      status: result.error ? "error" : "completed",
      error_message: result.error,
      created_at: new Date().toISOString(),
    };
    guestScans.set(guestRow.id, guestRow);
    return guestRow;
  });

export const getScan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    if (guestScans.has(data.id)) {
      return guestScans.get(data.id)!;
    }

    if (context.supabase && context.userId && context.userId !== "guest") {
      try {
        const { data: row, error } = await context.supabase
          .from("scans")
          .select("*")
          .eq("id", data.id)
          .eq("user_id", context.userId)
          .maybeSingle();
        if (!error && row) return row as ScanRow;
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

export const getScanHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const list: ScanSummary[] = Array.from(guestScans.values()).map((s) => ({
      id: s.id,
      url: s.url,
      grade: s.grade,
      score: s.score,
      status: s.status,
      created_at: s.created_at,
    }));

    if (context.supabase && context.userId && context.userId !== "guest") {
      try {
        const { data, error } = await context.supabase
          .from("scans")
          .select("id, url, grade, score, status, created_at")
          .eq("user_id", context.userId)
          .order("created_at", { ascending: false })
          .limit(100);
        if (!error && data) {
          list.push(...(data as ScanSummary[]));
        }
      } catch (e) {
        console.error(e);
      }
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });

export const deleteScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    if (guestScans.has(data.id)) {
      guestScans.delete(data.id);
      return { ok: true };
    }

    if (context.supabase && context.userId && context.userId !== "guest") {
      const { error } = await context.supabase
        .from("scans")
        .delete()
        .eq("id", data.id)
        .eq("user_id", context.userId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
