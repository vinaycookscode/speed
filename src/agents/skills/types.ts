export interface SkillContext {
    taskTitle: string;
    taskDescription: string;
    projectName: string;
}

export interface SkillOutput {
    files: { path: string; content: string }[];
    summary: string;
}

export interface ISkill {
    execute(ctx: SkillContext): Promise<SkillOutput>;
}
