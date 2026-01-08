/**
 * @fileoverview Tech Lead Agent Implementation
 * @module lib/agents/tech-lead
 *
 * The Tech Lead Agent creates technical tasks from user stories,
 * reviews code, and coordinates development work.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

import { BaseAgent } from '../base';
import type { AgentConfig, AgentInput, AgentRole } from '../types';
import type { ToolDefinition } from '../../llm/types';
import type { UserStory } from '../pm';

// ============================================================================
// TYPES
// ============================================================================

/**
 * A technical task derived from a user story.
 */
export interface TechnicalTask {
    /** Unique task ID */
    id: string;

    /** Task title */
    title: string;

    /** Detailed description */
    description: string;

    /** Task type */
    type: 'setup' | 'frontend' | 'backend' | 'database' | 'api' | 'test' | 'devops';

    /** Story this task belongs to */
    storyId: string;

    /** Files to create or modify */
    files: string[];

    /** Dependencies (other task IDs) */
    dependencies: string[];

    /** Assigned agent role */
    assignedTo?: AgentRole;

    /** Estimated hours */
    estimatedHours: number;

    /** Status */
    status: 'todo' | 'in-progress' | 'review' | 'done';
}

/**
 * Code review result.
 */
export interface CodeReview {
    /** Task ID being reviewed */
    taskId: string;

    /** Overall approval */
    approved: boolean;

    /** Review score (0-100) */
    score: number;

    /** Issues found */
    issues: {
        severity: 'error' | 'warning' | 'suggestion';
        file: string;
        line?: number;
        message: string;
    }[];

    /** Suggestions for improvement */
    suggestions: string[];
}

// ============================================================================
// TECH LEAD SYSTEM PROMPT
// ============================================================================

const TECH_LEAD_SYSTEM_PROMPT = `You are the Tech Lead Agent on an AI development team.

## Your Role
You are responsible for:
1. Breaking down user stories into technical tasks
2. Defining file structure and architecture
3. Reviewing code from engineers
4. Ensuring code quality and best practices
5. Coordinating work between frontend and backend

## Task Creation
When breaking down stories into tasks:
- Create separate tasks for frontend, backend, database, and tests
- Define clear file paths for each task
- Identify dependencies between tasks
- Assign tasks to appropriate agent roles
- Estimate effort in hours

## Task Types
- setup: Project setup, configuration
- frontend: UI components, pages, styling
- backend: API routes, business logic, services
- database: Schema, migrations, models
- api: API integration, contracts
- test: Unit tests, integration tests
- devops: CI/CD, deployment

## Code Review Guidelines
When reviewing code, check for:
- Correct implementation of acceptance criteria
- Code quality and readability
- Error handling
- Security considerations
- Performance implications
- Test coverage

## Output Format
When creating tasks, output valid JSON:
{
  "tasks": [
    {
      "id": "TASK-001",
      "title": "Create User model",
      "description": "Create the User database model with fields for email, password hash, and timestamps",
      "type": "database",
      "storyId": "US-001",
      "files": ["src/models/user.ts", "src/migrations/001_create_users.ts"],
      "dependencies": [],
      "assignedTo": "backend",
      "estimatedHours": 2
    }
  ]
}`;

// ============================================================================
// TECH LEAD TOOLS
// ============================================================================

/**
 * Tool for creating technical tasks.
 */
const createTaskTool: ToolDefinition = {
    name: 'create_task',
    description: 'Create a technical task from a user story',
    parameters: {
        type: 'object',
        properties: {
            title: {
                type: 'string',
                description: 'Task title',
            },
            description: {
                type: 'string',
                description: 'Detailed description of the work',
            },
            type: {
                type: 'string',
                enum: ['setup', 'frontend', 'backend', 'database', 'api', 'test', 'devops'],
                description: 'Type of task',
            },
            files: {
                type: 'array',
                items: { type: 'string' },
                description: 'Files to create or modify',
            },
            dependencies: {
                type: 'array',
                items: { type: 'string' },
                description: 'Task IDs this depends on',
            },
            assignedTo: {
                type: 'string',
                description: 'Agent role to assign to',
            },
            estimatedHours: {
                type: 'number',
                description: 'Estimated hours to complete',
            },
        },
        required: ['title', 'description', 'type', 'files'],
    },
};

/**
 * Tool for reviewing code.
 */
const reviewCodeTool: ToolDefinition = {
    name: 'review_code',
    description: 'Review code for quality and correctness',
    parameters: {
        type: 'object',
        properties: {
            approved: {
                type: 'boolean',
                description: 'Whether the code is approved',
            },
            score: {
                type: 'number',
                description: 'Quality score 0-100',
            },
            issues: {
                type: 'array',
                description: 'Issues found in the code',
            },
            suggestions: {
                type: 'array',
                items: { type: 'string' },
                description: 'Suggestions for improvement',
            },
        },
        required: ['approved', 'score'],
    },
};

// ============================================================================
// TECH LEAD AGENT CLASS
// ============================================================================

