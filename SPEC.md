# AnyList MCP — Project Spec

**Owner:** Eric (personal project, GitHub: xathrus)
**Status:** Phase 2 done, and internet-facing dependency vulnerabilities fixed (2026-10-04). Next: Phase 3. Phase 0 done (2026-10-04, commit 142c7b8). On CT 116: Docker 29.8 and Node 22.23 installed, unit tests 80/80 pass, integration tests 57/57 pass against my main account (login, lists, recipes, meal plan, collections). MCP Inspector (2026-10-04): R1 search ("chicken", 147 hits) + full recipe ✅; R2 two-week range ✅; R3 add entry linked to a recipe with Dinner label ✅ (edit is missing, see gaps); R4 import from Allrecipes, 11 ingredients and 9 steps ✅; R5 all 25 lists + a non-grocery list ✅. Recipe times display wrong (gap). Note: the grocery list is named "My Grocery List", not "Groceries".
**Last updated:** 2026-10-04

## Goal

Give ChatGPT (and optionally Claude) read/write access to my AnyList account through a self-hosted MCP server running on my personal Proxmox, reachable from anywhere via Cloudflare Tunnel.

## Requirements

The connected AI must be able to:

| # | Capability | Type |
|---|---|---|
| R1 | Read my recipes (search, list, view full recipe) | Read |
| R2 | Read my meal plan (by date range) | Read |
| R3 | Write to my meal plan (add/edit/remove entries, optionally linked to a recipe) | Write |
| R4 | Add recipes (manual entry and import from URL) | Write |
| R5 | Read and write my lists (view lists, add/check off/remove items) | Read/Write |

Non-functional requirements:

- **N1 Remote access:** works from ChatGPT web on any device, not just my LAN.
- **N2 Auth:** the public endpoint must require OAuth. No anonymous access to my AnyList data.
- **N3 Secrets:** AnyList credentials and server secrets live only in `.env`/config on the server, never in git.
- **N4 Self-hosted:** runs in Docker on an LXC on my personal Proxmox, exposed through my existing Cloudflare Tunnel.
- **N5 Maintainable by me:** setup and update steps documented in copy-paste form.

## Approach: fork first, build only if needed

An open-source project, **bobby060/anylist-mcp**, already implements most of this:

- Tools: `shopping`, `recipes` (browse, create, import from URL), `meal_plan`, `recipe_collections`, `health_check`
- HTTP mode in Docker designed for Cloudflare Tunnel
- Built-in OAuth with an email allowlist (`config/allowed-emails.txt`)
- Node.js 20+, built on a fork of the `anylist` npm library (unofficial, reverse-engineered AnyList API)

**Plan:** fork it to `xathrus/anylist-mcp`, deploy it, verify every requirement against ChatGPT, and only write code to close gaps. If it turns out to be broken or unworkable, fall back to building our own (see Fallback).

### Mapping requirements to existing tools

| Req | Expected tool | Verify in Phase 1 |
|---|---|---|
| R1 | `recipes` | search, list, get by name/ID |
| R2 | `meal_plan` | read by date range |
| R3 | `meal_plan` | add, edit, delete; link to recipe |
| R4 | `recipes` | create manually; import from URL |
| R5 | `shopping` | all lists, not just the default "Groceries" |

Anything that doesn't pass goes on the gap list (below) and becomes a change in our fork.

## Constraints and risks

- **Unofficial API.** AnyList has no public API. The library can break when AnyList changes their app. Mitigation: `health_check` tool, integration tests, and a pinned version so updates are deliberate.
- **ChatGPT requirements.** Custom MCP connectors require Developer Mode on a paid plan, are added through the web app, and authenticate via OAuth (ChatGPT cannot send a static API token). The server's OAuth flow must work with ChatGPT specifically; this is the highest-risk integration point and gets tested first in Phase 3.
- **Credential exposure.** The server holds my AnyList password. Optional mitigation: if AnyList sharing allows it, create a second AnyList account, share my lists/recipes/meal plan with it, and give the server that account instead.
- **Public endpoint.** Allowlist only my email. Keep the server and its dependencies updated.

## Architecture

```
ChatGPT (web/mobile)
   │  HTTPS + OAuth
   ▼
Cloudflare Tunnel  ──  public hostname: anylist-mcp.<my-domain>
   │
   ▼
Proxmox LXC (personal)
   └─ Docker: anylist-mcp (HTTP mode)
         ├─ .env (secrets, not in git)
         ├─ config/allowed-emails.txt (not in git)
         └─ data volume (accounts, OAuth clients; back this up)
   │
   ▼
AnyList (unofficial API)
```

## Phases

Each phase must work before starting the next.

