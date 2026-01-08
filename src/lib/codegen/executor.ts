/**
 * @fileoverview Code Executor Implementation
 * @module lib/codegen/executor
 *
 * Executes generated code: runs commands, installs dependencies, runs tests.
 * Provides safe execution environment with timeout and output capture.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

import type {
    CommandResult,
    TestResult,
    BuildResult,
    GeneratedFile,
} from './types';

// ============================================================================
// EXECUTOR CLASS
// ============================================================================

/**
 * Configuration for the code executor.
 */
export interface CodeExecutorConfig {
    /** Project root path */
    projectRoot: string;

    /** Default timeout for commands (ms) */
    timeout?: number;

    /** Maximum output length to capture */
    maxOutputLength?: number;
}

/**
 * Executes code and commands in the project.
 *
 * @example
 * ```typescript
 * const executor = new CodeExecutor({ projectRoot: '/my/project' });
 *
 * await executor.installDependencies();
 * await executor.runBuild();
 * const testResult = await executor.runTests();
 * ```
 */
export class CodeExecutor {
    /** Configuration */
    private config: CodeExecutorConfig;

    /**
     * Create a new executor.
     */
    constructor(config: CodeExecutorConfig) {
        this.config = {
            projectRoot: config.projectRoot,
            timeout: config.timeout || 60000,
            maxOutputLength: config.maxOutputLength || 10000,
        };
    }

