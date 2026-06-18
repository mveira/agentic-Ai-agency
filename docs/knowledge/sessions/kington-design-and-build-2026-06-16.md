# Kington Design & Build — session log

## Sessions: 2026-06-16 → 2026-06-18 (rolling)

End-to-end build of the Kington Design & Build marketing site —
Bristol-based design and build practice — from empty GitHub repo
through scaffold, content, CMS, analytics, local SEO and deploy.
Three calendar days, ~40 commits across the standalone site repo,
plus mirrored work on the C-Through template and playbook updates
in agency-agents.

### Scope going in

GitHub repo `mveira/kingtonD-B` pre-created by Marcus (empty, no
default branch). Brief: Pattern-B build per
`website-build-playbook.md`, using the C-Through standalone repo as
the source template. Stack: Next.js 14 + React 18.3 + Vercel +
Resend + admin CMS. Spec received as `kington_website_requirements_
spec.docx` v1.1 — premium-trade brand, anthracite-blue accent over
monochrome, line-led visual language, 10 services.

### What shipped

**Standalone repo `mveira/kingtonD-B`** on `feat/initial-scaffold-2026-06-16`:

- Scaffold lifted from `site-c-through-exteriors` — Next.js 14 +
  Vercel + admin CMS + lead form + before-after content type
