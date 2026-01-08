/**
 * @fileoverview Full Stack Engineer Agent Implementation
 * @module lib/agents/fullstack
 *
 * The FullStack Engineer Agent implements technical tasks by writing code.
 * Can handle both frontend and backend development.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

import { BaseAgent } from '../base';
import type { AgentConfig, AgentInput } from '../types';
import type { ToolDefinition, ToolCall, ToolResult } from '../../llm/types';
import type { TechnicalTask } from '../tech-lead';
import { getToolRegistry } from '../../tools';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Generated code output.
 */
export interface CodeOutput {
    /** Files created or modified */
    files: {
        path: string;
        content: string;
        action: 'create' | 'update';
    }[];

    /** Commands to run (e.g., npm install) */
    commands: string[];

    /** Explanation of the implementation */
    explanation: string;
}

// ============================================================================
// FULLSTACK SYSTEM PROMPT
// ============================================================================

const FULLSTACK_SYSTEM_PROMPT = `You are a Full Stack Engineer Agent on an AI development team.

## Your Role
You are responsible for:
1. Implementing technical tasks by writing code
2. Creating well-structured, maintainable code
3. Following best practices and coding standards
4. Writing tests for your implementations
5. Handling both frontend and backend development

## Code Quality Standards
Always follow these standards:
- Use TypeScript with proper type definitions
- Add JSDoc comments for functions and classes
- Include error handling for all I/O operations
- Follow consistent naming conventions (camelCase for variables, PascalCase for classes)
- Keep functions small and focused (single responsibility)
- Use async/await for asynchronous operations

## Frontend Guidelines
When writing frontend code:
- Use React functional components with hooks
- Use TypeScript for type safety
- Style with CSS modules or Tailwind CSS
- Handle loading and error states
- Make components responsive

## Backend Guidelines
When writing backend code:
- Use Express.js or similar frameworks
- Implement proper input validation
- Use middleware for common concerns
- Return appropriate HTTP status codes
- Log errors and important events

## Output Format
When implementing a task, use the write_file tool for each file:
1. First plan what files need to be created/modified
2. Write each file with complete, working code
3. Include any necessary commands (npm install, etc.)
4. Explain your implementation

DO NOT use placeholders like "// TODO" or "// implement here". Always write complete, working code.`;

// ============================================================================
// FULLSTACK TOOLS
// ============================================================================

/**
 * Tool for writing files.
 */
const writeFileTool: ToolDefinition = {
    name: 'write_file',
    description: 'Write content to a file. Creates directories if needed.',
    parameters: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'File path relative to project root',
            },
            content: {
                type: 'string',
                description: 'File content to write',
            },
        },
        required: ['path', 'content'],
    },
};

/**
 * Tool for reading files.
 */
const readFileTool: ToolDefinition = {
    name: 'read_file',
    description: 'Read the contents of a file',
    parameters: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'File path to read',
            },
        },
        required: ['path'],
    },
};

/**
 * Tool for running commands.
 */
const runCommandTool: ToolDefinition = {
    name: 'run_command',
    description: 'Run a shell command (e.g., npm install)',
    parameters: {
        type: 'object',
        properties: {
            command: {
                type: 'string',
                description: 'Command to run',
            },
        },
        required: ['command'],
    },
};

// ============================================================================
// FULLSTACK AGENT CLASS
// ============================================================================

/**
 * Default configuration for the FullStack Engineer Agent.
 */
const defaultFullStackConfig: Partial<AgentConfig> = {
    name: 'Jordan',
    role: 'fullstack',
    expertise: ['react', 'typescript', 'node.js', 'postgresql', 'api-design'],
    brain: {
        provider: 'gemini',
        model: 'gemini-1.5-flash',
        temperature: 0.4,
        maxTokens: 8192, // Higher for code generation
        systemPrompt: FULLSTACK_SYSTEM_PROMPT,
    },
    tools: [writeFileTool, readFileTool, runCommandTool],
};

/**
 * The FullStack Engineer Agent implements tasks by writing code.
 *
 * @example
 * ```typescript
 * const engineer = new FullStackAgent();
 *
 * const code = await engineer.implementTask(task, '/path/to/project');
 * ```
 */
export class FullStackAgent extends BaseAgent {
    /** Project root path */
    private projectRoot: string = '';

    /** Generated files in current session */
    private generatedFiles: CodeOutput['files'] = [];

