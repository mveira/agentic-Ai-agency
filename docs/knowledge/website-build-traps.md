# Website build traps

Specific anti-patterns observed in real engagements. Each entry is a
**Don't / Do** pair with the root cause and a citation back to the
session log where it was hit. Read this file before every website-build
engagement — see [`governance.md`](./governance.md).

When you hit a new trap, **add it here** before you finish the session.
Two engagements hitting the same trap means we didn't write the trap
down clearly enough.

---

## Discovery + scoping

### T-D1 — Don't cite code that doesn't exist yet
**Root cause**: Relying on a previous session's transcript rather than
grepping the current codebase.
**Do**: Before any reference to a symbol in a deliverable doc, grep for
it. "It was in the prior session's transcript" ≠ "it exists in this
repo."
**First hit**: `c-through-exteriors-2026-06-15` — `CrmAdapter` was cited
as if built across the proposal + feature record; no code existed. Had
to retroactively build the seam.

### T-D2 — Don't trust file names; `file` every asset before use
**Root cause**: Used a 70×70 px PNG as a hero image because the
filename said "commercial-building.png".
**Do**: `file path/to/image` on every candidate before treating it as
hero. Aspect ratio, dimensions, and actual format all matter.
**First hit**: `c-through-exteriors-2026-06-15`.

### T-D3 — Don't extract palette from CSS scrape; read the logo
**Root cause**: Audit's CSS scrape gives the historical implementation
palette, not necessarily the brand's actual identity.
**Do**: `Read` the logo file (PNG/SVG) directly at engagement start.
Brand palette is what the logo says, not what the legacy `main.css`
says.
**First hit**: `c-through-exteriors-2026-06-15` — three palette pivots
(electric purple → indigo → final logo-derived blue+coral) before
opening the logo PNG. ~45 minutes of pivots.

---

## Asset sourcing

### T-A1 — Don't probe external CDNs; the classifier will block
**Root cause**: When the client doesn't have a needed asset, the
temptation is to grab from Unsplash/Pexels/Picsum. Auto-classifier
blocks every external-image fetch by default — re-trying with a
different URL doesn't help.
**Do**: On the **first** denial, STOP and surface three unblock
options to the user:
1. Drop a file directly into `public/images/...`
2. Paste a specific URL + explicit "download this" instruction
3. Add a Bash permission rule to `.claude/settings.json`
**First hit**: `c-through-exteriors-2026-06-15` — 4 separate denials
(Unsplash HEAD probe, Unsplash GET, etc.) before escalating. ~30
minutes lost.

### T-A2 — Reuse client-owned assets via their own domain
**Root cause**: Client assets that exist on `<their-domain>/images/...`
ARE allowed by the classifier — they're not "external" in the trust
sense.
**Do**: Audit the live site for image paths before considering stock.
Often the highest-quality version of a hero photo is already there as
a CSS `background-image: url('../images/background-l.jpg')` reference
that doesn't show up in `<img src>` greps.
**First hit**: `c-through-exteriors-2026-06-15` — the live site's
actual CSS background-image was the highest-quality photo in their
library (1600×1200 vs everything else at 500×500). Took several
attempts before reading the live `main.css` to find it.

---

## Content + claims

### T-C1 — Don't ship fabricated numbers
**Root cause**: Visual layout demands a number (rating, stat,
testimonial) and the temptation is to plug "500+" or "4.9★" into
the JSX. Once shipped, it's invented fact on a real client site.
**Do**: Every fabricated/placeholder number gets a `VERIFIED = false`
boolean kill-switch at the top of the component AND a visible "TBD"
pill in the UI when `VERIFIED === false`. Flip to `true` only when the
client confirms the real value.
**First hit**: `c-through-exteriors-2026-06-15` — stat strip shipped
500+/4.9★/10+yrs/£2m, retrofitted TBD pills after audit.

### T-C2 — Testimonials must carry a `verified` boolean per entry
**Root cause**: Same as T-C1 but per-row. Without per-entry flagging,
real testimonials and placeholders look identical in the UI.
**Do**: Schema includes `verified: boolean` on every testimonial entry.
Component renders a "Placeholder" badge when `verified === false`.
**Pattern source**: `c-through-exteriors-2026-06-15`.

---

## Code hygiene

