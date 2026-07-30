// Deterministic static-site build. Bun + TypeScript, zero dependencies.
// Usage: bun src/build.ts  ->  emits public/index.html + public/styles.css
// Exits non-zero if any content file is missing.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { site } from "../content/site.ts";
import { projects } from "../content/projects.ts";
import { services } from "../content/services.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "content");
const PUBLIC = join(ROOT, "public");
const FONTS = join(PUBLIC, "fonts");

function die(msg: string): never {
  console.error(`build: ${msg}`);
  process.exit(1);
}

function readContent(relPath: string): string {
  const abs = join(CONTENT, relPath);
  if (!existsSync(abs)) die(`missing content file: ${relPath}`);
  return readFileSync(abs, "utf8");
}

// Escape HTML from content files so copy is rendered as text, never markup.
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Attribute-safe URL (href values come from typed config, still escaped).
function escAttr(s: string): string {
  return esc(s);
}

// --- Parse markdown content (simple, purpose-built) ---
const nowRaw = readContent("now.md").trim();
if (!nowRaw) die("now.md is empty");
const nowLines = nowRaw.split("\n").map((l) => l.trim()).filter(Boolean);
const nowStamp = nowLines[0];
const nowBullets = nowLines.slice(1).map((l) => l.replace(/^-\s+/, ""));
if (nowBullets.length === 0) die("now.md has no bullets");

const aboutRaw = readContent("about.md").trim();
if (!aboutRaw) die("about.md is empty");
const aboutParagraph = aboutRaw.split("\n\n")[0].replace(/\n/g, " ").trim();

// --- Fonts: self-hosted if all six woff2 present, else system fallback ---
const fontFiles = [
  "space-grotesk-400.woff2",
  "space-grotesk-500.woff2",
  "space-grotesk-700.woff2",
  "inter-400.woff2",
  "inter-500.woff2",
  "inter-700.woff2",
];
const fontsSelfHosted = fontFiles.every((f) => existsSync(join(FONTS, f)));

// --- Favicon: inline-SVG data URI, evergreen square with AF monogram ---
const faviconSvg =
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>` +
  `<rect width='32' height='32' rx='6' fill='%230B3D2E'/>` +
  `<text x='16' y='21' font-family='sans-serif' font-size='14' font-weight='700' ` +
  `fill='%232BB673' text-anchor='middle'>AF</text></svg>`;
const faviconHref = `data:image/svg+xml,${faviconSvg}`;

// --- HTML building blocks ---
function linkList(links: { label: string; href: string }[], cls: string): string {
  const items = links
    .map(
      (l) =>
        `<a class="${cls}" href="${escAttr(l.href)}">${esc(l.label)}</a>`,
    )
    .join("\n        ");
  return items;
}

const heroLinks = linkList(site.links, "hero-link");
const footerLinks = linkList(site.footerLinks, "footer-link");

const nowItems = nowBullets
  .map((b) => `        <li>${esc(b)}</li>`)
  .join("\n");

const projectCards = projects
  .map((p) => {
    const tags = p.tags
      .map((t) => `<li class="tag">${esc(t)}</li>`)
      .join("\n            ");
    return `      <article class="card">
        <div class="card-head">
          <h3 class="card-title">${esc(p.name)}</h3>
          <span class="status">${esc(p.status)}</span>
        </div>
        <p class="card-desc">${esc(p.description)}</p>
        <ul class="tags">
            ${tags}
        </ul>
      </article>`;
  })
  .join("\n");

const serviceItems = services.items
  .map((s) => `        <li>${esc(s)}</li>`)
  .join("\n");

const metaDescription = esc(site.tagline);

const html = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Austin Fiala — Cybersecurity Consultant</title>
<meta name="description" content="${metaDescription}">
<link rel="icon" href="${faviconHref}">
<link rel="stylesheet" href="styles.css">

<header class="hero">
  <div class="hero-inner wrap">
    <p class="eyebrow">${esc(site.location)}</p>
    <h1 class="hero-name">${esc(site.name)}</h1>
    <p class="hero-tagline">${esc(site.tagline)}</p>
    <nav class="hero-links" aria-label="Primary">
        ${heroLinks}
    </nav>
  </div>
</header>

<main class="wrap">
  <section class="section" id="now" aria-labelledby="now-h">
    <h2 class="section-title" id="now-h">Now</h2>
    <p class="stamp">${esc(nowStamp)}</p>
    <ul class="now-list">
${nowItems}
    </ul>
  </section>

  <hr class="rule">

  <section class="section" id="projects" aria-labelledby="projects-h">
    <h2 class="section-title" id="projects-h">Projects</h2>
    <div class="card-grid">
${projectCards}
    </div>
  </section>

  <hr class="rule">

  <section class="section" id="services" aria-labelledby="services-h">
    <h2 class="section-title" id="services-h">Work with me</h2>
    <p class="lede">${esc(services.intro)}</p>
    <ul class="service-list">
${serviceItems}
    </ul>
    <p class="cta-row">
      <a class="cta" href="${escAttr(services.ctaEmail)}">${esc(services.ctaLabel)}</a>
    </p>
  </section>

  <hr class="rule">

  <section class="section" id="about" aria-labelledby="about-h">
    <h2 class="section-title" id="about-h">About</h2>
    <p class="about">${esc(aboutParagraph)}</p>
  </section>
</main>

<footer class="footer">
  <div class="wrap footer-inner">
    <p class="copyright">© 2026 Austin Fiala</p>
    <nav class="footer-links" aria-label="Footer">
        ${footerLinks}
    </nav>
  </div>
</footer>
`;

