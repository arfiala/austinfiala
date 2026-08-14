// Tests for the subscribe service. Zero dependencies, bun:test only.
//
// Every test gets its own scratch database path and its own port from the
// 4711..4719 range, so nothing here can touch the real subscribers.db and two
// tests can never fight over a listener.

import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createSubscribeServer,
  csvCell,
  isValidEmail,
  normalizeEmail,
  toCsv,
  type SubscribeServer,
} from "./server.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

const started: SubscribeServer[] = [];
const dbPaths: string[] = [];

function scratchDb(): string {
  const p = join(tmpdir(), `austinfiala-subscribe-test-${crypto.randomUUID()}.db`);
  dbPaths.push(p);
  return p;
}

// Ports are handed out from the reserved test range, never 4700 (the real one).
let nextPort = 4711;
function scratchPort(): number {
  const p = nextPort;
  nextPort += 1;
  if (nextPort > 4719) nextPort = 4711;
  return p;
}

function boot(opts: Partial<Parameters<typeof createSubscribeServer>[0]> = {}): SubscribeServer {
  const s = createSubscribeServer({
    port: opts.port ?? scratchPort(),
    hostname: "127.0.0.1",
    dbPath: opts.dbPath ?? scratchDb(),
    adminToken: opts.adminToken ?? null,
    trustProxyIp: opts.trustProxyIp ?? false,
    rateLimitMax: opts.rateLimitMax ?? 10,
    rateLimitWindowMs: opts.rateLimitWindowMs ?? 60_000,
    quiet: true,
  });
  started.push(s);
  return s;
}

function url(s: SubscribeServer, path: string): string {
  return `http://127.0.0.1:${s.port}${path}`;
}

function form(fields: Record<string, string>): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
    redirect: "manual",
  };
}

function json(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    redirect: "manual",
  };
}

afterEach(() => {
  for (const s of started.splice(0)) s.stop();
  for (const p of dbPaths.splice(0)) {
    for (const f of [p, `${p}-wal`, `${p}-shm`]) {
      if (existsSync(f)) rmSync(f, { force: true });
    }
  }
});

// --- Pure helpers ---------------------------------------------------------

describe("email validation", () => {
  test("accepts ordinary addresses", () => {
    for (const e of [
      "austin@example.com",
      "a.b+tag@sub.domain.co.uk",
      "UPPER@Example.COM",
      "x@y.io",
      "first_last@firm-name.com",
    ]) {
      expect(isValidEmail(e)).toBe(true);
    }
  });

  test("rejects garbage", () => {
    for (const e of [
      "",
      "   ",
      "no-at-sign",
      "@nolocal.com",
      "nodomain@",
      "no@tld",
      "two@@at.com",
      "spa ce@example.com",
      "trailing@dot.",
      "new\nline@example.com",
    ]) {
      expect(isValidEmail(e)).toBe(false);
    }
  });

  test("caps total length at 254 characters", () => {
    const local = "a".repeat(240);
    expect(isValidEmail(`${local}@example.com`)).toBe(false);
    expect(isValidEmail(`${"a".repeat(60)}@example.com`)).toBe(true);
  });

  test("normalizes case and surrounding whitespace", () => {
    expect(normalizeEmail("  Austin@Example.COM  ")).toBe("austin@example.com");
  });
});