### T-CH1 — Don't `replace_all` a literal that's in both a token definition AND downstream usages
**Root cause**: Ran `replace_all rgba(88,32,255,0.08)` → `var(--shadow-brand-rgba)` to clean up token references. The same literal was the
*value* of the `--shadow-brand` token, so the definition silently became
`--shadow-brand: 0 8px 24px var(--shadow-brand-rgba)` — referencing an
undefined variable. Service-card hover shadows were invisible for
several commits.
**Do**: Update the **usages** to reference the token first; the token
definition stays untouched. Or use targeted `Edit` calls instead of
`replace_all` on values that appear in token definitions.
**First hit**: `c-through-exteriors-2026-06-15`.

### T-CH2 — Default to `git commit -F file.txt` for non-trivial bodies
**Root cause**: Heredoc commit messages break on em-dashes, smart
quotes, special chars. 4 separate failures cost ~5 min each.
**Do**: Write the message to `/tmp/commit-msg.txt` and run
`git commit -F /tmp/commit-msg.txt && rm /tmp/commit-msg.txt`. Reserve
heredoc for one-line ASCII-only messages.
**First hit**: `c-through-exteriors-2026-06-15`.

### T-CH3 — When working across two repos, prepend cd to every Bash invocation
**Root cause**: `cd ../agency-agents` to update the dossier, then later
`pnpm test` runs against the monorepo not the standalone site. Test
output looks weird (119 tests instead of 53), waste cycles debugging
"why did tests change".
**Do**: For multi-repo sessions, every Bash that runs tests/lint/build
starts with `cd /full/absolute/path/to/correct/repo &&`. Don't rely on
the shell's persistent cwd.
**First hit**: `c-through-exteriors-2026-06-15`.

---

## React + Next.js specifics

### T-N1 — `useActionState` is React 19; React 18.3 uses `useFormState` + `useFormStatus`
**Root cause**: Wrote `import { useActionState } from 'react'` for the
admin login form. Build failed with "useActionState is not a function".
**Do**: On React 18.x: `import { useFormState, useFormStatus } from 'react-dom'`.
Outer component uses `useFormState(action, initialState)`; a child
`<SubmitButton>` inside the `<form>` uses `useFormStatus()` for pending.
**First hit**: `c-through-exteriors-2026-06-15`.

### T-N2 — Client components using `useSearchParams()` need `<Suspense>` wrapping for prerender
**Root cause**: `pnpm build` failed on `/admin/login` because
`useSearchParams()` forces CSR-bailout, and the page wasn't marked
dynamic.
**Do**: Wrap the searchparam-using subtree in `<Suspense fallback={...}>`.
Or mark the page `export const dynamic = 'force-dynamic'` if Suspense
is awkward.
**First hit**: `c-through-exteriors-2026-06-15`.

### T-N3 — Admin filesystem writes via `node:fs` don't work on Vercel
**Root cause**: Built a CMS that writes to `content/before-after.json`
via `fs.writeFile`. Works in `next dev`, throws at runtime on Vercel
serverless (read-only filesystem).
**Do**: For Vercel-hosted CMS persistence, either:
1. Commit changes via the GitHub API (push to `main`, Vercel auto-deploys)
2. Use Vercel KV or Blob
3. Use a third-party DB
Document the limitation in the runbook the moment the CMS lands; don't
let it discover-in-production.
**First hit**: `c-through-exteriors-2026-06-15` — documented in runbook
as a Phase-3 enhancement.

---

## Aesthetic iteration

### T-AE1 — Cap palette pivots at one before reading the logo
**Root cause**: Three palette pivots before reading the logo PNG
directly. The audit's extracted CSS led to an "electric purple" guess
that was wrong twice.
**Do**: Before any palette change beyond the initial extraction, run
`Read` on the logo file. If the audit palette and the logo
disagree, the logo wins.

### T-AE2 — Surface external-fetch denials immediately, don't try alternatives
**Root cause**: After first Unsplash denial, tried 3 more URLs of
varying specificity. All blocked. Spent 30 minutes before escalating.
**Do**: First denial → STOP. Tell the user "the classifier denied this,
here are your three options to unblock." Don't speculatively try a
different domain or different path style.

---

## Process hygiene

### T-P1 — Verify repo location at session start against existing memory
**Root cause**: Memory says SPYN lives at one path; I worked in another
because that's where the structure matched conversation references.
**Do**: At session start, `git rev-parse --show-toplevel` and compare
to any stored memory of "where SPYN lives". If they differ, surface to
the user before any commits land.

### T-P2 — Follow the worktree convention if it exists in memory
**Root cause**: Stored memory `parallel-sessions-worktree-convention`
says to work in `.claude/worktrees/<slug>` worktrees. Skipped it.
**Do**: Read all relevant memory files at session start. If a
convention applies, set up the worktree first. Cost of `git worktree add`
is one shell command.
