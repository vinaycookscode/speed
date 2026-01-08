/**
 * @fileoverview Gemini LLM Client Implementation
 * @module lib/llm/gemini
 *
 * Client for Google's Gemini AI API.
 * Provides text generation and function calling capabilities.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

import {
    GoogleGenerativeAI,
    GenerativeModel,
    Content,
    FunctionDeclaration,
    FunctionCallingMode,
    type GenerateContentResult,
} from '@google/generative-ai';

import type {
    ILLMClient,
    GenerateRequest,
    GenerateResponse,
    GenerateOptions,
    ToolDefinition,
    ToolCallResponse,
    ToolCall,
    TokenUsage,
    FinishReason,
    Message,
} from './types';

import { LLMError, LLMErrorCode } from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default model to use */
const DEFAULT_MODEL = 'gemini-2.5-flash';

/** Default temperature for generation */
const DEFAULT_TEMPERATURE = 0.7;

/** Default max tokens */
const DEFAULT_MAX_TOKENS = 8192;

/** Request timeout in milliseconds (for future use) */
// const REQUEST_TIMEOUT_MS = 60000;

/** Maximum retry attempts */
const MAX_RETRIES = 3;

/** Delay between retries in milliseconds */
const RETRY_DELAY_MS = 1000;

// ============================================================================
// GEMINI CLIENT
// ============================================================================

/**
 * Configuration for the Gemini client.
 */
export interface GeminiClientConfig {
    /** Gemini API key */
    apiKey: string;

    /** Model to use (default: gemini-2.5-flash) */
    model?: string;

    /** Default generation options */
    defaultOptions?: GenerateOptions;
}

/**
 * Client for interacting with Google's Gemini API.
 *
 * @example
 * ```typescript
 * const client = new GeminiClient({
 *   apiKey: process.env.GEMINI_API_KEY!,
 *   model: 'gemini-2.5-flash'
 * });
 *
 * const response = await client.generate({
 *   systemPrompt: 'You are a helpful assistant.',
 *   userMessage: 'Hello!'
 * });
 *
 * console.log(response.content);
 * ```
 */
export class GeminiClient implements ILLMClient {
    /** The LLM provider name */
    public readonly provider = 'gemini';

    /** The model being used */
    public readonly model: string;

    /** The Google AI instance */
    private readonly genAI: GoogleGenerativeAI;

    /** The generative model instance */
    private readonly generativeModel: GenerativeModel;

    /** Default generation options */
    private readonly defaultOptions: GenerateOptions;

    /**
     * Creates a new Gemini client.
     *
     * @param config - Client configuration
     * @throws {LLMError} If API key is not provided
     */
    constructor(config: GeminiClientConfig) {
        if (!config.apiKey) {
            throw new LLMError(
                'Gemini API key is required',
                LLMErrorCode.INVALID_API_KEY
            );
        }

        this.model = config.model ?? DEFAULT_MODEL;
        this.defaultOptions = config.defaultOptions ?? {};

        // Initialize the Google AI client
        this.genAI = new GoogleGenerativeAI(config.apiKey);

        // Get the generative model
        this.generativeModel = this.genAI.getGenerativeModel({
            model: this.model,
        });
    }

    /**
     * Generate a text response from Gemini.
     *
     * @param request - The generation request
     * @returns The generated response
     */
    async generate(request: GenerateRequest): Promise<GenerateResponse> {
        const options = { ...this.defaultOptions, ...request.options };

        try {
            // Build the contents array
            const contents = this.buildContents(request);

            // Generate content
            const result = await this.withRetry(async () => {
                return await this.generativeModel.generateContent({
                    contents,
                    systemInstruction: request.systemPrompt,
                    generationConfig: {
                        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
                        maxOutputTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
                        stopSequences: options.stopSequences,
                    },
                });
            });

            // Parse and return the response
            return this.parseResponse(result);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Generate a response with function/tool calling support.
     *
     * @param request - The generation request
     * @param tools - Available tools the LLM can call
     * @returns The response with potential tool calls
     */
    async generateWithTools(
        request: GenerateRequest,
        tools: ToolDefinition[]
    ): Promise<ToolCallResponse> {
        const options = { ...this.defaultOptions, ...request.options };

        try {
            // Convert tools to Gemini function declarations
            const functionDeclarations = this.convertToolsToFunctions(tools);

            // Build the contents array
            const contents = this.buildContents(request);

            // Generate content with tools
            const result = await this.withRetry(async () => {
                return await this.generativeModel.generateContent({
                    contents,
                    systemInstruction: request.systemPrompt,
                    generationConfig: {
                        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
                        maxOutputTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
                        stopSequences: options.stopSequences,
                    },
                    tools: [
                        {
                            functionDeclarations,
                        },
                    ],
                    toolConfig: {
                        functionCallingConfig: {
                            mode: FunctionCallingMode.AUTO,
                        },
                    },
                });
            });

            // Parse and return the response with tool calls
            return this.parseToolCallResponse(result);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // ==========================================================================
    // PRIVATE METHODS
    // ==========================================================================

    /**
     * Build the contents array from the request.
     */
    private buildContents(request: GenerateRequest): Content[] {
        const contents: Content[] = [];

        // Add history if provided
        if (request.history && request.history.length > 0) {
            for (const message of request.history) {
                contents.push({
                    role: this.mapRole(message.role),
                    parts: [{ text: message.content }],
                });
            }
        }

        // Add the user message
        contents.push({
            role: 'user',
            parts: [{ text: request.userMessage }],
        });

        return contents;
    }

    /**
     * Map our message roles to Gemini roles.
     */
    private mapRole(role: Message['role']): 'user' | 'model' {
        switch (role) {
            case 'user':
                return 'user';
            case 'assistant':
            case 'system':
            case 'tool':
                return 'model';
            default:
                return 'user';
        }
    }

    /**
     * Convert tool definitions to Gemini function declarations.
     */
    private convertToolsToFunctions(tools: ToolDefinition[]): FunctionDeclaration[] {
        return tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            // Cast through unknown as the types are compatible at runtime
            parameters: tool.parameters as unknown as FunctionDeclaration['parameters'],
        }));
    }

    /**
     * Parse a standard generation response.
     */
    private parseResponse(result: GenerateContentResult): GenerateResponse {
        const response = result.response;
        const text = response.text();

        // Get usage metadata (if available)
        const usage = this.extractUsage(response);

        // Determine finish reason
        const finishReason = this.extractFinishReason(response);

        return {
            content: text,
            usage,
            finishReason,
        };
    }

    /**
     * Parse a tool call response.
     */
    private parseToolCallResponse(result: GenerateContentResult): ToolCallResponse {
        const response = result.response;
        const candidate = response.candidates?.[0];

        let content = '';
        const toolCalls: ToolCall[] = [];

        // Extract parts from the response
        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                // Text part
                if ('text' in part && part.text) {
                    content += part.text;
                }

                // Function call part
                if ('functionCall' in part && part.functionCall) {
                    toolCalls.push({
                        id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                        name: part.functionCall.name,
                        arguments: part.functionCall.args as Record<string, unknown>,
                    });
                }
            }
        }

