---
task: "Build and deploy austinfiala.com v1 single-page site"
project: austinfiala.com
slug: 20260715-132649_build-austinfiala-site
effort: E3
effort_source: classifier
phase: observe
progress: 0/34
mode: interactive
started: 2026-07-15T13:26:49-04:00
updated: 2026-07-15T13:26:49-04:00
---

## Problem

Austin approved the interview-driven plan (`PAI/MEMORY/WORK/20260715-122928_personal-website-plan/PLAN.md`) but the site doesn't exist: the hosted zone has only NS/SOA records, no repo, no page, nothing served. His professional identity has no public home.

## Vision

Someone Googles Austin and lands on a page that reads instantly as a senior security professional who builds things — quiet fintech-green design, current work visibly dated this month, zero salesy noise. Austin sees it and thinks "that's me, and I didn't have to fight for it."

## Out of Scope

Suretas — entirely absent by explicit decision (R-02 open). Writing/notes section — reserved URL scheme only, no empty blog. Multi-page structure, CMS, analytics, contact forms, JS frameworks. GitHub remote (gh CLI absent — local git now, push later).

## Constraints

- Bun + TypeScript build; no npm, no Node, no framework, no external CDN at runtime (fonts self-hosted or system-stack fallback)
- Static output only — no server code on the site
- Deploy to existing suretas-prod Lightsail box; Caddy **reload** only, never restart; Caddyfile backed up before edit
- rsync with explicit trailing-slash dir→dir form (path-flattening gotcha)
- All page copy is fact-checked against Austin's real profile — nothing invented

## Goal

https://austinfiala.com serves the v1 single-page site over valid TLS with the planned six sections and green editorial design, Suretas nowhere in the deployed bytes, suretas.com still healthy, all verified by live probes including an Interceptor browser pass.

## Criteria

- [ ] ISC-1: Curiam work dir `20260715-ai-policy-ciso-review` deleted from MEMORY/WORK
- [ ] ISC-2: Route53 A record austinfiala.com → 44.200.119.114 exists (INSYNC)
- [ ] ISC-3: Route53 A record www.austinfiala.com → 44.200.119.114 exists (INSYNC)
- [ ] ISC-4: Repo `~/Projects/austinfiala` initialized with git, initial commit made
- [ ] ISC-5: `bun run build` (or `bun src/build.ts`) exits 0 and emits `public/index.html`
- [ ] ISC-6: Content lives as editable files (now.md / projects / site config) separate from build code
- [ ] ISC-7: Hero renders name, one-line identity, location, email + GitHub links
- [ ] ISC-8: Now section renders with "Updated July 2026" date stamp
- [ ] ISC-9: Projects grid renders ≥2 entries, each with name, description, status, stack tags
- [ ] ISC-10: Services section renders advisory offer + mailto CTA
- [ ] ISC-11: About section renders bio with one personal/human line
- [ ] ISC-12: Footer renders email, GitHub, LinkedIn (`linkedin.com/in/austin-fiala`)
- [ ] ISC-13: Writing nav/URL scheme reserved but no empty blog section rendered
- [ ] ISC-14: Palette in served CSS: `#0B3D2E`, `#2BB673`, `#F7F8F6`, `#141917`
- [ ] ISC-15: Headings Space Grotesk, body Inter, self-hosted woff2 — OR documented system-stack fallback if font fetch fails
- [ ] ISC-16: Exactly ≤2 typefaces and 1 accent color in the stylesheet
- [ ] ISC-17: No stock photography / raster imagery in `public/`
- [ ] ISC-18: Page has viewport meta and renders without horizontal scroll at 375px
- [ ] ISC-19: Text contrast meets WCAG AA (checked on the 4 palette pairings used)
- [ ] ISC-20: `/opt/austinfiala/public/` on the instance contains the built files (byte-match index.html)
- [ ] ISC-21: Caddyfile backed up on instance before edit (timestamped copy exists)
- [ ] ISC-22: Caddy site block serves austinfiala.com; `www` redirects to apex
- [ ] ISC-23: Caddy reloaded (not restarted); service active
- [ ] ISC-24: `curl -i https://austinfiala.com` → 200 with valid cert (CN/SAN austinfiala.com)
- [ ] ISC-25: `curl -i http://austinfiala.com` → redirects to https
- [ ] ISC-26: Interceptor desktop screenshot shows all six sections rendered per design
- [ ] ISC-27: Interceptor 375px-width screenshot clean; console shows zero errors
- [ ] ISC-28: Every footer/hero link resolves (mailto/GitHub/LinkedIn URLs well-formed)
- [ ] ISC-29: Anti: `grep -ri suretas public/` and deployed bytes → zero hits
- [ ] ISC-30: Anti: `https://suretas.com/health` returns 200 after the Caddy reload
- [ ] ISC-31: Anti: no testimonials, client names, or client logos anywhere in served HTML
- [ ] ISC-32: Anti: no npm/npx usage; no `node_modules` committed; no runtime JS dependencies
- [ ] ISC-33: Anti: no PAI-private content (TELOS/PROJECTS/ISA text) in served bytes
- [ ] ISC-34: Antecedent: page copy drafted from Austin's real profile and flagged for his edit — no invented facts

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

## Features

| name | description | satisfies | depends_on | parallelizable |
|------|-------------|-----------|------------|----------------|
| curiam-removal | delete stale work dir | ISC-1 | — | done |
| dns | A records apex+www | ISC-2,3 | — | yes |
| site-build | repo, build script, content, styles | ISC-4..19,28,31..34 | — | yes (Engineer) |
| deploy | rsync + Caddy block + reload | ISC-20..25,29,30 | dns, site-build | no |
| browser-verify | Interceptor desktop+mobile pass | ISC-26,27 | deploy | no |

## Decisions

- 2026-07-15T13:26 — codex ABSENT (`which codex`): Forge and Cato unavailable, SOURCE: codex-unavailable. Site build delegated to Engineer per the Forge-slot fallback binding.
- 2026-07-15T13:26 — Delegation floor (E3 ≥2) at 1, show-your-math: deploy + verification require this machine's SSH key and Interceptor session; splitting them to a second agent shares credentials and serializes anyway. Engineer covers the parallelizable slot.
- 2026-07-15T13:26 — gh CLI absent: repo stays local; GitHub push is a follow-up when gh is installed/authed (plan's repo intent preserved).
- 2026-07-15T13:26 — ISA skill workflow (Scaffold.md) already loaded verbatim this session; executed per its procedure without re-injection to save context. Project ISA meets E3 section set.
- 2026-07-15T13:26 — Page copy drafted by me from PRINCIPAL_IDENTITY/RESUME facts, pinned in the Engineer brief verbatim; Engineer may not invent facts (ISC-34).

## Verification

(populated at VERIFY)
