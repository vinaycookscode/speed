/**
 * @fileoverview LLM Integration Module Exports
 * @module lib/llm
 *
 * Main entry point for the LLM integration layer.
 * Provides a unified interface for working with different LLM providers.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

// Export types
export * from './types';

export { GeminiClient, createGeminiClient, type GeminiClientConfig } from './gemini';

// ============================================================================
// FACTORY
// ============================================================================

import { GeminiClient, type GeminiClientConfig } from './gemini';
import type { ILLMClient } from './types';

/**
 * Supported LLM providers.
 */
export type LLMProvider = 'gemini' | 'openai';

/**
 * Configuration for creating an LLM client.
 */
export interface LLMClientConfig {
    /** The LLM provider to use */
    provider: LLMProvider;

    /** API key for the provider */
    apiKey: string;

    /** Optional model override */
    model?: string;
}

/**
 * Create an LLM client for the specified provider.
 *
 * @param config - Client configuration
 * @returns The configured LLM client
 * @throws {Error} If the provider is not supported
 *
 * @example
 * ```typescript
 * const client = createLLMClient({
 *   provider: 'gemini',
 *   apiKey: process.env.GEMINI_API_KEY!
 * });
 * ```
 */
export function createLLMClient(config: LLMClientConfig): ILLMClient {
    switch (config.provider) {
        case 'gemini':
            return new GeminiClient({
                apiKey: config.apiKey,
                model: config.model,
            });

        case 'openai':
            // TODO: Implement OpenAI client
            throw new Error('OpenAI client not yet implemented');

        default:
            throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
}
