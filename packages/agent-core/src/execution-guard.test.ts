import { describe, it, expect } from 'vitest';
import { checkAgentExecution, checkActionExecution, formatGuardLog } from './execution-guard.js';
import { ProjectConfigSchema } from './project-config.js';
import type { ProjectConfig } from './project-config.js';

describe('Execution Guard', () => {
  const agencyProject: ProjectConfig = {
    projectId: 'agency-001',
    dryRun: false,
    enabledAgents: ['research-agent', 'strategy-funnel-agent', 'copy-messaging-agent'],
    enabledActions: ['ghl-create-contact', 'ghl-send-email', 'ghl-update-pipeline'],
  };

  const clientProject: ProjectConfig = {
    projectId: 'client-001',
    dryRun: true,
    enabledAgents: ['research-agent', 'strategy-funnel-agent', 'copy-messaging-agent'],
    enabledActions: ['ghl-create-contact', 'ghl-send-email'],
  };

  const restrictedProject: ProjectConfig = {
    projectId: 'restricted-001',
    dryRun: false,
    enabledAgents: ['research-agent'],
    enabledActions: [],
  };

  const openProject: ProjectConfig = {
    projectId: 'open-001',
    dryRun: false,
    enabledAgents: [],
    enabledActions: [],
  };

  describe('ProjectConfigSchema', () => {
    it('validates a valid project config', () => {
      const result = ProjectConfigSchema.safeParse({
        projectId: 'test-001',
        dryRun: true,
        enabledAgents: ['research-agent'],
        enabledActions: ['ghl-create-contact'],
      });
      expect(result.success).toBe(true);
    });

    it('applies defaults for optional fields', () => {
      const result = ProjectConfigSchema.parse({ projectId: 'test-002' });
      expect(result.dryRun).toBe(false);
      expect(result.enabledAgents).toEqual([]);
      expect(result.enabledActions).toEqual([]);
    });
  });

  describe('checkAgentExecution', () => {
    it('allows enabled agent on agency project (no dryRun)', () => {
      const result = checkAgentExecution({
        config: agencyProject,
        agentId: 'research-agent',
      });
      expect(result.allowed).toBe(true);
      expect(result.dryRun).toBe(false);
      expect(result.blockedReason).toBeUndefined();
    });

    it('blocks agent on client project in dryRun', () => {
      const result = checkAgentExecution({
        config: clientProject,
        agentId: 'research-agent',
      });
      expect(result.allowed).toBe(false);
      expect(result.dryRun).toBe(true);
      expect(result.blockedReason).toBe('dry-run');
    });

    it('blocks disabled agent even when not in dryRun', () => {
      const result = checkAgentExecution({
        config: restrictedProject,
        agentId: 'copy-messaging-agent',
      });
      expect(result.allowed).toBe(false);
      expect(result.blockedReason).toBe('agent-disabled');
      expect(result.message).toContain('copy-messaging-agent');
      expect(result.message).toContain('not enabled');
    });

    it('allows any agent when enabledAgents is empty (no filter)', () => {
      const result = checkAgentExecution({
        config: openProject,
        agentId: 'any-agent',
      });
      expect(result.allowed).toBe(true);
    });

    it('same webhook behaves differently per project', () => {
      const agencyResult = checkAgentExecution({
        config: agencyProject,
        agentId: 'research-agent',
      });
      const clientResult = checkAgentExecution({
        config: clientProject,
        agentId: 'research-agent',
      });
      expect(agencyResult.allowed).toBe(true);
      expect(clientResult.allowed).toBe(false);
      expect(clientResult.blockedReason).toBe('dry-run');
    });
  });

  describe('checkActionExecution', () => {
    it('allows enabled action on agency project', () => {
      const result = checkActionExecution({
        config: agencyProject,
        actionId: 'ghl-create-contact',
      });
      expect(result.allowed).toBe(true);
      expect(result.dryRun).toBe(false);
    });

    it('blocks action on client project in dryRun', () => {
      const result = checkActionExecution({
        config: clientProject,
        actionId: 'ghl-create-contact',
      });
      expect(result.allowed).toBe(false);
      expect(result.dryRun).toBe(true);
      expect(result.blockedReason).toBe('dry-run');
    });

    it('blocks disabled action', () => {
      const result = checkActionExecution({
        config: agencyProject,
        actionId: 'ghl-delete-contact',
      });
      expect(result.allowed).toBe(false);
      expect(result.blockedReason).toBe('action-disabled');
    });

    it('allows any action when enabledActions is empty (no filter)', () => {
      const result = checkActionExecution({
        config: openProject,
        actionId: 'any-action',
      });
      expect(result.allowed).toBe(true);
    });

    it('client project never writes to GHL', () => {
      const actions = ['ghl-create-contact', 'ghl-send-email', 'ghl-update-pipeline'];
      for (const actionId of actions) {
        const result = checkActionExecution({
          config: clientProject,
          actionId,
        });
        expect(result.allowed).toBe(false);
        expect(result.dryRun).toBe(true);
      }
    });
  });

  describe('formatGuardLog', () => {
    it('formats allowed execution log', () => {
      const result = checkAgentExecution({
        config: agencyProject,
        agentId: 'research-agent',
      });
      const log = formatGuardLog({
        projectId: agencyProject.projectId,
        agentId: 'research-agent',
        result,
      });
      expect(log.projectId).toBe('agency-001');
      expect(log.agentId).toBe('research-agent');
      expect(log.allowed).toBe(true);
      expect(log.dryRun).toBe(false);
      expect(log.timestamp).toBeDefined();
    });

    it('formats blocked execution log with reason', () => {
      const result = checkAgentExecution({
        config: clientProject,
        agentId: 'research-agent',
      });
      const log = formatGuardLog({
        projectId: clientProject.projectId,
        agentId: 'research-agent',
        result,
      });
      expect(log.allowed).toBe(false);
      expect(log.dryRun).toBe(true);
      expect(log.blockedReason).toBe('dry-run');
      expect(log.message).toContain('Dry run');
    });

    it('formats action log with action ID', () => {
      const result = checkActionExecution({
        config: clientProject,
        actionId: 'ghl-send-email',
      });
      const log = formatGuardLog({
        projectId: clientProject.projectId,
        actionId: 'ghl-send-email',
        result,
      });
      expect(log.actionId).toBe('ghl-send-email');
      expect(log.blockedReason).toBe('dry-run');
    });
  });
});
