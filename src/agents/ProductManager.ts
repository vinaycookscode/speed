import { createLLMClient, resolveBestProvider } from '../lib/llm';
import type { ClaudeClient } from '../lib/llm/claude';
import type { ToolDefinition } from '../lib/llm/types';
import { v4 as uuidv4 } from 'uuid';
import type { Task, Epic, Story, Role } from '../store/agentStore';

export type PlanningProgressCallback = (charsReceived: number, rawChunk: string) => void;

export interface PlanningOutput {
    epics: Epic[];
    stories: Story[];
    tasks: Task[];
}

interface RawTask {
    title: string;
    description: string;
    type: string;
    complexity: number;
    assignableTo: string[];
    acceptanceCriteria?: string[];
    dependsOn?: string[];
}

interface RawStory {
    storyTitle: string;
    tasks: RawTask[];
}

interface RawEpic {
    epicTitle: string;
    epicDescription: string;
    stories: RawStory[];
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const OUTPUT_PLAN_TOOL: ToolDefinition = {
    name: 'output_plan',
    description: 'Output the complete project execution plan as structured data. Call this tool once with the full plan.',
    parameters: {
        properties: {
            epics: {
                type: 'array',
                description: '8-12 epics covering all relevant domains',
                items: {
                    type: 'object',
                    required: ['epicTitle', 'epicDescription', 'stories'],
                    properties: {
                        epicTitle: { type: 'string', description: 'Short domain name, e.g. "Authentication & Authorization"' },
                        epicDescription: { type: 'string', description: '2-3 sentence explanation of what this epic covers and why it matters' },
                        stories: {
                            type: 'array',
                            description: '3-5 user stories per epic',
                            items: {
                                type: 'object',
                                required: ['storyTitle', 'tasks'],
                                properties: {
                                    storyTitle: { type: 'string', description: 'User story format: As a [persona], I can [action] so that [benefit]' },
                                    tasks: {
                                        type: 'array',
                                        description: '3-6 atomic tasks per story',
                                        items: {
                                            type: 'object',
                                            required: ['title', 'description', 'type', 'complexity', 'assignableTo'],
                                            properties: {
                                                title: { type: 'string', description: 'Verb + specific noun, e.g. "Create users migration 001_create_users.sql"' },
                                                description: { type: 'string', description: 'Full technical specification — minimum 10 lines with all implementation details' },
                                                type: {
                                                    type: 'string',
                                                    enum: ['setup', 'architecture', 'database', 'backend', 'api', 'frontend', 'test', 'devops'],
                                                },
                                                complexity: { type: 'number', minimum: 1, maximum: 10 },
                                                assignableTo: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'string',
                                                        enum: ['Architect', 'Tech Lead', 'Software Engineer', 'Backend Engineer', 'QA Engineer', 'DevOps Engineer'],
                                                    },
                                                },
                                                acceptanceCriteria: {
                                                    type: 'array',
                                                    description: 'Minimum 3 binary pass/fail conditions',
                                                    items: { type: 'string' },
                                                },
                                                dependsOn: {
                                                    type: 'array',
                                                    description: 'Exact titles of tasks that must complete before this one starts',
                                                    items: { type: 'string' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        required: ['epics'],
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are a Staff Product Manager and Engineering Lead with 15+ years shipping production SaaS products. You understand both product strategy and deep technical implementation.

Given a project idea, you will:
1. THINK deeply about what this product truly needs (not just what was stated)
2. Call the \`output_plan\` tool with a comprehensive execution plan that AI engineering agents can implement without any clarification

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK DESCRIPTION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DATABASE tasks must specify:
- Migration filename (e.g. 003_create_orders.sql)
- Full CREATE TABLE with every column: name, type, constraints, default
- All indexes including compound ones for common queries
- Foreign keys with ON DELETE/ON UPDATE behaviour
- Any check constraints or triggers

BACKEND / SERVICE tasks must specify:
- File path (e.g. src/services/OrderService.ts)
- Class name + all methods with typed params and return types
- Step-by-step business logic (numbered)
- Error cases and what is thrown
- Caching strategy if applicable (what, TTL, invalidation)

API / ENDPOINT tasks must specify:
- HTTP method + full URL (e.g. POST /api/v1/orders)
- Middleware chain in order (auth → validate → handler)
- Complete request schema: all fields with types, required/optional, validation
- All response shapes: HTTP code + JSON body for success AND every error case
- Side effects: emails, queue jobs, events, cache invalidation
- Rate limit if applicable

FRONTEND tasks must specify:
- File path (e.g. src/pages/orders/OrderDetailPage.tsx)
- Props interface
- All state variables with types and initial values
- Every API call: endpoint, trigger condition, loading/error/success UI states
- Form fields (if any): validation rules, error messages
- Navigation: where the user goes after each action
- Mobile vs desktop layout differences

TEST tasks must specify:
- File path + framework (e.g. src/__tests__/OrderService.test.ts — Vitest)
- All mocks needed
- Every test case by name: input → expected output
- Edge cases: invalid inputs, concurrent calls, boundary values
- Coverage target (%)

DEVOPS / SETUP tasks must specify:
- Exact commands to run
- All files created with intended content structure
- Every env variable: key name, example value, required/optional
- package.json changes (scripts, deps)

DEPENDENCIES (dependsOn field):
- List exact titles of tasks that must complete before this one starts
- Cross-story and cross-epic dependencies are valid
- Always order tasks within a story: database → backend → api → frontend → test
- Example: a backend service task should dependsOn the migration task that creates its tables

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EPIC COVERAGE — generate ALL applicable
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Always include:
1. Project Setup & Architecture (repo, tech stack, env config, base structure, DB connection)
2. Database Design (ALL tables — users, sessions, domain entities, audit logs, etc.)
3. Authentication & Authorization (register, login, JWT+refresh, password reset, RBAC)
4. [3-6 Core Product Epics specific to the idea — cover main features in detail]
5. Admin / Management Panel (user management, content moderation — if applicable)
6. Notifications (email templates via Resend/SendGrid + in-app notification center)
7. Search & Filtering (if the product has lists of content or data)
8. File & Media Handling (if uploads/images are needed)
9. Analytics & Reporting (key metrics dashboard, data exports)
10. Payments & Billing (Stripe integration, webhooks, billing portal — if applicable)
11. Testing Suite (unit + integration + e2e: setup, key scenarios, CI integration)
12. DevOps & Deployment (Docker, GitHub Actions, staging + production environments)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUANTITY & QUALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 8-12 epics covering all relevant domains
- 3-5 stories per epic
- 3-6 tasks per story — each atomic (one engineer, one session)
- Descriptions: minimum 10 lines per task. Be specific, not generic.
- acceptanceCriteria: minimum 3 binary pass/fail conditions per task
- Task ordering per story: database → backend → api → frontend → test
- complexity: 1=config, 3=simple CRUD, 5=standard endpoint, 7=complex service, 9=distributed
- assignableTo values ONLY: "Architect" | "Tech Lead" | "Software Engineer" | "Backend Engineer" | "QA Engineer" | "DevOps Engineer"
- Never write generic task titles like "Implement X feature" — always name the exact file, endpoint, or component
`;

// ─────────────────────────────────────────────────────────────────────────────
// AGENT
// ─────────────────────────────────────────────────────────────────────────────

export class ProductManagerAgent {
    public async generatePlan(
        projectIdea: string,
        onProgress?: PlanningProgressCallback
    ): Promise<PlanningOutput> {
        const resolved = resolveBestProvider();
        if (!resolved) {
            throw new Error(
                'No LLM API key configured. Add VITE_ANTHROPIC_API_KEY or VITE_GEMINI_API_KEY to your .env file.'
            );
        }

        const client = createLLMClient(resolved);
        console.log(`PM Agent: Using provider "${resolved.provider}" (${client.model})`);

        const userMessage = `
Project idea: "${projectIdea}"

Before calling output_plan, think through:
- Who are all the user types? (end users, admins, guests, etc.)
- What are all the data entities this product needs?
- What third-party integrations does this require? (payments, email, storage, auth, etc.)
- What features does this product IMPLICITLY need that the user didn't mention? (auth, notifications, admin panel, onboarding, settings, etc.)
- What are the security concerns? (rate limiting, input validation, CSRF, etc.)

Now call output_plan with the complete Epic → Story → Task execution plan. Be exhaustive — this plan will be executed by AI agents with zero human intervention.
`.trim();

        const request = {
            systemPrompt: SYSTEM_PROMPT,
            userMessage,
            options: { temperature: 0.2, maxTokens: 20000 },
        };

        // ── Claude path: tool_use streaming (no JSON parsing needed) ──────────
        if (resolved.provider === 'claude') {
            const claudeClient = client as ClaudeClient;

            try {
                let rawEpics: RawEpic[];

                if (onProgress) {
                    console.log('PM Agent: Using tool_use streaming (Claude)');
                    const toolResponse = await claudeClient.generateWithToolsStreaming(
                        request,
                        [OUTPUT_PLAN_TOOL],
                        'output_plan',
                        (bytes: number) => onProgress(bytes, '')
                    );
                    rawEpics = (toolResponse.toolCalls[0]?.arguments as any)?.epics as RawEpic[];
                } else {
                    console.log('PM Agent: Using tool_use non-streaming (Claude)');
                    const toolResponse = await claudeClient.generateWithTools(
                        request,
                        [OUTPUT_PLAN_TOOL],
                        'output_plan'
                    );
                    rawEpics = (toolResponse.toolCalls[0]?.arguments as any)?.epics as RawEpic[];
                }

                if (!Array.isArray(rawEpics) || rawEpics.length === 0) {
                    throw new Error('PM Agent: Tool call returned empty or invalid plan.');
                }

                console.log(`PM Agent: Tool use succeeded — ${rawEpics.length} epics`);
                return this.transformToStoreTypes(rawEpics);
            } catch (err: any) {
                console.error('PM Agent: Claude tool_use failed:', err?.message ?? err);
                throw err;
            }
        }

        // ── Gemini / fallback path: text streaming + JSON parse with auto-retry ─
        const MAX_ATTEMPTS = 2;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                const attemptRequest = attempt === 1 ? request : {
                    ...request,
                    options: { ...request.options, temperature: 0 },
                    userMessage: request.userMessage +
                        '\n\nCRITICAL: Your previous response could not be parsed as valid JSON. This attempt MUST produce only a valid JSON array. Use \\n for newlines inside strings. Never use literal line breaks inside a JSON string value.',
                };

                const hasStreaming =
                    onProgress &&
                    attempt === 1 &&
                    'generateStreaming' in client &&
                    typeof (client as any).generateStreaming === 'function';

                let response;
                if (hasStreaming) {
                    response = await (client as any).generateStreaming(
                        attemptRequest,
                        (chunk: string, total: number) => onProgress!(total, chunk)
                    );
                } else {
                    response = await client.generate(attemptRequest);
                }

                if (!response?.content) throw new Error('LLM returned an empty response.');
                console.log('PM Agent: LLM responded —', response.content.length, 'chars');
                return this.parseAndTransform(response.content);
            } catch (err: any) {
                lastError = err;
                if (attempt < MAX_ATTEMPTS) {
                    console.warn(`PM Agent: Attempt ${attempt} failed (${err.message}), retrying at temperature=0…`);
                }
            }
        }

        throw lastError!;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Parsing (Gemini / fallback path only)
    // ─────────────────────────────────────────────────────────────────────────

    private parseAndTransform(raw: string): PlanningOutput {
        console.log('PM Agent: Parsing response —', raw.length, 'chars');

        let jsonStr = raw.trim();

        // 1. Strip markdown fences
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

        // 2. Extract the outermost JSON array
        const arrayStart = jsonStr.indexOf('[');
        if (arrayStart === -1) throw new Error('PM Agent: No JSON array found in response.');
        jsonStr = jsonStr.slice(arrayStart);

        // 3. Sanitize control characters and trailing commas
        jsonStr = this.sanitizeLLMJson(jsonStr);

        // 4. Parse with truncation recovery fallback
        let rawEpics: RawEpic[];
        try {
            rawEpics = JSON.parse(jsonStr);
        } catch (firstErr: any) {
            console.warn('PM Agent: Initial parse failed, attempting recovery…', firstErr.message);
            try {
                rawEpics = this.recoverTruncatedJson(jsonStr);
            } catch (recoveryErr: any) {
                throw new Error(`PM Agent: JSON parse failed and recovery unsuccessful. Original error: ${firstErr.message}`);
            }
        }

        if (!Array.isArray(rawEpics) || rawEpics.length === 0) {
            throw new Error('PM Agent: Parsed output is not a valid epic array.');
        }

        console.log(`PM Agent: Parsed ${rawEpics.length} epics`);
        return this.transformToStoreTypes(rawEpics);
    }

    private sanitizeLLMJson(raw: string): string {
        let result = '';
        let inString = false;
        let escaped = false;

        for (let i = 0; i < raw.length; i++) {
            const ch = raw[i];

            if (escaped) { result += ch; escaped = false; continue; }
            if (ch === '\\' && inString) { result += ch; escaped = true; continue; }
            if (ch === '"') { inString = !inString; result += ch; continue; }

            if (inString) {
                if (ch === '\n') { result += '\\n'; continue; }
                if (ch === '\r') { result += '\\r'; continue; }
                if (ch === '\t') { result += '\\t'; continue; }
                const code = ch.charCodeAt(0);
                if (code < 0x20) { result += `\\u${code.toString(16).padStart(4, '0')}`; continue; }
            }

            result += ch;
        }

        result = result.replace(/,(\s*[}\]])/g, '$1');
        return result;
    }

    private recoverTruncatedJson(jsonStr: string): RawEpic[] {
        let depth = 0;
        let lastGoodEnd = -1;
        let inString = false;
        let escaped = false;

        for (let i = 0; i < jsonStr.length; i++) {
            const ch = jsonStr[i];
            if (escaped) { escaped = false; continue; }
            if (ch === '\\' && inString) { escaped = true; continue; }
            if (ch === '"') { inString = !inString; continue; }
            if (inString) continue;
            if (ch === '{') depth++;
            else if (ch === '}') {
                depth--;
                if (depth === 0) lastGoodEnd = i;
            }
        }

        if (lastGoodEnd === -1) throw new Error('Recovery failed — no complete epic object found.');

        let recovered = jsonStr.slice(0, lastGoodEnd + 1).trimEnd();
        if (recovered.endsWith(',')) recovered = recovered.slice(0, -1);
        if (!recovered.startsWith('[')) recovered = '[' + recovered;

        return JSON.parse(recovered + ']');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Transform (both paths)
    // ─────────────────────────────────────────────────────────────────────────

    private transformToStoreTypes(rawEpics: RawEpic[]): PlanningOutput {
        const epics: Epic[] = [];
        const stories: Story[] = [];
        const tasks: Task[] = [];
        const titleToId = new Map<string, string>();
        const dependencyRefs: { task: Task; dependsOn: string[] }[] = [];

        // ── Pass 1: Build all entities, record dependency title refs ──────────
        for (const rawEpic of rawEpics) {
            const epicId = uuidv4();
            epics.push({
                id: epicId,
                title: rawEpic.epicTitle?.trim() || 'Untitled Epic',
                description: rawEpic.epicDescription?.trim() || '',
            });

            for (const rawStory of rawEpic.stories ?? []) {
                const storyId = uuidv4();
                stories.push({
                    id: storyId,
                    epicId,
                    title: rawStory.storyTitle?.trim() || 'Untitled Story',
                });

                for (const rawTask of rawStory.tasks ?? []) {
                    const id = uuidv4();
                    const criteria = rawTask.acceptanceCriteria ?? [];
                    const criteriaBlock =
                        criteria.length > 0
                            ? `\n\nACCEPTANCE CRITERIA:\n${criteria.map(c => `  ${c}`).join('\n')}`
                            : '';

                    const task: Task = {
                        id,
                        title: rawTask.title?.trim() || 'Untitled Task',
                        description: (rawTask.description?.trim() || '') + criteriaBlock,
                        status: 'todo',
                        progress: 0,
                        complexity:
                            typeof rawTask.complexity === 'number'
                                ? Math.min(10, Math.max(1, Math.round(rawTask.complexity)))
                                : 5,
                        dependencies: [], // resolved in pass 2
                        selected: true,
                        epicId,
                        storyId,
                        assignableTo: (rawTask.assignableTo ?? []) as Role[],
                        category: rawEpic.epicTitle,
                        comments: [],
                        history: [],
                        outputHistory: [],
                        type: this.normalizeType(rawTask.type),
                    };

                    const titleKey = rawTask.title?.trim() ?? '';
                    if (titleKey) titleToId.set(titleKey, id);
                    tasks.push(task);
                    dependencyRefs.push({ task, dependsOn: rawTask.dependsOn ?? [] });
                }
            }
        }

        // ── Pass 2: Resolve title references → UUIDs ──────────────────────────
        let resolvedCount = 0;
        for (const { task, dependsOn } of dependencyRefs) {
            task.dependencies = dependsOn
                .map(title => titleToId.get(title.trim()))
                .filter((id): id is string => id !== undefined);
            resolvedCount += task.dependencies.length;
        }

        console.log(
            `PM Agent: Plan ready — ${epics.length} epics, ${stories.length} stories, ${tasks.length} tasks, ${resolvedCount} dependency links`
        );
        return { epics, stories, tasks };
    }

    private normalizeType(type: string): NonNullable<Task['type']> {
        const validTypes: NonNullable<Task['type']>[] = [
            'setup', 'frontend', 'backend', 'database', 'api', 'test', 'architecture', 'devops',
        ];
        const normalized = type?.toLowerCase().trim() as NonNullable<Task['type']>;
        return validTypes.includes(normalized) ? normalized : 'backend';
    }
}