- Brand swap: ink (#1A1A1A) + anthracite blue (#2E3B4E) + greys
  palette; Montserrat (display) + Inter (body); line motif
  scaled across the site; mono-pitch elevation SVG with shed
  dormer, windows, door, ironmongery, tree, car — used as the
  home-page accent and as per-service motifs (10 distinct line
  illustrations across the services)
- Hero with full-bleed photo + Clifton-Suspension-Bridge SVG
  fallback; CTA buttons brand-aligned
- 10 services seeded in `lib/services.ts` with copy, FAQs (per-
  service + common), service-detail content, line motifs
- Mobile drawer rebuilt full-screen with brand wordmark, lift-up
  motion from the bottom, staggered item reveal
- Process strip (Consult → Design → Build → Handover), audience
  split, services grid, before-after preview, trust strip, stat
  strip with animated counters, testimonials, areas covered,
  closing CTA band, footer
- Quote form: name + phone + email + postcode + service + message
  + GDPR consent + honeypot + multi-file attachments (4 × 8 MB
  images/PDFs, base64-encoded → Resend attachments)
- About page (placeholder content + TBD pills for story / team)
- /privacy + /cookies legal stubs (UK GDPR / PECR)
- /areas index + 4 area landing pages (Clifton, Bedminster,
  Portishead, Nailsea) with location-aware copy + LocalBusiness
  schema + per-area featured services + FAQ schema
- robots.txt explicitly allows GPTBot, OAI-SearchBot, ChatGPT-User,
  PerplexityBot, Google-Extended, ClaudeBot per spec §10.3
- llms.txt enumerates all routes for AEO
- Sitemap covers every route incl. area pages
- Three Vercel components: SpeedInsights, first-party Analytics,
  consent-gated Meta Pixel + GA4 via custom Analytics component
- CookieBanner (accept/reject, localStorage, dispatches
  `cookie-consent-changed`)
- vercel.json pinning serverless functions to lhr1 (London)

**CMS** — three content types behind the existing admin password
gate, all persisted via the GitHub Contents API in production
(falls back to fs in dev):

- `/admin/before-after` — paired before+after photos, client-side
  resize (≤1400 px, JPEG q=0.85), data URLs stored inline in
  `content/before-after.json`
- `/admin/gallery` — 1–12 images per entry, up/down reorder,
  remove buttons, stored inline in `content/gallery.json`
- `/admin/testimonials` — quote + name + location + service +
  verified flag, stored in `content/testimonials.json`
- Admin hub at `/admin` lists all three with counts
- Each save commits as `cms(<section>): <verb> <slug>` →
  Vercel auto-rebuild

**Deployed** to Vercel (preview + production both green). Project
at `vercel.com/mveiras-projects/site-kington-design-and-build`.
Production aliased to
`https://site-kington-design-and-build.vercel.app`. Speed
Insights + Analytics dashboards live.

**Mirrored** to the C-Through template (`mveira/cthroughwindows`
branch `feat/template-attachments-analytics`):

- Same attachment upload + Analytics + CookieBanner
- Same image upload with inline JSON storage
- Same gallery + testimonials CMS sections
- `lib/github-content.ts` + `lib/content-write.ts` swap

**Playbook updates** (`mveira/agentic-Ai-agency` branch
`feat/site-kington-design-and-build-2026-06-16`):

- "Lead-forward email" section extended for multipart + Resend
  attachments (T-A2 mitigation)
- New "Admin image uploads + inline storage" section with
  resize budget + size math
- New "Gallery content type" section
- New "Analytics + cookie consent" section
- "Admin CMS" section updated for GitHub Contents API persistence
- Standard component set: analytics + cookie-banner + gallery-section
- Pre-launch checklist: 5 new items (admin image upload, gallery,
  cookie banner mount, GitHub env vars, attachment smoke test)
- Two new traps (T-N4, T-N5) — see below

### Decisions worth remembering

- **Decision**: skip the playbook's monorepo → subtree-split phase
  and work directly in the pre-created GitHub repo.
  - Why: when the GitHub repo is provided up-front, the monorepo
    intermediate adds friction without benefit. Each clone-then-push
    cycle was clean.
  - Caveat: this means the dossier is the only agency-agents
    artefact for the engagement (no `apps/site-<slug>/` mirror).

- **Decision**: store admin-uploaded images as base64 data URLs
  inline in the JSON, rather than committing binary files separately.
  - Why: simpler (one PUT per save), no path-management drift,
    no binary-in-git anxiety. Combined with client-side resize
    (1400 px / JPEG q=0.85), typical 5 MB photo → ~250 KB.
  - Trade-off: `next/image` can't optimize data URLs — must
    `unoptimized` at every consumer (T-N4).

- **Decision**: monochrome architectural line motif as the brand
  signature, scaled across the home page + per-service detail
  pages + area pages.
  - Why: spec §3.5 calls it out as the standout brand interaction.
    Single-stroke SVG is cheap, scales, and reads as architect's-
    drawing-grade thinking that fits premium-trade.
  - Implementation: `LineMotif` (mono-pitch house with dormer +
    handles + tree + car) on home + areas; `ServiceLineMotif`
    with 10 service-specific variants on /services/[slug].

- **Decision**: Clifton Suspension Bridge SVG as the *fallback*
  hero backdrop when no photo is supplied (spec §3.5/§8 — the
  signature SVG draw-on interaction).
  - Why: Bristol-specific, on-brand line-led, draws itself in
    on hero load, no licensing risk vs stock photography.
  - Marcus subsequently dropped an Unsplash kitchen-extension
    photo as the actual hero — bridge stays in the codebase as
    the fallback.

- **Decision**: ship analytics consent-gated from day one even
  though Meta/GA4 IDs are unset.
  - Why: GDPR-compliant default, banner present on every visit,
    flipping the env var triggers tracking with no code change.

### Traps we hit + how they closed

- **Trap**: `node:fs` writes failed on Vercel for the admin CMS
  (re-confirmation of T-N3 from C-Through).
  - Resolution: built `lib/github-content.ts` + the
    `useGitHub = github.isConfigured()` swap inside
    `lib/content-write.ts`. Each admin save PUTs the JSON via
    the GitHub Contents API; Vercel's git integration redeploys
    with the new content in ~30-60s.
  - Promoted: T-N3 gains a "Resolution" line pointing at the swap.

- **Trap**: `next/image` cannot optimize `data:` URLs.
  - Symptom: silent fallback, console warnings.
  - Fix: `unoptimized={src.startsWith('data:')}` on every
    consumer (`before-after-preview.tsx`, `portfolio/page.tsx`,
    `gallery-section`, admin list views).
  - Generalised → traps.md T-N4.

- **Trap**: easy to ship raw originals as base64 in JSON.
  - Mitigation: client-side resize via `createImageBitmap` +
    canvas (1400 px long edge, JPEG q=0.85). Typical phone
    photo → ~250 KB.
  - Generalised → traps.md T-N5.

- **Trap**: AnimatePresence doesn't track Fragment children —
  mobile drawer wouldn't open.
  - Fix: backdrop + drawer as direct keyed children of
    AnimatePresence, conditionally rendered separately.
  - Logged in the mobile-nav commit but not promoted to traps
    (judgement call: motion-specific enough that the next
    Pattern-B engagement will likely re-discover via the same
    debug path).

- **Trap**: `.site-header` has `backdrop-filter` which created
  a new containing block for the drawer's `position: fixed` —
  drawer was being trapped at header height.
  - Fix: wrap SiteHeader return in a Fragment, move
    `<AnimatePresence>` outside `<header>` so the drawer escapes
    the containing block. Worth promoting if any future build
    hits the same.

### Patterns worth reusing

Already promoted to `../website-build-playbook.md`:

- **Pattern**: GitHub Contents API for CMS persistence —
  `lib/github-content.ts` + swap inside `lib/content-write.ts`.
- **Pattern**: client-side image resize via `createImageBitmap` +
  canvas (1400 px long edge, JPEG q=0.85). Single `resizeToDataUrl`
  helper in both `_form.tsx` admin forms.
- **Pattern**: multi-image picker with hidden `<input name="images">`
  per file + `formData.getAll('images')` in the server action.
- **Pattern**: per-service architectural line motifs via a slug-
  keyed `MOTIFS` map + shared `<SvgFrame>`.
- **Pattern**: consent-gated `<Analytics />` + `<CookieBanner />`
  pair driven by a `cookie-consent-changed` custom event.
- **Pattern**: local SEO landing pages — `lib/areas.ts` data with
  region + postcodes + housingStock blurb + featuredServices,
  feeding `/areas/[slug]` SSG with LocalBusiness + FAQ schema.

### Open at session end

- Marcus to rename default branch `feat/initial-scaffold-2026-06-16`
  → `main` on GitHub
- Marcus to connect Vercel project to GitHub (Settings → Git)
- Marcus to set Vercel env vars: `ADMIN_PASSWORD`,
  `ADMIN_COOKIE_SECRET`, `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`,
  `GITHUB_REPO_NAME`, `GITHUB_DEFAULT_BRANCH`, optional
  `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`,
  `RESEND_API_KEY`, `LEAD_EMAIL_TO`, `LEAD_EMAIL_FROM`,
  `NEXT_PUBLIC_SITE_URL`
- Marcus to confirm 10 services with Kington (spec §14 #1)
- Vector SVG logo (white + ink) still pending — TIFF received
- Real hero photo + project photography to replace Unsplash stock
- Accreditation list to confirm (FMB / TrustMark / etc.) → flip
  `verified: true` per credential in `accreditations-strip.tsx`
- Real testimonials + Google Business Profile link
- Domain ownership confirmation for `kingtondesignbuild.co.uk` +
  DNS pointing at Vercel
- GHL sub-account ID to capture in `runbook.md`

### Time cost notes

- Three rolling sessions, total ~9 hours across two days.
- ~30 commits on `mveira/kingtonD-B` standalone repo.
- Brand palette + typography settled within 15 minutes once the
  spec doc landed (vs the 45 minutes of palette pivots on the
  C-Through engagement before T-D3/T-AE1 were captured) — KB
  paid off.
- External-CDN classifier hit zero times (T-A1 was respected
  from the first asset decision — Unsplash photo provided by
  Marcus from `~/Downloads/`, no probe-and-deny cycle).
- Mobile drawer rebuild burned ~20 minutes on the backdrop-
  filter containing-block trap. Captured as a candidate for
  future trap promotion.
- The image-upload + gallery + testimonials CMS pattern took
  ~90 minutes to design + ship + mirror to C-Through + document.
  Future Pattern-B engagement should be ~30 minutes of
  copy-and-adapt.
