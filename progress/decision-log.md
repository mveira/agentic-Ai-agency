# Decision Log

Segment: Week 1 – Foundation

---

## 2026-01-25

### Decision: Use pnpm workspaces for monorepo
- **Reason:** Native workspace support, efficient disk usage via hard links, strict dependency resolution
- **Alternatives considered:**
  - npm workspaces (less mature tooling)
  - yarn workspaces (extra dependency)
  - turborepo (adds complexity for initial scaffold)

### Decision: TypeScript strict mode everywhere
- **Reason:** Catches errors at compile time, better IDE support, self-documenting code
- **Alternatives considered:**
  - JavaScript with JSDoc (less type safety)
  - Partial TypeScript (inconsistent)

### Decision: Vitest over Jest for unit tests
- **Reason:** Native ESM support, faster execution, compatible with Vite ecosystem
- **Alternatives considered:**
  - Jest (slower, ESM issues)
  - Mocha (more configuration needed)

---
