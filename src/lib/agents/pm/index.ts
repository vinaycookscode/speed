/**
 * @fileoverview Product Manager Agent Implementation
 * @module lib/agents/pm
 *
 * The PM Agent creates user stories, epics, and prioritizes work.
 * Works closely with the user to understand requirements.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

import { BaseAgent } from '../base';
import type { AgentConfig, AgentInput } from '../types';
import type { ToolDefinition } from '../../llm/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * A user story in the backlog.
 */
export interface UserStory {
    /** Unique story ID */
    id: string;

    /** Story title */
    title: string;

    /** As a [role], I want [goal], so that [benefit] */
    description: string;

    /** Acceptance criteria */
    acceptanceCriteria: string[];

    /** Story points (1, 2, 3, 5, 8, 13) */
    storyPoints: number;

    /** Priority (1 = highest) */
    priority: number;

    /** Epic this story belongs to */
    epicId?: string;

    /** Status */
    status: 'backlog' | 'ready' | 'in-progress' | 'review' | 'done';
}

/**
 * An epic (collection of related stories).
 */
export interface Epic {
    /** Unique epic ID */
    id: string;

    /** Epic title */
    title: string;

    /** Epic description */
    description: string;

    /** Stories in this epic */
    storyIds: string[];
}

// ============================================================================
// PM AGENT SYSTEM PROMPT
// ============================================================================

const PM_AGENT_SYSTEM_PROMPT = `You are the Product Manager (PM) Agent on an AI development team.

## Your Role
You are responsible for:
1. Understanding user requirements and translating them into user stories
2. Creating well-structured user stories with clear acceptance criteria
3. Organizing stories into epics for better organization
4. Prioritizing the backlog based on user needs and dependencies
5. Communicating with the user to clarify requirements

## User Story Format
Always create user stories in this format:
- Title: Short, descriptive title
- Description: "As a [user role], I want [goal], so that [benefit]"
- Acceptance Criteria: Specific, testable criteria (use checkboxes)
- Story Points: Estimate using Fibonacci (1, 2, 3, 5, 8, 13)

## Guidelines
- Break down large features into smaller stories (max 8 story points)
- Each story should be independently deliverable
- Include both happy path and edge cases in acceptance criteria
- Consider non-functional requirements (performance, security)
- Prioritize based on user value and technical dependencies

## Output Format
When creating stories, output valid JSON:
{
  "stories": [
    {
      "id": "US-001",
      "title": "User Registration",
      "description": "As a new user, I want to register with email and password, so that I can access the application",
      "acceptanceCriteria": [
        "User can enter email and password",
        "Email is validated for correct format",
        "Password must be at least 8 characters",
        "User receives confirmation email",
        "User is redirected to dashboard after registration"
      ],
      "storyPoints": 3,
      "priority": 1
    }
  ],
  "epics": [
    {
      "id": "EPIC-001",
      "title": "User Authentication",
      "description": "All features related to user login, registration, and session management"
    }
  ]
}`;

// ============================================================================
// PM AGENT TOOLS
// ============================================================================

/**
 * Tool for creating user stories.
 */
const createStoryTool: ToolDefinition = {
    name: 'create_user_story',
    description: 'Create a new user story with acceptance criteria',
    parameters: {
        type: 'object',
        properties: {
            title: {
                type: 'string',
                description: 'Short, descriptive title for the story',
            },
            description: {
                type: 'string',
                description: 'User story in "As a..., I want..., so that..." format',
            },
            acceptanceCriteria: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of testable acceptance criteria',
            },
            storyPoints: {
                type: 'number',
                description: 'Estimate in story points (1, 2, 3, 5, 8, 13)',
            },
            priority: {
                type: 'number',
                description: 'Priority (1 = highest)',
            },
        },
        required: ['title', 'description', 'acceptanceCriteria', 'storyPoints'],
    },
};

/**
 * Tool for asking the user questions.
 */
const askUserTool: ToolDefinition = {
    name: 'ask_user',
    description: 'Ask the user a clarifying question about requirements',
    parameters: {
        type: 'object',
        properties: {
            question: {
                type: 'string',
                description: 'The question to ask',
            },
            context: {
                type: 'string',
                description: 'Why this question is important',
            },
        },
        required: ['question'],
    },
};

// ============================================================================
// PM AGENT CLASS
// ============================================================================

/**
 * Default configuration for the PM Agent.
 */
