/**
 * @fileoverview Code Generator Implementation
 * @module lib/codegen/generator
 *
 * Generates code using LLM based on task descriptions.
 * Produces complete, working code files.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

import type {
    GeneratedFile,
    CodeGenerationResult,
    ProjectContext,
} from './types';

import { createLLMClient } from '../llm';
import type { ILLMClient, ToolDefinition } from '../llm/types';
import { getApiKey } from '../config/env';

// ============================================================================
// CONSTANTS
// ============================================================================

/** System prompt for code generation */
const CODE_GEN_SYSTEM_PROMPT = `You are an expert code generator. Your job is to write complete, production-ready code.

## Rules
1. Write COMPLETE code - no placeholders, no TODOs, no "implement here"
2. Include proper imports at the top of each file
3. Add JSDoc comments for public functions and classes
4. Include error handling for all I/O operations
5. Use TypeScript for type safety
6. Follow consistent naming conventions

## Output Format
Respond with a JSON object containing the files to create:
{
  "files": [
    {
      "path": "src/components/Button.tsx",
      "content": "// Complete file content here...",
      "language": "typescript"
    }
  ],
  "dependencies": [
    { "name": "react", "version": "^18.0.0" }
  ],
  "explanation": "Brief explanation of what was generated"
}

## Code Quality Standards
- Use modern ES6+ syntax
- Prefer async/await over raw promises
- Use descriptive variable names
- Keep functions focused and small
- Include input validation where appropriate`;

// ============================================================================
// CODE GENERATOR CLASS
// ============================================================================

/**
 * Configuration for the code generator.
 */
export interface CodeGeneratorConfig {
    /** LLM provider to use */
    provider?: 'gemini' | 'openai';

    /** Model to use */
    model?: string;

    /** Temperature for generation (higher = more creative) */
    temperature?: number;
}

/**
 * Generates code using LLM.
 *
 * @example
 * ```typescript
 * const generator = new CodeGenerator();
 *
 * const result = await generator.generate({
 *   task: "Create a React button component with primary and secondary variants",
 *   context: { rootPath: '/my/project', type: 'web-application' }
 * });
 * ```
 */
export class CodeGenerator {
    /** The LLM client */
    private llmClient: ILLMClient;

    /** Configuration */
    private config: CodeGeneratorConfig;

    /**
     * Create a new code generator.
     */
    constructor(config: CodeGeneratorConfig = {}) {
        this.config = {
            provider: config.provider || 'gemini',
            model: config.model || 'gemini-2.5-flash',
            temperature: config.temperature || 0.3,
        };

        this.llmClient = createLLMClient({
            provider: this.config.provider!,
            apiKey: getApiKey(this.config.provider!),
            model: this.config.model,
        });
    }

