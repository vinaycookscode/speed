/**
 * @fileoverview Meta-Agent Implementation
 * @module lib/agents/meta
 *
 * The Meta-Agent is the entry point for all project requests.
 * It analyzes user requests, determines project type, and assembles teams.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

import { BaseAgent } from '../base';
import type { AgentConfig, AgentOutput, AgentInput } from '../types';
import type { ToolDefinition } from '../../llm/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Project types the Meta-Agent can identify.
 */
export type ProjectType =
    | 'web-application'
    | 'mobile-app'
    | 'api-backend'
    | 'cli-tool'
    | 'library'
    | 'desktop-app'
    | 'game'
    | 'data-pipeline'
    | 'ml-model'
    | 'devops-infra'
    | 'embedded-system'
    | 'operating-system'
    | 'compiler'
    | 'cloud-platform'
    | 'blockchain'
    | 'unknown';

/**
 * Complexity levels for projects.
 */
export type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'enterprise' | 'research';

/**
 * Result of project analysis.
 */
export interface ProjectAnalysis {
    /** Detected project type */
    projectType: ProjectType;

    /** Complexity assessment */
    complexity: ComplexityLevel;

    /** Detected domains (e.g., 'fintech', 'healthcare') */
    domains: string[];

    /** Key features identified */
    features: string[];

    /** Required agents for the team */
    requiredAgents: string[];

    /** Suggested tech stack */
    techStack: {
        frontend?: string[];
        backend?: string[];
        database?: string[];
        infrastructure?: string[];
    };

    /** Questions to ask the user for clarification */
    clarifyingQuestions: string[];

    /** Feasibility assessment */
    feasibility: {
        canBuild: boolean;
        estimatedSprints: number;
        risks: string[];
        suggestions: string[];
    };
}

// ============================================================================
// META-AGENT SYSTEM PROMPT
// ============================================================================

const META_AGENT_SYSTEM_PROMPT = `You are the Meta-Agent, the primary orchestrator of a multi-agent AI development team.

## Your Role
You are the first point of contact for all project requests. Your job is to:
1. Analyze the user's request to understand what they want to build
2. Classify the project type (web app, mobile, OS, compiler, etc.)
3. Assess complexity and feasibility
4. Determine which agents are needed for the team
5. Ask clarifying questions if the request is ambiguous
6. Suggest appropriate technology stack based on the domain

## Project Type Detection
Identify the project type based on keywords:
- "website", "web app", "dashboard", "portal" → web-application
- "mobile", "iOS", "Android", "React Native" → mobile-app
- "API", "REST", "GraphQL", "microservice" → api-backend
- "CLI", "command line", "terminal tool" → cli-tool
- "OS", "kernel", "bootloader", "operating system" → operating-system
- "compiler", "language", "parser", "interpreter" → compiler
- "game", "game engine", "3D", "graphics" → game
- "ML", "AI", "model", "training", "neural" → ml-model
- "blockchain", "smart contract", "crypto" → blockchain
- "cloud", "serverless", "infrastructure" → cloud-platform

## Domain Detection
Identify the business domain:
- Banking terms (transactions, accounts, payments) → fintech
- Medical terms (patients, diagnosis, health) → healthcare
- Store terms (products, cart, orders) → e-commerce
- Social terms (friends, posts, messages) → social

## Tech Stack Selection
Based on domain, suggest appropriate technologies:
- Fintech: Java/Spring, PostgreSQL, strict security
- Healthcare: HIPAA-compliant stack, audit logging
- Startup/MVP: TypeScript, React, Node.js, PostgreSQL
- Enterprise: .NET or Java, enterprise databases
- Real-time: WebSockets, Redis, event-driven

## Team Composition
Based on project type, determine required agents:
- Web App: PM, Architect, Frontend Engineer, Backend Engineer, QA
- Mobile: PM, Architect, Mobile Engineer, Backend Engineer, QA
- OS: PM, Kernel Architect, Systems Programmer, QA
- Compiler: PM, Language Designer, Compiler Engineer, QA

## Output Format
Always respond with a JSON object containing your analysis:
{
  "projectType": "web-application",
  "complexity": "moderate",
  "domains": ["e-commerce"],
  "features": ["user auth", "product catalog", "shopping cart"],
  "requiredAgents": ["pm", "architect", "fullstack", "qa"],
  "techStack": {
    "frontend": ["React", "TypeScript"],
    "backend": ["Node.js", "Express"],
    "database": ["PostgreSQL"]
  },
  "clarifyingQuestions": [],
  "feasibility": {
    "canBuild": true,
    "estimatedSprints": 3,
    "risks": [],
    "suggestions": []
  }
}

If you need more information, include clarifying questions. If the project is too ambitious, suggest a reduced scope in the suggestions.`;

// ============================================================================
// META-AGENT TOOLS
// ============================================================================

/**
 * Tool for asking the user clarifying questions.
 */
const askUserTool: ToolDefinition = {
    name: 'ask_user',
    description: 'Ask the user a clarifying question about their project requirements',
    parameters: {
        type: 'object',
        properties: {
            question: {
                type: 'string',
                description: 'The question to ask the user',
            },
            options: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Multiple choice options for the user',
            },
        },
        required: ['question'],
    },
};

/**
 * Tool for creating the project analysis.
 */
