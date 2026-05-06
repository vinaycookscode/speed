import { createLLMClient, resolveBestProvider } from '../lib/llm';
import type { ToolDefinition } from '../lib/llm/types';
import { v4 as uuidv4 } from 'uuid';
import type { Task, Epic, Story, Role } from '../store/agentStore';

export type PlanningProgressCallback = (charsReceived: number, rawChunk: string) => void;

export type EpicStatusCallback = (
    epicId: string,
    title: string,
    description: string,
    status: 'pending' | 'working' | 'done' | 'error',
    taskCount?: number
) => void;

export interface PlanningOutput {
    epics: Epic[];
    stories: Story[];
    tasks: Task[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal types
// ─────────────────────────────────────────────────────────────────────────────

interface RawStory {
    storyTitle: string;
    tasks: RawTask[];
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

interface RawEpic {
    epicTitle: string;
    epicDescription: string;
    stories: RawStory[];
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL SCHEMA — single call, compact output
// ─────────────────────────────────────────────────────────────────────────────

const OUTPUT_PLAN_TOOL: ToolDefinition = {
    name: 'output_plan',
    description: 'Output the complete project execution plan.',
    parameters: {
        properties: {
            epics: {
                type: 'array',
                items: {
                    type: 'object',
                    required: ['epicTitle', 'epicDescription', 'stories'],
                    properties: {
                        epicTitle: { type: 'string' },
                        epicDescription: { type: 'string' },
                        stories: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['storyTitle', 'tasks'],
                                properties: {
                                    storyTitle: { type: 'string' },
                                    tasks: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            required: ['title', 'description', 'type', 'complexity', 'assignableTo'],
                                            properties: {
                                                title: { type: 'string' },
                                                description: { type: 'string' },
                                                type: {
                                                    type: 'string',
                                                    enum: ['setup', 'architecture', 'database', 'backend', 'api', 'frontend', 'test', 'devops'],
                                                },
                                                complexity: { type: 'number' },
                                                assignableTo: {
                                                    type: 'array',
                                                    items: { type: 'string' },
                                                },
                                                acceptanceCriteria: {
                                                    type: 'array',
                                                    items: { type: 'string' },
                                                },
                                                dependsOn: {
                                                    type: 'array',
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
// SYSTEM PROMPT — optimised for speed: concise specs, no bloat
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a Staff PM and Engineering Lead. Given a project idea, call output_plan with a full execution plan.

EPIC COVERAGE (include all applicable):
1. Project Setup (repo, stack, env, base structure)
2. Database Design (all tables, migrations)
3. Auth (register, login, JWT, RBAC)
4. 2-4 Core Product Epics (the main features)
5. Testing Suite
6. DevOps & Deployment

RULES:
- 6-8 epics, 2-3 stories each, 2-4 tasks per story
- Task titles: verb + specific noun (e.g. "Create users table migration")
- Task description: 3-4 lines — file path, key implementation details, error handling
- acceptanceCriteria: 2-3 pass/fail conditions per task
- dependsOn: exact titles of prerequisite tasks
- Order within story: database → backend → api → frontend → test
- type: one of setup|architecture|database|backend|api|frontend|test|devops
- assignableTo: Architect|Tech Lead|Software Engineer|Backend Engineer|QA Engineer|DevOps Engineer
- Be specific, not generic. Name files, endpoints, components.
- Keep it concise — quality over quantity.`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// AGENT
// ─────────────────────────────────────────────────────────────────────────────

export class ProductManagerAgent {
    async generatePlan(
        projectIdea: string,
        onProgress?: PlanningProgressCallback,
        onEpicStatus?: EpicStatusCallback
    ): Promise<PlanningOutput> {
        const resolved = resolveBestProvider();
        if (!resolved) {
            throw new Error('No LLM API key configured. Add VITE_ANTHROPIC_API_KEY to your .env file.');
        }

        const client = createLLMClient(resolved);
        console.log(`PM Agent: Using provider "${resolved.provider}" (${client.model})`);

        const userMessage = `Project idea: "${projectIdea}"

Think about: user types, data entities, integrations, implicit features (auth, notifications, admin).
Then call output_plan with the full plan.`;

        const request = {
            systemPrompt: SYSTEM_PROMPT,
            userMessage,
            options: { temperature: 0.2, maxTokens: 16000 },
        };

        if (resolved.provider === 'claude') {
            return this.generateWithClaude(client, request, resolved.apiKey, onProgress, onEpicStatus);
        }

        // Gemini fallback
        return this.generateWithGemini(client, request, onProgress);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Claude: single call, progressive epic reveal
    // ─────────────────────────────────────────────────────────────────────────

    private async generateWithClaude(
        client: any,
        request: any,
        apiKey: string,
        onProgress?: PlanningProgressCallback,
        onEpicStatus?: EpicStatusCallback
    ): Promise<PlanningOutput> {
        const ipc = typeof window !== 'undefined' ? (window as any).ipcRenderer : null;

        let rawEpics: RawEpic[];

        if (ipc) {
            // ── Electron: IPC → Node.js main process (streaming works in Node) ──
            rawEpics = await this.callViaIPC(ipc, apiKey, request, onProgress);
        } else {
            // ── Chrome: non-streaming POST (no SSE = no HTTP/2 issues) ──
            rawEpics = await this.callNonStreaming(client, request, onProgress);
        }

        // ── Progressive epic reveal ──────────────────────────────────────────
        // The call is done — now reveal epics one by one for a smooth animation
        const output = this.transformToStoreTypes(rawEpics);

        if (onEpicStatus) {
            for (const epic of output.epics) {
                const taskCount = output.tasks.filter(t => t.epicId === epic.id).length;
                onEpicStatus(epic.id, epic.title, epic.description, 'done', taskCount);
                // Small delay between reveals for animation
                await new Promise(r => setTimeout(r, 150));
            }
        }

        return output;
    }

    // ── Electron IPC path (streaming in Node.js) ─────────────────────────────

    private async callViaIPC(
        ipc: any,
        apiKey: string,
        request: any,
        onProgress?: PlanningProgressCallback
    ): Promise<RawEpic[]> {
        console.log('[PM Agent] Electron — routing through IPC');

        let simBytes = 0;
        const heartbeat = setInterval(() => {
            simBytes = Math.min(simBytes + 200, 2000);
            onProgress?.(simBytes, '');
        }, 1500);

        const progressHandler = (_: any, bytes: number) => {
            if (bytes > 0) {
                clearInterval(heartbeat);
                onProgress?.(bytes, '');
            }
        };
        const logHandler = (_: any, msg: string) => console.log(`[Main] ${msg}`);
        ipc.on('claude:planProgress', progressHandler);
        ipc.on('claude:planLog', logHandler);

        try {
            const result = await ipc.invoke('claude:generatePlan', {
                apiKey,
                systemPrompt: request.systemPrompt,
                userMessage: request.userMessage,
                toolSchema: {
                    name: OUTPUT_PLAN_TOOL.name,
                    description: OUTPUT_PLAN_TOOL.description,
                    input_schema: { type: 'object', ...OUTPUT_PLAN_TOOL.parameters },
                },
            });

            if (!result.success) throw new Error(result.error ?? 'IPC returned failure');
            const epics = result.epics as RawEpic[];
            if (!Array.isArray(epics) || epics.length === 0) throw new Error('Plan returned 0 epics.');
            console.log(`[PM Agent] ${epics.length} epics via IPC`);
            return epics;
        } finally {
            clearInterval(heartbeat);
            ipc.off('claude:planProgress', progressHandler);
            ipc.off('claude:planLog', logHandler);
        }
    }

    // ── Chrome non-streaming path (regular POST, no SSE) ─────────────────────

    private async callNonStreaming(
        client: any,
        request: any,
        onProgress?: PlanningProgressCallback
    ): Promise<RawEpic[]> {
        console.log('[PM Agent] Chrome — non-streaming generateWithTools');

        let simBytes = 0;
        const heartbeat = setInterval(() => {
            simBytes = Math.min(simBytes + 300, 20000);
            onProgress?.(simBytes, '');
        }, 1000);

        try {
            const toolResponse = await client.generateWithTools(
                request,
                [OUTPUT_PLAN_TOOL],
                'output_plan'
            );

            if (toolResponse.finishReason === 'length') {
                throw new Error('Plan truncated — try a shorter project description.');
            }

            const rawEpics = (toolResponse.toolCalls[0]?.arguments as any)?.epics as RawEpic[];
            if (!Array.isArray(rawEpics) || rawEpics.length === 0) {
                throw new Error('No epics returned from plan.');
            }

            console.log(`[PM Agent] ${rawEpics.length} epics via non-streaming`);
            return rawEpics;
        } finally {
            clearInterval(heartbeat);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Gemini: text-based fallback
    // ─────────────────────────────────────────────────────────────────────────

    private async generateWithGemini(
        client: any,
        request: any,
        onProgress?: PlanningProgressCallback
    ): Promise<PlanningOutput> {
        const MAX_ATTEMPTS = 2;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                const attemptRequest = attempt === 1 ? request : {
                    ...request,
                    options: { ...request.options, temperature: 0 },
                    userMessage: request.userMessage + '\n\nCRITICAL: Output ONLY valid JSON.',
                };

                let response;
                if (attempt === 1 && typeof client.generateStreaming === 'function') {
                    response = await client.generateStreaming(
                        attemptRequest,
                        (chunk: string, total: number) => onProgress?.(total, chunk)
                    );
                } else {
                    response = await client.generate(attemptRequest);
                }

                if (!response?.content) throw new Error('LLM returned an empty response.');
                return this.parseAndTransformGemini(response.content);
            } catch (err: any) {
                lastError = err;
                if (attempt < MAX_ATTEMPTS) {
                    console.warn(`PM Agent: Attempt ${attempt} failed (${err.message}), retrying…`);
                }
            }
        }

        throw lastError!;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Transform
    // ─────────────────────────────────────────────────────────────────────────

    private transformToStoreTypes(rawEpics: RawEpic[]): PlanningOutput {
        const epics: Epic[] = [];
        const stories: Story[] = [];
        const tasks: Task[] = [];
        const titleToId = new Map<string, string>();
        const dependencyRefs: { task: Task; dependsOn: string[] }[] = [];

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
                    const criteriaBlock = criteria.length > 0
                        ? `\n\nACCEPTANCE CRITERIA:\n${criteria.map(c => `  ${c}`).join('\n')}`
                        : '';

                    const task: Task = {
                        id,
                        title: rawTask.title?.trim() || 'Untitled Task',
                        description: (rawTask.description?.trim() || '') + criteriaBlock,
                        status: 'todo',
                        progress: 0,
                        complexity: typeof rawTask.complexity === 'number'
                            ? Math.min(10, Math.max(1, Math.round(rawTask.complexity)))
                            : 5,
                        dependencies: [],
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

        // Resolve title-based dependencies → UUIDs
        let resolvedCount = 0;
        for (const { task, dependsOn } of dependencyRefs) {
            task.dependencies = dependsOn
                .map(title => titleToId.get(title.trim()))
                .filter((id): id is string => id !== undefined);
            resolvedCount += task.dependencies.length;
        }

        console.log(
            `PM Agent: Plan ready — ${epics.length} epics, ${stories.length} stories, ` +
            `${tasks.length} tasks, ${resolvedCount} deps`
        );
        return { epics, stories, tasks };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Gemini parsing helpers
    // ─────────────────────────────────────────────────────────────────────────

    private parseAndTransformGemini(raw: string): PlanningOutput {
        let jsonStr = raw.trim()
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```\s*$/, '')
            .trim();

        const arrayStart = jsonStr.indexOf('[');
        if (arrayStart === -1) throw new Error('No JSON array found in response.');
        jsonStr = jsonStr.slice(arrayStart);
        jsonStr = this.sanitizeLLMJson(jsonStr);

        let rawEpics: RawEpic[];
        try {
            rawEpics = JSON.parse(jsonStr);
        } catch (firstErr: any) {
            try {
                rawEpics = this.recoverTruncatedJson(jsonStr);
            } catch {
                throw new Error(`JSON parse failed: ${firstErr.message}`);
            }
        }

        if (!Array.isArray(rawEpics) || rawEpics.length === 0) {
            throw new Error('Parsed output is not a valid epic array.');
        }

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

        return result.replace(/,(\s*[}\]])/g, '$1');
    }

    private recoverTruncatedJson(jsonStr: string): RawEpic[] {
        let depth = 0, lastGoodEnd = -1, inString = false, escaped = false;

        for (let i = 0; i < jsonStr.length; i++) {
            const ch = jsonStr[i];
            if (escaped) { escaped = false; continue; }
            if (ch === '\\' && inString) { escaped = true; continue; }
            if (ch === '"') { inString = !inString; continue; }
            if (inString) continue;
            if (ch === '{') depth++;
            else if (ch === '}') { depth--; if (depth === 0) lastGoodEnd = i; }
        }

        if (lastGoodEnd === -1) throw new Error('Recovery failed — no complete epic found.');

        let recovered = jsonStr.slice(0, lastGoodEnd + 1).trimEnd();
        if (recovered.endsWith(',')) recovered = recovered.slice(0, -1);
        if (!recovered.startsWith('[')) recovered = '[' + recovered;
        return JSON.parse(recovered + ']');
    }

    private normalizeType(type: string): NonNullable<Task['type']> {
        const validTypes: NonNullable<Task['type']>[] = [
            'setup', 'frontend', 'backend', 'database', 'api', 'test', 'architecture', 'devops',
        ];
        const normalized = type?.toLowerCase().trim() as NonNullable<Task['type']>;
        return validTypes.includes(normalized) ? normalized : 'backend';
    }
}