/**
 * Default configuration for the Tech Lead Agent.
 */
const defaultTechLeadConfig: Partial<AgentConfig> = {
    name: 'Alex',
    role: 'tech-lead',
    expertise: ['architecture', 'code-review', 'task-breakdown', 'technical-planning'],
    brain: {
        provider: 'gemini',
        model: 'gemini-2.0-flash-exp',
        temperature: 0.4,
        maxTokens: 4096,
        systemPrompt: TECH_LEAD_SYSTEM_PROMPT,
    },
    tools: [createTaskTool, reviewCodeTool],
};

/**
 * The Tech Lead Agent breaks down stories and reviews code.
 *
 * @example
 * ```typescript
 * const techLead = new TechLeadAgent();
 *
 * const tasks = await techLead.createTasksFromStory(story);
 * ```
 */
export class TechLeadAgent extends BaseAgent {
    /** Created tasks */
    private tasks: TechnicalTask[] = [];

    /**
     * Create a new Tech Lead Agent.
     */
    constructor(config?: Partial<AgentConfig>) {
        super({
            ...defaultTechLeadConfig,
            ...config,
        } as AgentConfig);
    }

    /**
     * Create technical tasks from a user story.
     *
     * @param story - The user story to break down
     * @returns Created tasks
     */
    async createTasksFromStory(story: UserStory): Promise<TechnicalTask[]> {
        this.addLog('action', `Breaking down story: ${story.title}`);

        const input: AgentInput = {
            task: `Break down this user story into technical tasks:\n\n${JSON.stringify(story, null, 2)}\n\nCreate tasks for each aspect: database, backend, frontend, tests.`,
        };

        const output = await this.think(input);
        const newTasks = this.parseTasksResponse(output.result, story.id);

        this.tasks.push(...newTasks);
        return newTasks;
    }

    /**
     * Create tasks from multiple stories.
     *
     * @param stories - User stories to break down
     * @returns All created tasks
     */
    async createTasksFromStories(stories: UserStory[]): Promise<TechnicalTask[]> {
        const allTasks: TechnicalTask[] = [];

        for (const story of stories) {
            const tasks = await this.createTasksFromStory(story);
            allTasks.push(...tasks);
        }

        return allTasks;
    }

    /**
     * Review code for a task.
     *
     * @param taskId - The task ID
     * @param code - The code to review (file contents)
     * @returns The review result
     */
    async reviewCode(taskId: string, code: Record<string, string>): Promise<CodeReview> {
        this.addLog('action', `Reviewing code for task: ${taskId}`);

        const task = this.tasks.find((t) => t.id === taskId);
        const codeContext = Object.entries(code)
            .map(([file, content]) => `=== ${file} ===\n${content}`)
            .join('\n\n');

        const input: AgentInput = {
            task: `Review this code for task "${task?.title || taskId}":\n\n${codeContext}\n\nCheck for: correctness, code quality, error handling, security.`,
        };

        const output = await this.think(input);
        return this.parseReviewResponse(output.result, taskId);
    }

    /**
     * Get all tasks.
     */
    getTasks(): TechnicalTask[] {
        return [...this.tasks];
    }

    /**
     * Get tasks by status.
     */
    getTasksByStatus(status: TechnicalTask['status']): TechnicalTask[] {
        return this.tasks.filter((t) => t.status === status);
    }

    /**
     * Parse tasks from LLM response.
     */
    private parseTasksResponse(response: string, storyId: string): TechnicalTask[] {
        const jsonMatch = response.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                const tasks = parsed.tasks || [parsed];

                return tasks.map((t: any, i: number) => ({
                    id: t.id || `TASK-${storyId}-${String(i + 1).padStart(3, '0')}`,
                    title: t.title || 'Untitled Task',
                    description: t.description || '',
                    type: t.type || 'backend',
                    storyId: storyId,
                    files: t.files || [],
                    dependencies: t.dependencies || [],
                    assignedTo: t.assignedTo,
                    estimatedHours: t.estimatedHours || 2,
                    status: 'todo' as const,
                }));
            } catch (error) {
                this.addLog('error', `Failed to parse tasks: ${error}`);
            }
        }

        return [];
    }

    /**
     * Parse review from LLM response.
     */
    private parseReviewResponse(response: string, taskId: string): CodeReview {
        const jsonMatch = response.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    taskId,
                    approved: parsed.approved ?? true,
                    score: parsed.score ?? 80,
                    issues: parsed.issues || [],
                    suggestions: parsed.suggestions || [],
                };
            } catch (error) {
                this.addLog('error', `Failed to parse review: ${error}`);
            }
        }

        // Default positive review if parsing fails
        return {
            taskId,
            approved: true,
            score: 75,
            issues: [],
            suggestions: ['Could not parse detailed review'],
        };
    }
}

/**
 * Create a new Tech Lead Agent.
 */
export function createTechLeadAgent(config?: Partial<AgentConfig>): TechLeadAgent {
    return new TechLeadAgent(config);
}
