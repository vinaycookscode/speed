/**
 * @fileoverview Tool Registry Implementation
 * @module lib/tools/registry
 *
 * Registry for managing agent tools.
 * Provides registration, lookup, and execution of tools.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

import type {
    Tool,
    ToolCategory,
    IToolRegistry,
    ToolExecutionResult,
} from './types';

// ============================================================================
// TOOL REGISTRY
// ============================================================================

/**
 * Registry for managing agent tools.
 *
 * @example
 * ```typescript
 * const registry = new ToolRegistry();
 *
 * registry.register(writeFileTool);
 * registry.register(readFileTool);
 *
 * const tool = registry.get('write_file');
 * if (tool) {
 *   const result = await tool.execute({ path: '/tmp/test.txt', content: 'Hello' });
 * }
 * ```
 */
export class ToolRegistry implements IToolRegistry {
    /** Map of tool name to tool */
    private tools: Map<string, Tool> = new Map();

    /**
     * Register a new tool.
     *
     * @param tool - The tool to register
     * @throws {Error} If a tool with the same name already exists
     */
    register<T, R>(tool: Tool<T, R>): void {
        if (this.tools.has(tool.name)) {
            throw new Error(`Tool "${tool.name}" is already registered`);
        }

        this.tools.set(tool.name, tool as Tool);
    }

    /**
     * Get a tool by name.
     *
     * @param name - The tool name
     * @returns The tool, or undefined if not found
     */
    get(name: string): Tool | undefined {
        return this.tools.get(name);
    }

    /**
     * Get all registered tools.
     *
     * @returns Array of all tools
     */
    getAll(): Tool[] {
        return Array.from(this.tools.values());
    }

    /**
     * Get tools by category.
     *
     * @param category - The category to filter by
     * @returns Array of tools in the category
     */
    getByCategory(category: ToolCategory): Tool[] {
        return this.getAll().filter((tool) => tool.category === category);
    }

    /**
     * Check if a tool exists.
     *
     * @param name - The tool name
     * @returns Whether the tool exists
     */
    has(name: string): boolean {
        return this.tools.has(name);
    }

    /**
     * Unregister a tool.
     *
     * @param name - The tool name
     * @returns Whether the tool was removed
     */
    unregister(name: string): boolean {
        return this.tools.delete(name);
    }

    /**
     * Execute a tool by name.
     *
     * @param name - The tool name
     * @param params - The tool parameters
     * @returns The execution result
     */
    async execute(name: string, params: Record<string, unknown>): Promise<ToolExecutionResult> {
        const tool = this.get(name);

        if (!tool) {
            return {
                success: false,
                output: `Tool "${name}" not found`,
                error: {
                    code: 'TOOL_NOT_FOUND',
                    message: `Tool "${name}" is not registered`,
                },
            };
        }

        const startTime = Date.now();

        try {
            const result = await tool.execute(params);

            return {
                ...result,
                metadata: {
                    ...result.metadata,
                    durationMs: Date.now() - startTime,
                    timestamp: Date.now(),
                },
            };
        } catch (error) {
            return {
                success: false,
                output: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
                error: {
                    code: 'EXECUTION_ERROR',
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                },
                metadata: {
                    durationMs: Date.now() - startTime,
                    timestamp: Date.now(),
                },
            };
        }
    }

    /**
     * Get tool definitions for LLM function calling.
     *
     * @returns Array of tool definitions
     */
    getDefinitions() {
        return this.getAll().map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters as unknown as Record<string, unknown>,
        }));
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/** Global tool registry instance */
let globalRegistry: ToolRegistry | null = null;

/**
 * Get the global tool registry.
 *
 * @returns The global tool registry
 */
export function getToolRegistry(): ToolRegistry {
    if (!globalRegistry) {
        globalRegistry = new ToolRegistry();
    }
    return globalRegistry;
}