### Phase 0 — Fork and set up repo
- Fork `bobby060/anylist-mcp` to `xathrus/anylist-mcp`.
- Clone to `~/code/personal/anylist-mcp` using `git@github-xathrus:` (with `--recurse-submodules`).
- Add `upstream` remote pointing to `bobby060/anylist-mcp`.
- Add this `SPEC.md` and `CLAUDE.md`; commit and push.
- **Done when:** repo is cloned, both remotes exist, first commit is pushed as xathrus.
- **Result: ✅ Done.** Notes:
  - Repo was initialized in the existing folder rather than freshly cloned, so SPEC.md and CLAUDE.md stayed put. The result is the same as a clone, including the `anylist-js` submodule.
  - Upstream already had its own CLAUDE.md, so it was merged under ours as "Upstream coding guidelines". If upstream edits it, pulling from upstream may need a manual merge.
  - `upstream` push URL is set to `no_push`, so git refuses any push to bobby060.
  - Added `.gitignore` entries for `.env.*` (except the examples) and `.anylist_credentials`.

### Phase 1 — Prove it works against my AnyList
- Install and run on the LXC (Linux; the Makefile targets don't run natively on Windows).
- Run unit tests, then integration tests with real credentials in `.env`.
- Use the MCP Inspector to exercise every requirement R1–R5 manually.
- **Done when:** R1–R5 all pass in the Inspector, or failures are recorded on the gap list.
- **Stop point:** if the AnyList library can't log in or read data, stop and reassess before going further.
- **Result: ✅ Done.** R1, R2, R4 and R5 pass; R3 add/remove passes, edit is missing. Failures and risks are on the gap list. Test data (imported Allrecipes cookie recipe, Oct 10 test meal plan entry) was deleted afterwards. Inspector access: `ssh -L 6274:localhost:6274 -L 6277:localhost:6277 root@<LXC IP>`, then `make inspect` in that session.

### Phase 2 — Deploy on Proxmox (LAN only)
- Run in HTTP mode via Docker on the LXC; container restarts automatically.
- Create `update.sh` (git pull → rebuild → restart) and document it.
- **Done when:** server survives a container restart and an LXC reboot.

- **Result: ✅ Done (2026-10-04).** Running via Docker Compose with `restart: unless-stopped`. First `./update.sh` built and reported healthy (the first build takes about 11 min, mostly `apk add`; it's cached after that). `docker compose restart` came back healthy. After an LXC `reboot`, `/health` answered from the LAN without any manual steps. Server account created for xathrus@gmail.com and AnyList login saved via `/setup`. `allowed-emails.txt` is read only at startup, so restart after editing it.

#### Server runbook (CT 116, `/opt/anylist-mcp`)

| Task | Command |
|---|---|
| Update to latest `main` | `cd /opt/anylist-mcp && ./update.sh` |
| Status | `cd /opt/anylist-mcp && docker compose ps` |
| Logs (live; Ctrl+C to stop) | `cd /opt/anylist-mcp && docker compose logs -f` |
| Restart | `cd /opt/anylist-mcp && docker compose restart` |
| Stop / start | `docker compose down` / `docker compose up -d` (in `/opt/anylist-mcp`) |
| Health | `curl -s http://localhost:3000/health` should print `{"status":"ok"}` |

Sign-in model: create a server account at `http://192.168.12.86:3000/login` (email must be in `config/allowed-emails.txt`), then enter AnyList credentials at `/setup`. They're stored encrypted with `SERVER_SECRET_KEY`.

**Back up:**
- `SERVER_SECRET_KEY` and `SESSION_SECRET` from `.env`, in a password manager. Without `SERVER_SECRET_KEY`, the saved AnyList login can't be decrypted, and you'd have to re-enter it at `/setup`.
- The `anylist_data` Docker volume (the SQLite database with accounts and OAuth clients). Losing it means signing up again and reconnecting ChatGPT, but no AnyList data is lost.

### Phase 3 — Expose and connect ChatGPT
- Add a public hostname to the existing Cloudflare Tunnel pointing at the container.
- Configure secrets and the email allowlist (my email only).
- In ChatGPT: enable Developer Mode, add a custom connector with the tunnel URL, auth = OAuth, complete sign-in.
- Run the acceptance tests below in ChatGPT.
- **Done when:** all acceptance tests pass from ChatGPT on my phone, off my home network.

### Phase 4 — Close gaps
- Fix anything on the gap list in our fork, with tests (follow upstream's CONTRIBUTING.md so fixes could be offered upstream).
- **Done when:** gap list is empty or remaining items are explicitly deferred.

### Phase 5 (optional) — Claude connector
- Add the same URL as a custom connector in Claude and repeat the acceptance tests.

## Acceptance tests (run in ChatGPT)

1. "Search my AnyList recipes for chicken and show the top 5." (R1)
2. "Show me the full recipe for [a real recipe name]." (R1)
3. "What's on my meal plan for next week?" (R2)
4. "Add [recipe] to my meal plan for Thursday dinner." Then verify in the AnyList app. (R3)
5. "Move Thursday's dinner to Friday." Verify in app. (R3)
6. "Import this recipe: [URL]." Verify it appears in AnyList with ingredients and steps. (R4)
7. "What lists do I have?" and "What's on [a non-Groceries list]?" (R5)
8. "Add milk and eggs to my grocery list," then "check off milk." Verify in app. (R5)
9. Sign out of the connector and confirm the URL rejects unauthenticated requests. (N2)

## Gap list

_Filled in during Phase 1 and Phase 3._

| Gap | Found in | Status |
|---|---|---|
| **Dependency vulnerabilities.** Full install: 33 (1 critical, 21 high). Production only (`npm audit --omit=dev`, 2026-10-04): **21 (1 critical, 10 high, 5 moderate, 5 low)**, so not just dev tools. Seen so far: `@anthropic-ai/mcpb` (desktop-extension packager, wrongly listed under `dependencies`, unused at runtime) pulls in vulnerable `@inquirer/prompts`; `ws` 7.x (DoS), `uuid` <11, `tough-cookie` <4.1.3 come via the AnyList library and are only used against AnyList's servers. Critical item not yet identified. Do not use `npm audit fix --force`. | Phase 1 setup, Phase 2 | **Mostly fixed, merged 2026-10-04** (21 → 3; unit 80/80, integration 57/57 on the server; one test updated because the SDK now reports invalid input as a tool error instead of a protocol error): moved `mcpb` to devDependencies (21 → 14), then ran a non-forced `npm audit fix`. Every internet-facing item is fixed: MCP SDK 1.17.4 → 1.32.0, path-to-regexp 8.4.2, body-parser 2.3.0, qs 6.16.0; also ws 7.5.13, tough-cookie 4.1.4, form-data 3.0.5. The server already uses one McpServer + transport per session, so the SDK's shared-instance leak doesn't apply. **Accepted risk:** `protobufjs` 5.0.3 (critical) and `uuid` 3.4.0 (moderate) are pinned by the AnyList library and only process data from AnyList's own servers over TLS, never input from MCP clients. Fixing them means porting `anylist-js` to protobufjs 7+ (Phase 4, needs our own fork of the submodule). Side finding: the server runs AnyList code from the `anylist-js` submodule, but its runtime packages come from the npm `anylist@0.8.5` dependency. Re-run `npm audit --omit=dev` after every dependency change. |
| **R3 edit:** `meal_plan` has no edit/move action, only `list_events`, `list_labels`, `create_event` and `delete_event`. "Move Thursday's dinner to Friday" only works if the AI deletes and re-creates the entry, which loses the original entry ID and needs two steps that could half-fail. | Phase 1 code review | Open: Phase 4 candidate (add `update_event`) |
| **R1/R4 recipe times:** AnyList stores prep/cook time in **seconds** (per `anylist-js/README.md`), but `src/tools/recipes.js` shows them as minutes and writes `prep_time`/`cook_time` "in minutes" unconverted. Seen in Inspector: "Baked Lemon Chicken, cook: 1500min" (really 25 min). A recipe created with prep_time 15 would save as 15 seconds. | Phase 1 Inspector | Open: Phase 4 (convert seconds↔minutes on read and write, with tests) |
| **Recipe delete with duplicate names:** `deleteRecipe` in `src/anylist-client.js` deletes the first exact-name match without checking for others, while `update` refuses when a name matches several recipes. With 1,300+ recipes, a duplicate name could make ChatGPT delete the wrong copy. | Phase 1 code review | Open: Phase 4 (refuse on multiple matches, or delete by ID) |

## Fallback: build our own

Only if the fork is unworkable. Same requirements, phases 1–3 unchanged.
- Stack: Node.js/TypeScript (the maintained AnyList library is Node), official MCP TypeScript SDK, Streamable HTTP transport.
- Auth: OAuth 2.1 with dynamic client registration (what ChatGPT and Claude both expect).
- Reuse the `anylist` npm library for AnyList access.

## Open questions

- Public hostname to use for the tunnel.

Resolved:

- ~~Which LXC hosts it?~~ **New dedicated LXC** (decided 2026-10-04): unprivileged Debian, 2 cores, 2 GB RAM, 512 MB swap, 16 GB disk, features `nesting=1,keyctl=1` (required for Docker), start at boot, fixed IP. Built as CT 116, Debian 13, 192.168.12.86. Code lives at `/opt/anylist-mcp`, cloned read-only over HTTPS, so the server has no GitHub credentials.

- ~~Use my main AnyList account or a secondary shared account?~~ **Main account** (decided 2026-10-04). Accepted risk: the server holds my main AnyList password, encrypted at rest with `SERVER_SECRET_KEY`. Integration tests write to this account, but only items prefixed 🧪, a list named `Test List`, and meal plan entries dated 2099. They clean up after themselves; if a run crashes, delete any 🧪 leftovers by hand.
- Confirm my ChatGPT plan supports Developer Mode.
