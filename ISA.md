---
task: "Add a blog to austinfiala.com"
project: austinfiala.com
slug: 20260730-104436_austinfiala-blog
effort: E3
effort_source: classifier
phase: complete
progress: 59/59
mode: interactive
iteration: 2
started: 2026-07-30T10:44:36-04:00
updated: 2026-07-30T10:44:36-04:00
---

## Problem

Austin approved the interview-driven plan (`PAI/MEMORY/WORK/20260715-122928_personal-website-plan/PLAN.md`) but the site doesn't exist: the hosted zone has only NS/SOA records, no repo, no page, nothing served. His professional identity has no public home.

## Vision

Someone Googles Austin and lands on a page that reads instantly as a senior security professional who builds things — quiet fintech-green design, current work visibly dated this month, zero salesy noise. Austin sees it and thinks "that's me, and I didn't have to fight for it."

## Out of Scope

Suretas — entirely absent by explicit decision (R-02 open). ~~Writing/notes section — reserved URL scheme only, no empty blog.~~ SUPERSEDED 2026-07-30: Austin asked for a blog; it ships with a real first post per the original "goes live when the first post exists" rule. Still out: CMS, analytics, contact forms, JS frameworks, comments, tags/categories, pagination (add when post count demands it). GitHub remote push (pushed 2026-07-26; future pushes on Austin's word).

## Constraints

- Bun + TypeScript build; no npm, no Node, no framework, no external CDN at runtime (fonts self-hosted or system-stack fallback)
- Static output only — no server code on the site
- Deploy to existing suretas-prod Lightsail box; Caddy **reload** only, never restart; Caddyfile backed up before edit
- rsync with explicit trailing-slash dir→dir form (path-flattening gotcha)
- All page copy is fact-checked against Austin's real profile — nothing invented

## Goal

https://austinfiala.com serves the v1 single-page site over valid TLS with the planned six sections and green editorial design, Suretas nowhere in the deployed bytes, suretas.com still healthy, all verified by live probes including an Interceptor browser pass.

## Criteria

- [x] ISC-1: Curiam work dir `20260715-ai-policy-ciso-review` deleted from MEMORY/WORK
- [x] ISC-2: Route53 A record austinfiala.com → 44.200.119.114 exists (INSYNC)
- [x] ISC-3: Route53 A record www.austinfiala.com → 44.200.119.114 exists (INSYNC)
- [x] ISC-4: Repo `~/Projects/austinfiala` initialized with git, initial commit made
- [x] ISC-5: `bun run build` (or `bun src/build.ts`) exits 0 and emits `public/index.html`
- [x] ISC-6: Content lives as editable files (now.md / projects / site config) separate from build code
- [x] ISC-7: Hero renders name, one-line identity, location, email + GitHub links
- [x] ISC-8: Now section renders with "Updated July 2026" date stamp
- [x] ISC-9: Projects grid renders ≥1 entry, each with name, description, status, stack tags [refined 2026-07-15: was ≥2 at launch; AI Policy card removed on Austin's instruction — see Decisions]
- [x] ISC-10: Services section renders advisory offer + mailto CTA
- [x] ISC-11: About section renders bio with one personal/human line
- [x] ISC-12: Footer renders email, GitHub, LinkedIn (`linkedin.com/in/austin-fiala`)
- [x] ISC-13: Writing nav/URL scheme reserved but no empty blog section rendered
- [x] ISC-14: Palette in served CSS: `#0B3D2E`, `#2BB673`, `#F7F8F6`, `#141917`
- [x] ISC-15: Headings Space Grotesk, body Inter, self-hosted woff2 — OR documented system-stack fallback if font fetch fails
- [x] ISC-16: Exactly ≤2 typefaces and 1 accent color in the stylesheet
- [x] ISC-17: No stock photography / raster imagery in `public/`
- [x] ISC-18: Page has viewport meta and renders without horizontal scroll at 375px
- [x] ISC-19: Text contrast meets WCAG AA (checked on the 4 palette pairings used)
- [x] ISC-20: `/opt/austinfiala/public/` on the instance contains the built files (byte-match index.html)
- [x] ISC-21: Caddyfile backed up on instance before edit (timestamped copy exists)
- [x] ISC-22: Caddy site block serves austinfiala.com; `www` redirects to apex
- [x] ISC-23: Caddy reloaded (not restarted); service active
- [x] ISC-24: `curl -i https://austinfiala.com` → 200 with valid cert (CN/SAN austinfiala.com)
- [x] ISC-25: `curl -i http://austinfiala.com` → redirects to https
- [x] ISC-26: Interceptor desktop screenshot shows all six sections rendered per design
- [x] ISC-35: "AI Policy & Training" card removed — 0 hits in built and live-served HTML (2026-07-15 follow-up task)
- [x] ISC-36: "Personal AI Infrastructure" card still renders (1 hit live)
- [x] ISC-37: Anti: suretas still 0 hits live; suretas.com/health 200 post-deploy; index.html md5 byte-match local↔prod (b6d2d004…)
- [x] ISC-38: Removal committed to repo
- [DEFERRED-VERIFY] ISC-27: Interceptor 375px-width screenshot clean; console shows zero errors — this Interceptor build has no viewport emulation (manifest grep empty; window resize doesn't reflow the DOM render). Follow-up: FOLLOWUP-austinfiala-mobile-check — Austin loads the site on his phone, or devtools emulation next session. Structural evidence already strong: viewport meta present, all CSS widths are max-width (840px column, 480px collapse query), zero scripts + all resources render (no console-error source).
- [x] ISC-28: Every footer/hero link resolves (mailto/GitHub/LinkedIn URLs well-formed)
- [x] ISC-29: Anti: `grep -ri suretas public/` and deployed bytes → zero hits
- [x] ISC-30: Anti: `https://suretas.com/health` returns 200 after the Caddy reload
- [x] ISC-31: Anti: no testimonials, client names, or client logos anywhere in served HTML
- [x] ISC-32: Anti: no npm/npx usage; no `node_modules` committed; no runtime JS dependencies
- [x] ISC-33: Anti: no PAI-private content (TELOS/PROJECTS/ISA text) in served bytes
- [x] ISC-34: Antecedent: page copy drafted from Austin's real profile and flagged for his edit — no invented facts

### Blog (2026-07-30, ISC-39..68)

- [x] ISC-39: content/blog/ exists with ≥1 .md post carrying title + date front matter
- [x] ISC-40: build fails non-zero on a post missing title or date (synthetic bad post probe)
- [x] ISC-41: markdown renderer handles paragraphs, ## and ### headings, bullet lists, links, inline code, fenced code blocks, and bold (fixture render grep)
- [x] ISC-42: post body is HTML-escaped before markdown transforms; a literal script tag in a post renders inert as text
- [x] ISC-43: bun src/build.ts exits 0 and emits public/blog/index.html
- [x] ISC-44: each post emits public/blog/[slug]/index.html
- [x] ISC-45: blog index lists posts newest first, each with date and title linking to /blog/[slug]/
- [x] ISC-46: post page renders title, date stamp, body, and a back link to /blog/ plus home link
- [x] ISC-47: blog pages load /styles.css (absolute path) and introduce no new typefaces or accent hues
- [x] ISC-48: every blog page carries viewport meta, favicon, and a meta description
- [x] ISC-49: homepage hero nav gains a Blog link to /blog/
- [x] ISC-50: footer gains a Blog link to /blog/ via site.ts footerLinks
- [x] ISC-51: public/blog/feed.xml is a valid RSS 2.0 feed with absolute URLs per post
- [x] ISC-52: each blog page has a unique title tag (index and per post)
- [x] ISC-53: first real post exists, copy factual from Austin's profile, flagged for his edit
- [x] ISC-54: slugs derive from filename and match ^[a-z0-9-]+$ (build dies otherwise)
- [x] ISC-55: dates render human-readable (Month D, YYYY) and sort by ISO date string
- [x] ISC-56: blog CSS uses only existing palette variables; no new hex accent hues added
- [x] ISC-57: blog layout is max-width-only with the existing 480px collapse query (no horizontal scroll structurally possible)
- [x] ISC-58: build remains zero-dependency (no package.json, no node_modules)
- [x] ISC-59: Anti: zero suretas hits in all built bytes (recursive grep over public/)
- [x] ISC-60: Anti: zero em or en dashes in new user-facing blog copy (grep over built blog HTML)
- [x] ISC-61: Anti: homepage delta is only the added nav/footer Blog links (diff inspection)
- [x] ISC-62: Anti: zero script tags in any built page (site stays zero-JS)
- [x] ISC-63: Anti: no invented facts, testimonials, or client references in post copy
- [x] ISC-64: Antecedent: post copy flagged for Austin's edit before any deploy
- [x] ISC-65: Interceptor screenshot: blog index renders correctly on a local server
- [x] ISC-66: Interceptor screenshot: post page renders correctly (heading, prose, code styling)
- [x] ISC-67: Interceptor screenshot: homepage hero shows the Blog link
- [x] ISC-68: blog feature committed to the repo (git log shows the commit)
- [x] ISC-69: build dies non-zero with an R-02 message if any content file mentions suretas (ingestion-point guard; synthetic probe)

### Blog deploy (2026-07-30, ISC-70..76)

- [x] ISC-70: rsync completes; live /blog/index.html md5 byte-matches local build
- [x] ISC-71: https://austinfiala.com/blog/ returns 200 over public HTTPS
- [x] ISC-72: post page and feed.xml return 200; feed served with an XML content type; /blog no-slash 308s to /blog/
- [x] ISC-73: live homepage bytes contain the hero Blog link
- [x] ISC-74: Anti: live pages 0 suretas hits; suretas.com/health, fit., day. all 200 post-deploy
- [x] ISC-75: Interceptor screenshot of the live https://austinfiala.com/blog/ render
- [x] ISC-76: deploy/NOTES.md bootstrapped with method, target, smoke set, log; committed

### Blueprint restyle (2026-07-30, Austin picked concept C; ISC-77..94)

- [x] ISC-77: blog pages emit body class bp; homepage emits no body tag change
- [x] ISC-78: blog index shows the four-cell title block (PROJECT, SHEET, DRAWN BY, REV from latest post date)
- [x] ISC-79: index h1 is The Drafting Table with the mono working-notes subline
- [x] ISC-80: each post renders as a paper print card with four gold corner ticks
- [x] ISC-81: cards carry NOTE numbers assigned date-ascending (oldest = 001), slug tiebreak; stable for append-only publishing, backdating renumbers by design [refined per advisor]
- [x] ISC-82: cards carry the PUBLIC COPY stamp and a dashed printhead rule
- [x] ISC-83: specline shows DATE and READ minutes (word count over 200, floor 1)
- [x] ISC-84: gold doodle arrow with pin-up line renders on the index only
- [x] ISC-85: post page carries title block, NOTE number, stamp, full body inside the print, specline, crumbs
- [x] ISC-86: post body typography restyled for paper (evergreen headings, tinted code) with no rendering regression
- [x] ISC-87: palette limited to existing vars plus brand gold #C9973F and derived #8F6722 gold-ink for small text on paper (AA measured 4.77)
- [x] ISC-88: grid ground via CSS gradients only, no images
- [x] ISC-89: 480px query keeps cards and title block stacking cleanly (structural CSS check)
- [x] ISC-90: Anti: homepage byte-identical to pre-restyle build (md5 compare)
- [x] ISC-91: Anti: feed.xml byte-identical (visual-only change; feed keeps the Austin Fiala Blog name deliberately)
- [x] ISC-92: Anti: zero script tags, zero suretas, zero em/en dashes in built blog output (guards still pass)
- [x] ISC-93: Interceptor screenshots: restyled index and post page render per concept
- [x] ISC-94: committed 0ba7c39; deploy staged but NOT executed (gated on Austin's word)
- [x] ISC-95: whole-tree build determinism proven: identical tree md5 across two builds plus a TZ/LC_ALL variant [added per advisor]
- [x] ISC-96: blog stylesheet links carry a CSS content-hash version param (stale-cache lesson); homepage link untouched [added per advisor]
- [x] ISC-97: positive structure guard in build dies if the index loses The Drafting Table, the title block, or NOTE numbering [added per advisor]

## Test Strategy

| isc | type | check | threshold | tool |
|-----|------|-------|-----------|------|
| ISC-1 | fs | dir absent | 0 matches | Bash ls/grep |
| ISC-2..3 | dns | change INSYNC + dig answer | both records | aws route53 / dig |
| ISC-4 | git | `git log --oneline` ≥1 | commit exists | Bash |
| ISC-5 | build | exit 0 + file exists | index.html emitted | Bash bun |
| ISC-6 | fs | content files exist apart from src | ≥2 content files | ls |
| ISC-7..13 | content | section markers in built HTML | each present | Grep public/index.html |
| ISC-14..17 | design | hex codes / font-family / img count | exact | Grep CSS, ls public |
| ISC-18..19 | design | viewport meta; contrast ratios of used pairs | AA ≥4.5:1 body | Grep + computed check |
| ISC-20..23 | deploy | remote ls/diff, backup file, caddy status | all confirmed | ssh |
| ISC-24..25 | live | curl status + cert subject | 200 / 301 | curl -i |
| ISC-26..27 | browser | Interceptor screenshots + console | rendered, 0 errors | interceptor |
| ISC-28 | content | href extraction | all well-formed | Grep |
| ISC-29..33 | anti | greps + health curl + manifest review | zero hits / 200 | Bash |
| ISC-34 | process | copy sources traceable to known profile facts | reviewed | manual + this ISA |
| ISC-39..44 | build | file existence, exit codes, synthetic bad-post probe | exact | Bash bun + ls |
| ISC-41..42 | engine | fixture post rendered, grep for expected/inert markup | exact | Grep built HTML |
| ISC-45..52 | content | markers in built blog HTML + feed.xml | each present | Grep public/blog/ |
| ISC-53, 63, 64 | process | copy traceable to profile, flagged for edit | reviewed | manual + this ISA |
| ISC-54..58 | build | slug regex, date format, CSS vars, no deps | exact | Grep + ls |
| ISC-59..62 | anti | recursive greps over public/ | zero hits | Bash rg |
| ISC-65..67 | browser | Interceptor screenshots on local server | rendered | interceptor |
| ISC-68 | git | git log shows blog commit | ≥1 commit | Bash |

## Features

| name | description | satisfies | depends_on | parallelizable |
|------|-------------|-----------|------------|----------------|
| curiam-removal | delete stale work dir | ISC-1 | — | done |
| dns | A records apex+www | ISC-2,3 | — | yes |
| site-build | repo, build script, content, styles | ISC-4..19,28,31..34 | — | yes (Engineer) |
| deploy | rsync + Caddy block + reload | ISC-20..25,29,30 | dns, site-build | no |
| browser-verify | Interceptor desktop+mobile pass | ISC-26,27 | deploy | no |
| blog-engine | markdown parser + multi-page emit in build.ts | ISC-39..44, 54..58 | — | no |
| blog-pages | index, post pages, RSS, nav links, CSS | ISC-45..52, 56..57 | blog-engine | no |
| blog-content | first post from Austin's real profile | ISC-53, 63, 64 | — | yes |
| blog-verify | probes + Interceptor local walkthrough + commit | ISC-59..62, 65..68 | blog-pages | no |

## Decisions

- 2026-07-15T13:26 — codex ABSENT (`which codex`): Forge and Cato unavailable, SOURCE: codex-unavailable. Site build delegated to Engineer per the Forge-slot fallback binding.
- 2026-07-15T13:26 — Delegation floor (E3 ≥2) at 1, show-your-math: deploy + verification require this machine's SSH key and Interceptor session; splitting them to a second agent shares credentials and serializes anyway. Engineer covers the parallelizable slot.
- 2026-07-15T13:26 — gh CLI absent: repo stays local; GitHub push is a follow-up when gh is installed/authed (plan's repo intent preserved).
- 2026-07-15T13:26 — ISA skill workflow (Scaffold.md) already loaded verbatim this session; executed per its procedure without re-injection to save context. Project ISA meets E3 section set.
- 2026-07-15T13:26 — Page copy drafted by me from PRINCIPAL_IDENTITY/RESUME facts, pinned in the Engineer brief verbatim; Engineer may not invent facts (ISC-34).
- 2026-07-15T13:55 — refined: ISC-16 "1 accent color" means one accent hue; Constraints permit tints derived from the palette. Emerald #2BB673 stays decorative/large-text; links use derived #1E7A50 because emerald fails WCAG AA at body size (contrast ~2.46 vs ~5.0). Engineer's substitution follows the brief's explicit AA instruction.
- 2026-07-15T13:55 — DNS incident, local-only: my pre-record dig seeded a negative cache upstream; authoritative + world resolve fine (www worked immediately). Live-probed apex via --resolve (200, valid LE cert). Interceptor pass waits on cache expiry via bounded background poll; /etc/hosts workaround unavailable (no passwordless sudo).
- 2026-07-15T13:55 — Family/newborn deliberately excluded from public page copy (privacy default); Austin can add. Personal line covers swimming/biking/golf/brewing only.
- 2026-07-15T14:20 — Austin: remove the AI Policy project card. Classifier said E2; ISC floor under-decomposed (4 new ISCs, not 16) — a one-entry content deletion + redeploy doesn't decompose further without inventing probes. Projects grid now 1 card (honest beats padded; more cards when Austin supplies them).

- 2026-07-30T10:44 — Blog task (iteration 2). codex still ABSENT (`which codex`): Forge/Cato unavailable, SOURCE: codex-unavailable. Delegation floor (E3 ≥2) relaxed to 0, show-your-math: the whole feature is one file (src/build.ts, 447 lines, bespoke zero-dep builder) plus content files; an Engineer would need the entire file as context anyway, Engineer agents have stalled mid-build in 6 of the last 8 spawns on this machine, and the 10-minute tier budget is smaller than typical agent spin-up plus reconciliation. Primary builds directly; independent verification still runs (probes + Interceptor + Advisor).
- 2026-07-30T10:44 — URL scheme: plan reserved /notes/[slug] but Austin said "blog"; /blog/[slug]/ wins (matches user vocabulary, zero live links to /notes/ exist to break). Reservation superseded in Out of Scope.
- 2026-07-30T10:44 — EnterPlanMode skipped despite Advanced tier: classifier DIRECTIVE says execute now, task is additive and reversible, deploy stays confirm-gated on Austin. Logged as the doctrine deviation it is.
- 2026-07-30T11:05 — Advisor pass: its top concern (javascript: link schemes) was already closed by the safeHref allowlist and probed; real catches adopted: hostile front-matter title probe (passed after probing), atom:link self reference in the feed, RSS discovery link in page heads, and the dash rule made structural (build dies on em/en dash in blog output, legacy homepage copy exempt). Advisor's auto-state loaded the wrong ISA (ironman slug); this project ISA was the real harness throughout. Follow-ups accepted, not built: probes as a permanent test file, host-side path/content-type verification at deploy. Drafts policy: none, a post in the folder is published.
- 2026-07-30T11:05 — Deploy deliberately NOT executed: house pattern gates production on Austin's explicit "deploy". Deploy path when he says go: bun src/build.ts, rsync public/ dir-to-dir (trailing slash, no --delete) to /opt/austinfiala/public/, no service restart needed, then curl /blog/ + feed.xml live and confirm content-type.

## Changelog

- 2026-07-15 — conjectured: Interceptor alone can complete full browser verification including the mobile breakpoint. refuted_by: manifest grep shows no viewport/device emulation; `window resize` does not reflow the DOM-render screenshot. learned: mobile-layout verification on this machine needs a real device or devtools emulation; structural CSS evidence (max-width-only layout + collapse query + viewport meta) is the honest substitute, not a screenshot. criterion_now: ISC-27 is [DEFERRED-VERIFY] with FOLLOWUP-austinfiala-mobile-check (Austin's phone).

## Verification

- ISC-1: Bash — dir listed then deleted; `grep -c` over WORK/ → 0 matches remain
- ISC-2/3: aws route53 — change C06940152B76DJO6O5XTD INSYNC; authoritative dig → 44.200.119.114 (both records)
- ISC-4: git — commits b10941b, 98520ca
- ISC-5/6: Bash — build exit 0; public/index.html + styles.css emitted; content/ holds 5 editable files apart from src/
- ISC-7..12: Grep served+built HTML — "Austin Fiala"(3), "New Jersey, USA", mailto(3), github.com/arfiala(2), "Updated July 2026", 2 project cards w/ status+tags, "Work with me"+CTA, About para, footer Email/GitHub/LinkedIn
- ISC-13: Grep — 0 hits for writing/notes in HTML; README documents reserved /notes/<slug> scheme
- ISC-14: Grep styles.css — all four hex values present
- ISC-15: ls — 6 woff2 in public/fonts; 6 @font-face blocks; families = Inter, Space Grotesk only
- ISC-16: Grep — 2 typeface families; accent = green hue (emerald #2BB673 decorative + derived #1E7A50 AA links per Decisions refinement)
- ISC-17: Grep — 0 `<img>` tags, 0 raster references
- ISC-18: Grep — viewport meta present; all CSS widths are max-width (840 column, 480 collapse query, 8px decorative) — overflow structurally impossible
- ISC-19: Engineer computed contrast: emerald-on-offwhite 2.46 (demoted to decorative), #1E7A50 links ~5.0, ink-on-offwhite and offwhite-on-evergreen pass
- ISC-20: md5sum — 076df64364fd5979973f0edf2a4f5388 identical local and /opt/austinfiala/public/
- ISC-21: ssh — /etc/caddy/Caddyfile.bak-20260715T174814 created before edit
- ISC-22/23: ssh — new site blocks in Caddyfile; `caddy validate` Valid; systemctl reload; is-active → active
- ISC-24: curl — HTTP/2 200; openssl: CN=austinfiala.com, issuer Let's Encrypt, notAfter Oct 13 2026
- ISC-25: curl — http:// → 308 Location: https://austinfiala.com/; https://www → 301 → apex
- ISC-26: Interceptor — a11y tree shows banner/main(4 regions)/contentinfo; full-page + pixel-true screenshots visually confirm all six sections, grid motif, fonts
- ISC-27: DEFERRED-VERIFY — see Changelog; FOLLOWUP-austinfiala-mobile-check
- ISC-28: interceptor tree — e1..e6 hrefs all well-formed (mailto/GitHub/LinkedIn)
- ISC-29: curl+grep — live served bytes: 0 suretas hits (checked via --resolve AND public DNS)
- ISC-30: curl — suretas.com/health 200 at 14:00:17 post-reload; app page 200
- ISC-31: copy pinned verbatim; placeholder/lorem/testimonial scan on live bytes → 0 hits
- ISC-32: ls — no package.json/node_modules; build is `bun src/build.ts`; zero `<script>` tags
- ISC-33: copy authored fresh from identity facts; no PAI file content in repo or served bytes
- ISC-34: all copy traceable to PRINCIPAL_IDENTITY/RESUME facts; family deliberately excluded (Decisions); flagged for Austin's edit

### Blog (2026-07-30)

- ISC-39: ls — content/blog/why-this-site-has-zero-dependencies.md with title + date front matter
- ISC-40: Bash — synthetic no-date post: exit 1, "date must be YYYY-MM-DD"
- ISC-41: Grep fixture render — strong/em/code/link/h2/h3/li/fenced all present exactly once
- ISC-42: Grep — "&lt;script&gt;" 1, live "<script>" 0 in fixture page; hostile title escaped in title/h1 and feed (&amp;), feed still well-formed
- ISC-43/44: Bash — build exit 0; blog/index.html + blog/why-this-site-has-zero-dependencies/index.html emitted
- ISC-45: Grep — post link href + "July 30, 2026" in index
- ISC-46: Grep — h1 post-title, All posts + Home links present
- ISC-47: Grep — /styles.css absolute in both pages; 0 hex literals in blog CSS block (vars only)
- ISC-48: Grep — viewport, icon, description present in index and post page
- ISC-49/50: Grep — hero-link and footer-link href="/blog/" in built index.html; git diff shows exactly those 2 added lines
- ISC-51: xmllint --noout clean; 1 item; absolute URLs; rfc822 pubDate; atom:link self ref (advisor add)
- ISC-52: Grep — "Blog | Austin Fiala" vs "Why this site has zero dependencies | Austin Fiala"
- ISC-53/63/64: copy authored from PRINCIPAL_IDENTITY facts (consultant, financial firms, solo, time-constrained); zero invented claims; flagged for Austin's edit before deploy
- ISC-54: Bash — Bad_Slug.md: exit 1 with slug message
- ISC-55: Grep — stamp "July 30, 2026"; sort key is ISO date string desc
- ISC-56: awk+grep — 0 hex color literals in the blog CSS section
- ISC-57: CSS inspection — wrap max-width 840, flex with wrap, pre overflow-x auto, 480px collapse adds column stacking
- ISC-58: ls — no package.json, no node_modules
- ISC-59: rg — 0 suretas hits recursive over public/ after final rebuild
- ISC-60: grep — 0 em/en dashes in blog HTML + feed; now also a build-time guard (probe: dash post exits 1)
- ISC-61: git diff public/index.html — 2 insertions, both Blog links, nothing else
- ISC-62: grep — 0 "<script" occurrences across public/
- ISC-65: Interceptor — screenshot 1785423132049: breadcrumb, Blog h1, lede, dated post link, RSS link, footer
- ISC-66: Interceptor — screenshot 1785423138859: date stamp, display h1, prose, bullets, styled code block, back links
- ISC-67: Interceptor — screenshot 1785423148258: hero shows Blog | Email | GitHub; footer leads with Blog; rest of homepage unchanged
- ISC-68: git — commit f0d2fa3 "Add blog: markdown posts, escape-first renderer, RSS, R-02 and dash guards"
- ISC-69: Bash — suretas post probe: exit 1 "R-02 guard: suretas found in blog/feed.xml"; guard is case-insensitive and output-side; 0 suretas bytes written
- ISC-70: rsync 7 files sent; curl live blog/index.html md5 7e0462d3022ded4f65b3ba1a5d0cb1ee = local
- ISC-71/72: curl — 200 on /, /blog/, post, feed.xml; content-type text/xml; /blog → 308 → /blog/
- ISC-73: curl live / — 1 hit hero-link href="/blog/"
- ISC-74: curl — 0 suretas across four live pages; suretas:200 fit:200 day:200
- ISC-75: Interceptor — screenshot 1785423579731: live blog index over HTTPS, breadcrumb, dated post, RSS link
- ISC-76: deploy/NOTES.md written (method/target/secrets/smoke/gotchas/log)
- Deploy advisor pass: whole-tree parity proven (`rsync -avin --checksum` dry-run: zero pending transfers, exit 0); http 308 and www 301 both land on /blog/; leak-class rg over public/ 0 hits; deployed SHA pinned in NOTES.md; no --delete deliberate (additive feature, house rule). Known-open, recorded not blocking: no Cache-Control header on statics (Caddy default, zero-JS site so low risk), no robots.txt/sitemap/custom 404 (site never had them), feed served text/xml rather than application/rss+xml (readers accept both). Neighbor health is "unchanged by construction" (no restart, disjoint path), not a differential test.
