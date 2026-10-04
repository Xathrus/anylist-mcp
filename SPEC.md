# AnyList MCP — Project Spec

**Owner:** Eric (personal project, GitHub: xathrus)
**Status:** Planning
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

### Phase 1 — Prove it works against my AnyList
- Install and run on the LXC (Linux; the Makefile targets don't run natively on Windows).
- Run unit tests, then integration tests with real credentials in `.env`.
- Use the MCP Inspector to exercise every requirement R1–R5 manually.
- **Done when:** R1–R5 all pass in the Inspector, or failures are recorded on the gap list.
- **Stop point:** if the AnyList library can't log in or read data, stop and reassess before going further.

### Phase 2 — Deploy on Proxmox (LAN only)
- Run in HTTP mode via Docker on the LXC; container restarts automatically.
- Create `update.sh` (git pull → rebuild → restart) and document it.
- **Done when:** server survives a container restart and an LXC reboot.

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
| | | |

## Fallback: build our own

Only if the fork is unworkable. Same requirements, phases 1–3 unchanged.
- Stack: Node.js/TypeScript (the maintained AnyList library is Node), official MCP TypeScript SDK, Streamable HTTP transport.
- Auth: OAuth 2.1 with dynamic client registration (what ChatGPT and Claude both expect).
- Reuse the `anylist` npm library for AnyList access.

## Open questions

- Public hostname to use for the tunnel.
- Which LXC hosts it (new or existing Docker host).
- Use my main AnyList account or a secondary shared account?
- Confirm my ChatGPT plan supports Developer Mode.
