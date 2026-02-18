/**
 * Skills Loader
 *
 * Reads skill definitions from the agency-skills sibling repo.
 * Each skill has: skill.md (required), checklists.md, qc-tests.md, templates.md (optional).
 */

import { readFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Skill identifier in the format `{name}/v{version}`.
 * Examples: "security/v1", "llm-optimisation/v1", "psychology/v1"
 */
export type SkillId = `${string}/v${number}`;

/**
 * Regex to validate and parse SkillId format.
 */
const SKILL_ID_REGEX = /^([a-z][a-z0-9-]*)\/(v\d+)$/;

export interface LoadedSkill {
  id: SkillId;
  name: string;
  version: string;
  skill: string;
  checklists: string;
  qcTests: string;
  templates: string | null;
}

// ─── Errors ─────────────────────────────────────────────────────────────────

export class SkillNotFoundError extends Error {
  constructor(
    public readonly skillId: string,
    public readonly path: string,
  ) {
    super(`Skill not found: "${skillId}" (looked in ${path})`);
    this.name = 'SkillNotFoundError';
  }
}

export class InvalidSkillIdError extends Error {
  constructor(public readonly skillId: string) {
    super(
      `Invalid SkillId format: "${skillId}". Expected format: "{name}/v{version}" (e.g. "security/v1")`,
    );
    this.name = 'InvalidSkillIdError';
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseSkillId(id: string): { name: string; version: string } {
  const match = id.match(SKILL_ID_REGEX);
  if (!match) {
    throw new InvalidSkillIdError(id);
  }
  return { name: match[1]!, version: match[2]! };
}

const __dirname = dirname(fileURLToPath(import.meta.url));

function getDefaultBasePath(): string {
  return process.env.SKILLS_BASE_PATH ?? resolve(__dirname, '../../../../../agency-skills');
}

async function readOptionalFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf-8');
  } catch {
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Load a single skill by its SkillId.
 * Throws SkillNotFoundError if skill.md doesn't exist.
 * Throws InvalidSkillIdError if the id format is wrong.
 */
export async function loadSkill(id: SkillId, basePath?: string): Promise<LoadedSkill> {
  const { name, version } = parseSkillId(id);
  const base = basePath ?? getDefaultBasePath();
  const skillDir = join(base, 'skills', name);
  const skillPath = join(skillDir, 'skill.md');

  let skill: string;
  try {
    skill = await readFile(skillPath, 'utf-8');
  } catch {
    throw new SkillNotFoundError(id, skillPath);
  }

  const [checklists, qcTests, templates] = await Promise.all([
    readFile(join(skillDir, 'checklists.md'), 'utf-8').catch(() => ''),
    readFile(join(skillDir, 'qc-tests.md'), 'utf-8').catch(() => ''),
    readOptionalFile(join(skillDir, 'templates.md')),
  ]);

  return {
    id,
    name,
    version,
    skill,
    checklists,
    qcTests,
    templates,
  };
}

/**
 * Load multiple skills. Rejects if any skill fails to load.
 */
export async function loadSkills(ids: SkillId[], basePath?: string): Promise<LoadedSkill[]> {
  return Promise.all(ids.map((id) => loadSkill(id, basePath)));
}
