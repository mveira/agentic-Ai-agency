import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import type { Membership } from '@agency/auth';
import {
  createAuthMiddleware,
  createProjectAccessMiddleware,
  getAuthContext,
  type AuthMiddlewareConfig,
  type TokenVerifier,
  type MembershipLoader,
  type ProjectLoader,
} from './auth.js';

// --- Mock implementations ---

function createMockVerifier(
  result: { userId: string; email: string } | null = null
): TokenVerifier {
  return { verify: vi.fn().mockResolvedValue(result) };
}

function createMockMembershipLoader(memberships: Membership[] = []): MembershipLoader {
  return { loadMemberships: vi.fn().mockResolvedValue(memberships) };
}

function createMockProjectLoader(orgIdMap: Record<string, string> = {}): ProjectLoader {
  return {
    getProjectOrgId: vi.fn().mockImplementation(async (projectId: string) => {
      return orgIdMap[projectId] ?? null;
    }),
  };
}

// --- Fixtures ---

const agencyMembership: Membership = {
  id: 'm1',
  orgId: 'org-agency',
  userId: 'user-1',
  role: 'agency_admin',
};

const clientMembership: Membership = {
  id: 'm2',
  orgId: 'org-client-a',
  userId: 'user-2',
  role: 'client_admin',
};

const viewerMembership: Membership = {
  id: 'm3',
  orgId: 'org-client-a',
  userId: 'user-3',
  role: 'viewer',
};

const clientMemberMembership: Membership = {
  id: 'm4',
  orgId: 'org-client-a',
  userId: 'user-4',
  role: 'client_member',
};

// --- Helper to create test app ---

function createTestApp(config: AuthMiddlewareConfig) {
  const app = new Hono();
  app.use('/api/*', createAuthMiddleware(config));
  app.get('/api/me', (c) => {
    const auth = getAuthContext(c);
    return c.json({ userId: auth.user.id, orgIds: auth.orgIds });
  });

  // Project-scoped route with read access
  app.use('/api/projects/:id/*', createProjectAccessMiddleware(config, 'read'));
  app.get('/api/projects/:id/config', (c) => {
    return c.json({ projectId: c.req.param('id'), access: 'granted' });
  });

  // Project-scoped write route
  const writeApp = new Hono();
  writeApp.use('/api/*', createAuthMiddleware(config));
  writeApp.use('/api/projects/:id/*', createProjectAccessMiddleware(config, 'write'));
  writeApp.put('/api/projects/:id/config', (c) => {
    return c.json({ projectId: c.req.param('id'), write: 'granted' });
  });

  return { app, writeApp };
}

