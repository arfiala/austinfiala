# Deploy Notes: austinfiala.com

Bootstrapped 2026-07-30 during the first blog deploy (Deploy skill invariant 6).

## Method

Static files only. No service, no restart, no migrations.

1. Build locally: `bun src/build.ts` (emits `public/`). The build itself is the gate: it dies on missing content, bad blog front matter, bad slugs, any Suretas mention in output (R-02 guard), or em/en dashes in blog output.
2. rsync `public/` to the box, dir-to-dir with trailing slashes, NEVER `--delete`:
   `rsync -av -e "ssh -i ~/.ssh/lightsail/suretas-deploy.pem" ~/Projects/austinfiala/public/ ubuntu@44.200.119.114:/opt/austinfiala/public/`
3. No restart needed. Caddy serves the files directly.

## Target

- Host: suretas-prod Lightsail instance, 44.200.119.114, user ubuntu, key `~/.ssh/lightsail/suretas-deploy.pem`
- Path: `/opt/austinfiala/public/`
- Caddy: site block for austinfiala.com in `/etc/caddy/Caddyfile` (shared box: suretas.com, fit., day. also live here). Caddy changes are reload, never restart.

## Secrets

None. Pure static site, no env, no keys.

## Smoke set

- Whole-tree parity: `rsync -avin --checksum` dry-run against the target shows zero pending transfers (proves the entire deployed tree matches the local build, not just one sampled file)
- Orphan check: remote `find` file list diffed against the local tree is identical (rsync without --delete leaves removed files live; this catches them)
- `curl` 200: `/`, `/blog/`, `/blog/<latest-slug>/`, `/blog/feed.xml`
- feed.xml served with an XML content type
- Live homepage bytes contain the Blog hero link
- Anti: `grep -i suretas` over live-fetched pages = 0 hits
- Anti: `https://suretas.com/health` 200, `https://fit.austinfiala.com` 200, `https://day.austinfiala.com` 200 (shared box unharmed)
- Interceptor screenshot of the live blog index

## Known gotchas

- rsync path flattening: always dir-to-dir with trailing slash on BOTH sides (learned on Suretas 2026-07-12).
- Never dig a brand-new domain before creating its records (negative-cache incident 2026-07-15). Not relevant to updates.
- Rollback = `git archive <previous-commit>` locally, rebuild, rsync the same way. Statics make rollback identical to deploy.

## Deploy log

- 2026-07-31 | 43c430a (+ 3abf382 ISA) | social cards, bio box, robots, sitemap, URL lock-in | rsync per method | outcome: clean. Parity zero pending, zero orphans, six URLs 200 (incl. robots.txt + sitemap.xml), /assets/card.png live as image/png 66054 bytes, bio + canonical + og markers in live bytes, siblings 200. LinkedIn Post Inspector seed attempted via automation browser but it has no LinkedIn session (empty shell); Austin should paste a post URL into linkedin.com/post-inspector once from his own browser.

- 2026-07-30 | 0ba7c39 (+ 6dd1b88 ISA) | blueprint blog restyle | rsync per method, 5 files | outcome: clean. Whole-tree checksum parity zero pending, four URLs 200, "The Drafting Table" live, versioned stylesheet URL 200, zero suretas live, suretas/fit/day 200 after, live real-Chrome render confirmed. Note: rsync re-sent byte-identical index.html on mtime alone (rebuilds touch mtimes); the checksum parity dry-run is the real content proof.

- 2026-07-30 | f0d2fa3 (+ c534224 ISA) | first blog deploy | rsync per method above, 7 files | outcome: clean. All four URLs 200, feed text/xml, live blog index byte-matched local (md5 7e0462d3), zero suretas in live bytes, suretas/fit/day all 200 after, live render confirmed in real Chrome. No surprises.
