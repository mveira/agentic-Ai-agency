# Error Log

Segment: Week 1 – Foundation

---

## Week 4.0 – Auth + Multi-Tenant

### Error: Unused `Membership` import in rbac.test.ts
- **Timestamp:** 2026-01-26
- **Command:** `pnpm lint`
- **Error:** `'Membership' is defined but never used`
- **Resolution:** Removed unused import from type import line

### Error: Auth package noEmit preventing dist build
- **Timestamp:** 2026-01-26
- **Command:** `pnpm --filter @agency/auth build`
- **Error:** Build produced no output files; API failed to resolve `@agency/auth`
- **Resolution:** Added `"noEmit": false` to auth tsconfig.json (root tsconfig has `noEmit: true`)

### Error: Implicit any types in Supabase cookie methods
- **Timestamp:** 2026-01-26
- **Command:** `pnpm --filter @agency/dashboard typecheck`
- **Error:** 18 `TS7006: Parameter implicitly has an 'any' type` errors
- **Resolution:** Added explicit type annotations (`name: string`, `value: string`, `options: CookieOptions`) to all cookie method parameters

---

*Previous weeks: no errors recorded.*

---
