import type { AuthContext, Membership, Role, ProjectRef } from './types.js';

/**
 * RBAC Access Checks
 *
 * Single source of truth for authorization decisions.
 * All access checks go through these functions.
 */

/**
 * Roles that grant agency-wide access
 */
const AGENCY_ROLES: Role[] = ['agency_admin', 'agency_operator'];

/**
 * Roles that grant write access
 */
const WRITE_ROLES: Role[] = ['agency_admin', 'agency_operator', 'client_admin'];

/**
 * Check if user has a membership in the given org
 */
export function canAccessOrg(ctx: AuthContext, orgId: string): boolean {
  return ctx.memberships.some((m) => m.orgId === orgId);
}

/**
 * Check if user can access a project (via org membership)
 */
export function canAccessProject(ctx: AuthContext, project: ProjectRef): boolean {
  // Agency roles can access all projects
  if (isAgencyUser(ctx)) {
    return true;
  }
  return ctx.memberships.some((m) => m.orgId === project.orgId);
}

/**
 * Check if user has an agency role (admin or operator)
 */
export function isAgencyUser(ctx: AuthContext): boolean {
  return ctx.memberships.some((m) => AGENCY_ROLES.includes(m.role));
}

/**
 * Check if user has write access to an org
 */
export function canWriteOrg(ctx: AuthContext, orgId: string): boolean {
  return ctx.memberships.some(
    (m) => m.orgId === orgId && WRITE_ROLES.includes(m.role)
  );
}

/**
 * Check if user has write access to a project
 */
export function canWriteProject(ctx: AuthContext, project: ProjectRef): boolean {
  // Agency admins/operators can write to any project
  if (isAgencyUser(ctx)) {
    return true;
  }
  return ctx.memberships.some(
    (m) => m.orgId === project.orgId && WRITE_ROLES.includes(m.role)
  );
}

/**
 * Check if user is a viewer only (read-only)
 */
export function isViewerOnly(ctx: AuthContext): boolean {
  return ctx.memberships.every((m) => m.role === 'viewer');
}

/**
 * Get user's role for a specific org
 */
export function getRoleForOrg(ctx: AuthContext, orgId: string): Role | null {
  const membership = ctx.memberships.find((m) => m.orgId === orgId);
  return membership?.role ?? null;
}

/**
 * Get all org IDs the user has access to
 */
export function getAccessibleOrgIds(ctx: AuthContext): string[] {
  return [...new Set(ctx.memberships.map((m) => m.orgId))];
}

/**
 * Filter projects to only those the user can access
 */
export function filterAccessibleProjects(
  ctx: AuthContext,
  projects: ProjectRef[]
): ProjectRef[] {
  if (isAgencyUser(ctx)) {
    return projects;
  }
  const orgIds = new Set(getAccessibleOrgIds(ctx));
  return projects.filter((p) => orgIds.has(p.orgId));
}

/**
 * Build an AuthContext from user and memberships
 */
export function buildAuthContext(user: { id: string; email: string }, memberships: Membership[]): AuthContext {
  return {
    user,
    memberships,
    orgIds: [...new Set(memberships.map((m) => m.orgId))],
  };
}