describe("csv encoding", () => {
  test("quotes separators, quotes and newlines", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  test("defuses spreadsheet formula injection", () => {
    expect(csvCell("=SUM(A1)")).toBe(`"'=SUM(A1)"`);
    expect(csvCell("+1@example.com")).toBe(`"'+1@example.com"`);
    expect(csvCell("@cmd")).toBe(`"'@cmd"`);
  });

  test("emits a header row and one row per subscriber", () => {
    const csv = toCsv([
      { id: 1, email: "a@example.com", created_at: "2026-08-14T00:00:00.000Z", source: "/" },
      { id: 2, email: "b@example.com", created_at: "2026-08-14T00:00:01.000Z", source: "/blog/" },
    ]);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("id,email,created_at,source");
    expect(lines[1]).toBe("1,a@example.com,2026-08-14T00:00:00.000Z,/");
    expect(lines).toHaveLength(3);
  });
});

// --- POST /subscribe ------------------------------------------------------

describe("POST /subscribe", () => {
  test("form post stores the subscriber and redirects to the thanks page", async () => {
    const s = boot();
    const res = await fetch(url(s, "/subscribe"), form({ email: "Austin@Example.com", website: "", source: "/" }));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/subscribed/");
    expect(res.headers.get("x-subscribe-status")).toBe("subscribed");

    const rows = s.db.query("SELECT email, source FROM subscribers").all() as { email: string; source: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("austin@example.com");
    expect(rows[0].source).toBe("/");
  });

  test("json post stores the subscriber and answers with json", async () => {
    const s = boot();
    const res = await fetch(url(s, "/subscribe"), json({ email: "reader@example.com" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ ok: true, status: "subscribed" });
    expect(s.db.query("SELECT COUNT(*) AS n FROM subscribers").get()).toEqual({ n: 1 });
  });

  test("created_at is stored as an ISO timestamp", async () => {
    const s = boot();
    await fetch(url(s, "/subscribe"), json({ email: "stamp@example.com" }));
    const row = s.db.query("SELECT created_at FROM subscribers").get() as { created_at: string };
    expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  test("a filled honeypot is dropped silently with 204 and stores nothing", async () => {
    const s = boot();
    const res = await fetch(url(s, "/subscribe"), form({ email: "bot@example.com", website: "http://spam.example" }));
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(s.db.query("SELECT COUNT(*) AS n FROM subscribers").get()).toEqual({ n: 0 });

    const viaJson = await fetch(url(s, "/subscribe"), json({ email: "bot2@example.com", website: "x" }));
    expect(viaJson.status).toBe(204);
    expect(s.db.query("SELECT COUNT(*) AS n FROM subscribers").get()).toEqual({ n: 0 });
  });

  test("a duplicate is friendly, not an error, and never doubles a row", async () => {
    const s = boot();
    await fetch(url(s, "/subscribe"), json({ email: "dupe@example.com" }));

    const again = await fetch(url(s, "/subscribe"), json({ email: "  DUPE@example.com " }));
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual({ ok: true, status: "already_subscribed" });

    const viaForm = await fetch(url(s, "/subscribe"), form({ email: "dupe@example.com" }));
    expect(viaForm.status).toBe(303);
    expect(viaForm.headers.get("location")).toBe("/subscribed/");
    expect(viaForm.headers.get("x-subscribe-status")).toBe("already_subscribed");

    expect(s.db.query("SELECT COUNT(*) AS n FROM subscribers").get()).toEqual({ n: 1 });
  });

  test("an implausible address is rejected and stored nowhere", async () => {
    const s = boot();
    const res = await fetch(url(s, "/subscribe"), json({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, status: "invalid_email" });

    const viaForm = await fetch(url(s, "/subscribe"), form({ email: "also bad" }));
    expect(viaForm.status).toBe(400);
    expect(viaForm.headers.get("content-type")).toContain("text/html");

    expect(s.db.query("SELECT COUNT(*) AS n FROM subscribers").get()).toEqual({ n: 0 });
  });

  test("source is captured, capped and defaulted", async () => {
    const s = boot();
    await fetch(url(s, "/subscribe"), json({ email: "a@example.com", source: "/blog/" }));
    await fetch(url(s, "/subscribe"), json({ email: "b@example.com" }));
    await fetch(url(s, "/subscribe"), json({ email: "c@example.com", source: "/x".repeat(400) }));

    const rows = s.db.query("SELECT email, source FROM subscribers ORDER BY id").all() as
      { email: string; source: string }[];
    expect(rows[0].source).toBe("/blog/");
    expect(rows[1].source).toBe("/");
    expect(rows[2].source.length).toBeLessThanOrEqual(128);
  });

  test("an oversized body is refused before parsing", async () => {
    const s = boot();
    const res = await fetch(url(s, "/subscribe"), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `email=${"a".repeat(20_000)}%40example.com`,
      redirect: "manual",
    });
    expect(res.status).toBe(413);
    expect(s.db.query("SELECT COUNT(*) AS n FROM subscribers").get()).toEqual({ n: 0 });
  });

  test("GET /subscribe is not allowed and unknown paths are 404", async () => {
    const s = boot();
    expect((await fetch(url(s, "/subscribe"))).status).toBe(405);
    expect((await fetch(url(s, "/nope"))).status).toBe(404);
  });
});

// --- Rate limiting --------------------------------------------------------

describe("rate limiting", () => {
  test("the eleventh request in a window is refused", async () => {
    const s = boot({ rateLimitMax: 10 });
    const codes: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await fetch(url(s, "/subscribe"), json({ email: `rl${i}@example.com` }));
      codes.push(res.status);
    }
    expect(codes.slice(0, 10).every((c) => c === 200)).toBe(true);
    expect(codes[10]).toBe(429);
    expect(s.db.query("SELECT COUNT(*) AS n FROM subscribers").get()).toEqual({ n: 10 });
  });

  test("the window rolls forward", async () => {
    const s = boot({ rateLimitMax: 2, rateLimitWindowMs: 40 });
    await fetch(url(s, "/subscribe"), json({ email: "w1@example.com" }));
    await fetch(url(s, "/subscribe"), json({ email: "w2@example.com" }));
    expect((await fetch(url(s, "/subscribe"), json({ email: "w3@example.com" }))).status).toBe(429);
    await Bun.sleep(60);
    expect((await fetch(url(s, "/subscribe"), json({ email: "w3@example.com" }))).status).toBe(200);
  });

  test("proxy headers are ignored unless the proxy is explicitly trusted", async () => {
    // Fail closed. A forwarded header the operator has not vouched for must
    // never be able to mint a fresh bucket per request, which is exactly how a
    // limiter silently stops limiting.
    const s = boot({ rateLimitMax: 3 });
    const codes: number[] = [];
    for (let i = 0; i < 4; i++) {
      const res = await fetch(url(s, "/subscribe"), {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": `10.0.0.${i}` },
        body: JSON.stringify({ email: `spoof${i}@example.com` }),
        redirect: "manual",
      });
      codes.push(res.status);
    }
    expect(codes[3]).toBe(429);
  });

  test("with a trusted proxy, distinct client IPs get distinct buckets", async () => {
    const s = boot({ rateLimitMax: 2, trustProxyIp: true });
    const hit = (ip: string, email: string) =>
      fetch(url(s, "/subscribe"), {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": ip },
        body: JSON.stringify({ email }),
        redirect: "manual",
      });

    expect((await hit("203.0.113.9", "p1@example.com")).status).toBe(200);
    expect((await hit("203.0.113.9", "p2@example.com")).status).toBe(200);
    expect((await hit("203.0.113.9", "p3@example.com")).status).toBe(429);
    expect((await hit("198.51.100.4", "p4@example.com")).status).toBe(200);
  });
});

// --- GET /export.csv ------------------------------------------------------

describe("GET /export.csv", () => {
  test("is unavailable, never open, when no admin token is configured", async () => {
    const s = boot({ adminToken: null });
    const res = await fetch(url(s, "/export.csv"));
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain("@");
  });

  test("refuses a missing or wrong bearer token", async () => {
    const s = boot({ adminToken: "correct-horse-battery" });
    expect((await fetch(url(s, "/export.csv"))).status).toBe(401);
    expect(
      (await fetch(url(s, "/export.csv"), { headers: { authorization: "Bearer nope" } })).status,
    ).toBe(401);
    expect(
      (await fetch(url(s, "/export.csv"), { headers: { authorization: "Basic correct-horse-battery" } })).status,
    ).toBe(401);
  });

  test("returns every subscriber as CSV for the right token", async () => {
    const s = boot({ adminToken: "correct-horse-battery" });
    await fetch(url(s, "/subscribe"), json({ email: "one@example.com", source: "/" }));
    await fetch(url(s, "/subscribe"), json({ email: "two@example.com", source: "/blog/" }));

    const res = await fetch(url(s, "/export.csv"), {
      headers: { authorization: "Bearer correct-horse-battery" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const body = await res.text();
    const lines = body.trim().split("\n");
    expect(lines[0]).toBe("id,email,created_at,source");
    expect(body).toContain("one@example.com");
    expect(body).toContain("two@example.com");
    expect(lines).toHaveLength(3);
  });
});

// --- Persistence ----------------------------------------------------------

describe("persistence", () => {
  test("subscribers survive a restart on the same database file", async () => {
    const dbPath = scratchDb();
    const first = boot({ dbPath });
    await fetch(url(first, "/subscribe"), json({ email: "durable@example.com" }));
    first.stop();
    started.splice(started.indexOf(first), 1);

    const second = boot({ dbPath });
    const rows = second.db.query("SELECT email FROM subscribers").all() as { email: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("durable@example.com");
  });
});

// --- Source hygiene -------------------------------------------------------

describe("source hygiene", () => {
  const src = readFileSync(join(HERE, "server.ts"), "utf8");

  test("no em or en dashes anywhere in the service source", () => {
    expect(/[–—]/.test(src)).toBe(false);
  });

  test("no console output ever carries an email address", () => {
    const logLines = src.split("\n").filter((l) => /console\.(log|info|warn|error)/.test(l));
    expect(logLines.length).toBeGreaterThan(0);
    for (const line of logLines) {
      expect(/email/i.test(line)).toBe(false);
    }
  });
});