// --- Blog ---
// Posts are markdown files in content/blog/, filename is the slug.
// Front matter block (--- title / date ---) is required; build dies without it.

interface BlogPost {
  slug: string;
  title: string;
  dateIso: string;
  dateHuman: string;
  bodyHtml: string;
  summary: string;
}

const BLOG = join(CONTENT, "blog");
const SITE_URL = "https://austinfiala.com";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function humanDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

function rfc822(iso: string): string {
  const dt = new Date(`${iso}T00:00:00Z`);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const mons = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[dt.getUTCDay()]}, ${String(dt.getUTCDate()).padStart(2, "0")} ` +
    `${mons[dt.getUTCMonth()]} ${dt.getUTCFullYear()} 00:00:00 GMT`;
}

// Only these href shapes are allowed in post links; anything else stays literal text.
function safeHref(url: string): string | null {
  return /^(https?:\/\/|mailto:|\/|#)/.test(url) ? url : null;
}

// Inline markdown applied to ALREADY-ESCAPED text: code spans, links, bold, italic.
// Code spans are lifted out first so their contents skip the other transforms.
function inlineMd(escaped: string): string {
  const codeSpans: string[] = [];
  let out = escaped.replace(/`([^`]+)`/g, (_m, code: string) => {
    codeSpans.push(`<code>${code}</code>`);
    return `@@CODESPAN${codeSpans.length - 1}@@`;
  });
  out = out.replace(/\[([^\]]+)\]\(([^()\s]+)\)/g, (m: string, text: string, url: string) => {
    const href = safeHref(url);
    return href ? `<a href="${href}">${text}</a>` : m;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return out.replace(/@@CODESPAN(\d+)@@/g, (_m, i: string) => codeSpans[Number(i)]);
}

// Purpose-built block renderer: paragraphs, ##/### headings, bullet lists,
// fenced code blocks. Escape-first everywhere; unknown constructs render as text.
function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }
    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { code.push(lines[i]); i++; }
      i++;
      out.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`);
      continue;
    }
    if (line.startsWith("### ")) { out.push(`<h3>${inlineMd(esc(line.slice(4).trim()))}</h3>`); i++; continue; }
    if (line.startsWith("## ")) { out.push(`<h2>${inlineMd(esc(line.slice(3).trim()))}</h2>`); i++; continue; }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(`  <li>${inlineMd(esc(lines[i].slice(2).trim()))}</li>`);
        i++;
      }
      out.push(`<ul>\n${items.join("\n")}\n</ul>`);
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length && lines[i].trim() !== "" &&
      !lines[i].startsWith("- ") && !lines[i].startsWith("## ") &&
      !lines[i].startsWith("### ") && !lines[i].startsWith("```")
    ) {
      para.push(lines[i].trim());
      i++;
    }
    out.push(`<p>${inlineMd(esc(para.join(" ")))}</p>`);
  }
  return out.join("\n");
}

