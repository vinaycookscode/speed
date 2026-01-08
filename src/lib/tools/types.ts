/**
 * @fileoverview Tool System Type Definitions
 * @module lib/tools/types
 *
 * Type definitions for the extensible tool system.
 * Tools are capabilities that agents can use to interact with
 * the environment (file system, commands, APIs, etc.).
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

// ============================================================================
// TOOL DEFINITION
// ============================================================================

/**
 * Definition of a tool that agents can use.
 */
export interface Tool<TParams = Record<string, unknown>, TResult = unknown> {
    /**
     * Unique name of the tool.
     * Should be snake_case.
     */
    name: string;

    /**
     * Human-readable description of what the tool does.
     * This is used by the LLM to decide when to use the tool.
     */
    description: string;

    /**
     * Category for grouping related tools.
     */
    category: ToolCategory;

    /**
     * JSON Schema defining the tool's parameters.
     * Used for LLM function calling.
     */
    parameters: ToolParameters;

    /**
     * Execute the tool with the given parameters.
     *
     * @param params - The parameters for the tool
     * @returns The result of the tool execution
     */
    execute(params: TParams): Promise<ToolExecutionResult<TResult>>;
}

/**
 * Categories for organizing tools.
 */
export type ToolCategory =
    | 'file'           // File system operations
    | 'command'        // Shell commands
    | 'search'         // Search operations
    | 'communication'  // Inter-agent/user communication
    | 'codegen'        // Code generation
    | 'validation'     // Code validation
    | 'execution'      // Code execution
    | 'custom';        // Custom tools

/**
 * JSON Schema definition for tool parameters.
 */
export interface ToolParameters {
    /** Type must be 'object' for tool parameters */
    type: 'object';

    /** Property definitions */
    properties: Record<string, ToolParameterProperty>;

    /** List of required property names */
    required?: string[];

    /** Whether additional properties are allowed */
    additionalProperties?: boolean;
}

/**
 * Definition of a single parameter property.
 */
export interface ToolParameterProperty {
    /** The data type */
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';

    /** Description for the LLM */
    description: string;

    /** Allowed values (for enums) */
    enum?: string[];

    /** Default value */
    default?: unknown;

    /** For arrays: definition of items */
    items?: ToolParameterProperty;
}

// ============================================================================
// TOOL EXECUTION
// ============================================================================

/**
 * Result of a tool execution.
 */
export interface ToolExecutionResult<T = unknown> {
    /** Whether the execution was successful */
    success: boolean;

    /** The result data (if successful) */
    data?: T;

    /** Human-readable output message */
    output: string;

    /** Error information (if failed) */
    error?: ToolError;

    /** Execution metadata */
    metadata?: ToolExecutionMetadata;
}

/**
 * Error information from a failed tool execution.
 */
export interface ToolError {
    /** Error code */
    code: string;

    /** Error message */
    message: string;

    /** Stack trace (if available) */
    stack?: string;

    /** Suggestions for fixing the error */
    suggestions?: string[];
}

/**
 * Metadata about a tool execution.
 */
export interface ToolExecutionMetadata {
    /** Time taken in milliseconds */
    durationMs: number;

    /** Timestamp of execution */
    timestamp: number;

    /** Any additional context */
    context?: Record<string, unknown>;
}

// ============================================================================
// TOOL REGISTRY
// ============================================================================

/**
 * Registry for managing available tools.
 */
export interface IToolRegistry {
    /**
     * Register a new tool.
     *
     * @param tool - The tool to register
     */
    register<T, R>(tool: Tool<T, R>): void;

    /**
     * Get a tool by name.
     *
     * @param name - The tool name
     * @returns The tool, or undefined if not found
     */
    get(name: string): Tool | undefined;

    /**
     * Get all registered tools.
     *
     * @returns Array of all tools
     */
    getAll(): Tool[];

    /**
     * Get tools by category.
     *
     * @param category - The category to filter by
     * @returns Array of tools in the category
     */
    getByCategory(category: ToolCategory): Tool[];

    /**
     * Check if a tool exists.
     *
     * @param name - The tool name
     * @returns Whether the tool exists
     */
    has(name: string): boolean;

    /**
     * Unregister a tool.
     *
     * @param name - The tool name
     * @returns Whether the tool was removed
     */
    unregister(name: string): boolean;
}

// ============================================================================
// BUILT-IN TOOL PARAMETER TYPES
// ============================================================================

/**
 * Parameters for file read tool.
 */
export interface ReadFileParams {
    /** Path to the file to read */
    path: string;

    /** Encoding (default: utf-8) */
    encoding?: string;
}

/**
 * Parameters for file write tool.
 */
export interface WriteFileParams {
    /** Path to write the file */
    path: string;

    /** Content to write */
    content: string;

    /** Whether to create directories if they don't exist */
    createDirs?: boolean;
}

/**
 * Parameters for command execution tool.
 */
export interface RunCommandParams {
    /** The command to run */
    command: string;

    /** Working directory */
    cwd?: string;

    /** Environment variables */
    env?: Record<string, string>;

    /** Timeout in milliseconds */
    timeout?: number;
}

/**
 * Parameters for search tool.
 */
export interface SearchParams {
    /** Search query */
    query: string;

    /** Maximum number of results */
    maxResults?: number;

    /** Search source */
    source?: 'web' | 'github' | 'docs';
}
