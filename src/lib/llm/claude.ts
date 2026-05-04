/**
 * @fileoverview Claude (Anthropic) LLM Client Implementation
 * @module lib/llm/claude
 *
 * Client for Anthropic's Claude API.
 * Implements the shared ILLMClient interface so any agent can swap providers.
 *
 * Note: `dangerouslyAllowBrowser: true` is intentional — this runs inside
 * an Electron desktop app (not a public web browser), so there is no CORS
 * or key-exposure risk.
 */

import Anthropic from '@anthropic-ai/sdk';

import type {
    ILLMClient,
    GenerateRequest,
    GenerateResponse,
    GenerateOptions,
    ToolDefinition,
    ToolCallResponse,
    ToolCall,
    FinishReason,
} from './types';

import { LLMError, LLMErrorCode } from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 8192;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ============================================================================
// CLAUDE CLIENT
// ============================================================================

export interface ClaudeClientConfig {
    apiKey: string;
    model?: string;
    defaultOptions?: GenerateOptions;
}

export class ClaudeClient implements ILLMClient {
    public readonly provider = 'claude';
    public readonly model: string;

    private readonly client: Anthropic;
    private readonly defaultOptions: GenerateOptions;

    constructor(config: ClaudeClientConfig) {
        if (!config.apiKey) {
            throw new LLMError('Anthropic API key is required', LLMErrorCode.INVALID_API_KEY);
        }

        this.model = config.model ?? DEFAULT_MODEL;
        this.defaultOptions = config.defaultOptions ?? {};

        this.client = new Anthropic({
            apiKey: config.apiKey,
            dangerouslyAllowBrowser: true,
            timeout: 90000, // 90s per individual HTTP request — prevents silent hangs
        });
    }

    // -------------------------------------------------------------------------
    // ILLMClient implementation
    // -------------------------------------------------------------------------

