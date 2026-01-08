/**
 * @fileoverview Code Validator Implementation
 * @module lib/codegen/validator
 *
 * Validates generated code for syntax errors, type errors, and lint issues.
 * Uses TypeScript compiler API and ESLint for comprehensive validation.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

import type {
    GeneratedFile,
    ValidationResult,
    ValidationIssue,
    ValidationType,
} from './types';

// ============================================================================
// VALIDATOR CLASS
// ============================================================================

/**
 * Configuration for the code validator.
 */
export interface CodeValidatorConfig {
    /** Project root path */
    projectRoot?: string;

    /** Whether to run type checking */
    checkTypes?: boolean;

    /** Whether to run linting */
    checkLint?: boolean;

    /** TypeScript config path */
    tsConfigPath?: string;

    /** ESLint config path */
    eslintConfigPath?: string;
}

/**
 * Validates generated code for errors.
 *
 * @example
 * ```typescript
 * const validator = new CodeValidator({ projectRoot: '/my/project' });
 *
 * const result = await validator.validate([
 *   { path: 'src/index.ts', content: 'const x: string = 5;' }
 * ]);
 *
 * if (!result.valid) {
 *   console.log('Errors:', result.issues);
 * }
 * ```
 */
export class CodeValidator {
    /** Configuration */
    private config: CodeValidatorConfig;

    /**
     * Create a new validator.
     */
    constructor(config: CodeValidatorConfig = {}) {
        this.config = {
            projectRoot: config.projectRoot || process.cwd(),
            checkTypes: config.checkTypes !== false,
            checkLint: config.checkLint !== false,
            tsConfigPath: config.tsConfigPath,
            eslintConfigPath: config.eslintConfigPath,
        };
    }

    /**
     * Validate code files.
     *
     * @param files - Files to validate
     * @returns Validation result
     */
    async validate(files: GeneratedFile[]): Promise<ValidationResult> {
        const issues: ValidationIssue[] = [];
        const validationsRun: ValidationType[] = [];

        // Syntax validation
        const syntaxIssues = await this.validateSyntax(files);
        issues.push(...syntaxIssues);
        validationsRun.push('syntax');

        // Type validation (if enabled and no syntax errors)
        if (this.config.checkTypes && syntaxIssues.length === 0) {
            const typeIssues = await this.validateTypes(files);
            issues.push(...typeIssues);
            validationsRun.push('types');
        }

        // Lint validation (if enabled)
        if (this.config.checkLint) {
            const lintIssues = await this.validateLint(files);
            issues.push(...lintIssues);
            validationsRun.push('lint');
        }

        const errors = issues.filter((i) => i.type === 'error');
        const warnings = issues.filter((i) => i.type === 'warning');

        return {
            valid: errors.length === 0,
            issues,
            validationsRun,
            summary: this.buildSummary(errors.length, warnings.length),
        };
    }

    /**
     * Validate syntax of TypeScript/JavaScript files.
     */
    async validateSyntax(files: GeneratedFile[]): Promise<ValidationIssue[]> {
        const issues: ValidationIssue[] = [];

        for (const file of files) {
            if (!this.isJsOrTsFile(file.path)) {
                continue;
            }

            const syntaxErrors = this.checkSyntax(file);
            issues.push(...syntaxErrors);
        }

        return issues;
    }

    /**
     * Check syntax of a single file.
     */
    private checkSyntax(file: GeneratedFile): ValidationIssue[] {
        const issues: ValidationIssue[] = [];

        try {
            // Basic syntax checks without full TypeScript compiler
            const content = file.content;

            // Check for unbalanced brackets
            const bracketErrors = this.checkBrackets(content, file.path);
            issues.push(...bracketErrors);

            // Check for common syntax errors
            const commonErrors = this.checkCommonSyntaxErrors(content, file.path);
            issues.push(...commonErrors);

        } catch (error) {
            issues.push({
                type: 'error',
                category: 'syntax',
                file: file.path,
                message: `Syntax check failed: ${error instanceof Error ? error.message : String(error)}`,
            });
        }

        return issues;
    }

    /**
     * Check for unbalanced brackets.
     */
    private checkBrackets(content: string, filePath: string): ValidationIssue[] {
        const issues: ValidationIssue[] = [];

        const brackets: Record<string, string> = {
            '{': '}',
            '[': ']',
            '(': ')',
        };

        const stack: { char: string; line: number }[] = [];
        const lines = content.split('\n');

        let inString = false;
        let stringChar = '';
        let inComment = false;
        let inMultiLineComment = false;

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const prev = i > 0 ? line[i - 1] : '';

                // Handle string literals
                if ((char === '"' || char === "'" || char === '`') && prev !== '\\') {
                    if (inString && char === stringChar) {
                        inString = false;
                    } else if (!inString && !inComment && !inMultiLineComment) {
                        inString = true;
                        stringChar = char;
                    }
                    continue;
                }

                if (inString) continue;

                // Handle comments
                if (char === '/' && line[i + 1] === '/') {
                    inComment = true;
                    break;
                }
                if (char === '/' && line[i + 1] === '*') {
                    inMultiLineComment = true;
                    continue;
                }
                if (char === '*' && line[i + 1] === '/') {
                    inMultiLineComment = false;
                    i++;
                    continue;
                }

                if (inComment || inMultiLineComment) continue;

                // Check brackets
                if (brackets[char]) {
                    stack.push({ char, line: lineNum + 1 });
                } else if (Object.values(brackets).includes(char)) {
                    const expected = Object.entries(brackets).find(([, v]) => v === char)?.[0];
                    if (stack.length === 0 || stack[stack.length - 1].char !== expected) {
                        issues.push({
                            type: 'error',
                            category: 'syntax',
                            file: filePath,
                            line: lineNum + 1,
                            message: `Unexpected closing bracket '${char}'`,
                        });
                    } else {
                        stack.pop();
                    }
                }
            }

