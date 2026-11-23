// Server-only scan engine. Performs live HTTP header checks against a target
// site using worker-compatible fetch (no Node APIs, no filesystem access).

import type { CheckStatus, EngineResult, ScanCheck } from "@/lib/scan-types";

const REQUEST_HEADERS = {
  "user-agent": "Mozilla/5.0 (compatible; AegisScan/1.0; +security scanner)",
  accept: "text/html,application/xhtml+xml",
};

function normalizeTarget(raw: string): { url?: string; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { error: "Enter a website URL to scan." };

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { error: "That doesn't look like a valid website address." };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { error: "Only http(s) website addresses can be scanned." };
  }

  const host = parsed.hostname.toLowerCase();
  if (!host || !host.includes(".")) {
    return { error: "Enter a public website address, like example.com." };
  }
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return { error: "Only public websites can be scanned." };
  }
  if (
    /^(10\.|127\.|169\.254\.|192\.168\.|0\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "::1" ||
    host.startsWith("[fc") ||
    host.startsWith("[fd") ||
    host.startsWith("[fe")
  ) {
    return { error: "Only public websites can be scanned." };
  }

  return { url: parsed.toString() };
}

function gradeFor(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function safeGetCookies(headers: Headers): string[] {
  try {
    if (typeof headers.getSetCookie === "function") {
      return headers.getSetCookie();
    }
  } catch {
    // fall through
  }
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function checkHttps(finalUrl: string): ScanCheck {
  const isHttps = finalUrl.startsWith("https://");
  let detail: string;
  if (isHttps) {
    let host = "";
    try {
      host = new URL(finalUrl).host;
    } catch {
      host = "the site";
    }
    detail = `The site is served over HTTPS (${host}).`;
  } else {
    detail =
      "The site is not served over HTTPS, so traffic can be read or altered while in transit.";
  }
  return {
    key: "https",
    label: "HTTPS encryption",
    status: isHttps ? "pass" : "fail",
    weight: 15,
    earned: isHttps ? 15 : 0,
    detail,
    fix: "Install a TLS certificate and serve the whole site over HTTPS, then redirect any HTTP traffic to HTTPS. Free certificates are available from Let's Encrypt or are built into most hosting providers.",
  };
}

async function checkHttpUpgrade(host: string): Promise<ScanCheck> {
  const weight = 5;
  try {
    const res = await fetch(`http://${host}/`, {
      redirect: "manual",
      headers: REQUEST_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    await res.body?.cancel();
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location?.startsWith("https://")) {
      return {
        key: "http-upgrade",
        label: "HTTP to HTTPS redirect",
        status: "pass",
        weight,
        earned: weight,
        detail:
          "Visitors who type the plain http address are redirected to the secure HTTPS version.",
        fix: "",
      };
    }
    if (res.status >= 200 && res.status < 400) {
      return {
        key: "http-upgrade",
        label: "HTTP to HTTPS redirect",
        status: "fail",
        weight,
        earned: 0,
        detail: "The site still responds over plain HTTP without redirecting to HTTPS.",
        fix: "Set up a permanent redirect (301) from every HTTP address to its HTTPS equivalent, including the www variant if used.",
      };
    }
    return {
      key: "http-upgrade",
      label: "HTTP to HTTPS redirect",
      status: "pass",
      weight,
      earned: weight,
      detail: `Plain HTTP does not serve content (status ${res.status}).`,
      fix: "",
    };
  } catch {
    return {
      key: "http-upgrade",
      label: "HTTP to HTTPS redirect",
      status: "pass",
      weight,
      earned: weight,
      detail: "Plain HTTP does not answer, so insecure traffic is not possible.",
      fix: "",
    };
  }
}

function checkHsts(headers: Headers): ScanCheck {
  const weight = 15;
  const value = headers.get("strict-transport-security");
  const maxAge = value ? Number(/max-age=(\d+)/i.exec(value)?.[1] ?? "0") : 0;
  if (maxAge >= 15552000) {
    return {
      key: "hsts",
      label: "HSTS (Strict-Transport-Security)",
      status: "pass",
      weight,
      earned: weight,
      detail: `Browsers are told to use HTTPS only for the next ${Math.round(maxAge / 86400000)} days.`,
      fix: "",
    };
  }
  if (value) {
    return {
      key: "hsts",
      label: "HSTS (Strict-Transport-Security)",
      status: "warn",
      weight,
      earned: Math.round(weight / 2),
      detail: "HSTS is present but the max-age setting is shorter than the recommended 180 days.",
      fix: "Raise the max-age in your Strict-Transport-Security header to at least 15552000 (180 days) and consider adding the includeSubDomains and preload directives.",
    };
  }
  return {
    key: "hsts",
    label: "HSTS (Strict-Transport-Security)",
    status: "fail",
    weight,
    earned: 0,
    detail: "The site does not tell browsers to refuse unencrypted connections on future visits.",
    fix: "Send a Strict-Transport-Security header with max-age=63072000; includeSubDomains; preload once the whole site is reliably served over HTTPS.",
  };
}

function checkCsp(headers: Headers): ScanCheck {
  const weight = 15;
  const csp = headers.get("content-security-policy");
  if (!csp) {
    return {
      key: "csp",
      label: "Content-Security-Policy",
      status: "fail",
      weight,
      earned: 0,
      detail:
        "No content security policy was found, leaving the site more open to cross-site scripting attacks.",
      fix: "Add a Content-Security-Policy header. Start with a report-only policy, then tighten it, for example: default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'self'.",
    };
  }
  if (/unsafe-inline|unsafe-eval/.test(csp)) {
    return {
      key: "csp",
      label: "Content-Security-Policy",
      status: "warn",
      weight,
      earned: Math.round(weight / 2),
      detail:
        "A policy is present but allows 'unsafe-inline' or 'unsafe-eval', which weakens protection against script injection.",
      fix: "Move inline scripts into external files or use nonces/hashes, then remove 'unsafe-inline' and 'unsafe-eval' from the script-src directive.",
    };
  }
  return {
    key: "csp",
    label: "Content-Security-Policy",
    status: "pass",
    weight,
    earned: weight,
    detail: "A content security policy is in place to limit what scripts the page can load.",
    fix: "",
  };
}

function checkXcto(headers: Headers): ScanCheck {
  const weight = 10;
  const value = headers.get("x-content-type-options");
  const pass = /nosniff/i.test(value ?? "");
  return {
    key: "xcto",
    label: "X-Content-Type-Options",
    status: pass ? "pass" : "fail",
    weight,
    earned: pass ? weight : 0,
    detail: pass
      ? "Browsers are told not to guess file types, reducing MIME confusion attacks."
      : "Browsers may guess the type of responses, which can be abused to run uploaded files as scripts.",
    fix: "Send the header X-Content-Type-Options: nosniff on every response.",
  };
}

function checkFraming(headers: Headers): ScanCheck {
  const weight = 10;
  const xfo = (headers.get("x-frame-options") ?? "").toLowerCase();
  const csp = headers.get("content-security-policy") ?? "";
  const frameAncestors = /frame-ancestors[^;]*/i.exec(csp)?.[0] ?? "";
  const xfoPass = xfo.includes("deny") || xfo.includes("sameorigin");
  const cspPass = frameAncestors.includes("'none'") || frameAncestors.includes("'self'");
  const pass = xfoPass || cspPass;
  return {
    key: "framing",
    label: "Clickjacking protection",
    status: pass ? "pass" : "fail",
    weight,
    earned: pass ? weight : 0,
    detail: pass
      ? "Other sites are blocked from embedding this site in an invisible frame."
      : "The page can be embedded in an invisible frame on another site, enabling clickjacking attacks.",
    fix: "Send either X-Frame-Options: DENY (or SAMEORIGIN) or add frame-ancestors 'none' (or 'self') to your Content-Security-Policy.",
  };
}

function checkReferrer(headers: Headers): ScanCheck {
  const weight = 10;
  const value = (headers.get("referrer-policy") ?? "").toLowerCase();
  const safe = ["no-referrer", "same-origin", "strict-origin", "strict-origin-when-cross-origin"];
  const pass = safe.includes(value);
  return {
    key: "referrer",
    label: "Referrer-Policy",
    status: pass ? "pass" : "fail",
    weight,
    earned: pass ? weight : 0,
    detail: pass
      ? "The site controls how much address information leaks to other sites through the referrer."
      : value
        ? `The referrer policy "${value}" leaks more address information to other sites than necessary.`
        : "No referrer policy is set, so full page addresses can leak to other sites.",
    fix: "Send the header Referrer-Policy: strict-origin-when-cross-origin (or the stricter no-referrer).",
  };
}

function checkCookies(cookies: string[]): ScanCheck {
  const weight = 10;
  if (cookies.length === 0) {
    return {
      key: "cookies",
      label: "Cookie security flags",
      status: "info",
      weight,
      earned: weight,
      detail: "No cookies were set in the response we received, so there is nothing to flag.",
      fix: "",
    };
  }
  let missingSecure = 0;
  let missingHttpOnly = 0;
  let missingSameSite = 0;
  for (const cookie of cookies) {
    const c = cookie.toLowerCase();
    if (!c.includes("secure")) missingSecure += 1;
    if (!c.includes("httponly")) missingHttpOnly += 1;
    if (!c.includes("samesite")) missingSameSite += 1;
  }
  const pass = missingSecure === 0 && missingHttpOnly === 0 && missingSameSite === 0;
  const parts: string[] = [];
  if (missingSecure) parts.push(`${missingSecure} missing the Secure flag`);
  if (missingHttpOnly) parts.push(`${missingHttpOnly} not HttpOnly`);
  if (missingSameSite) parts.push(`${missingSameSite} without a SameSite setting`);
  return {
    key: "cookies",
    label: "Cookie security flags",
    status: pass ? "pass" : "fail",
    weight,
    earned: pass ? weight : 0,
    detail: pass
      ? `All ${cookies.length} cookie(s) use Secure, HttpOnly and SameSite.`
      : `Out of ${cookies.length} cookie(s): ${parts.join(", ")}.`,
    fix: "Set Secure (HTTPS-only), HttpOnly (blocks JavaScript access) and SameSite=Lax or Strict on every cookie your site sets.",
  };
}

function checkServerDisclosure(headers: Headers): ScanCheck {
  const weight = 5;
  const server = headers.get("server") ?? "";
  if (/nginx|apache|iis|express|php|asp\.net|tomcat|jetty/i.test(server)) {
    return {
      key: "server",
      label: "Server software disclosure",
      status: "warn",
      weight,
      earned: 0,
      detail: `The Server header reveals the software in use: "${server}". Attackers use this to target known vulnerabilities.`,
      fix: "Configure your web server to omit the Server header or set it to a generic value, and disable version tokens.",
    };
  }
  return {
    key: "server",
    label: "Server software disclosure",
    status: "pass",
    weight,
    earned: weight,
    detail: "The response does not reveal which server software runs the site.",
    fix: "",
  };
}

function checkPermissionsPolicy(headers: Headers): ScanCheck {
  const weight = 5;
  const value = headers.get("permissions-policy") ?? headers.get("feature-policy");
  const pass = Boolean(value);
  return {
    key: "permissions",
    label: "Permissions-Policy",
    status: pass ? "pass" : "fail",
    weight,
    earned: pass ? weight : 0,
    detail: pass
      ? "The site declares which browser features (camera, microphone, geolocation) it allows."
      : "The site does not restrict powerful browser features like camera or geolocation access.",
    fix: "Send a Permissions-Policy header, for example: camera=(), microphone=(), geolocation=().",
  };
}

export async function runScanForUrl(raw: string): Promise<EngineResult> {
  const target = normalizeTarget(raw);
  if (!target.url) {
    return {
      url: raw.trim(),
      finalUrl: null,
      grade: "N/A",
      score: 0,
      checks: [],
      error: target.error ?? null,
    };
  }

  let res: Response;
  try {
    res = await fetch(target.url, {
      redirect: "follow",
      headers: REQUEST_HEADERS,
      signal: AbortSignal.timeout(12000),
    });
    await res.body?.cancel();
  } catch (err) {
    const message =
      err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")
        ? "The site took too long to respond."
        : "We couldn't reach that site. Check the address and try again.";
    return { url: target.url, finalUrl: null, grade: "N/A", score: 0, checks: [], error: message };
  }

  const headers = res.headers;
  const finalUrl = res.url || target.url;
  const cookies = safeGetCookies(headers);

  const checks: ScanCheck[] = [
    checkHttps(finalUrl),
    await checkHttpUpgrade(new URL(finalUrl).host),
    checkHsts(headers),
    checkCsp(headers),
    checkXcto(headers),
    checkFraming(headers),
    checkReferrer(headers),
    checkCookies(cookies),
    checkServerDisclosure(headers),
    checkPermissionsPolicy(headers),
  ];

  const score = Math.round(checks.reduce((sum, check) => sum + check.earned, 0));
  const grade = gradeFor(score);

  return { url: target.url, finalUrl, grade, score, checks, error: null };
}
