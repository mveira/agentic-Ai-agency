# Authentication & Multi-Tenancy

The system uses Supabase for authentication and a custom RBAC layer for multi-tenant access control.

---

## Authentication Flow

```
1. User requests magic link via Supabase
2. Email delivered with login link
3. User clicks link → redirected to /auth/callback
4. Supabase exchanges code for session token
5. Token attached to all subsequent API requests as Bearer token
6. API middleware verifies token + loads memberships
```

---

## Role Hierarchy

| Role | Level | Read Access | Write Access |
|------|-------|-------------|--------------|
| `agency_admin` | Agency | All projects | All projects |
| `agency_operator` | Agency | All projects | All projects |
| `client_admin` | Client | Own org projects | Own org projects |
| `client_member` | Client | Own org projects | None |
| `viewer` | Any | Assigned projects | None |

Agency roles (`agency_admin`, `agency_operator`) have cross-org access — they can read and write all projects regardless of org assignment.

Client roles are scoped to their organisation. A `client_admin` can write to projects owned by their org. A `client_member` has read-only access.

`viewer` is strictly read-only across all memberships.

---

## Core Types

### User
```typescript
interface User {
  id: string;
  email: string;
}
```

### Membership
```typescript
interface Membership {
  id: string;
  orgId: string;
  userId: string;
  role: Role;
}
```

A user can have multiple memberships across different organisations with different roles.

### AuthContext
```typescript
interface AuthContext {
  user: User;
  memberships: Membership[];
  orgIds: string[];
}
```

Built from user + memberships via `buildAuthContext()`. Attached to every authenticated request.

### ProjectRef
```typescript
interface ProjectRef {
  id: string;
  orgId: string;
}
```

Used for project-level access checks.

---

## RBAC Functions

| Function | Purpose |
|----------|---------|
| `canAccessOrg(ctx, orgId)` | Check if user has any membership in org |
| `canAccessProject(ctx, project)` | Agency roles → true; client roles → check org match |
| `canWriteOrg(ctx, orgId)` | Check write-capable role in org |
| `canWriteProject(ctx, project)` | Agency roles → true; client_admin → check org match |
| `isAgencyUser(ctx)` | Check if any membership is agency_admin or agency_operator |
| `isViewerOnly(ctx)` | Check if all memberships are viewer |
| `getRoleForOrg(ctx, orgId)` | Get user's role in a specific org |
| `getAccessibleOrgIds(ctx)` | Get all org IDs user can access |
| `filterAccessibleProjects(ctx, projects)` | Filter project list by access permissions |

---

## API Middleware

### Token Verification

```typescript
const authMiddleware = createAuthMiddleware({
  verifier: TokenVerifier;       // Validates bearer token
  membershipLoader: MembershipLoader;  // Loads user's org memberships
});
```

Applied to all authenticated routes. Extracts bearer token from `Authorization` header, verifies it, loads memberships, and attaches `AuthContext` to the Hono context.

Returns 401 if token is missing or invalid.

### Project Access

```typescript
const projectAccess = createProjectAccessMiddleware({
  projectLoader: ProjectLoader;  // Resolves projectId → orgId
}, 'read' | 'write');
```

Applied to project-scoped routes. Checks if the authenticated user can access (or write to) the specified project based on their role and org membership.

Returns 403 if access is denied.

---

## Multi-Tenant Data Isolation

- Every project belongs to an organisation (`orgId`)
- Every query is scoped by project or org
- Agency users can cross org boundaries
- Client users are strictly isolated to their org
- The dashboard renders different views based on role:
  - Agency users see all projects
  - Client users see only their org's projects
  - Viewers see assigned projects in read-only mode

---

## Supabase Integration

| Component | Location |
|-----------|----------|
| Magic link auth | `apps/dashboard/src/app/login/` |
| OAuth callback | `apps/dashboard/src/app/auth/callback/` |
| Client utilities | `apps/dashboard/src/lib/supabase/` |
| Middleware | `apps/dashboard/src/lib/supabase/middleware.ts` |

The dashboard uses Supabase's client-side and server-side auth helpers for session management.
