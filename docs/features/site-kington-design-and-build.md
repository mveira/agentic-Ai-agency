# Site — Kington Design & Build

**Phase A** (high-level). Engagement record + delivery contract for the
Kington Design & Build marketing site.

## Purpose

Deliver a Vercel-hosted Next.js marketing + lead-generation site for
Kington Design & Build (Bristol design-and-build practice), following
the Pattern B template documented in
`docs/knowledge/website-build-playbook.md`. Source dossier lives in the
SPYN repo at `docs/08-operations/clients/kington-design-and-build/`.

## Handbook Alignment

Stage 7 (Build) + Stage 8 (Delivery). Client-facing deliverable, not
an internal pipeline.

## Trigger

Engagement initiated 2026-06-16. Standalone GitHub repo at
`mveira/kingtonD-B` was pre-created by Marcus; scaffold pushed on
`feat/initial-scaffold-2026-06-16`.

## Inputs

- Engagement dossier — SPYN `docs/08-operations/clients/kington-design-and-build/`
- C-Through reference scaffold — `~/Development/agentic-agency/site-c-through-exteriors/`
- Knowledge base — `docs/knowledge/website-build-playbook.md` + `website-build-traps.md`
- Client logo — `/Users/marcusveira/Desktop/projects/kington/cropped -logo.tiff`
- Prior 2025 scaffold (content reference only) — `~/Desktop/projects/kington/kington-build-design/`
- Future inputs: client requirements doc (in flight), photos, real
  testimonials, real contact details, accent-colour decision, GHL
  sub-account ID

## Outputs

- Live Vercel deployment at `kingtondesignbuild.co.uk` (TBD —
  domain ownership to be confirmed)
- Standalone GitHub repo `mveira/kingtonD-B` with commit history
- Session log at `docs/knowledge/sessions/kington-design-and-build-2026-06-16.md`
  (written at session end per `governance.md`)
- Traps + patterns promoted into `website-build-traps.md` /
  `website-build-playbook.md` as they emerge

## Allowed Actions

- Lift component patterns + admin CMS + lib utilities from
  C-Through standalone repo wholesale where SAME (most of the stack)
- Adapt brand tokens, services, FAQs, copy, photos per Kington
  requirements
- Push to `mveira/kingtonD-B`, deploy to Vercel
- Update SPYN dossier as engagement state changes
- Promote KB content per `governance.md`

## Forbidden Actions

- Ship fabricated stat numbers / quotes / claims without
  `VERIFIED = false` kill-switch + visible TBD pill (T-C1/T-C2)
- Use external-CDN photos (Unsplash, Pexels) — classifier blocks,
  surface unblock options to user on first denial (T-A1)
- Pick palette from CSS scrape rather than logo (T-D3/T-AE1)
- Treat any image as hero before `file` confirms dimensions (T-D2)
- `replace_all` on RGBA literals that double as token definition
  values (T-CH1)
- Commit substantive work directly to `main` on either repo

## UI/UX Summary

Standard marketing site: hero → audience split → services grid →
before/after preview → testimonials → areas covered → quote form.
Inner pages: per-service, portfolio, contact, admin CMS (gated).
A11y baseline: skip link, `<MotionConfig reducedMotion="user">`,
labelled forms, semantic landmarks.

## Failure Modes

| Failure | Behaviour | Recovery |
|---------|-----------|----------|
| Build breaks on `pnpm build` | Fix locally, commit, redeploy | Vercel preview gates merge to main |
| Resend API fails for lead-forward | Form still succeeds; log is the audit trail | Check log + alert client |
| Admin CMS write fails on Vercel (read-only fs) | Documented Phase-3 limitation; CMS works in `next dev` only for now | Migrate to GitHub-API-commit (`lib/content-write.ts` swap) |
| Image asset 404 (e.g. `/images/hero/background.jpg`) | Visible broken-image until seeded | Seed `public/images/` from client-supplied photos |
| Palette pivot loop | Bound to ≤1 pre-logo + lock after logo `Read` (T-D3/T-AE1) | Decision-log palette choice + move on |
| External-CDN classifier block | First denial → STOP + surface 3 unblock options (T-A1) | User picks: file drop / URL paste / settings.json rule |

## Escalation Rules

- Domain ownership unclear → escalate to Marcus before launch
- GHL sub-account not yet created → escalate at the pre-launch
  checklist phase
- Client unreachable for testimonial / stat verification → ship with
  `VERIFIED = false` + TBD pill; do not fabricate

## Cost Considerations

Zero LLM cost. Vercel free tier covers a marketing site at this
traffic level. Resend free tier covers expected lead volume.
GitHub private repo is free. Time-cost target: per session-log time
benchmarks for `c-through-exteriors-2026-06-15` minus the ~85 minutes
of traps we won't re-hit.

## Logging & Audit

- Dossier in SPYN (5 files) — long-form engagement audit trail
- in-flight.md row on `feat/client-site-onboarding-kington-2026-06-16`
- Session log at engagement close per `governance.md`
- Git commit history in `mveira/kingtonD-B`
- Vercel deployment logs (web UI)
- Lead form submissions logged to `console.log` + optionally
  Resend-forwarded (audit trail = console log, not the email)

## CHANGES

| Date | Author | Change |
|------|--------|--------|
| 2026-06-16 | Claude | Phase A draft created at engagement start |
