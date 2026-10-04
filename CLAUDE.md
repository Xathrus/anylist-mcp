# CLAUDE.md — anylist-mcp

## What this is
A fork of bobby060/anylist-mcp, deployed on my personal Proxmox and exposed via Cloudflare Tunnel so ChatGPT can read/write my AnyList recipes, meal plan, and lists. **Read SPEC.md before starting any work.** It has the requirements, phases, and acceptance tests.

## About me
- I'm not a programmer. Explain what you're doing and why in plain terms, especially for anything touching auth, networking, or secrets.
- I want copy-paste-ready commands for anything I run myself on the server.
- My workstation is Windows. The Makefile targets and Docker run on the Linux LXC, not on Windows.

## How to work
- Work one phase at a time, in the order in SPEC.md. Don't start the next phase until the current one's "Done when" is met.
- Propose a plan before making multi-file changes.
- Use a branch for anything beyond a small fix.
- When a requirement fails testing, add it to the Gap list in SPEC.md rather than silently working around it.
- Keep SPEC.md current: update status, gap list, and open questions as things change.

## Git
- `origin` = `git@github-xathrus:xathrus/anylist-mcp.git` (my fork). Never change the host alias.
- `upstream` = `https://github.com/bobby060/anylist-mcp.git` (pull only, never push).
- Release order: `git add -A` → `git commit` → `git push origin main` → `git tag vX.Y.Z` → `git push origin vX.Y.Z`. Never tag before committing.

## Secrets (hard rules)
- Never commit `.env`, `config/allowed-emails.txt`, credentials, tokens, or the data volume. Confirm `.gitignore` covers them before the first commit.
- Never print secret values in output or logs.
- Ask before any change that affects authentication or what's publicly exposed.

## Deployment
- Runs in Docker on a personal Proxmox LXC.
- Exposed through my existing Cloudflare Tunnel as a new public hostname (no port forwarding).
- Updates via `update.sh` on the server: git pull, rebuild, restart.

---

# Upstream coding guidelines

_From bobby060/anylist-mcp. Kept so fixes stay in the style upstream expects._

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.