const defaultPMAgentConfig: Partial<AgentConfig> = {
    name: 'Maya',
    role: 'pm',
    expertise: ['requirements', 'user-stories', 'prioritization', 'stakeholder-communication'],
    brain: {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        temperature: 0.5,
        maxTokens: 4096,
        systemPrompt: PM_AGENT_SYSTEM_PROMPT,
    },
    tools: [createStoryTool, askUserTool],
};

/**
 * The PM Agent creates and manages user stories.
 *
 * @example
 * ```typescript
 * const pmAgent = new PMAgent();
 *
 * const stories = await pmAgent.createUserStories(
 *   "Build a todo app with user auth, todo CRUD, and categories"
 * );
 * ```
 */
export class PMAgent extends BaseAgent {
    /** Created user stories */
    private stories: UserStory[] = [];

    /** Created epics */
    private epics: Epic[] = [];

    /**
     * Create a new PM Agent.
     */
    constructor(config?: Partial<AgentConfig>) {
        super({
            ...defaultPMAgentConfig,
            ...config,
        } as AgentConfig);
    }

    /**
     * Create user stories from project requirements.
     *
     * @param requirements - The project requirements/features
     * @returns Created user stories
     */
    async createUserStories(requirements: string): Promise<{ stories: UserStory[]; epics: Epic[] }> {
        this.addLog('action', 'Creating user stories from requirements');

        const input: AgentInput = {
            task: `Create user stories for the following requirements:\n\n${requirements}\n\nRespond with a JSON object containing "stories" and "epics" arrays.`,
        };

        const output = await this.think(input);

        // Parse the response
        const result = this.parseStoriesResponse(output.result);
        this.stories = result.stories;
        this.epics = result.epics;

        return result;
    }

    /**
     * Prioritize stories in the backlog.
     *
     * @returns Prioritized stories
     */
    async prioritizeBacklog(): Promise<UserStory[]> {
        if (this.stories.length === 0) {
            return [];
        }

        this.addLog('action', 'Prioritizing backlog');

        const input: AgentInput = {
            task: `Prioritize these user stories based on user value and dependencies. Return the story IDs in priority order (highest first):\n\n${JSON.stringify(this.stories, null, 2)}`,
        };

        const output = await this.think(input);

        // Try to parse priority order from response
        const priorityOrder = this.parsePriorityOrder(output.result);

        // Reorder stories
        const prioritizedStories = this.stories.map((story, index) => ({
            ...story,
            priority: priorityOrder.indexOf(story.id) + 1 || index + 1,
        }));

        this.stories = prioritizedStories.sort((a, b) => a.priority - b.priority);

        return this.stories;
    }

    /**
     * Get all stories.
     */
    getStories(): UserStory[] {
        return [...this.stories];
    }

    /**
     * Get all epics.
     */
    getEpics(): Epic[] {
        return [...this.epics];
    }

    /**
     * Parse the stories response from LLM.
     */
    private parseStoriesResponse(response: string): { stories: UserStory[]; epics: Epic[] } {
        const jsonMatch = response.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    stories: (parsed.stories || []).map((s: any, i: number) => ({
                        id: s.id || `US-${String(i + 1).padStart(3, '0')}`,
                        title: s.title || 'Untitled Story',
                        description: s.description || '',
                        acceptanceCriteria: s.acceptanceCriteria || [],
                        storyPoints: s.storyPoints || 3,
                        priority: s.priority || i + 1,
                        epicId: s.epicId,
                        status: 'backlog' as const,
                    })),
                    epics: (parsed.epics || []).map((e: any, i: number) => ({
                        id: e.id || `EPIC-${String(i + 1).padStart(3, '0')}`,
                        title: e.title || 'Untitled Epic',
                        description: e.description || '',
                        storyIds: e.storyIds || [],
                    })),
                };
            } catch (error) {
                this.addLog('error', `Failed to parse stories: ${error}`);
            }
        }

        return { stories: [], epics: [] };
    }

    /**
     * Parse priority order from response.
     */
    private parsePriorityOrder(response: string): string[] {
        // Try to find story IDs in the response
        const idMatches = response.match(/US-\d+/g);
        return idMatches || [];
    }
}

/**
 * Create a new PM Agent.
 */
export function createPMAgent(config?: Partial<AgentConfig>): PMAgent {
    return new PMAgent(config);
}