describe('Auth Middleware', () => {
  describe('createAuthMiddleware', () => {
    it('returns 401 when no Authorization header', async () => {
      const config: AuthMiddlewareConfig = {
        tokenVerifier: createMockVerifier(),
        membershipLoader: createMockMembershipLoader(),
        projectLoader: createMockProjectLoader(),
      };
      const { app } = createTestApp(config);

      const res = await app.request('/api/me');
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain('Authorization');
    });

    it('returns 401 when Authorization header is not Bearer', async () => {
      const config: AuthMiddlewareConfig = {
        tokenVerifier: createMockVerifier(),
        membershipLoader: createMockMembershipLoader(),
        projectLoader: createMockProjectLoader(),
      };
      const { app } = createTestApp(config);

      const res = await app.request('/api/me', {
        headers: { Authorization: 'Basic abc123' },
      });
      expect(res.status).toBe(401);
    });

    it('returns 401 when token is invalid', async () => {
      const config: AuthMiddlewareConfig = {
        tokenVerifier: createMockVerifier(null),
        membershipLoader: createMockMembershipLoader(),
        projectLoader: createMockProjectLoader(),
      };
      const { app } = createTestApp(config);

      const res = await app.request('/api/me', {
        headers: { Authorization: 'Bearer invalid-token' },
      });
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain('expired');
    });

    it('returns 403 when user has no memberships', async () => {
      const config: AuthMiddlewareConfig = {
        tokenVerifier: createMockVerifier({ userId: 'user-1', email: 'test@test.com' }),
        membershipLoader: createMockMembershipLoader([]),
        projectLoader: createMockProjectLoader(),
      };
      const { app } = createTestApp(config);

      const res = await app.request('/api/me', {
        headers: { Authorization: 'Bearer valid-token' },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('memberships');
    });

    it('sets AuthContext and calls next() for valid user', async () => {
      const config: AuthMiddlewareConfig = {
        tokenVerifier: createMockVerifier({ userId: 'user-1', email: 'admin@agency.com' }),
        membershipLoader: createMockMembershipLoader([agencyMembership]),
        projectLoader: createMockProjectLoader(),
      };
      const { app } = createTestApp(config);

      const res = await app.request('/api/me', {
        headers: { Authorization: 'Bearer valid-token' },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.userId).toBe('user-1');
      expect(body.orgIds).toEqual(['org-agency']);
    });

    it('passes token to verifier correctly', async () => {
      const verifier = createMockVerifier({ userId: 'user-1', email: 'a@b.com' });
      const config: AuthMiddlewareConfig = {
        tokenVerifier: verifier,
        membershipLoader: createMockMembershipLoader([agencyMembership]),
        projectLoader: createMockProjectLoader(),
      };
      const { app } = createTestApp(config);

      await app.request('/api/me', {
        headers: { Authorization: 'Bearer my-secret-token' },
      });
      expect(verifier.verify).toHaveBeenCalledWith('my-secret-token');
    });
  });

  describe('createProjectAccessMiddleware (read)', () => {
    it('returns 404 when project does not exist', async () => {
      const config: AuthMiddlewareConfig = {
        tokenVerifier: createMockVerifier({ userId: 'user-1', email: 'admin@agency.com' }),
        membershipLoader: createMockMembershipLoader([agencyMembership]),
        projectLoader: createMockProjectLoader({}),
      };
      const { app } = createTestApp(config);

      const res = await app.request('/api/projects/proj-unknown/config', {
        headers: { Authorization: 'Bearer valid-token' },
      });
      expect(res.status).toBe(404);
    });

    it('agency admin can access any project', async () => {
      const config: AuthMiddlewareConfig = {
        tokenVerifier: createMockVerifier({ userId: 'user-1', email: 'admin@agency.com' }),
        membershipLoader: createMockMembershipLoader([agencyMembership]),
        projectLoader: createMockProjectLoader({ 'proj-a': 'org-client-a' }),
      };
      const { app } = createTestApp(config);

      const res = await app.request('/api/projects/proj-a/config', {
        headers: { Authorization: 'Bearer valid-token' },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.access).toBe('granted');
    });

    it('client admin can access own org project', async () => {
      const config: AuthMiddlewareConfig = {
        tokenVerifier: createMockVerifier({ userId: 'user-2', email: 'admin@clienta.com' }),
        membershipLoader: createMockMembershipLoader([clientMembership]),
        projectLoader: createMockProjectLoader({ 'proj-a': 'org-client-a' }),
      };
      const { app } = createTestApp(config);

      const res = await app.request('/api/projects/proj-a/config', {
        headers: { Authorization: 'Bearer valid-token' },
      });
      expect(res.status).toBe(200);
    });

    it('client admin cannot access other org project', async () => {
      const config: AuthMiddlewareConfig = {
        tokenVerifier: createMockVerifier({ userId: 'user-2', email: 'admin@clienta.com' }),
        membershipLoader: createMockMembershipLoader([clientMembership]),
        projectLoader: createMockProjectLoader({ 'proj-b': 'org-client-b' }),
      };
      const { app } = createTestApp(config);

      const res = await app.request('/api/projects/proj-b/config', {
        headers: { Authorization: 'Bearer valid-token' },
      });
      expect(res.status).toBe(403);
    });

    it('viewer can read own org project', async () => {
      const config: AuthMiddlewareConfig = {
        tokenVerifier: createMockVerifier({ userId: 'user-3', email: 'viewer@clienta.com' }),
        membershipLoader: createMockMembershipLoader([viewerMembership]),
        projectLoader: createMockProjectLoader({ 'proj-a': 'org-client-a' }),
      };
      const { app } = createTestApp(config);

      const res = await app.request('/api/projects/proj-a/config', {
        headers: { Authorization: 'Bearer valid-token' },
      });
      expect(res.status).toBe(200);
    });

    it('viewer cannot read other org project', async () => {
      const config: AuthMiddlewareConfig = {
        tokenVerifier: createMockVerifier({ userId: 'user-3', email: 'viewer@clienta.com' }),
        membershipLoader: createMockMembershipLoader([viewerMembership]),
        projectLoader: createMockProjectLoader({ 'proj-b': 'org-client-b' }),
      };
      const { app } = createTestApp(config);

      const res = await app.request('/api/projects/proj-b/config', {
        headers: { Authorization: 'Bearer valid-token' },
      });
      expect(res.status).toBe(403);
    });
  });

  describe('createProjectAccessMiddleware (write)', () => {
    it('agency admin can write to any project', async () => {
      const config: AuthMiddlewareConfig = {
        tokenVerifier: createMockVerifier({ userId: 'user-1', email: 'admin@agency.com' }),
        membershipLoader: createMockMembershipLoader([agencyMembership]),
        projectLoader: createMockProjectLoader({ 'proj-a': 'org-client-a' }),
      };
      const { writeApp } = createTestApp(config);

      const res = await writeApp.request('/api/projects/proj-a/config', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun: true }),
      });
      expect(res.status).toBe(200);
    });

    it('client admin can write to own org project', async () => {
      const config: AuthMiddlewareConfig = {
        tokenVerifier: createMockVerifier({ userId: 'user-2', email: 'admin@clienta.com' }),
        membershipLoader: createMockMembershipLoader([clientMembership]),
        projectLoader: createMockProjectLoader({ 'proj-a': 'org-client-a' }),
      };
      const { writeApp } = createTestApp(config);

      const res = await writeApp.request('/api/projects/proj-a/config', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun: true }),
      });
      expect(res.status).toBe(200);
    });

    it('client member cannot write to project', async () => {
      const config: AuthMiddlewareConfig = {
        tokenVerifier: createMockVerifier({ userId: 'user-4', email: 'member@clienta.com' }),
        membershipLoader: createMockMembershipLoader([clientMemberMembership]),
        projectLoader: createMockProjectLoader({ 'proj-a': 'org-client-a' }),
      };
      const { writeApp } = createTestApp(config);

      const res = await writeApp.request('/api/projects/proj-a/config', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun: true }),
      });
      expect(res.status).toBe(403);
    });

    it('viewer cannot write to project', async () => {
      const config: AuthMiddlewareConfig = {
        tokenVerifier: createMockVerifier({ userId: 'user-3', email: 'viewer@clienta.com' }),
        membershipLoader: createMockMembershipLoader([viewerMembership]),
        projectLoader: createMockProjectLoader({ 'proj-a': 'org-client-a' }),
      };
      const { writeApp } = createTestApp(config);

      const res = await writeApp.request('/api/projects/proj-a/config', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun: true }),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('getAuthContext', () => {
    it('throws when auth context not set', async () => {
      const app = new Hono();
      app.get('/test', (c) => {
        getAuthContext(c);
        return c.json({ ok: true });
      });

      const res = await app.request('/test');
      expect(res.status).toBe(500);
    });
  });
});
