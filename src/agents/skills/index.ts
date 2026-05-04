import { FrontendSkill } from './FrontendSkill';
import { BackendSkill } from './BackendSkill';
import { DatabaseSkill } from './DatabaseSkill';
import { ApiSkill } from './ApiSkill';
import { TestSkill } from './TestSkill';
import { SetupSkill } from './SetupSkill';
import { ArchitectureSkill } from './ArchitectureSkill';
import { DevOpsSkill } from './DevOpsSkill';
import type { ISkill } from './types';

const SKILL_MAP: Partial<Record<string, ISkill>> = {
    frontend: new FrontendSkill(),
    backend: new BackendSkill(),
    database: new DatabaseSkill(),
    api: new ApiSkill(),
    test: new TestSkill(),
    setup: new SetupSkill(),
    architecture: new ArchitectureSkill(),
    devops: new DevOpsSkill(),
};

export const getSkill = (type?: string): ISkill | null =>
    type ? (SKILL_MAP[type] ?? null) : null;

export type { ISkill, SkillContext, SkillOutput } from './types';
