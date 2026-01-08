/**
 * @fileoverview LLM Integration Types
 * @module lib/llm/types
 *
 * Type definitions for the LLM (Large Language Model) integration layer.
 * These types define the interface for communicating with AI providers
 * like Gemini, OpenAI, etc.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

// ============================================================================
// REQUEST TYPES
// ============================================================================

/**
 * Configuration for an LLM generation request.
 */
export interface GenerateRequest {
    /** The system prompt that defines the AI's behavior */
    systemPrompt: string;

    /** The user's message or query */
    userMessage: string;

    /** Optional conversation history for context */
    history?: Message[];

    /** Generation parameters */
    options?: GenerateOptions;
}

/**
 * Options for controlling LLM generation behavior.
 */
export interface GenerateOptions {
    /**
     * Controls randomness in output (0.0 = deterministic, 1.0 = creative)
     * @default 0.7
     */
    temperature?: number;

    /**
     * Maximum number of tokens to generate
     * @default 4096
     */
    maxTokens?: number;

    /**
     * Stop sequences that will halt generation
     */
    stopSequences?: string[];
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Response from an LLM generation request.
 */
export interface GenerateResponse {
    /** The generated text content */
    content: string;

    /** Token usage statistics */
    usage: TokenUsage;

    /** The finish reason for the generation */
    finishReason: FinishReason;
}

/**
 * Token usage statistics for a generation.
 */
export interface TokenUsage {
    /** Number of tokens in the prompt */
    promptTokens: number;

    /** Number of tokens in the completion */
    completionTokens: number;

    /** Total tokens used */
    totalTokens: number;
}

/**
 * Reasons why the LLM stopped generating.
 */
export type FinishReason = 'stop' | 'length' | 'content_filter' | 'tool_calls';

// ============================================================================
// MESSAGE TYPES
// ============================================================================

/**
 * A message in the conversation history.
 */
export interface Message {
    /** The role of the message sender */
    role: MessageRole;

    /** The content of the message */
    content: string;

    /** Optional name for the sender */
    name?: string;
}

/**
 * Possible roles for a message sender.
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

// ============================================================================
// TOOL CALLING TYPES
// ============================================================================

/**
 * Definition of a tool that the LLM can call.
 */
export interface ToolDefinition {
    /** Unique name of the tool */
    name: string;

    /** Description of what the tool does (for LLM to understand) */
    description: string;

    /** JSON Schema defining the tool's parameters */
    parameters: Record<string, unknown>;
}

/**
 * A tool call requested by the LLM.
 */
export interface ToolCall {
    /** Unique ID for this tool call */
    id: string;

    /** Name of the tool to call */
    name: string;

    /** Arguments to pass to the tool (parsed JSON) */
    arguments: Record<string, unknown>;
}

/**
 * Result of executing a tool.
 */
export interface ToolResult {
    /** The tool call ID this result corresponds to */
    toolCallId: string;

    /** The result content */
    content: string;

    /** Whether the tool execution was successful */
    success: boolean;

    /** Error message if the tool failed */
    error?: string;
}

/**
 * Response from an LLM request that includes tool calls.
 */
export interface ToolCallResponse {
    /** Text content (may be empty if only tool calls) */
    content: string;

    /** Tool calls requested by the LLM */
    toolCalls: ToolCall[];

    /** Token usage statistics */
    usage: TokenUsage;

    /** The finish reason */
    finishReason: FinishReason;
}

// ============================================================================
// CLIENT INTERFACE
// ============================================================================

/**
 * Interface for LLM client implementations.
 * All LLM providers (Gemini, OpenAI, etc.) must implement this interface.
 */
export interface ILLMClient {
    /** The name of the LLM provider */
    readonly provider: string;

    /** The model being used */
    readonly model: string;

    /**
     * Generate a text response from the LLM.
     *
     * @param request - The generation request
     * @returns The generated response
     */
    generate(request: GenerateRequest): Promise<GenerateResponse>;

    /**
     * Generate a response with tool calling support.
     *
     * @param request - The generation request
     * @param tools - Available tools the LLM can call
     * @returns The response with potential tool calls
     */
    generateWithTools(
        request: GenerateRequest,
        tools: ToolDefinition[]
    ): Promise<ToolCallResponse>;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Error codes for LLM operations.
 */
export enum LLMErrorCode {
    /** API key is invalid or missing */
    INVALID_API_KEY = 'INVALID_API_KEY',

    /** Rate limit exceeded */
    RATE_LIMITED = 'RATE_LIMITED',

    /** Request timed out */
    TIMEOUT = 'TIMEOUT',

    /** Content was blocked by safety filters */
    CONTENT_BLOCKED = 'CONTENT_BLOCKED',

    /** Unknown error occurred */
    UNKNOWN = 'UNKNOWN',
}

/**
 * Custom error class for LLM operations.
 */
export class LLMError extends Error {
    constructor(
        message: string,
        public readonly code: LLMErrorCode,
        public readonly cause?: Error
    ) {
        super(message);
        this.name = 'LLMError';
    }
}
