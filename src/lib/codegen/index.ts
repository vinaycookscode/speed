/**
 * @fileoverview Code Generation Engine Exports
 * @module lib/codegen
 *
 * Main entry point for the code generation engine.
 * Provides unified API for generating, validating, and executing code.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

// Export types
export * from './types';

// Export components
export { CodeGenerator, createCodeGenerator } from './generator';
export type { CodeGeneratorConfig } from './generator';

export { CodeValidator, createCodeValidator } from './validator';
export type { CodeValidatorConfig } from './validator';

export { CodeExecutor, createCodeExecutor } from './executor';
export type { CodeExecutorConfig } from './executor';

export { CodeIterator, createCodeIterator } from './iterator';
export type { CodeIteratorConfig } from './iterator';

// ============================================================================
// CONVENIENCE FACTORY
// ============================================================================

import { CodeIterator, type CodeIteratorConfig } from './iterator';

/**
 * Create a full code generation pipeline.
 * This is the main entry point for the code engine.
 *
 * @param projectRoot - Path to the project root
 * @param options - Additional options
 * @returns A configured code iterator for the project
 *
 * @example
 * ```typescript
 * const engine = createCodeEngine('/path/to/project');
 *
 * const result = await engine.generateUntilValid(
 *   "Create a user login form with email and password validation"
 * );
 *
 * if (result.success) {
 *   console.log('Files generated:', result.finalCode?.files);
 * }
 * ```
 */
export function createCodeEngine(
    projectRoot: string,
    options?: Partial<Omit<CodeIteratorConfig, 'projectRoot'>>
): CodeIterator {
    return new CodeIterator({
        projectRoot,
        ...options,
    });
}
