// Tests for the static build, focused on the subscribe integration and on the
// invariants the site cannot afford to lose silently: no JavaScript on the
// page, no em or en dashes in the new copy, and byte-identical rebuilds.

import { beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");

async function runBuild(): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(["bun", "src/build.ts"], { cwd: ROOT, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { code: await proc.exited, stdout, stderr };
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir).sort()) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

function read(rel: string): string {
  return readFileSync(join(PUBLIC, rel), "utf8");
}

// The subscribe band on the homepage, isolated so the assertion cannot be
// satisfied by unrelated legacy copy elsewhere on the page.
function subscribeRegion(html: string): string {
  const start = html.indexOf('id="subscribe"');
  expect(start).toBeGreaterThan(-1);
  const end = html.indexOf("</section>", start);
  const stop = end === -1 ? html.indexOf("</form>", start) : end;
  return html.slice(start, stop === -1 ? html.length : stop);
}

let build: { code: number; stdout: string; stderr: string };

beforeAll(async () => {
  build = await runBuild();
});

describe("build", () => {
  test("exits clean with all guards green", () => {
    expect(build.stderr).toBe("");
    expect(build.code).toBe(0);
    expect(build.stdout).toContain("build: wrote");
  });
});

describe("subscribe band", () => {
  test("the homepage carries a plain form that posts to the service", () => {
    const html = read("index.html");
    expect(html).toContain('action="/subscribe"');
    expect(html).toContain('method="post"');
    expect(html).toContain('name="email"');
    expect(html).toContain('type="email"');
  });

  test("the blog index carries the same form", () => {
    const html = read("blog/index.html");
    expect(html).toContain('action="/subscribe"');
    expect(html).toContain('name="email"');
  });

  test("each form ships the honeypot field and its own source value", () => {
    const home = read("index.html");
    const blog = read("blog/index.html");
    expect(home).toContain('name="website"');
    expect(blog).toContain('name="website"');
    expect(home).toContain('name="source" value="/"');
    expect(blog).toContain('name="source" value="/blog/"');
  });

  test("the privacy line is present on both bands", () => {
    for (const page of ["index.html", "blog/index.html"]) {
      expect(read(page).toLowerCase()).toContain("unsubscribe by replying");
    }
  });

  test("the honeypot is hidden from people but reachable by bots", () => {
    const css = read("styles.css");
    expect(css).toContain(".sub-hp");
    const home = read("index.html");
    expect(home).toContain('tabindex="-1"');
    expect(home).toContain('autocomplete="off"');
  });

  test("no em or en dashes in the subscribe copy", () => {
    expect(/[–—]/.test(subscribeRegion(read("index.html")))).toBe(false);
    expect(/[–—]/.test(subscribeRegion(read("blog/index.html")))).toBe(false);
  });
});

describe("thanks page", () => {
  test("is emitted at /subscribed/", () => {
    expect(existsSync(join(PUBLIC, "subscribed", "index.html"))).toBe(true);
  });

  test("is noindex, thanks the reader, and links back", () => {
    const html = read("subscribed/index.html");
    expect(html).toMatch(/<meta name="robots" content="noindex[",]/);
    expect(html.toLowerCase()).toContain("you are on the list");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/blog/"');
  });

  test("carries no em or en dashes", () => {
    expect(/[–—]/.test(read("subscribed/index.html"))).toBe(false);
  });

  test("stays out of the sitemap", () => {
    expect(read("sitemap.xml")).not.toContain("/subscribed/");
  });
});

describe("graceful degradation", () => {
  // The form is the only thing on this site that depends on a running service.
  // These are the assertions that keep a dead service from becoming a dead end.

  test("both bands print a mailto fallback next to the form", () => {
    for (const page of ["index.html", "blog/index.html"]) {
      const region = subscribeRegion(read(page));
      expect(region).toContain("mailto:");
      expect(region.toLowerCase()).toContain("if the form fails");
    }
  });

  test("a service-down page is emitted for Caddy to serve on a proxy error", () => {
    const html = read("subscribe-unavailable/index.html");
    expect(html).toMatch(/<meta name="robots" content="noindex[",]/);
    expect(html.toLowerCase()).toContain("nothing was saved");
    expect(html).toContain("mailto:");
    expect(/[–—]/.test(html)).toBe(false);
    expect(read("sitemap.xml")).not.toContain("/subscribe-unavailable/");
  });

  test("the form needs no JavaScript: plain method, action and inputs only", () => {
    const home = read("index.html");
    // A form that only works when script runs is a form that silently loses
    // signups for every reader with script off or a blocked request.
    expect(home).toMatch(/<form class="sub-form" method="post" action="\/subscribe">/);
    expect(home).not.toContain("<script");
    expect(home).not.toMatch(/\son[a-z]+=/);
  });
});

describe("site invariants", () => {
  test("zero JavaScript ships on any emitted page", () => {
    for (const abs of walk(PUBLIC)) {
      if (!abs.endsWith(".html")) continue;
      const html = readFileSync(abs, "utf8");
      expect(html).not.toContain("<script");
      expect(html).not.toMatch(/\son[a-z]+=/);
    }
  });

  test("no page mentions Suretas (R-02 guard)", () => {
    for (const abs of walk(PUBLIC)) {
      if (!/\.(html|xml|css|txt)$/.test(abs)) continue;
      expect(/suretas/i.test(readFileSync(abs, "utf8"))).toBe(false);
    }
  });

  test("rebuilding produces byte-identical output", async () => {
    const before = new Map<string, string>();
    for (const abs of walk(PUBLIC)) {
      before.set(abs, new Bun.CryptoHasher("sha256").update(readFileSync(abs)).digest("hex"));
    }
    const second = await runBuild();
    expect(second.code).toBe(0);
    const after = walk(PUBLIC);
    expect(after).toHaveLength(before.size);
    for (const abs of after) {
      const hash = new Bun.CryptoHasher("sha256").update(readFileSync(abs)).digest("hex");
      expect(`${abs}:${hash}`).toBe(`${abs}:${before.get(abs)}`);
    }
  });
});