    /**
     * Create a new FullStack Engineer Agent.
     */
    constructor(config?: Partial<AgentConfig>) {
        super({
            ...defaultFullStackConfig,
            ...config,
        } as AgentConfig);
    }

    /**
     * Set the project root path.
     */
    setProjectRoot(path: string): void {
        this.projectRoot = path;
    }

    /**
     * Implement a technical task.
     *
     * @param task - The task to implement
     * @param projectRoot - Path to the project root
     * @returns Generated code output
     */
    async implementTask(task: TechnicalTask, projectRoot?: string): Promise<CodeOutput> {
        if (projectRoot) {
            this.projectRoot = projectRoot;
        }

        this.addLog('action', `Implementing task: ${task.title}`);
        this.generatedFiles = [];

        const input: AgentInput = {
            task: `Implement this task:\n\n${JSON.stringify(task, null, 2)}\n\nUse the write_file tool to create each file with complete, working code.`,
            context: {
                projectRoot: this.projectRoot,
                existingFiles: task.files,
            },
        };

        const output = await this.think(input);

        // Execute any tool calls
        if (output.toolCalls && output.toolCalls.length > 0) {
            for (const toolCall of output.toolCalls) {
                await this.executeTool(toolCall);
            }
        }

        return {
            files: this.generatedFiles,
            commands: this.extractCommands(output.result),
            explanation: output.result,
        };
    }

    /**
     * Fix code based on review feedback.
     *
     * @param task - The task being fixed
     * @param feedback - Review feedback
     * @returns Updated code output
     */
    async fixFromFeedback(task: TechnicalTask, feedback: string): Promise<CodeOutput> {
        this.addLog('action', `Fixing task based on feedback: ${task.title}`);
        this.generatedFiles = [];

        const input: AgentInput = {
            task: `Fix the code for this task based on the review feedback:\n\nTask: ${JSON.stringify(task, null, 2)}\n\nFeedback:\n${feedback}\n\nUse the write_file tool to write the corrected files.`,
        };

        const output = await this.think(input);

        // Execute any tool calls
        if (output.toolCalls && output.toolCalls.length > 0) {
            for (const toolCall of output.toolCalls) {
                await this.executeTool(toolCall);
            }
        }

        return {
            files: this.generatedFiles,
            commands: this.extractCommands(output.result),
            explanation: output.result,
        };
    }

    /**
     * Execute a tool call.
     */
    private async executeTool(toolCall: ToolCall): Promise<void> {
        const registry = getToolRegistry();

        if (toolCall.name === 'write_file') {
            const args = toolCall.arguments as { path: string; content: string };
            const fullPath = this.projectRoot
                ? `${this.projectRoot}/${args.path}`
                : args.path;

            // Record the generated file
            this.generatedFiles.push({
                path: args.path,
                content: args.content,
                action: 'create',
            });

            // Actually write the file
            if (registry.has('write_file')) {
                await registry.execute('write_file', {
                    path: fullPath,
                    content: args.content,
                    createDirs: true,
                });
            }
        }
    }

    /**
     * Extract commands from the response.
     */
    private extractCommands(response: string): string[] {
        const commands: string[] = [];

        // Look for npm install commands
        const npmMatch = response.match(/npm install\s+[\w\-@/\s]+/g);
        if (npmMatch) {
            commands.push(...npmMatch.map((c) => c.trim()));
        }

        // Look for other common commands
        const cmdPatterns = [
            /npx\s+[\w\-]+[\w\-@/\s]*/g,
            /yarn\s+add\s+[\w\-@/\s]+/g,
        ];

        for (const pattern of cmdPatterns) {
            const matches = response.match(pattern);
            if (matches) {
                commands.push(...matches.map((c) => c.trim()));
            }
        }

        return [...new Set(commands)]; // Deduplicate
    }

    /**
     * Get files generated in current session.
     */
    getGeneratedFiles(): CodeOutput['files'] {
        return [...this.generatedFiles];
    }

    /**
     * Override useTool to handle code generation tools.
     */
    async useTool(toolCall: ToolCall): Promise<ToolResult> {
        await this.executeTool(toolCall);

        return {
            toolCallId: toolCall.id,
            content: `File written: ${(toolCall.arguments as any).path}`,
            success: true,
        };
    }
}

/**
 * Create a new FullStack Engineer Agent.
 */
export function createFullStackAgent(config?: Partial<AgentConfig>): FullStackAgent {
    return new FullStackAgent(config);
}
