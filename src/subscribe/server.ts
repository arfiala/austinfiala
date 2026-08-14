// Subscribe service for austinfiala.com. Bun + TypeScript, zero dependencies.
//
// Usage: bun src/subscribe/server.ts   (binds 127.0.0.1:4700)
//
// Scope, deliberately small:
//   POST /subscribe    form-encoded or JSON, stores one email in SQLite
//   GET  /export.csv   the whole list as CSV, bearer-token gated
//
// It sends NO email of any kind. austinfiala.com has no sending identity, so
// there is nothing here that could double as a mail path. Collecting the list
// and mailing the list are two separate decisions and this is only the first.
//
// It binds loopback only. Caddy proxies /subscribe and /export.csv to it; the
// rest of the site stays static files served straight off disk.

import { Database } from "bun:sqlite";

// --- Configuration --------------------------------------------------------

export interface SubscribeServerOptions {
  port: number;
  hostname?: string;
  dbPath: string;
  /** Bearer token for GET /export.csv. Null or empty means the route is 503. */
  adminToken?: string | null;
  /**
   * Whether to believe X-Real-IP / X-Forwarded-For for rate-limit keys.
   *
   * Default false, which is the fail-closed side. Turn it on ONLY when the
   * reverse proxy in front of this service sets X-Real-IP from the real TCP
   * peer (Caddy: `header_up X-Real-IP {remote_host}`). Without that line a
   * client supplies the header itself, mints a fresh bucket per request, and
   * the limiter is decoration. With it off, everything shares one bucket:
   * conservative, but never bypassable.
   */
  trustProxyIp?: boolean;
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
  /** Suppress startup logging in tests. */
  quiet?: boolean;
}

export interface SubscribeServer {
  port: number;
  db: Database;
  stop(): void;
}

export interface SubscriberRow {
  id: number;
  email: string;
  created_at: string;
  source: string;
}

const MAX_BODY_BYTES = 4096;
const MAX_EMAIL_LENGTH = 254;
const MAX_SOURCE_LENGTH = 128;
const THANKS_PATH = "/subscribed/";

// --- Email -----------------------------------------------------------------