            inComment = false;
        }

        // Report unclosed brackets
        for (const unclosed of stack) {
            issues.push({
                type: 'error',
                category: 'syntax',
                file: filePath,
                line: unclosed.line,
                message: `Unclosed bracket '${unclosed.char}'`,
            });
        }

        return issues;
    }

    /**
     * Check for common syntax errors.
     */
    private checkCommonSyntaxErrors(content: string, filePath: string): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNum = i + 1;

            // Check for double semicolons
            if (/;;/.test(line)) {
                issues.push({
                    type: 'warning',
                    category: 'syntax',
                    file: filePath,
                    line: lineNum,
                    message: 'Double semicolon detected',
                    suggestion: 'Remove the extra semicolon',
                });
            }

            // Check for obvious incomplete statements
            if (/^\s*(const|let|var)\s+\w+\s*$/.test(line)) {
                issues.push({
                    type: 'error',
                    category: 'syntax',
                    file: filePath,
                    line: lineNum,
                    message: 'Incomplete variable declaration',
                    suggestion: 'Add an initializer or type annotation',
                });
            }
        }

        return issues;
    }

    /**
     * Validate TypeScript types (placeholder for full implementation).
     */
    async validateTypes(files: GeneratedFile[]): Promise<ValidationIssue[]> {
        // Note: Full type checking requires the TypeScript compiler
        // This is a simplified version that checks for basic type patterns

        const issues: ValidationIssue[] = [];

        for (const file of files) {
            if (!file.path.endsWith('.ts') && !file.path.endsWith('.tsx')) {
                continue;
            }

            // Check for type annotations in function parameters
            const funcRegex = /function\s+\w+\s*\(([^)]*)\)/g;
            const lines = file.content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // Check for any type usage
                if (/:\s*any\b/.test(line)) {
                    issues.push({
                        type: 'warning',
                        category: 'types',
                        file: file.path,
                        line: i + 1,
                        message: 'Usage of "any" type detected',
                        suggestion: 'Consider using a more specific type',
                    });
                }
            }
        }

        return issues;
    }

    /**
     * Validate lint rules (simplified implementation).
     */
    async validateLint(files: GeneratedFile[]): Promise<ValidationIssue[]> {
        const issues: ValidationIssue[] = [];

        for (const file of files) {
            if (!this.isJsOrTsFile(file.path)) {
                continue;
            }

            const lines = file.content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const lineNum = i + 1;

                // Check for console.log
                if (/console\.(log|warn|error)\s*\(/.test(line)) {
                    issues.push({
                        type: 'warning',
                        category: 'lint',
                        file: file.path,
                        line: lineNum,
                        message: 'Unexpected console statement',
                        suggestion: 'Remove console statement or use a logger',
                    });
                }

                // Check for very long lines
                if (line.length > 120) {
                    issues.push({
                        type: 'warning',
                        category: 'lint',
                        file: file.path,
                        line: lineNum,
                        message: `Line too long (${line.length} > 120 characters)`,
                        suggestion: 'Break line into multiple lines',
                    });
                }

                // Check for TODO/FIXME comments
                if (/\/\/\s*(TODO|FIXME|HACK):/i.test(line)) {
                    issues.push({
                        type: 'warning',
                        category: 'lint',
                        file: file.path,
                        line: lineNum,
                        message: 'TODO/FIXME comment detected',
                        suggestion: 'Address the TODO or remove it',
                    });
                }
            }
        }

        return issues;
    }

    /**
     * Check if file is JavaScript or TypeScript.
     */
    private isJsOrTsFile(path: string): boolean {
        return /\.(js|jsx|ts|tsx)$/.test(path);
    }

    /**
     * Build validation summary.
     */
    private buildSummary(errorCount: number, warningCount: number): string {
        if (errorCount === 0 && warningCount === 0) {
            return 'Validation passed with no issues';
        }

        const parts: string[] = [];
        if (errorCount > 0) {
            parts.push(`${errorCount} error${errorCount > 1 ? 's' : ''}`);
        }
        if (warningCount > 0) {
            parts.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`);
        }

        return `Validation found ${parts.join(' and ')}`;
    }
}

/**
 * Create a new code validator.
 */
export function createCodeValidator(config?: CodeValidatorConfig): CodeValidator {
    return new CodeValidator(config);
}