const analyzeProjectTool: ToolDefinition = {
    name: 'analyze_project',
    description: 'Analyze the project request and produce a structured analysis',
    parameters: {
        type: 'object',
        properties: {
            projectType: {
                type: 'string',
                description: 'The detected project type',
                enum: [
                    'web-application', 'mobile-app', 'api-backend', 'cli-tool',
                    'library', 'desktop-app', 'game', 'data-pipeline', 'ml-model',
                    'devops-infra', 'embedded-system', 'operating-system',
                    'compiler', 'cloud-platform', 'blockchain', 'unknown',
                ],
            },
            complexity: {
                type: 'string',
                description: 'Complexity assessment',
                enum: ['simple', 'moderate', 'complex', 'enterprise', 'research'],
            },
            domains: {
                type: 'array',
                items: { type: 'string' },
                description: 'Business domains detected',
            },
            features: {
                type: 'array',
                items: { type: 'string' },
                description: 'Key features identified',
            },
            requiredAgents: {
                type: 'array',
                items: { type: 'string' },
                description: 'Agent roles needed for the team',
            },
            techStack: {
                type: 'object',
                description: 'Recommended technology stack',
            },
            estimatedSprints: {
                type: 'number',
                description: 'Estimated number of sprints to complete',
            },
        },
        required: ['projectType', 'complexity', 'features', 'requiredAgents'],
    },
};

// ============================================================================
// META-AGENT CLASS
// ============================================================================

/**
 * Default configuration for the Meta-Agent.
 */
const defaultMetaAgentConfig: Partial<AgentConfig> = {
    name: 'Meta',
    role: 'meta',
    expertise: ['project-analysis', 'team-composition', 'scope-assessment'],
    brain: {
        provider: 'gemini',
        model: 'gemini-1.5-flash',
        temperature: 0.3, // Lower temperature for more consistent analysis
        maxTokens: 4096,
        systemPrompt: META_AGENT_SYSTEM_PROMPT,
    },
    tools: [askUserTool, analyzeProjectTool],
};

/**
 * The Meta-Agent analyzes project requests and orchestrates the team.
 *
 * @example
 * ```typescript
 * const metaAgent = new MetaAgent();
 *
 * const result = await metaAgent.analyzeProject(
 *   "Build me a todo app with user authentication"
 * );
 *
 * console.log(result.projectType); // "web-application"
 * console.log(result.requiredAgents); // ["pm", "architect", "fullstack", "qa"]
 * ```
 */
export class MetaAgent extends BaseAgent {
    /** Cached analysis result */
    private lastAnalysis: ProjectAnalysis | null = null;

    /**
     * Create a new Meta-Agent.
     *
     * @param config - Optional configuration overrides
     */
    constructor(config?: Partial<AgentConfig>) {
        super({
            ...defaultMetaAgentConfig,
            ...config,
        } as AgentConfig);
    }

    /**
     * Analyze a project request.
     *
     * @param request - The user's project request
     * @returns The project analysis
     */
    async analyzeProject(request: string): Promise<ProjectAnalysis> {
        this.addLog('action', `Analyzing project request: ${request.slice(0, 100)}...`);

        const input: AgentInput = {
            task: `Analyze this project request and provide a structured analysis:\n\n"${request}"`,
            context: {
                instruction: 'Respond ONLY with a valid JSON object matching the ProjectAnalysis structure.',
            },
        };

        const output = await this.think(input);

        // Try to parse the response as JSON
        const analysis = this.parseAnalysis(output.result);
        this.lastAnalysis = analysis;

        return analysis;
    }

    /**
     * Get the last analysis result.
     */
    getLastAnalysis(): ProjectAnalysis | null {
        return this.lastAnalysis;
    }

    /**
     * Parse the LLM response into a ProjectAnalysis.
     */
    private parseAnalysis(response: string): ProjectAnalysis {
        // Try to extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                return this.validateAnalysis(parsed);
            } catch (error) {
                this.addLog('error', `Failed to parse analysis JSON: ${error}`);
            }
        }

        // Return a default analysis if parsing fails
        return this.getDefaultAnalysis();
    }

    /**
     * Validate and fill in missing fields in the analysis.
     */
    private validateAnalysis(parsed: Partial<ProjectAnalysis>): ProjectAnalysis {
        return {
            projectType: parsed.projectType || 'unknown',
            complexity: parsed.complexity || 'moderate',
            domains: parsed.domains || [],
            features: parsed.features || [],
            requiredAgents: parsed.requiredAgents || ['pm', 'fullstack'],
            techStack: parsed.techStack || {},
            clarifyingQuestions: parsed.clarifyingQuestions || [],
            feasibility: parsed.feasibility || {
                canBuild: true,
                estimatedSprints: 3,
                risks: [],
                suggestions: [],
            },
        };
    }

    /**
     * Get a default analysis for when parsing fails.
     */
    private getDefaultAnalysis(): ProjectAnalysis {
        return {
            projectType: 'unknown',
            complexity: 'moderate',
            domains: [],
            features: [],
            requiredAgents: ['pm', 'fullstack', 'qa'],
            techStack: {
                frontend: ['React', 'TypeScript'],
                backend: ['Node.js'],
                database: ['PostgreSQL'],
            },
            clarifyingQuestions: [
                'Could you provide more details about what you want to build?',
            ],
            feasibility: {
                canBuild: true,
                estimatedSprints: 3,
                risks: ['Requirements unclear'],
                suggestions: ['Please provide more specific requirements'],
            },
        };
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new Meta-Agent instance.
 *
 * @param config - Optional configuration overrides
 * @returns A new Meta-Agent
 */
export function createMetaAgent(config?: Partial<AgentConfig>): MetaAgent {
    return new MetaAgent(config);
}
