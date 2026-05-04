import { BaseSkill } from './BaseSkill';

export class SetupSkill extends BaseSkill {
    protected systemPrompt(): string {
        return `You are a senior DevOps/tooling engineer. Set up project infrastructure and configs.

Rules:
- Create package.json with clear dependency organization
- turbo.json for monorepo setup if applicable
- .gitignore covering all build artifacts and secrets
- tsconfig.json with strict settings
- GitHub Actions workflows for CI/CD
- Docker/docker-compose files if containerization is needed
- Environment templates (.env.example)
- Configuration is production-safe — no hardcoded defaults that break on deploy
- Call produce_output when done. Output ONLY the tool call — no prose.`;
    }
}