    /**
     * Run a shell command.
     *
     * @param command - Command to run
     * @param options - Execution options
     * @returns Command result
     */
    async runCommand(
        command: string,
        options: { cwd?: string; timeout?: number } = {}
    ): Promise<CommandResult> {
        const startTime = Date.now();
        const cwd = options.cwd || this.config.projectRoot;
        const timeout = options.timeout || this.config.timeout;

        try {
            // Check if we're in Electron environment
            if (typeof window !== 'undefined' && (window as any).electron?.runCommand) {
                const result = await (window as any).electron.runCommand(command, { cwd, timeout });

                return {
                    command,
                    exitCode: result.exitCode,
                    stdout: this.truncateOutput(result.stdout),
                    stderr: this.truncateOutput(result.stderr),
                    success: result.exitCode === 0,
                    durationMs: Date.now() - startTime,
                };
            }

            // Node.js environment
            if (typeof require !== 'undefined') {
                const { exec } = require('child_process');
                const { promisify } = require('util');
                const execAsync = promisify(exec);

                const result = await execAsync(command, {
                    cwd,
                    timeout,
                    maxBuffer: 1024 * 1024 * 10, // 10MB
                });

                return {
                    command,
                    exitCode: 0,
                    stdout: this.truncateOutput(result.stdout || ''),
                    stderr: this.truncateOutput(result.stderr || ''),
                    success: true,
                    durationMs: Date.now() - startTime,
                };
            }

            return {
                command,
                exitCode: -1,
                stdout: '',
                stderr: 'Command execution not available in this environment',
                success: false,
                durationMs: Date.now() - startTime,
            };
        } catch (error: any) {
            return {
                command,
                exitCode: error.code || 1,
                stdout: error.stdout || '',
                stderr: error.stderr || error.message || String(error),
                success: false,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Install npm dependencies.
     *
     * @param packages - Optional specific packages to install
     * @returns Command result
     */
    async installDependencies(packages?: string[]): Promise<CommandResult> {
        const command = packages && packages.length > 0
            ? `npm install ${packages.join(' ')}`
            : 'npm install';

        return this.runCommand(command);
    }

    /**
     * Run the project build.
     *
     * @returns Build result
     */
    async runBuild(): Promise<BuildResult> {
        const startTime = Date.now();
        const result = await this.runCommand('npm run build');

        return {
            success: result.success,
            output: result.stdout + result.stderr,
            errors: result.success ? [] : this.extractErrors(result.stderr),
            warnings: this.extractWarnings(result.stdout + result.stderr),
            durationMs: Date.now() - startTime,
        };
    }

    /**
     * Run tests.
     *
     * @returns Test result
     */
    async runTests(): Promise<TestResult> {
        const result = await this.runCommand('npm test -- --passWithNoTests');

        if (!result.success) {
            // Try to parse test output
            return this.parseTestOutput(result);
        }

        return {
            passed: true,
            total: 0,
            passedCount: 0,
            failedCount: 0,
            skippedCount: 0,
            failures: [],
            output: result.stdout,
        };
    }

    /**
     * Start the development server.
     *
     * @returns Command result
     */
    async startDevServer(): Promise<CommandResult> {
        // Note: This starts the server but doesn't wait for it
        return this.runCommand('npm run dev &', { timeout: 5000 });
    }

    /**
     * Write files to disk.
     *
     * @param files - Files to write
     * @returns Whether all writes succeeded
     */
    async writeFiles(files: GeneratedFile[]): Promise<{ success: boolean; errors: string[] }> {
        const errors: string[] = [];

        for (const file of files) {
            try {
                const fullPath = `${this.config.projectRoot}/${file.path}`;

                if (typeof window !== 'undefined' && (window as any).electron?.writeFile) {
                    await (window as any).electron.writeFile(fullPath, file.content);
                } else if (typeof require !== 'undefined') {
                    const fs = require('fs').promises;
                    const path = require('path');

                    await fs.mkdir(path.dirname(fullPath), { recursive: true });
                    await fs.writeFile(fullPath, file.content, 'utf-8');
                }
            } catch (error) {
                errors.push(`Failed to write ${file.path}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        return {
            success: errors.length === 0,
            errors,
        };
    }

    /**
     * Check if a file exists.
     */
    async fileExists(relativePath: string): Promise<boolean> {
        const fullPath = `${this.config.projectRoot}/${relativePath}`;

        try {
            if (typeof require !== 'undefined') {
                const fs = require('fs').promises;
                await fs.access(fullPath);
                return true;
            }
        } catch {
            return false;
        }

        return false;
    }

    /**
     * Read a file.
     */
    async readFile(relativePath: string): Promise<string | null> {
        const fullPath = `${this.config.projectRoot}/${relativePath}`;

        try {
            if (typeof window !== 'undefined' && (window as any).electron?.readFile) {
                return await (window as any).electron.readFile(fullPath);
            } else if (typeof require !== 'undefined') {
                const fs = require('fs').promises;
                return await fs.readFile(fullPath, 'utf-8');
            }
        } catch {
            return null;
        }

        return null;
    }

    /**
     * Parse test output to extract results.
     */
    private parseTestOutput(result: CommandResult): TestResult {
        const output = result.stdout + result.stderr;

        // Try to parse Jest/Vitest style output
        const passedMatch = output.match(/(\d+)\s+pass/i);
        const failedMatch = output.match(/(\d+)\s+fail/i);
        const skippedMatch = output.match(/(\d+)\s+skip/i);

        const passedCount = passedMatch ? parseInt(passedMatch[1]) : 0;
        const failedCount = failedMatch ? parseInt(failedMatch[1]) : 0;
        const skippedCount = skippedMatch ? parseInt(skippedMatch[1]) : 0;

        // Extract failure details
        const failures: TestResult['failures'] = [];
        const failureRegex = /✕\s+(.+?)(?:\n|$)/g;
        let match;

        while ((match = failureRegex.exec(output)) !== null) {
            failures.push({
                name: match[1].trim(),
                message: 'Test failed',
            });
        }

        return {
            passed: failedCount === 0,
            total: passedCount + failedCount + skippedCount,
            passedCount,
            failedCount,
            skippedCount,
            failures,
            output,
        };
    }

    /**
     * Extract error messages from output.
     */
    private extractErrors(output: string): string[] {
        const errors: string[] = [];
        const errorRegex = /error[:\s]+(.+?)(?:\n|$)/gi;
        let match;

        while ((match = errorRegex.exec(output)) !== null) {
            errors.push(match[1].trim());
        }

        return errors;
    }

    /**
     * Extract warning messages from output.
     */
    private extractWarnings(output: string): string[] {
        const warnings: string[] = [];
        const warningRegex = /warning[:\s]+(.+?)(?:\n|$)/gi;
        let match;

        while ((match = warningRegex.exec(output)) !== null) {
            warnings.push(match[1].trim());
        }

        return warnings;
    }

    /**
     * Truncate output to maximum length.
     */
    private truncateOutput(output: string): string {
        if (output.length <= this.config.maxOutputLength!) {
            return output;
        }

        const half = Math.floor(this.config.maxOutputLength! / 2);
        return output.slice(0, half) + '\n\n... [truncated] ...\n\n' + output.slice(-half);
    }
}

/**
 * Create a new code executor.
 */
export function createCodeExecutor(config: CodeExecutorConfig): CodeExecutor {
    return new CodeExecutor(config);
}
