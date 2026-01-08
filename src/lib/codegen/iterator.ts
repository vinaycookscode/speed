/**
 * @fileoverview Iterative Code Generation Pipeline
 * @module lib/codegen/iterator
 *
 * Iteratively generates code, validates, and fixes until successful.
 * Implements the core "generate → validate → fix" loop.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

import type {
    IterationResult,
    IterationAttempt,
    CodeGenerationResult,
    ValidationResult,
    ProjectContext,
} from './types';

import { CodeGenerator } from './generator';
import { CodeValidator } from './validator';
import { CodeExecutor } from './executor';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum number of iteration attempts */
const MAX_ITERATIONS = 5;

// ============================================================================
// ITERATOR CLASS
// ============================================================================

/**
 * Configuration for the code iterator.
 */
export interface CodeIteratorConfig {
    /** Maximum number of attempts */
    maxIterations?: number;

    /** Project root path */
    projectRoot: string;

    /** Whether to write files to disk */
    writeFiles?: boolean;

    /** Whether to run tests */
    runTests?: boolean;

    /** LLM provider */
    provider?: 'gemini' | 'openai';
}

/**
 * Iteratively generates and validates code until successful.
 *
 * @example
 * ```typescript
 * const iterator = new CodeIterator({ projectRoot: '/my/project' });
 *
 * const result = await iterator.generateUntilValid(
 *   "Create a React button component",
 *   { type: 'web-application', techStack: { frontend: ['React'] } }
 * );
 *
 * if (result.success) {
 *   console.log('Generated:', result.finalCode?.files);
 * }
 * ```
 */
export class CodeIterator {
    /** Configuration */
    private config: CodeIteratorConfig;

    /** Code generator */
    private generator: CodeGenerator;

    /** Code validator */
    private validator: CodeValidator;

    /** Code executor */
    private executor: CodeExecutor;

    /**
     * Create a new iterator.
     */
    constructor(config: CodeIteratorConfig) {
        this.config = {
            maxIterations: config.maxIterations || MAX_ITERATIONS,
            projectRoot: config.projectRoot,
            writeFiles: config.writeFiles !== false,
            runTests: config.runTests !== false,
            provider: config.provider || 'gemini',
        };

        this.generator = new CodeGenerator({ provider: this.config.provider });
        this.validator = new CodeValidator({ projectRoot: this.config.projectRoot });
        this.executor = new CodeExecutor({ projectRoot: this.config.projectRoot });
    }

    /**
     * Generate code iteratively until validation passes.
     *
     * @param task - Task description
     * @param context - Project context
     * @returns Iteration result
     */
    async generateUntilValid(
        task: string,
        context?: Partial<ProjectContext>
    ): Promise<IterationResult> {
        const attempts: IterationAttempt[] = [];
        let lastGeneration: CodeGenerationResult | undefined;
        let lastValidation: ValidationResult | undefined;

        for (let i = 0; i < this.config.maxIterations!; i++) {
            const attempt: IterationAttempt = {
                attempt: i + 1,
                status: 'generating',
                timestamp: Date.now(),
            };

            // Generate code
            if (i === 0) {
                // First attempt: fresh generation
                lastGeneration = await this.generator.generate(task, context);
            } else {
                // Subsequent attempts: improve based on feedback
                const feedback = this.buildFeedback(lastValidation!);
                lastGeneration = await this.generator.improve(
                    lastGeneration!.files,
                    feedback
                );
            }

            attempt.generatedCode = lastGeneration;

            if (!lastGeneration.success) {
                attempt.status = 'failed';
                attempt.error = lastGeneration.error || 'Code generation failed';
                attempts.push(attempt);
                continue;
            }

            // Validate generated code
            attempt.status = 'validating';
            lastValidation = await this.validator.validate(lastGeneration.files);
            attempt.validation = lastValidation;

            if (lastValidation.valid) {
                // Write files if enabled
                if (this.config.writeFiles) {
                    attempt.status = 'executing';
                    const writeResult = await this.executor.writeFiles(lastGeneration.files);

                    if (!writeResult.success) {
                        attempt.status = 'failed';
                        attempt.error = writeResult.errors.join('\n');
                        attempts.push(attempt);
                        continue;
                    }

                    // Run tests if enabled
                    if (this.config.runTests) {
                        const testResult = await this.executor.runTests();
                        attempt.testResult = testResult;

                        if (!testResult.passed) {
                            // Tests failed, try to fix
                            attempt.status = 'failed';
                            attempt.error = `Tests failed: ${testResult.failures.map((f) => f.name).join(', ')}`;
                            attempts.push(attempt);
                            continue;
                        }
                    }
                }

                // Success!
                attempt.status = 'success';
                attempts.push(attempt);

                return {
                    success: true,
                    totalAttempts: i + 1,
                    attempts,
                    finalCode: lastGeneration,
                };
            }

            // Validation failed, log and continue
            attempt.status = 'failed';
            attempt.error = lastValidation.summary;
            attempts.push(attempt);
        }

        // Max iterations reached
        return {
            success: false,
            totalAttempts: attempts.length,
            attempts,
            finalError: `Failed after ${attempts.length} attempts. Last error: ${attempts[attempts.length - 1]?.error}`,
        };
    }

    /**
     * Build feedback from validation result for next iteration.
     */
    private buildFeedback(validation: ValidationResult): string {
        const errorMessages = validation.issues
            .filter((i) => i.type === 'error')
            .map((i) => `- ${i.file}${i.line ? `:${i.line}` : ''}: ${i.message}`)
            .join('\n');

        const warningMessages = validation.issues
            .filter((i) => i.type === 'warning')
            .slice(0, 5) // Limit warnings
            .map((i) => `- ${i.file}${i.line ? `:${i.line}` : ''}: ${i.message}`)
            .join('\n');

        let feedback = 'The generated code has the following issues that need to be fixed:\n\n';

        if (errorMessages) {
            feedback += `ERRORS (must fix):\n${errorMessages}\n\n`;
        }

        if (warningMessages) {
            feedback += `WARNINGS (should fix):\n${warningMessages}\n\n`;
        }

        feedback += 'Please regenerate the code with these issues fixed.';

        return feedback;
    }

    /**
     * Get iteration statistics.
     */
    getStats(result: IterationResult): {
        success: boolean;
        attempts: number;
        errors: number;
        warnings: number;
    } {
        const allIssues = result.attempts
            .flatMap((a) => a.validation?.issues || []);

        return {
            success: result.success,
            attempts: result.totalAttempts,
            errors: allIssues.filter((i) => i.type === 'error').length,
            warnings: allIssues.filter((i) => i.type === 'warning').length,
        };
    }
}

/**
 * Create a new code iterator.
 */
export function createCodeIterator(config: CodeIteratorConfig): CodeIterator {
    return new CodeIterator(config);
}