    async generate(request: GenerateRequest): Promise<GenerateResponse> {
        const options = { ...this.defaultOptions, ...request.options };

        try {
            const response = await this.withRetry(() =>
                this.client.messages.create({
                    model: this.model,
                    system: request.systemPrompt,
                    messages: this.buildMessages(request),
                    temperature: options.temperature ?? DEFAULT_TEMPERATURE,
                    max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
                    ...(options.stopSequences?.length
                        ? { stop_sequences: options.stopSequences }
                        : {}),
                })
            );

            return this.parseResponse(response);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Stream a response, calling onChunk with each text delta.
     * Returns the full response once streaming is complete.
     */
    async generateStreaming(
        request: GenerateRequest,
        onChunk: (text: string, totalChars: number) => void
    ): Promise<GenerateResponse> {
        const options = { ...this.defaultOptions, ...request.options };

        try {
            // Use streaming via raw SSE — iterate over the stream directly.
            // This avoids finalMessage() which can hang if the stream closes unexpectedly.
            const stream = await this.client.messages.create({
                model: this.model,
                system: request.systemPrompt,
                messages: this.buildMessages(request),
                temperature: options.temperature ?? DEFAULT_TEMPERATURE,
                max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
                stream: true,
                ...(options.stopSequences?.length
                    ? { stop_sequences: options.stopSequences }
                    : {}),
            });

            let fullText = '';
            let inputTokens = 0;
            let outputTokens = 0;
            let stopReason: string | null = null;

            for await (const event of stream) {
                if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                    const chunk = event.delta.text;
                    fullText += chunk;
                    onChunk(chunk, fullText.length);
                } else if (event.type === 'message_delta') {
                    stopReason = event.delta.stop_reason ?? null;
                    outputTokens = event.usage?.output_tokens ?? outputTokens;
                } else if (event.type === 'message_start') {
                    inputTokens = event.message.usage?.input_tokens ?? 0;
                }
            }

            return {
                content: fullText,
                usage: {
                    promptTokens: inputTokens,
                    completionTokens: outputTokens,
                    totalTokens: inputTokens + outputTokens,
                },
                finishReason: this.mapStopReason(stopReason),
            };
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async generateWithTools(
        request: GenerateRequest,
        tools: ToolDefinition[],
        forceTool?: string
    ): Promise<ToolCallResponse> {
        const options = { ...this.defaultOptions, ...request.options };

        try {
            const response = await this.withRetry(() =>
                this.client.messages.create({
                    model: this.model,
                    system: request.systemPrompt,
                    messages: this.buildMessages(request),
                    temperature: options.temperature ?? DEFAULT_TEMPERATURE,
                    max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
                    tools: this.convertTools(tools),
                    tool_choice: forceTool
                        ? { type: 'tool', name: forceTool }
                        : { type: 'auto' },
                })
            );

            return this.parseToolCallResponse(response);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Stream a tool_use call, reporting progress via onChunk as JSON bytes accumulate.
     * Forces the specified tool so Claude always calls it (never produces text-only output).
     * Returns a ToolCallResponse once streaming is complete.
     */
    async generateWithToolsStreaming(
        request: GenerateRequest,
        tools: ToolDefinition[],
        toolName: string,
        onChunk: (bytesReceived: number) => void
    ): Promise<ToolCallResponse> {
        const options = { ...this.defaultOptions, ...request.options };

        try {
            const stream = await this.client.messages.create({
                model: this.model,
                system: request.systemPrompt,
                messages: this.buildMessages(request),
                temperature: options.temperature ?? DEFAULT_TEMPERATURE,
                max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
                tools: this.convertTools(tools),
                tool_choice: { type: 'tool', name: toolName },
                stream: true,
            });

            let jsonBuffer = '';
            let inputTokens = 0;
            let outputTokens = 0;

            for await (const event of stream) {
                if (
                    event.type === 'content_block_delta' &&
                    event.delta.type === 'input_json_delta'
                ) {
                    jsonBuffer += event.delta.partial_json;
                    onChunk(jsonBuffer.length);
                } else if (event.type === 'message_delta') {
                    outputTokens = event.usage?.output_tokens ?? outputTokens;
                } else if (event.type === 'message_start') {
                    inputTokens = event.message.usage?.input_tokens ?? 0;
                }
            }

            if (!jsonBuffer) {
                throw new Error('Tool use stream produced no JSON output.');
            }

            const parsedArgs = JSON.parse(jsonBuffer);
            return {
                content: '',
                toolCalls: [{ id: 'tool-0', name: toolName, arguments: parsedArgs }],
                usage: {
                    promptTokens: inputTokens,
                    completionTokens: outputTokens,
                    totalTokens: inputTokens + outputTokens,
                },
                finishReason: 'tool_calls',
            };
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private buildMessages(request: GenerateRequest): Anthropic.MessageParam[] {
        const messages: Anthropic.MessageParam[] = [];

        // Replay conversation history (skip system messages — those go in system param)
        for (const msg of request.history ?? []) {
            if (msg.role === 'system') continue;
            messages.push({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content,
            });
        }

        // Append the latest user turn
        messages.push({ role: 'user', content: request.userMessage });

        return messages;
    }

    private convertTools(tools: ToolDefinition[]): Anthropic.Tool[] {
        return tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            input_schema: {
                type: 'object' as const,
                ...(tool.parameters as Record<string, unknown>),
            },
        }));
    }

    private parseResponse(response: Anthropic.Message): GenerateResponse {
        let content = '';
        for (const block of response.content) {
            if (block.type === 'text') content += block.text;
        }

        return {
            content,
            usage: {
                promptTokens: response.usage.input_tokens,
                completionTokens: response.usage.output_tokens,
                totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            },
            finishReason: this.mapStopReason(response.stop_reason),
        };
    }

    private parseToolCallResponse(response: Anthropic.Message): ToolCallResponse {
        let content = '';
        const toolCalls: ToolCall[] = [];

        for (const block of response.content) {
            if (block.type === 'text') {
                content += block.text;
            } else if (block.type === 'tool_use') {
                toolCalls.push({
                    id: block.id,
                    name: block.name,
                    arguments: block.input as Record<string, unknown>,
                });
            }
        }

        return {
            content,
            toolCalls,
            usage: {
                promptTokens: response.usage.input_tokens,
                completionTokens: response.usage.output_tokens,
                totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            },
            finishReason: toolCalls.length > 0 ? 'tool_calls' : this.mapStopReason(response.stop_reason),
        };
    }

    private mapStopReason(stopReason: string | null): FinishReason {
        switch (stopReason) {
            case 'end_turn':      return 'stop';
            case 'max_tokens':   return 'length';
            case 'stop_sequence': return 'stop';
            case 'tool_use':     return 'tool_calls';
            default:             return 'stop';
        }
    }

    private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
        let lastError: Error | undefined;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error as Error;
                if (this.isNonRetryableError(error)) throw error;
                if (attempt < MAX_RETRIES - 1) {
                    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
                }
            }
        }

        throw lastError;
    }

    private isNonRetryableError(error: unknown): boolean {
        if (error instanceof Error) {
            return (
                error.message.includes('API key') ||
                error.message.includes('authentication') ||
                error.message.includes('401')
            );
        }
        return false;
    }

    private handleError(error: unknown): LLMError {
        if (error instanceof LLMError) return error;

        const msg = error instanceof Error ? error.message : String(error);

        if (msg.includes('API key') || msg.includes('authentication') || msg.includes('401')) {
            return new LLMError(
                'Invalid or missing Anthropic API key. Set VITE_ANTHROPIC_API_KEY in your .env file.',
                LLMErrorCode.INVALID_API_KEY,
                error instanceof Error ? error : undefined
            );
        }
        if (msg.includes('rate') || msg.includes('429') || msg.includes('quota')) {
            return new LLMError(
                `Rate limit exceeded: ${msg}`,
                LLMErrorCode.RATE_LIMITED,
                error instanceof Error ? error : undefined
            );
        }
        if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
            return new LLMError('Request timed out.', LLMErrorCode.TIMEOUT, error instanceof Error ? error : undefined);
        }

        return new LLMError(
            `Claude request failed: ${msg}`,
            LLMErrorCode.UNKNOWN,
            error instanceof Error ? error : undefined
        );
    }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createClaudeClient(apiKey: string, model?: string): ClaudeClient {
    return new ClaudeClient({ apiKey, model });
}
