/**
 * @fileoverview Code Generation Engine Types
 * @module lib/codegen/types
 *
 * Type definitions for the code generation engine.
 * Defines interfaces for code generation, validation, and execution.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

// ============================================================================
// GENERATED CODE TYPES
// ============================================================================

/**
 * A generated file.
 */
export interface GeneratedFile {
    /** File path relative to project root */
    path: string;

    /** File content */
    content: string;

    /** Programming language */
    language: string;

    /** Action performed */
    action: 'create' | 'update' | 'delete';
}

/**
 * Output of a code generation operation.
 */
export interface CodeGenerationResult {
    /** Generated files */
    files: GeneratedFile[];

    /** Dependencies to install */
    dependencies: {
        name: string;
        version?: string;
        dev?: boolean;
    }[];

    /** Commands to run after generation */
    postCommands: string[];

    /** Explanation of what was generated */
    explanation: string;

    /** Whether generation was successful */
    success: boolean;

    /** Error message if failed */
    error?: string;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Types of validation.
 */
export type ValidationType = 'syntax' | 'types' | 'lint' | 'build' | 'test';

/**
 * A validation error or warning.
 */
export interface ValidationIssue {
    /** Issue type */
    type: 'error' | 'warning';

    /** Validation category */
    category: ValidationType;

    /** File where issue was found */
    file: string;

    /** Line number */
    line?: number;

    /** Column number */
    column?: number;

    /** Error/warning message */
    message: string;

    /** Error code */
    code?: string;

    /** Suggested fix */
    suggestion?: string;
}

/**
 * Result of code validation.
 */
export interface ValidationResult {
    /** Whether all validations passed */
    valid: boolean;

    /** Issues found */
    issues: ValidationIssue[];

    /** Validation types that were run */
    validationsRun: ValidationType[];

    /** Summary of validation */
    summary: string;
}

// ============================================================================
// EXECUTION TYPES
// ============================================================================

/**
 * Result of running a command.
 */
export interface CommandResult {
    /** The command that was run */
    command: string;

    /** Exit code */
    exitCode: number;

    /** Standard output */
    stdout: string;

    /** Standard error */
    stderr: string;

    /** Whether command succeeded (exit code 0) */
    success: boolean;

    /** Duration in milliseconds */
    durationMs: number;
}

/**
 * Result of running tests.
 */
export interface TestResult {
    /** Whether all tests passed */
    passed: boolean;

    /** Total tests run */
    total: number;

    /** Tests passed */
    passedCount: number;

    /** Tests failed */
    failedCount: number;

    /** Tests skipped */
    skippedCount: number;

    /** Failed test details */
    failures: {
        name: string;
        message: string;
        file?: string;
    }[];

    /** Raw output */
    output: string;
}

/**
 * Result of building the project.
 */
export interface BuildResult {
    /** Whether build succeeded */
    success: boolean;

    /** Build output */
    output: string;

    /** Build errors */
    errors: string[];

    /** Build warnings */
    warnings: string[];

    /** Duration in milliseconds */
    durationMs: number;
}

// ============================================================================
// REVIEW TYPES
// ============================================================================

/**
 * Severity of a review issue.
 */
export type ReviewSeverity = 'critical' | 'major' | 'minor' | 'suggestion';

/**
 * A code review issue.
 */
export interface ReviewIssue {
    /** Severity level */
    severity: ReviewSeverity;

    /** Category (e.g., 'security', 'performance', 'style') */
    category: string;

    /** File path */
    file: string;

    /** Line number */
    line?: number;

    /** Issue description */
    message: string;

    /** Suggested fix */
    suggestion?: string;
}

/**
 * Result of code review.
 */
export interface CodeReviewResult {
    /** Whether code is approved */
    approved: boolean;

    /** Quality score (0-100) */
    score: number;

    /** Issues found */
    issues: ReviewIssue[];

    /** General suggestions */
    suggestions: string[];

    /** Summary of review */
    summary: string;
}

// ============================================================================
// ITERATION TYPES
// ============================================================================

/**
 * Status of an iteration attempt.
 */
export type IterationStatus = 'pending' | 'generating' | 'validating' | 'executing' | 'reviewing' | 'success' | 'failed';

/**
 * A single iteration attempt.
 */
export interface IterationAttempt {
    /** Attempt number (1-indexed) */
    attempt: number;

    /** Status */
    status: IterationStatus;

    /** Generated code (if any) */
    generatedCode?: CodeGenerationResult;

    /** Validation result (if run) */
    validation?: ValidationResult;

    /** Test result (if run) */
    testResult?: TestResult;

    /** Review result (if run) */
    review?: CodeReviewResult;

    /** Error if failed */
    error?: string;

    /** Timestamp */
    timestamp: number;
}

/**
 * Result of iterative code generation.
 */
export interface IterationResult {
    /** Whether iteration succeeded */
    success: boolean;

    /** Number of attempts made */
    totalAttempts: number;

    /** All attempts */
    attempts: IterationAttempt[];

    /** Final generated code (if successful) */
    finalCode?: CodeGenerationResult;

    /** Final error (if failed) */
    finalError?: string;
}

// ============================================================================
// PROJECT CONTEXT
// ============================================================================

/**
 * Context about the project being built.
 */
export interface ProjectContext {
    /** Project root path */
    rootPath: string;

    /** Project name */
    name: string;

    /** Project type */
    type: string;

    /** Tech stack */
    techStack: {
        frontend?: string[];
        backend?: string[];
        database?: string[];
    };

    /** Existing files */
    existingFiles: string[];

    /** Package.json dependencies (if applicable) */
    dependencies?: Record<string, string>;
}
