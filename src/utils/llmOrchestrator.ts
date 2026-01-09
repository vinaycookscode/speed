/**
 * @fileoverview LLM Orchestrator Hook for React Integration
 * @module utils/llmOrchestrator
 *
 * React hook that integrates the multi-agent LLM system with the UI.
 * Provides real-time project analysis, story creation, and code generation.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 */

import { useState, useCallback } from 'react';
import { createMetaAgent, createPMAgent, createTechLeadAgent } from '../lib/agents';
import type { ProjectAnalysis, UserStory, TechnicalTask } from '../lib/agents';

// ============================================================================
// TYPES
// ============================================================================

export interface LLMOrchestratorState {
    /** Whether an LLM operation is in progress */
    isLoading: boolean;

    /** Current status message */
    status: string;

    /** Any error that occurred */
    error: string | null;

    /** Project analysis result */
    analysis: ProjectAnalysis | null;

    /** Generated user stories */
    stories: UserStory[];

    /** Generated tasks */
    tasks: TechnicalTask[];

    /** Logs for display */
    logs: { timestamp: number; message: string; type: 'info' | 'success' | 'error' }[];
}

export interface UseLLMOrchestratorReturn extends LLMOrchestratorState {
    /** Analyze a project idea */
    analyzeProject: (idea: string) => Promise<ProjectAnalysis | null>;

    /** Create user stories from analysis */
    createStories: (projectIdea: string) => Promise<UserStory[]>;

    /** Create technical tasks from stories */
    createTasks: (stories: UserStory[]) => Promise<TechnicalTask[]>;

    /** Clear all state */
    reset: () => void;

    /** Add a log entry */
    addLog: (message: string, type?: 'info' | 'success' | 'error') => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for integrating LLM-powered agents with React components.
 *
 * @example
 * ```tsx
 * function IdeaInput() {
 *   const { analyzeProject, isLoading, analysis, logs } = useLLMOrchestrator();
 *
 *   const handleSubmit = async () => {
 *     const result = await analyzeProject("Build me a todo app");
 *     console.log(result?.projectType); // "web-application"
 *   };
 * }
 * ```
 */
export function useLLMOrchestrator(): UseLLMOrchestratorReturn {
    const [state, setState] = useState<LLMOrchestratorState>({
        isLoading: false,
        status: '',
        error: null,
        analysis: null,
        stories: [],
        tasks: [],
        logs: [],
    });

    const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
        setState(prev => ({
            ...prev,
            logs: [...prev.logs, { timestamp: Date.now(), message, type }],
        }));
    }, []);

    const analyzeProject = useCallback(async (idea: string): Promise<ProjectAnalysis | null> => {
        setState(prev => ({
            ...prev,
            isLoading: true,
            status: 'Meta-Agent analyzing project...',
            error: null,
        }));

        addLog(`🧠 Meta-Agent analyzing: "${idea.slice(0, 50)}..."`);

        try {
            const metaAgent = createMetaAgent();
            const analysis = await metaAgent.analyzeProject(idea);

            setState(prev => ({
                ...prev,
                isLoading: false,
                status: 'Analysis complete',
                analysis,
            }));

            addLog(`✅ Project type: ${analysis.projectType}, Complexity: ${analysis.complexity}`, 'success');
            addLog(`📋 Required agents: ${analysis.requiredAgents.join(', ')}`, 'info');

            return analysis;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                status: 'Analysis failed',
                error: errorMsg,
            }));

            addLog(`❌ Error: ${errorMsg}`, 'error');
            return null;
        }
    }, [addLog]);

    const createStories = useCallback(async (projectIdea: string): Promise<UserStory[]> => {
        setState(prev => ({
            ...prev,
            isLoading: true,
            status: 'PM Agent creating user stories...',
        }));

        addLog('📝 PM Agent (Maya) creating user stories...');

        try {
            const pmAgent = createPMAgent();
            const { stories, epics } = await pmAgent.createUserStories(projectIdea);

            setState(prev => ({
                ...prev,
                isLoading: false,
                status: `Created ${stories.length} stories`,
                stories,
            }));

            addLog(`✅ Created ${stories.length} stories in ${epics.length} epics`, 'success');

            return stories;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: errorMsg,
            }));

            addLog(`❌ Error: ${errorMsg}`, 'error');
            return [];
        }
    }, [addLog]);

    const createTasks = useCallback(async (stories: UserStory[]): Promise<TechnicalTask[]> => {
        setState(prev => ({
            ...prev,
            isLoading: true,
            status: 'Tech Lead breaking down stories...',
        }));

        addLog('🔧 Tech Lead (Alex) breaking down stories into tasks...');

        try {
            const techLeadAgent = createTechLeadAgent();
            const tasks = await techLeadAgent.createTasksFromStories(stories);

            setState(prev => ({
                ...prev,
                isLoading: false,
                status: `Created ${tasks.length} tasks`,
                tasks,
            }));

            addLog(`✅ Created ${tasks.length} technical tasks`, 'success');

            return tasks;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: errorMsg,
            }));

            addLog(`❌ Error: ${errorMsg}`, 'error');
            return [];
        }
    }, [addLog]);

    const reset = useCallback(() => {
        setState({
            isLoading: false,
            status: '',
            error: null,
            analysis: null,
            stories: [],
            tasks: [],
            logs: [],
        });
    }, []);

    return {
        ...state,
        analyzeProject,
        createStories,
        createTasks,
        reset,
        addLog,
    };
}