    /**
     * Generate code for a task.
     *
     * @param task - Description of what to generate
     * @param context - Project context
     * @returns Generated code
     */
    async generate(
        task: string,
        context?: Partial<ProjectContext>
    ): Promise<CodeGenerationResult> {
        const prompt = this.buildPrompt(task, context);

        try {
            const response = await this.llmClient.generate({
                systemPrompt: CODE_GEN_SYSTEM_PROMPT,
                userMessage: prompt,
                options: {
                    temperature: this.config.temperature,
                    maxTokens: 8192,
                },
            });

            return this.parseResponse(response.content);
        } catch (error) {
            return {
                files: [],
                dependencies: [],
                postCommands: [],
                explanation: '',
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    /**
     * Generate code for multiple files at once.
     *
     * @param files - File specifications
     * @param context - Project context
     * @returns Generated code
     */
    async generateFiles(
        files: { path: string; description: string }[],
        context?: Partial<ProjectContext>
    ): Promise<CodeGenerationResult> {
        const fileSpec = files
            .map((f) => `- ${f.path}: ${f.description}`)
            .join('\n');

        const task = `Generate the following files:\n\n${fileSpec}`;
        return this.generate(task, context);
    }

    /**
     * Improve existing code based on feedback.
     *
     * @param code - Current code
     * @param feedback - What to improve
     * @returns Improved code
     */
    async improve(
        code: GeneratedFile[],
        feedback: string
    ): Promise<CodeGenerationResult> {
        const codeContext = code
            .map((f) => `=== ${f.path} ===\n${f.content}`)
            .join('\n\n');

        const prompt = `Improve the following code based on this feedback:\n\nFeedback: ${feedback}\n\nCurrent Code:\n${codeContext}`;

        return this.generate(prompt);
    }

    /**
     * Build the prompt for generation.
     */
    private buildPrompt(task: string, context?: Partial<ProjectContext>): string {
        let prompt = `Task: ${task}`;

        if (context) {
            prompt += '\n\nProject Context:';

            if (context.type) {
                prompt += `\n- Project Type: ${context.type}`;
            }

            if (context.techStack) {
                if (context.techStack.frontend) {
                    prompt += `\n- Frontend: ${context.techStack.frontend.join(', ')}`;
                }
                if (context.techStack.backend) {
                    prompt += `\n- Backend: ${context.techStack.backend.join(', ')}`;
                }
                if (context.techStack.database) {
                    prompt += `\n- Database: ${context.techStack.database.join(', ')}`;
                }
            }

            if (context.existingFiles && context.existingFiles.length > 0) {
                prompt += `\n- Existing Files: ${context.existingFiles.slice(0, 10).join(', ')}`;
            }
        }

        return prompt;
    }

    /**
     * Parse the LLM response into a CodeGenerationResult.
     */
    private parseResponse(response: string): CodeGenerationResult {
        // Try to extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);

                return {
                    files: (parsed.files || []).map((f: any) => ({
                        path: f.path,
                        content: f.content,
                        language: f.language || this.detectLanguage(f.path),
                        action: 'create' as const,
                    })),
                    dependencies: parsed.dependencies || [],
                    postCommands: parsed.postCommands || [],
                    explanation: parsed.explanation || '',
                    success: true,
                };
            } catch (error) {
                // JSON parsing failed
            }
        }

        // Fallback: try to extract code blocks
        const codeBlocks = this.extractCodeBlocks(response);

        if (codeBlocks.length > 0) {
            return {
                files: codeBlocks,
                dependencies: [],
                postCommands: [],
                explanation: response,
                success: true,
            };
        }

        return {
            files: [],
            dependencies: [],
            postCommands: [],
            explanation: response,
            success: false,
            error: 'Could not parse code from response',
        };
    }

    /**
     * Extract code blocks from markdown-style response.
     */
    private extractCodeBlocks(response: string): GeneratedFile[] {
        const files: GeneratedFile[] = [];

        // Match ```language\n...content...\n```
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;

        while ((match = codeBlockRegex.exec(response)) !== null) {
            const language = match[1] || 'typescript';
            const content = match[2].trim();

            // Try to find a filename before the code block
            const beforeBlock = response.substring(0, match.index);
            const fileMatch = beforeBlock.match(/[`'"]([\w/.]+\.\w+)[`'"]\s*:?\s*$/);

            const path = fileMatch
                ? fileMatch[1]
                : `generated_${files.length + 1}.${this.getExtension(language)}`;

            files.push({
                path,
                content,
                language,
                action: 'create',
            });
        }

        return files;
    }

    /**
     * Detect language from file path.
     */
    private detectLanguage(path: string): string {
        const ext = path.split('.').pop()?.toLowerCase();

        const languageMap: Record<string, string> = {
            ts: 'typescript',
            tsx: 'typescript',
            js: 'javascript',
            jsx: 'javascript',
            py: 'python',
            rb: 'ruby',
            go: 'go',
            rs: 'rust',
            java: 'java',
            cs: 'csharp',
            css: 'css',
            scss: 'scss',
            html: 'html',
            json: 'json',
            md: 'markdown',
            sql: 'sql',
            sh: 'bash',
            yaml: 'yaml',
            yml: 'yaml',
        };

        return languageMap[ext || ''] || 'plaintext';
    }

    /**
     * Get file extension from language.
     */
    private getExtension(language: string): string {
        const extensionMap: Record<string, string> = {
            typescript: 'ts',
            javascript: 'js',
            python: 'py',
            ruby: 'rb',
            go: 'go',
            rust: 'rs',
            java: 'java',
            csharp: 'cs',
            css: 'css',
            scss: 'scss',
            html: 'html',
            json: 'json',
            markdown: 'md',
            sql: 'sql',
            bash: 'sh',
            yaml: 'yaml',
        };

        return extensionMap[language] || 'txt';
    }
}

/**
 * Create a new code generator.
 */
export function createCodeGenerator(config?: CodeGeneratorConfig): CodeGenerator {
    return new CodeGenerator(config);
}
