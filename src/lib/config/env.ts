/**
 * @fileoverview Environment Configuration
 * @module lib/config/env
 */

export interface EnvConfig {
    geminiApiKey: string | undefined;
    openaiApiKey: string | undefined;
    anthropicApiKey: string | undefined;
    nodeEnv: 'development' | 'production' | 'test';
    isElectron: boolean;
}

export function getEnvConfig(): EnvConfig {
    return {
        geminiApiKey: getEnvVar('VITE_GEMINI_API_KEY') || getEnvVar('GEMINI_API_KEY'),
        openaiApiKey: getEnvVar('VITE_OPENAI_API_KEY') || getEnvVar('OPENAI_API_KEY'),
        anthropicApiKey: getEnvVar('VITE_ANTHROPIC_API_KEY') || getEnvVar('ANTHROPIC_API_KEY'),
        nodeEnv: (getEnvVar('NODE_ENV') as EnvConfig['nodeEnv']) || 'development',
        isElectron: typeof window !== 'undefined' && !!(window as any).electron,
    };
}

function getEnvVar(key: string): string | undefined {
    // Vite exposes VITE_* vars at import.meta.env
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        const val = (import.meta as any).env[key];
        if (val) return val;
    }
    // Electron / Node fallback
    if (typeof window !== 'undefined' && (window as any).__env) {
        return (window as any).__env[key];
    }
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
    }
    return undefined;
}

export function hasApiKey(provider: 'gemini' | 'openai' | 'claude'): boolean {
    const config = getEnvConfig();
    switch (provider) {
        case 'gemini':  return !!config.geminiApiKey;
        case 'openai':  return !!config.openaiApiKey;
        case 'claude':  return !!config.anthropicApiKey;
        default:        return false;
    }
}

export function getApiKey(provider: 'gemini' | 'openai' | 'claude'): string {
    const config = getEnvConfig();
    switch (provider) {
        case 'gemini':
            if (!config.geminiApiKey) throw new Error('Gemini API key not configured. Set VITE_GEMINI_API_KEY in your .env file.');
            return config.geminiApiKey;
        case 'openai':
            if (!config.openaiApiKey) throw new Error('OpenAI API key not configured. Set VITE_OPENAI_API_KEY in your .env file.');
            return config.openaiApiKey;
        case 'claude':
            if (!config.anthropicApiKey) throw new Error('Anthropic API key not configured. Set VITE_ANTHROPIC_API_KEY in your .env file.');
            return config.anthropicApiKey;
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}