function parsePost(filename: string): BlogPost {
  const slug = filename.replace(/\.md$/, "");
  if (!/^[a-z0-9-]+$/.test(slug)) {
    die(`blog: bad slug "${slug}" (filenames must be lowercase a-z, 0-9, hyphens)`);
  }
  const raw = readFileSync(join(BLOG, filename), "utf8").trim();
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) die(`blog: ${filename} missing front matter (--- title/date block)`);
  const fm: Record<string, string> = {};
  for (const l of m[1].split("\n")) {
    const idx = l.indexOf(":");
    if (idx > 0) fm[l.slice(0, idx).trim()] = l.slice(idx + 1).trim();
  }
  if (!fm.title) die(`blog: ${filename} front matter missing title`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.date ?? "")) die(`blog: ${filename} date must be YYYY-MM-DD`);
  const body = m[2].trim();
  if (!body) die(`blog: ${filename} has no body`);
  const firstPara = body.split("\n\n")[0].replace(/\n/g, " ").trim();
  const summary = firstPara.replace(/\]\([^)]*\)/g, "]").replace(/[#*`\[\]]/g, "").trim();
  return {
    slug,
    title: fm.title,
    dateIso: fm.date,
    dateHuman: humanDate(fm.date),
    bodyHtml: renderMarkdown(body),
    summary,
  };
}

if (!existsSync(BLOG)) die("blog: content/blog/ is missing");
const posts: BlogPost[] = readdirSync(BLOG)
  .filter((f) => f.endsWith(".md"))
  .map(parsePost)
  .sort((a, b) => (a.dateIso < b.dateIso ? 1 : -1));
if (posts.length === 0) die("blog: content/blog/ has no posts (the blog never ships empty)");

const blogDescription = "Notes on cybersecurity, risk, and building simple systems.";

function pageShell(title: string, description: string, body: string): string {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="icon" href="${faviconHref}">
<link rel="alternate" type="application/rss+xml" title="Austin Fiala Blog" href="/blog/feed.xml">
<link rel="stylesheet" href="/styles.css">

${body}
`;
}

const blogHeader = `<header class="subhero">
  <div class="wrap subhero-inner">
    <a class="crumb" href="/">Austin Fiala</a>
    <span class="crumb-sep">/</span>
    <a class="crumb" href="/blog/">Blog</a>
  </div>
</header>`;

const blogFooter = `<footer class="footer">
  <div class="wrap footer-inner">
    <p class="copyright">© 2026 Austin Fiala</p>
    <nav class="footer-links" aria-label="Footer">
        ${footerLinks}
    </nav>
  </div>
</footer>`;

const postItems = posts
  .map(
    (p) => `      <li>
        <span class="post-date">${esc(p.dateHuman)}</span>
        <a class="post-link" href="/blog/${p.slug}/">${esc(p.title)}</a>
      </li>`,
  )
  .join("\n");

const blogIndexHtml = pageShell(
  "Blog | Austin Fiala",
  blogDescription,
  `${blogHeader}

<main class="wrap">
  <section class="section" aria-labelledby="blog-h">
    <h1 class="section-title" id="blog-h">Blog</h1>
    <p class="lede">${esc(blogDescription)}</p>
    <ul class="post-list">
${postItems}
    </ul>
    <p class="feed-note"><a href="/blog/feed.xml">RSS feed</a></p>
  </section>
</main>

${blogFooter}`,
);

function postPage(p: BlogPost): string {
  return pageShell(
    `${p.title} | Austin Fiala`,
    p.summary,
    `${blogHeader}

<main class="wrap">
  <article class="section post">
    <p class="stamp">${esc(p.dateHuman)}</p>
    <h1 class="post-title">${esc(p.title)}</h1>
${p.bodyHtml}
    <p class="crumbs"><a href="/blog/">All posts</a> · <a href="/">Home</a></p>
  </article>
</main>

${blogFooter}`,
  );
}

const feedItems = posts
  .map(
    (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE_URL}/blog/${p.slug}/</link>
      <guid>${SITE_URL}/blog/${p.slug}/</guid>
      <pubDate>${rfc822(p.dateIso)}</pubDate>
      <description>${esc(p.summary)}</description>
    </item>`,
  )
  .join("\n");

const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Austin Fiala Blog</title>
    <link>${SITE_URL}/blog/</link>
    <atom:link href="${SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml"/>
    <description>${esc(blogDescription)}</description>
    <language>en-us</language>
    <lastBuildDate>${rfc822(posts[0].dateIso)}</lastBuildDate>
${feedItems}
  </channel>
</rss>
`;

// --- CSS ---
const gridSvg =
  `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'>` +
  `<path d='M48 0H0V48' fill='none' stroke='%232BB673' stroke-width='0.75'/>` +
  `</svg>`;

const fontFace = fontsSelfHosted
  ? `@font-face{font-family:"Space Grotesk";font-style:normal;font-weight:400;font-display:swap;src:url("fonts/space-grotesk-400.woff2") format("woff2");}
@font-face{font-family:"Space Grotesk";font-style:normal;font-weight:500;font-display:swap;src:url("fonts/space-grotesk-500.woff2") format("woff2");}
@font-face{font-family:"Space Grotesk";font-style:normal;font-weight:700;font-display:swap;src:url("fonts/space-grotesk-700.woff2") format("woff2");}
@font-face{font-family:"Inter";font-style:normal;font-weight:400;font-display:swap;src:url("fonts/inter-400.woff2") format("woff2");}
@font-face{font-family:"Inter";font-style:normal;font-weight:500;font-display:swap;src:url("fonts/inter-500.woff2") format("woff2");}
@font-face{font-family:"Inter";font-style:normal;font-weight:700;font-display:swap;src:url("fonts/inter-700.woff2") format("woff2");}

`
  : "";

const css = `${fontFace}:root{
  --evergreen:#0B3D2E;
  --emerald:#2BB673;
  --offwhite:#F7F8F6;
  --ink:#141917;
  --link:#1E7A50; /* AA-passing green for body-size link text on off-white */
  --tint:rgba(43,182,115,0.10);
  --space:8px;
  --font-head:"Space Grotesk",ui-sans-serif,system-ui,sans-serif;
  --font-body:"Inter",ui-sans-serif,system-ui,sans-serif;
}

*{box-sizing:border-box;}
html{-webkit-text-size-adjust:100%;}
body{
  margin:0;
  background:var(--offwhite);
  color:var(--ink);
  font-family:var(--font-body);
  font-size:18px;
  line-height:1.65;
  overflow-x:hidden;
}

h1,h2,h3{font-family:var(--font-head);line-height:1.15;letter-spacing:-0.01em;color:var(--evergreen);margin:0;}

a{color:var(--link);}

.wrap{max-width:840px;margin:0 auto;padding:0 24px;}

/* --- Hero --- */
.hero{
  position:relative;
  background:var(--evergreen);
  color:var(--offwhite);
  overflow:hidden;
}
.hero::before{
  content:"";
  position:absolute;
  inset:0;
  background-image:url("data:image/svg+xml,${gridSvg}");
  background-size:48px 48px;
  opacity:0.12;
  pointer-events:none;
}
.hero-inner{position:relative;padding:96px 24px 80px;}
.eyebrow{
  margin:0 0 16px;
  font-family:var(--font-head);
  font-weight:500;
  font-size:0.8rem;
  letter-spacing:0.14em;
  text-transform:uppercase;
  color:var(--emerald);
}
.hero-name{
  color:var(--offwhite);
  font-weight:700;
  font-size:clamp(2.4rem,7vw,3.6rem);
  margin:0 0 20px;
}
.hero-tagline{
  max-width:36em;
  margin:0 0 32px;
  font-size:1.12rem;
  color:var(--offwhite);
  opacity:0.92;
}
.hero-links{display:flex;gap:16px;flex-wrap:wrap;}
.hero-link{
  color:var(--offwhite);
  font-family:var(--font-head);
  font-weight:500;
  text-decoration:none;
  padding:10px 20px;
  border:1px solid var(--emerald);
  border-radius:6px;
  transition:none;
}
.hero-link:hover,.hero-link:focus{background:var(--emerald);color:var(--evergreen);}

/* --- Sections --- */
.section{padding:56px 0;}
.section-title{
  font-size:1.6rem;
  font-weight:700;
  margin:0 0 24px;
}
.stamp{
  font-family:var(--font-head);
  font-weight:500;
  font-size:0.85rem;
  letter-spacing:0.06em;
  text-transform:uppercase;
  color:var(--link);
  margin:0 0 16px;
}

.rule{
  border:0;
  height:2px;
  margin:0;
  background:linear-gradient(90deg,rgba(43,182,115,0) 0%,var(--emerald) 50%,rgba(43,182,115,0) 100%);
}

.now-list,.service-list{
  list-style:none;
  margin:0;
  padding:0;
}
.now-list li,.service-list li{
  position:relative;
  padding:8px 0 8px 28px;
  border-bottom:1px solid rgba(20,25,23,0.08);
}
.now-list li:last-child,.service-list li:last-child{border-bottom:0;}
.now-list li::before,.service-list li::before{
  content:"";
  position:absolute;
  left:4px;
  top:16px;
  width:8px;
  height:8px;
  border-radius:2px;
  background:var(--emerald);
}

.lede{margin:0 0 24px;}

/* --- Project cards --- */
.card-grid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:24px;
}
.card{
  border:1px solid rgba(11,61,46,0.14);
  border-top:3px solid var(--emerald);
  border-radius:8px;
  padding:24px;
  background:#fff;
}
.card-head{
  display:flex;
  align-items:baseline;
  justify-content:space-between;
  gap:12px;
  margin-bottom:12px;
}
.card-title{font-size:1.1rem;font-weight:700;}
.status{
  flex:none;
  font-family:var(--font-head);
  font-weight:500;
  font-size:0.7rem;
  letter-spacing:0.08em;
  text-transform:uppercase;
  color:var(--link);
  border:1px solid var(--emerald);
  border-radius:999px;
  padding:2px 10px;
}
.card-desc{margin:0 0 16px;font-size:0.98rem;}
.tags{
  list-style:none;
  margin:0;
  padding:0;
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}
.tag{
  font-family:ui-monospace,monospace;
  font-size:0.75rem;
  color:var(--link);
  background:var(--tint);
  border:1px solid rgba(43,182,115,0.35);
  border-radius:4px;
  padding:3px 8px;
}

/* --- CTA --- */
.cta-row{margin:8px 0 0;}
.cta{
  display:inline-block;
  font-family:var(--font-head);
  font-weight:500;
  text-decoration:none;
  color:var(--offwhite);
  background:var(--evergreen);
  border:1px solid var(--evergreen);
  border-radius:6px;
  padding:12px 28px;
}
.cta:hover,.cta:focus{background:var(--emerald);border-color:var(--emerald);color:var(--evergreen);}

.about{margin:0;max-width:40em;}

/* --- Footer --- */
.footer{
  background:var(--evergreen);
  color:var(--offwhite);
  margin-top:24px;
}
.footer-inner{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  flex-wrap:wrap;
  padding-top:32px;
  padding-bottom:32px;
}
.copyright{margin:0;font-size:0.9rem;opacity:0.85;}
.footer-links{display:flex;gap:20px;flex-wrap:wrap;}
.footer-link{
  color:var(--offwhite);
  font-weight:500;
  text-decoration:none;
  border-bottom:1px solid var(--emerald);
  padding-bottom:2px;
}
.footer-link:hover,.footer-link:focus{color:var(--emerald);}

/* --- Responsive --- */
@media (max-width:480px){
  body{font-size:16px;}
  .hero-inner{padding:64px 20px 56px;}
  .wrap{padding:0 20px;}
  .section{padding:40px 0;}
  .card-grid{grid-template-columns:1fr;}
  .card-head{flex-wrap:wrap;}
  .footer-inner{flex-direction:column;align-items:flex-start;}
}

/* --- Blog --- */
.subhero{background:var(--evergreen);}
.subhero-inner{padding:28px 24px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}
.crumb{color:var(--offwhite);font-family:var(--font-head);font-weight:500;text-decoration:none;}
.crumb:hover,.crumb:focus{color:var(--emerald);}
.crumb-sep{color:var(--emerald);}
.post-list{list-style:none;margin:0;padding:0;}
.post-list li{display:flex;align-items:baseline;gap:16px;padding:12px 0;border-bottom:1px solid rgba(20,25,23,0.08);}
.post-list li:last-child{border-bottom:0;}
.post-date{flex:none;font-family:var(--font-head);font-weight:500;font-size:0.85rem;letter-spacing:0.04em;text-transform:uppercase;color:var(--link);min-width:9.5em;}
.post-link{font-family:var(--font-head);font-weight:500;font-size:1.05rem;}
.post-title{font-size:clamp(1.8rem,5vw,2.4rem);font-weight:700;margin:0 0 24px;}
.post h2{font-size:1.35rem;margin:32px 0 12px;}
.post h3{font-size:1.1rem;margin:24px 0 8px;}
.post p{margin:0 0 16px;max-width:44em;}
.post ul{margin:0 0 16px;padding-left:24px;}
.post li{margin:4px 0;}
.post pre{background:var(--tint);border:1px solid rgba(43,182,115,0.35);border-radius:8px;padding:16px;overflow-x:auto;font-size:0.85rem;line-height:1.5;}
.post code{font-family:ui-monospace,monospace;}
.post p code,.post li code{background:var(--tint);border:1px solid rgba(43,182,115,0.35);border-radius:4px;padding:1px 5px;font-size:0.85em;}
.crumbs{margin:32px 0 0;font-family:var(--font-head);}
.feed-note{margin:24px 0 0;font-size:0.9rem;}
@media (max-width:480px){
  .post-list li{flex-direction:column;gap:2px;}
}
`;

// --- Emit ---
// R-02 guard runs at emit time: Suretas stays off this site until the
// employment-legal check clears. Delete the guard the day R-02 closes.
const emitted: [string, string][] = [
  ["index.html", html],
  ["styles.css", css],
  ["blog/index.html", blogIndexHtml],
  ["blog/feed.xml", feedXml],
  ...posts.map((p): [string, string] => [`blog/${p.slug}/index.html`, postPage(p)]),
];

for (const [rel, content] of emitted) {
  if (/suretas/i.test(content)) {
    die(`R-02 guard: "suretas" found in ${rel}; Suretas stays off this site until R-02 clears`);
  }
  // Dash rule: no em or en dashes in blog output (legacy homepage copy exempt).
  if (rel.startsWith("blog/") && /[–—]/.test(content)) {
    die(`dash guard: em/en dash found in ${rel}; use a period, comma, colon, or plain word`);
  }
  const abs = join(PUBLIC, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf8");
}

console.log(
  `build: wrote index.html, styles.css, blog/ (${posts.length} post${posts.length === 1 ? "" : "s"} + feed.xml) ` +
    `(fonts: ${fontsSelfHosted ? "self-hosted" : "system fallback"})`,
);
