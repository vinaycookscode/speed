import { createLLMClient, resolveBestProvider } from '../../lib/llm';
import type { ToolDefinition, ToolCallResponse } from '../../lib/llm/types';
import type { ISkill, SkillContext, SkillOutput } from './types';

// Shared tool schema used by all skills
const PRODUCE_OUTPUT_TOOL: ToolDefinition = {
    name: 'produce_output',
    description: 'Output the implementation files for this task.',
    parameters: {
        type: 'object',
        properties: {
            files: {
                type: 'array',
                description: 'Files to create/update',
                items: {
                    type: 'object',
                    required: ['path', 'content'],
                    properties: {
                        path: { type: 'string', description: 'Relative file path' },
                        content: { type: 'string', description: 'File contents' },
                    },
                },
            },
            summary: {
                type: 'string',
                description: 'One sentence describing what was implemented',
            },
        },
        required: ['files', 'summary'],
    },
};

export abstract class BaseSkill implements ISkill {
    async execute(ctx: SkillContext): Promise<SkillOutput> {
        const resolved = resolveBestProvider();
        if (!resolved) {
            throw new Error('No LLM API key configured.');
        }

        const client = createLLMClient(resolved);
        const systemPrompt = this.systemPrompt();
        const userMessage = this.buildUserMessage(ctx);

        const request = {
            systemPrompt,
            userMessage,
            options: { temperature: 0.3, maxTokens: 4000 },
        };

        // Claude: use streaming tool_use
        if (resolved.provider === 'claude') {
            const toolResponse = await (client as any).generateWithToolsStreaming(
                request,
                [PRODUCE_OUTPUT_TOOL],
                'produce_output',
                () => {} // No progress tracking in skills
            ) as ToolCallResponse;

            const args = toolResponse.toolCalls[0]?.arguments as any;
            return { files: args.files, summary: args.summary };
        }

        // Gemini/others: use standard tool_use
        const toolResponse = (await (client as any).generateWithTools(
            request,
            [PRODUCE_OUTPUT_TOOL]
        )) as ToolCallResponse;

        const args = toolResponse.toolCalls[0]?.arguments as any;
        return { files: args.files, summary: args.summary };
    }

    protected abstract systemPrompt(): string;

    protected buildUserMessage(ctx: SkillContext): string {
        return `Task: ${ctx.taskTitle}

Description:
${ctx.taskDescription}`;
    }
}
