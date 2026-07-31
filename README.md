# austinfiala

Static single-page personal site for Austin Fiala. Copy and config live in `content/` (typed `.ts` + `.md`); `bun src/build.ts` reads them, escapes all content, and emits `public/index.html` + `public/styles.css` (no JavaScript ships to the page). Fonts (Space Grotesk / Inter) are self-hosted from `public/fonts/*.woff2`; if those files are absent the build automatically falls back to a `system-ui` font stack with no fonts directory required. The `/notes/<slug>` URL scheme is reserved for a future writing section and is intentionally unused today. Build with `bun src/build.ts` — no npm, no install step, zero runtime dependencies.

## URL policy (frozen 2026-07-31)

These identifiers are permanent. Changing any of them breaks subscribers
and inbound links; do not change them without a redirect plan.

- Posts: `/blog/<slug>/` (flat, dateless; slug = markdown filename)
- Feed: `/blog/feed.xml` (RSS 2.0; GUIDs are the permalink URLs)
- Page titles: `<post title> | Austin Fiala`
- Social card: `/assets/card.png` (1200x630; source `design/card.svg`, rasterized via `rsvg-convert`)
