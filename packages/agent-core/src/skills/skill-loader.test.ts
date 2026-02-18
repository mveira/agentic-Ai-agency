import { describe, it, expect } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSkill, loadSkills, SkillNotFoundError, InvalidSkillIdError } from './skill-loader.js';
import type { SkillId } from './skill-loader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// agency-skills is a sibling of agency-agents: ../../agency-agents/packages/agent-core/src/skills -> ../../agency-skills
const SKILLS_BASE = resolve(__dirname, '../../../../../agency-skills');

describe('loadSkill', () => {
  it('returns correct LoadedSkill shape for security/v1', async () => {
    const skill = await loadSkill('security/v1', SKILLS_BASE);

    expect(skill.id).toBe('security/v1');
    expect(skill.name).toBe('security');
    expect(skill.version).toBe('v1');
    expect(typeof skill.skill).toBe('string');
    expect(skill.skill.length).toBeGreaterThan(0);
    expect(typeof skill.checklists).toBe('string');
    expect(typeof skill.qcTests).toBe('string');
    // templates may be string or null
    expect(skill.templates === null || typeof skill.templates === 'string').toBe(true);
  });

  it('reads actual files from agency-skills (integration)', async () => {
    const skill = await loadSkill('security/v1', SKILLS_BASE);

    expect(skill.skill).toContain('Security');
    expect(skill.checklists.length).toBeGreaterThan(0);
    expect(skill.qcTests.length).toBeGreaterThan(0);
  });

  it('throws SkillNotFoundError for nonexistent skill', async () => {
    await expect(loadSkill('nonexistent/v1' as SkillId, SKILLS_BASE)).rejects.toThrow(
      SkillNotFoundError,
    );
  });

  it('throws InvalidSkillIdError for invalid format', async () => {
    await expect(loadSkill('invalid' as SkillId, SKILLS_BASE)).rejects.toThrow(
      InvalidSkillIdError,
    );
  });

  it('throws InvalidSkillIdError for "security/vx"', async () => {
    await expect(loadSkill('security/vx' as SkillId, SKILLS_BASE)).rejects.toThrow(
      InvalidSkillIdError,
    );
  });

  it('throws InvalidSkillIdError for uppercase name', async () => {
    await expect(loadSkill('Security/v1' as SkillId, SKILLS_BASE)).rejects.toThrow(
      InvalidSkillIdError,
    );
  });
});

describe('loadSkills', () => {
  it('loads multiple skills', async () => {
    const skills = await loadSkills(['security/v1', 'psychology/v1'], SKILLS_BASE);

    expect(skills).toHaveLength(2);
    expect(skills[0]!.name).toBe('security');
    expect(skills[1]!.name).toBe('psychology');
  });

  it('rejects if any skill id is invalid', async () => {
    await expect(
      loadSkills(['security/v1', 'nonexistent/v1' as SkillId], SKILLS_BASE),
    ).rejects.toThrow(SkillNotFoundError);
  });

  it('returns empty array for empty input', async () => {
    const skills = await loadSkills([], SKILLS_BASE);
    expect(skills).toHaveLength(0);
  });
});
