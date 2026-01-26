import type { Context, Next, MiddlewareHandler } from 'hono';
import type { AuthContext, Membership, ProjectRef } from '@agency/auth';
import { buildAuthContext, canAccessProject, canWriteProject } from '@agency/auth';

/**
 * Verifies a bearer token and returns user info.
 * Supabase implementation verifies JWT; mock returns static data.
 */
export interface TokenVerifier {
  verify(token: string): Promise<{ userId: string; email: string } | null>;
}

/**
 * Loads memberships for a user from the database.
 */
export interface MembershipLoader {
  loadMemberships(userId: string): Promise<Membership[]>;
}

/**
 * Loads a project's org ownership.
 */
export interface ProjectLoader {
  getProjectOrgId(projectId: string): Promise<string | null>;
}

/**
 * Configuration for auth middleware.
 */
export interface AuthMiddlewareConfig {
  tokenVerifier: TokenVerifier;
  membershipLoader: MembershipLoader;
  projectLoader: ProjectLoader;
}

/**
 * Extract bearer token from Authorization header.
 */
function extractBearerToken(header: string | undefined): string | null {
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }
  return header.slice(7);
}

/**
 * Creates a Hono middleware that verifies the bearer token,
 * loads memberships, and attaches AuthContext to the request.
 */
export function createAuthMiddleware(config: AuthMiddlewareConfig): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const token = extractBearerToken(c.req.header('authorization'));
    if (!token) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const user = await config.tokenVerifier.verify(token);
    if (!user) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    const memberships = await config.membershipLoader.loadMemberships(user.userId);
    if (memberships.length === 0) {
      return c.json({ error: 'No organization memberships found' }, 403);
    }

    const authCtx = buildAuthContext(
      { id: user.userId, email: user.email },
      memberships
    );

    c.set('auth', authCtx);
    await next();
  };
}

/**
 * Retrieve AuthContext from Hono context. Throws if not set.
 */
export function getAuthContext(c: Context): AuthContext {
  const auth = c.get('auth') as AuthContext | undefined;
  if (!auth) {
    throw new Error('Auth context not found. Ensure auth middleware is applied.');
  }
  return auth;
}

/**
 * Creates middleware that checks the authenticated user can access the
 * project identified by the :id route param.
 */
export function createProjectAccessMiddleware(
  config: AuthMiddlewareConfig,
  mode: 'read' | 'write' = 'read'
): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const authCtx = c.get('auth') as AuthContext | undefined;
    if (!authCtx) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const projectId = c.req.param('id') ?? c.req.param('projectId');
    if (!projectId) {
      return c.json({ error: 'Missing project ID' }, 400);
    }

    const orgId = await config.projectLoader.getProjectOrgId(projectId);
    if (!orgId) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const project: ProjectRef = { id: projectId, orgId };
    const hasAccess = mode === 'write'
      ? canWriteProject(authCtx, project)
      : canAccessProject(authCtx, project);

    if (!hasAccess) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    c.set('project', project);
    await next();
  };
}
