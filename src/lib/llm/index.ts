/**
 * @fileoverview LLM Integration — main entry point
 * @module lib/llm
 */

// Re-export types
export * from './types';

// Re-export clients
export { GeminiClient, createGeminiClient, type GeminiClientConfig } from './gemini';
export { ClaudeClient, createClaudeClient, type ClaudeClientConfig } from './claude';

// ============================================================================
// FACTORY
// ============================================================================

import { GeminiClient } from './gemini';
import { ClaudeClient } from './claude';
import type { ILLMClient } from './types';

/** Supported LLM providers. */
export type LLMProvider = 'gemini' | 'openai' | 'claude';

export interface LLMClientConfig {
    provider: LLMProvider;
    apiKey: string;
    model?: string;
}

/**
 * Create an LLM client for the given provider.
 *
 * @example
 * ```typescript
 * const client = createLLMClient({ provider: 'claude', apiKey: '...' });
 * ```
 */
export function createLLMClient(config: LLMClientConfig): ILLMClient {
    switch (config.provider) {
        case 'gemini':
            return new GeminiClient({ apiKey: config.apiKey, model: config.model });

        case 'claude':
            return new ClaudeClient({ apiKey: config.apiKey, model: config.model });

        case 'openai':
            throw new Error('OpenAI client not yet implemented.');

        default:
            throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
}

/**
 * Resolve the best available provider from environment keys.
 * Priority: claude → gemini (openai not implemented yet).
 */
export function resolveBestProvider(): { provider: LLMProvider; apiKey: string } | null {
    const tryKey = (key: string) => {
        if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) {
            return (import.meta as any).env[key] as string;
        }
        if (typeof process !== 'undefined' && process.env?.[key]) {
            return process.env[key] as string;
        }
        return null;
    };

    const claudeKey = tryKey('VITE_ANTHROPIC_API_KEY') || tryKey('ANTHROPIC_API_KEY');
    if (claudeKey) return { provider: 'claude', apiKey: claudeKey };

    const geminiKey = tryKey('VITE_GEMINI_API_KEY') || tryKey('GEMINI_API_KEY');
    if (geminiKey) return { provider: 'gemini', apiKey: geminiKey };

    return null;
}
