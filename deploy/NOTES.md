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

## Subscribe service (staged, not deployed)

The newsletter capture added a subscribe form to the homepage and the blog index. The form is plain HTML that posts to `/subscribe`, which means this repo now has a server-side component: `src/subscribe/server.ts`. **It is not deployed and not enabled.** Nothing in the section above changes: the deploy is still an rsync of `public/`, and the live site today answers `/subscribe` with a 404 until Austin decides otherwise.

Deciding to enable it is a real decision, not a step. It puts a writable database of email addresses on a shared box that also holds Suretas client data, and it makes the one page element that can fail independently of the site.

### What the service is

- Bun + TypeScript, zero dependencies, SQLite via `bun:sqlite`.
- `POST /subscribe` stores one address. Honeypot field, sliding-window rate limit, duplicates are a no-op.
- `GET /export.csv` returns the list, bearer-token gated. No token configured means the route answers 503, never an open export.
- **It sends no email, ever.** austinfiala.com has no sending identity. Collecting a list and mailing a list are two separate decisions and only the first is built. Two tests and the unit's `IPAddressDeny=any` all hold that line.

### If it is ever enabled

1. Create the paths and the data directory:
   - code: `/opt/austinfiala/service/` (rsync `src/subscribe/` there, dir to dir, same rules as `public/`)
   - data: `/opt/austinfiala/data/` owned by `ubuntu`, mode 700
2. Optional export token: write `ADMIN_TOKEN=<random>` to `/opt/austinfiala/subscribe.env`, mode 600, owner `ubuntu`. Skip this and the export route stays 503.
3. Install the unit: copy `deploy/subscribe.service` to `/etc/systemd/system/`, then `systemctl daemon-reload && systemctl enable --now subscribe`. Confirm it is listening on loopback only: `ss -ltnp | grep 4700` shows `127.0.0.1:4700` and nothing else.
4. Add the Caddy routing below to the `austinfiala.com` site block, `caddy validate` it, then **reload, never restart** (three other sites live on this box).
5. Smoke it from the box before trusting it from outside, then from outside.

### Caddy snippet (comment, do not apply until step 4 above)

```
# austinfiala.com {
#     root * /opt/austinfiala/public
#     file_server
#
#     # Exactly one proxied path. Everything else stays static files.
#     handle /subscribe {
#         reverse_proxy 127.0.0.1:4700 {
#             # Required. Without this the rate limiter is decoration: the
#             # client supplies X-Real-IP itself and gets a fresh bucket per
#             # request. Ships together with SUBSCRIBE_TRUST_PROXY_IP=1.
#             header_up X-Real-IP {remote_host}
#         }
#     }
#
#     # Graceful degradation. If the service is down, dead or mid restart, the
#     # reader gets a plain page with a mailto fallback instead of a bare
#     # gateway error. There is no JavaScript in this path, so there is no
#     # error cascade to handle: the browser posts, Caddy answers, done.
#     handle_errors 502 503 504 {
#         rewrite * /subscribe-unavailable/index.html
#         file_server
#     }
# }
```

Two traps worth naming, both of which look fine until they are live:

- **Use `handle`, not `handle_path`.** `handle_path` strips the matched prefix, so the service would receive `/` and answer 404 for every signup while Caddy reports a healthy 404 and nothing looks broken.
- **Do not proxy `/export.csv`.** It stays loopback only. A subscriber list on the public origin is one leaked bearer token away from being everyone's, and there is no reason for it to be reachable from the internet when the operator can already reach the box. Export over SSH instead:
  `ssh ubuntu@44.200.119.114 'curl -sS -H "Authorization: Bearer <token>" http://127.0.0.1:4700/export.csv' > subscribers.csv`

### Trying it on the box without enabling anything

Run it in the foreground against a scratch database, probe it over loopback, then Ctrl-C. Nothing is installed, nothing is enabled, nothing survives:

```
cd /opt/austinfiala/service
SUBSCRIBERS_DB=/tmp/scratch-subs.db SUBSCRIBE_PORT=4505 /usr/local/bin/bun src/subscribe/server.ts
curl -si -X POST -d 'email=probe@example.com' http://127.0.0.1:4505/subscribe   # expect 303 to /subscribed/
rm -f /tmp/scratch-subs.db*
```

### Smoke set additions (only once it is enabled)

- `POST /subscribe` from outside with a real address: 303 to `/subscribed/`, and the row is present in the export.
- Honeypot post (`website=x`): answers the same as a success, and adds no row.
- Rate limit: the eleventh post inside a minute answers 429.
- `GET /export.csv` from outside: **must not be routable** (404 or the static site's own answer, never a CSV).
- Stop the service and post the form once: the reader gets the service-down page, not a gateway error. Start it again.
- `/subscribed/` and `/subscribe-unavailable/` both 200 as static pages.

### Backups

`subscribers.db` would be the only irreplaceable state this site has ever had. The static site needs no backup because it rebuilds from the repo; a list of addresses does not. Enabling the service without adding it to the nightly off-site backup pattern used by cadence and daybook leaves one copy of the list on one disk.

## Known gotchas

- rsync path flattening: always dir-to-dir with trailing slash on BOTH sides (learned on Suretas 2026-07-12).
- Never dig a brand-new domain before creating its records (negative-cache incident 2026-07-15). Not relevant to updates.
- Rollback = `git archive <previous-commit>` locally, rebuild, rsync the same way. Statics make rollback identical to deploy.

## Deploy log

- 2026-08-03 | 1a5ee38 | Cadence case study post (publish #1 on the PUBLISH/TOUCH counter) | rsync per method, 5 files | outcome: clean. Checksum parity zero pending, zero orphans, four URLs 200 (feed text/xml), siblings suretas/fit/day 200, zero suretas in live post bytes, live real-Chrome render confirmed (NOTE 002, REV 2026.08.03). No surprises.

- 2026-07-31 | 43c430a (+ 3abf382 ISA) | social cards, bio box, robots, sitemap, URL lock-in | rsync per method | outcome: clean. Parity zero pending, zero orphans, six URLs 200 (incl. robots.txt + sitemap.xml), /assets/card.png live as image/png 66054 bytes, bio + canonical + og markers in live bytes, siblings 200. LinkedIn Post Inspector seed attempted via automation browser but it has no LinkedIn session (empty shell); Austin should paste a post URL into linkedin.com/post-inspector once from his own browser.

- 2026-07-30 | 0ba7c39 (+ 6dd1b88 ISA) | blueprint blog restyle | rsync per method, 5 files | outcome: clean. Whole-tree checksum parity zero pending, four URLs 200, "The Drafting Table" live, versioned stylesheet URL 200, zero suretas live, suretas/fit/day 200 after, live real-Chrome render confirmed. Note: rsync re-sent byte-identical index.html on mtime alone (rebuilds touch mtimes); the checksum parity dry-run is the real content proof.

- 2026-07-30 | f0d2fa3 (+ c534224 ISA) | first blog deploy | rsync per method above, 7 files | outcome: clean. All four URLs 200, feed text/xml, live blog index byte-matched local (md5 7e0462d3), zero suretas in live bytes, suretas/fit/day all 200 after, live render confirmed in real Chrome. No surprises.