// Deliberately permissive. The only address that truly validates is one that
// receives mail, so this rejects the obviously broken and lets the rest
// through rather than turning a signup box into a spec-compliance quiz.
const EMAIL_RE = /^[^\s@,;<>"]{1,64}@[^\s@,;<>".]+(\.[^\s@,;<>".]+)+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  const value = normalizeEmail(raw);
  if (value.length === 0 || value.length > MAX_EMAIL_LENGTH) return false;
  return EMAIL_RE.test(value);
}

// --- CSV -------------------------------------------------------------------

// A leading =, +, -, @, tab or CR makes a spreadsheet treat the cell as a
// formula when the export is opened. Prefixing with an apostrophe keeps the
// value readable and inert.
const FORMULA_LEAD = /^[=+\-@\t\r]/;

export function csvCell(value: string): string {
  const dangerous = FORMULA_LEAD.test(value);
  const body = dangerous ? `'${value}` : value;
  if (dangerous || /[",\n\r]/.test(body)) {
    return `"${body.replace(/"/g, '""')}"`;
  }
  return body;
}

export function toCsv(rows: SubscriberRow[]): string {
  const lines = ["id,email,created_at,source"];
  for (const r of rows) {
    lines.push([String(r.id), csvCell(r.email), csvCell(r.created_at), csvCell(r.source)].join(","));
  }
  return `${lines.join("\n")}\n`;
}

// --- Storage ---------------------------------------------------------------

export function openDb(path: string): Database {
  const db = new Database(path, { create: true });
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT '/'
    )
  `);
  return db;
}

// --- Rate limiting ---------------------------------------------------------

class SlidingWindow {
  private hits = new Map<string, number[]>();

  constructor(private max: number, private windowMs: number) {}

  /** True when the caller is within budget; records the hit. */
  allow(key: string, now: number): boolean {
    const cutoff = now - this.windowMs;
    const kept = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    if (kept.length >= this.max) {
      this.hits.set(key, kept);
      return false;
    }
    kept.push(now);
    this.hits.set(key, kept);
    if (this.hits.size > 5000) this.prune(cutoff);
    return true;
  }

  private prune(cutoff: number): void {
    for (const [key, times] of this.hits) {
      if (times.every((t) => t <= cutoff)) this.hits.delete(key);
    }
  }
}

// --- Request helpers -------------------------------------------------------

function clientKey(req: Request, socketIp: string, trustProxyIp: boolean): string {
  if (!trustProxyIp) return socketIp;
  const real = req.headers.get("x-real-ip");
  if (real && real.trim()) return real.trim().slice(0, 64);
  // X-Forwarded-For is an appendable list. The proxy appends the real peer, so
  // the LAST entry is the one a client cannot forge. Reading the first entry is
  // the classic bypass.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1].slice(0, 64);
  }
  return socketIp;
}

function wantsJson(req: Request): boolean {
  return (req.headers.get("content-type") ?? "").includes("application/json");
}

const HTML_HEAD =
  `<!doctype html><meta charset="utf-8">` +
  `<meta name="viewport" content="width=device-width, initial-scale=1">` +
  `<meta name="robots" content="noindex">`;

function htmlPage(title: string, body: string, status: number): Response {
  return new Response(
    `${HTML_HEAD}<title>${title}</title>` +
      `<body style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:34em;margin:12vh auto;padding:0 24px;line-height:1.6;color:#141917;background:#F7F8F6">` +
      `${body}<p><a href="/" style="color:#1E7A50">Back to austinfiala.com</a></p></body>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

function jsonResponse(status: number, body: unknown, subscribeStatus: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-subscribe-status": subscribeStatus,
      "cache-control": "no-store",
    },
  });
}

function redirectToThanks(subscribeStatus: string): Response {
  return new Response(null, {
    status: 303,
    headers: {
      location: THANKS_PATH,
      "x-subscribe-status": subscribeStatus,
      "cache-control": "no-store",
    },
  });
}

// Constant-time comparison so a wrong token cannot be narrowed byte by byte.
function tokenMatches(supplied: string, expected: string): boolean {
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function cleanSource(raw: string | undefined): string {
  if (!raw) return "/";
  // Strip control characters, keep it a short path-ish label.
  const stripped = Array.from(raw.trim())
    .filter((ch) => (ch.codePointAt(0) ?? 0) >= 0x20)
    .join("");
  if (!stripped) return "/";
  return stripped.slice(0, MAX_SOURCE_LENGTH);
}

// --- Server ----------------------------------------------------------------

export function createSubscribeServer(opts: SubscribeServerOptions): SubscribeServer {
  const db = openDb(opts.dbPath);
  const adminToken = opts.adminToken && opts.adminToken.length > 0 ? opts.adminToken : null;
  const trustProxyIp = opts.trustProxyIp ?? false;
  const limiter = new SlidingWindow(opts.rateLimitMax ?? 10, opts.rateLimitWindowMs ?? 60_000);

  const insert = db.query(
    "INSERT INTO subscribers (email, created_at, source) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING",
  );
  const selectAll = db.query("SELECT id, email, created_at, source FROM subscribers ORDER BY id");

  async function handleSubscribe(req: Request, ip: string): Promise<Response> {
    const asJson = wantsJson(req);

    const declared = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      return asJson
        ? jsonResponse(413, { ok: false, status: "too_large" }, "too_large")
        : htmlPage("Too large", "<p>That request was too large.</p>", 413);
    }

    if (!limiter.allow(ip, Date.now())) {
      return asJson
        ? jsonResponse(429, { ok: false, status: "rate_limited" }, "rate_limited")
        : htmlPage("Slow down", "<p>Too many attempts just now. Try again in a minute.</p>", 429);
    }

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return asJson
        ? jsonResponse(413, { ok: false, status: "too_large" }, "too_large")
        : htmlPage("Too large", "<p>That request was too large.</p>", 413);
    }

    let email = "";
    let honeypot = "";
    let source: string | undefined;
    if (asJson) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        email = typeof parsed.email === "string" ? parsed.email : "";
        honeypot = typeof parsed.website === "string" ? parsed.website : "";
        source = typeof parsed.source === "string" ? parsed.source : undefined;
      } catch {
        return jsonResponse(400, { ok: false, status: "bad_request" }, "bad_request");
      }
    } else {
      const params = new URLSearchParams(raw);
      email = params.get("email") ?? "";
      honeypot = params.get("website") ?? "";
      source = params.get("source") ?? undefined;
    }

    // Honeypot: a real person never sees this field, so anything in it is a
    // bot. Answer exactly as if the signup worked, and store nothing.
    if (honeypot.trim().length > 0) {
      return new Response(null, { status: 204, headers: { "x-subscribe-status": "dropped" } });
    }

    if (!isValidEmail(email)) {
      return asJson
        ? jsonResponse(400, { ok: false, status: "invalid_email" }, "invalid_email")
        : htmlPage(
            "Check that address",
            "<p>That address did not look right, so nothing was saved. Please go back and try again.</p>",
            400,
          );
    }

    const result = insert.run(normalizeEmail(email), new Date().toISOString(), cleanSource(source));
    const isNew = result.changes > 0;
    const status = isNew ? "subscribed" : "already_subscribed";
    // Log the outcome only. Addresses never reach stdout, journald, or a log file.
    console.log(`subscribe: ${status}`);

    return asJson ? jsonResponse(200, { ok: true, status }, status) : redirectToThanks(status);
  }

  function handleExport(req: Request): Response {
    if (!adminToken) {
      // No token configured means no export, never an open export.
      return new Response("export is not configured\n", {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    const auth = req.headers.get("authorization") ?? "";
    const supplied = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!supplied || !tokenMatches(supplied, adminToken)) {
      return new Response("unauthorized\n", {
        status: 401,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "www-authenticate": 'Bearer realm="subscribe"',
        },
      });
    }
    const rows = selectAll.all() as SubscriberRow[];
    console.log(`subscribe: export served (${rows.length} rows)`);
    return new Response(toCsv(rows), {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="subscribers.csv"',
        "cache-control": "no-store",
      },
    });
  }

  const server = Bun.serve({
    port: opts.port,
    hostname: opts.hostname ?? "127.0.0.1",
    async fetch(req, srv) {
      const { pathname } = new URL(req.url);
      const socketIp = srv.requestIP(req)?.address ?? "unknown";
      const ip = clientKey(req, socketIp, trustProxyIp);

      if (pathname === "/subscribe") {
        if (req.method !== "POST") {
          return new Response("method not allowed\n", {
            status: 405,
            headers: { allow: "POST", "content-type": "text/plain; charset=utf-8" },
          });
        }
        return handleSubscribe(req, ip);
      }

      if (pathname === "/export.csv") {
        if (req.method !== "GET") {
          return new Response("method not allowed\n", {
            status: 405,
            headers: { allow: "GET", "content-type": "text/plain; charset=utf-8" },
          });
        }
        return handleExport(req);
      }

      return new Response("not found\n", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    },
  });

  if (!opts.quiet) {
    console.log(`subscribe: listening on http://${server.hostname}:${server.port}`);
  }

  return {
    port: server.port,
    db,
    stop() {
      server.stop(true);
      db.close(false);
    },
  };
}

// --- Entry point -----------------------------------------------------------

if (import.meta.main) {
  const trustProxyIp = process.env.SUBSCRIBE_TRUST_PROXY_IP === "1";
  createSubscribeServer({
    port: Number(process.env.SUBSCRIBE_PORT ?? "4700"),
    hostname: "127.0.0.1",
    dbPath: process.env.SUBSCRIBERS_DB ?? "./subscribers.db",
    adminToken: process.env.ADMIN_TOKEN ?? null,
    trustProxyIp,
  });
  console.log(
    `subscribe: export ${process.env.ADMIN_TOKEN ? "enabled" : "disabled (ADMIN_TOKEN unset)"}, ` +
      `proxy IP ${trustProxyIp ? "trusted" : "not trusted"}`,
  );
}
