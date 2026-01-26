import { describe, it, expect } from 'vitest';
import {
  canAccessOrg,
  canAccessProject,
  canWriteOrg,
  canWriteProject,
  isAgencyUser,
  isViewerOnly,
  getRoleForOrg,
  getAccessibleOrgIds,
  filterAccessibleProjects,
  buildAuthContext,
} from './rbac.js';
import { RoleSchema } from './types.js';
import type { AuthContext, ProjectRef } from './types.js';

describe('RBAC Access Checks', () => {
  // --- Fixtures ---
  const agencyOrg = { id: 'org-agency', name: 'Agency HQ', type: 'agency' as const };
  const clientOrgA = { id: 'org-client-a', name: 'Client A', type: 'client' as const };
  const clientOrgB = { id: 'org-client-b', name: 'Client B', type: 'client' as const };

  const agencyAdmin: AuthContext = buildAuthContext(
    { id: 'user-admin', email: 'admin@agency.com' },
    [{ id: 'm1', orgId: agencyOrg.id, userId: 'user-admin', role: 'agency_admin' }]
  );

  const agencyOperator: AuthContext = buildAuthContext(
    { id: 'user-op', email: 'op@agency.com' },
    [{ id: 'm2', orgId: agencyOrg.id, userId: 'user-op', role: 'agency_operator' }]
  );

  const clientAdminA: AuthContext = buildAuthContext(
    { id: 'user-ca', email: 'admin@clienta.com' },
    [{ id: 'm3', orgId: clientOrgA.id, userId: 'user-ca', role: 'client_admin' }]
  );

  const clientMemberA: AuthContext = buildAuthContext(
    { id: 'user-cm', email: 'member@clienta.com' },
    [{ id: 'm4', orgId: clientOrgA.id, userId: 'user-cm', role: 'client_member' }]
  );

  const viewerA: AuthContext = buildAuthContext(
    { id: 'user-v', email: 'viewer@clienta.com' },
    [{ id: 'm5', orgId: clientOrgA.id, userId: 'user-v', role: 'viewer' }]
  );

  const multiOrgUser: AuthContext = buildAuthContext(
    { id: 'user-multi', email: 'multi@agency.com' },
    [
      { id: 'm6', orgId: agencyOrg.id, userId: 'user-multi', role: 'agency_operator' },
      { id: 'm7', orgId: clientOrgA.id, userId: 'user-multi', role: 'client_admin' },
    ]
  );

  const projectA: ProjectRef = { id: 'proj-a', orgId: clientOrgA.id };
  const projectB: ProjectRef = { id: 'proj-b', orgId: clientOrgB.id };

  describe('RoleSchema', () => {
    it('validates all 5 roles', () => {
      const roles = ['agency_admin', 'agency_operator', 'client_admin', 'client_member', 'viewer'];
      for (const role of roles) {
        expect(RoleSchema.safeParse(role).success).toBe(true);
      }
    });

    it('rejects unknown role', () => {
      expect(RoleSchema.safeParse('superadmin').success).toBe(false);
    });
  });

  describe('canAccessOrg', () => {
    it('agency admin can access their org', () => {
      expect(canAccessOrg(agencyAdmin, agencyOrg.id)).toBe(true);
    });

    it('client admin can access their org', () => {
      expect(canAccessOrg(clientAdminA, clientOrgA.id)).toBe(true);
    });

    it('client admin cannot access another org', () => {
      expect(canAccessOrg(clientAdminA, clientOrgB.id)).toBe(false);
    });

    it('multi-org user can access both orgs', () => {
      expect(canAccessOrg(multiOrgUser, agencyOrg.id)).toBe(true);
      expect(canAccessOrg(multiOrgUser, clientOrgA.id)).toBe(true);
    });
  });

  describe('canAccessProject', () => {
    it('agency admin can access any project', () => {
      expect(canAccessProject(agencyAdmin, projectA)).toBe(true);
      expect(canAccessProject(agencyAdmin, projectB)).toBe(true);
    });

    it('agency operator can access any project', () => {
      expect(canAccessProject(agencyOperator, projectA)).toBe(true);
      expect(canAccessProject(agencyOperator, projectB)).toBe(true);
    });

    it('client admin can access their org project', () => {
      expect(canAccessProject(clientAdminA, projectA)).toBe(true);
    });

    it('client admin cannot access another org project', () => {
      expect(canAccessProject(clientAdminA, projectB)).toBe(false);
    });

    it('client member can access their org project', () => {
      expect(canAccessProject(clientMemberA, projectA)).toBe(true);
    });

    it('client member cannot access another org project', () => {
      expect(canAccessProject(clientMemberA, projectB)).toBe(false);
    });

    it('viewer can access their org project', () => {
      expect(canAccessProject(viewerA, projectA)).toBe(true);
    });

    it('viewer cannot access another org project', () => {
      expect(canAccessProject(viewerA, projectB)).toBe(false);
    });
  });

  describe('canWriteOrg', () => {
    it('agency admin can write', () => {
      expect(canWriteOrg(agencyAdmin, agencyOrg.id)).toBe(true);
    });

    it('client admin can write to their org', () => {
      expect(canWriteOrg(clientAdminA, clientOrgA.id)).toBe(true);
    });

    it('client member cannot write', () => {
      expect(canWriteOrg(clientMemberA, clientOrgA.id)).toBe(false);
    });

    it('viewer cannot write', () => {
      expect(canWriteOrg(viewerA, clientOrgA.id)).toBe(false);
    });
  });

  describe('canWriteProject', () => {
    it('agency operator can write to any project', () => {
      expect(canWriteProject(agencyOperator, projectA)).toBe(true);
      expect(canWriteProject(agencyOperator, projectB)).toBe(true);
    });

    it('client admin can write to own org project', () => {
      expect(canWriteProject(clientAdminA, projectA)).toBe(true);
    });

    it('client admin cannot write to other org project', () => {
      expect(canWriteProject(clientAdminA, projectB)).toBe(false);
    });

    it('client member cannot write', () => {
      expect(canWriteProject(clientMemberA, projectA)).toBe(false);
    });
  });

  describe('isAgencyUser', () => {
    it('true for agency_admin', () => {
      expect(isAgencyUser(agencyAdmin)).toBe(true);
    });

    it('true for agency_operator', () => {
      expect(isAgencyUser(agencyOperator)).toBe(true);
    });

    it('false for client_admin', () => {
      expect(isAgencyUser(clientAdminA)).toBe(false);
    });

    it('false for viewer', () => {
      expect(isAgencyUser(viewerA)).toBe(false);
    });

    it('true for multi-org user with agency role', () => {
      expect(isAgencyUser(multiOrgUser)).toBe(true);
    });
  });

  describe('isViewerOnly', () => {
    it('true for viewer', () => {
      expect(isViewerOnly(viewerA)).toBe(true);
    });

    it('false for client_member', () => {
      expect(isViewerOnly(clientMemberA)).toBe(false);
    });

    it('false for agency_admin', () => {
      expect(isViewerOnly(agencyAdmin)).toBe(false);
    });
  });

  describe('getRoleForOrg', () => {
    it('returns role for valid org', () => {
      expect(getRoleForOrg(agencyAdmin, agencyOrg.id)).toBe('agency_admin');
      expect(getRoleForOrg(clientAdminA, clientOrgA.id)).toBe('client_admin');
    });

    it('returns null for org user has no membership in', () => {
      expect(getRoleForOrg(clientAdminA, clientOrgB.id)).toBeNull();
    });
  });

  describe('getAccessibleOrgIds', () => {
    it('returns single org for single-org user', () => {
      expect(getAccessibleOrgIds(clientAdminA)).toEqual([clientOrgA.id]);
    });

    it('returns multiple orgs for multi-org user', () => {
      const orgIds = getAccessibleOrgIds(multiOrgUser);
      expect(orgIds).toContain(agencyOrg.id);
      expect(orgIds).toContain(clientOrgA.id);
      expect(orgIds).toHaveLength(2);
    });
  });

  describe('filterAccessibleProjects', () => {
    const allProjects: ProjectRef[] = [projectA, projectB];

    it('agency admin sees all projects', () => {
      const result = filterAccessibleProjects(agencyAdmin, allProjects);
      expect(result).toHaveLength(2);
    });

    it('client admin sees only their org projects', () => {
      const result = filterAccessibleProjects(clientAdminA, allProjects);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('proj-a');
    });

    it('client member of org B cannot see org A projects', () => {
      const clientMemberB = buildAuthContext(
        { id: 'user-cmb', email: 'member@clientb.com' },
        [{ id: 'm8', orgId: clientOrgB.id, userId: 'user-cmb', role: 'client_member' }]
      );
      const result = filterAccessibleProjects(clientMemberB, allProjects);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('proj-b');
    });
  });

  describe('buildAuthContext', () => {
    it('builds context with deduped orgIds', () => {
      const ctx = buildAuthContext(
        { id: 'u1', email: 'test@test.com' },
        [
          { id: 'm1', orgId: 'org-1', userId: 'u1', role: 'client_member' },
          { id: 'm2', orgId: 'org-1', userId: 'u1', role: 'viewer' },
        ]
      );
      expect(ctx.orgIds).toEqual(['org-1']);
      expect(ctx.memberships).toHaveLength(2);
    });
  });
});
