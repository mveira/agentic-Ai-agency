import { z } from 'zod';

/**
 * Organization types
 */
export const OrgTypeSchema = z.enum(['agency', 'client']);
export type OrgType = z.infer<typeof OrgTypeSchema>;

/**
 * Role hierarchy (highest to lowest privilege)
 */
export const RoleSchema = z.enum([
  'agency_admin',
  'agency_operator',
  'client_admin',
  'client_member',
  'viewer',
]);
export type Role = z.infer<typeof RoleSchema>;

/**
 * Organization
 */
export interface Org {
  id: string;
  name: string;
  type: OrgType;
}

/**
 * User profile
 */
export interface User {
  id: string;
  email: string;
}

/**
 * Membership linking user to org with a role
 */
export interface Membership {
  id: string;
  orgId: string;
  userId: string;
  role: Role;
}

/**
 * Authenticated context available to API/dashboard
 */
export interface AuthContext {
  user: User;
  memberships: Membership[];
  orgIds: string[];
}

/**
 * Project with org ownership
 */
export interface ProjectRef {
  id: string;
  orgId: string;
}
