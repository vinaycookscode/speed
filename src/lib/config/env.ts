/**
 * @fileoverview Environment Configuration
 * @module lib/config/env
 *
 * Environment variable configuration and validation.
 * Centralizes all environment-related configuration.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

// ============================================================================
// ENVIRONMENT TYPES
// ============================================================================

/**
 * Application environment configuration.
 */
export interface EnvConfig {
    /** Gemini API key */
    geminiApiKey: string | undefined;

    /** OpenAI API key (optional) */
    openaiApiKey: string | undefined;

    /** Current environment */
    nodeEnv: 'development' | 'production' | 'test';

    /** Whether running in Electron */
    isElectron: boolean;
}

// ============================================================================
// ENVIRONMENT HELPERS
// ============================================================================

/**
 * Get the current environment configuration.
 *
 * @returns The environment configuration
 */
export function getEnvConfig(): EnvConfig {
    return {
        geminiApiKey: getEnvVar('VITE_GEMINI_API_KEY') || getEnvVar('GEMINI_API_KEY'),
        openaiApiKey: getEnvVar('VITE_OPENAI_API_KEY') || getEnvVar('OPENAI_API_KEY'),
        nodeEnv: (getEnvVar('NODE_ENV') as EnvConfig['nodeEnv']) || 'development',
        isElectron: typeof window !== 'undefined' && !!(window as any).electron,
    };
}

/**
 * Get an environment variable, handling both Vite and Node.js environments.
 *
 * @param key - The environment variable key
 * @returns The value or undefined
 */
function getEnvVar(key: string): string | undefined {
    // Vite environment (browser)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return (import.meta.env as Record<string, string>)[key];
    }

    // Node.js environment
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
    }

    return undefined;
}

/**
 * Check if a required API key is configured.
 *
 * @param provider - The LLM provider to check
 * @returns Whether the API key is configured
 */
export function hasApiKey(provider: 'gemini' | 'openai'): boolean {
    const config = getEnvConfig();

    switch (provider) {
        case 'gemini':
            return !!config.geminiApiKey;
        case 'openai':
            return !!config.openaiApiKey;
        default:
            return false;
    }
}

/**
 * Get the API key for a provider.
 *
 * @param provider - The LLM provider
 * @returns The API key
 * @throws {Error} If the API key is not configured
 */
export function getApiKey(provider: 'gemini' | 'openai'): string {
    const config = getEnvConfig();

    switch (provider) {
        case 'gemini':
            if (!config.geminiApiKey) {
                throw new Error(
                    'Gemini API key not configured. Set VITE_GEMINI_API_KEY in your .env file.'
                );
            }
            return config.geminiApiKey;

        case 'openai':
            if (!config.openaiApiKey) {
                throw new Error(
                    'OpenAI API key not configured. Set VITE_OPENAI_API_KEY in your .env file.'
                );
            }
            return config.openaiApiKey;

        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}