        // Get usage metadata
        const usage = this.extractUsage(response);

        // Determine finish reason
        const finishReason = toolCalls.length > 0 ? 'tool_calls' : this.extractFinishReason(response);

        return {
            content,
            toolCalls,
            usage,
            finishReason,
        };
    }

    /**
     * Extract token usage from response.
     */
    private extractUsage(response: GenerateContentResult['response']): TokenUsage {
        const metadata = response.usageMetadata;

        return {
            promptTokens: metadata?.promptTokenCount ?? 0,
            completionTokens: metadata?.candidatesTokenCount ?? 0,
            totalTokens: metadata?.totalTokenCount ?? 0,
        };
    }

    /**
     * Extract finish reason from response.
     */
    private extractFinishReason(response: GenerateContentResult['response']): FinishReason {
        const candidate = response.candidates?.[0];

        switch (candidate?.finishReason) {
            case 'STOP':
                return 'stop';
            case 'MAX_TOKENS':
                return 'length';
            case 'SAFETY':
            case 'RECITATION':
                return 'content_filter';
            default:
                return 'stop';
        }
    }

    /**
     * Retry wrapper for API calls.
     */
    private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
        let lastError: Error | undefined;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error as Error;

                // Don't retry on certain errors
                if (this.isNonRetryableError(error)) {
                    throw error;
                }

                // Wait before retrying
                if (attempt < MAX_RETRIES - 1) {
                    await this.sleep(RETRY_DELAY_MS * (attempt + 1));
                }
            }
        }

        throw lastError;
    }

    /**
     * Check if an error should not be retried.
     */
    private isNonRetryableError(error: unknown): boolean {
        if (error instanceof Error) {
            // API key errors
            if (error.message.includes('API key')) {
                return true;
            }
            // Safety/content filter errors
            if (error.message.includes('SAFETY') || error.message.includes('blocked')) {
                return true;
            }
        }
        return false;
    }

    /**
     * Sleep for a specified duration.
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Handle and wrap errors.
     */
    private handleError(error: unknown): LLMError {
        if (error instanceof LLMError) {
            return error;
        }

        const errorMessage = error instanceof Error ? error.message : String(error);

        // Categorize the error
        if (errorMessage.includes('API key')) {
            return new LLMError(
                'Invalid or missing API key',
                LLMErrorCode.INVALID_API_KEY,
                error instanceof Error ? error : undefined
            );
        }

        if (errorMessage.includes('rate') || errorMessage.includes('quota')) {
            return new LLMError(
                'Rate limit exceeded. Please try again later.',
                LLMErrorCode.RATE_LIMITED,
                error instanceof Error ? error : undefined
            );
        }

        if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
            return new LLMError(
                'Request timed out. Please try again.',
                LLMErrorCode.TIMEOUT,
                error instanceof Error ? error : undefined
            );
        }

        if (errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
            return new LLMError(
                'Content was blocked by safety filters.',
                LLMErrorCode.CONTENT_BLOCKED,
                error instanceof Error ? error : undefined
            );
        }

        return new LLMError(
            `LLM request failed: ${errorMessage}`,
            LLMErrorCode.UNKNOWN,
            error instanceof Error ? error : undefined
        );
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new Gemini client.
 *
 * @param apiKey - The Gemini API key
 * @param model - Optional model override
 * @returns A configured Gemini client
 *
 * @example
 * ```typescript
 * const client = createGeminiClient(process.env.GEMINI_API_KEY!);
 * ```
 */
export function createGeminiClient(
    apiKey: string,
    model?: string
): GeminiClient {
    return new GeminiClient({
        apiKey,
        model,
    });
}
