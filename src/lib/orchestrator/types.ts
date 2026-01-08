/**
 * @fileoverview Orchestrator Type Definitions
 * @module lib/orchestrator/types
 *
 * Types for the sprint orchestrator that coordinates agents.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

import type { AgentId, AgentRole } from '../agents/types';
import type { ProjectAnalysis } from '../agents/meta';
import type { UserStory, Epic } from '../agents/pm';
import type { TechnicalTask } from '../agents/tech-lead';
import type { CodeGenerationResult } from '../codegen/types';

// ============================================================================
// SPRINT TYPES
// ============================================================================

/**
 * Status of a sprint.
 */
export type SprintStatus =
    | 'planning'      // Creating stories and tasks
    | 'in-progress'   // Development ongoing
    | 'review'        // Code review
    | 'testing'       // Running tests
    | 'done'          // Sprint completed
    | 'failed';       // Sprint failed

/**
 * A sprint containing work to be done.
 */
export interface Sprint {
    /** Sprint ID */
    id: string;

    /** Sprint number */
    number: number;

    /** Sprint goal */
    goal: string;

    /** Status */
    status: SprintStatus;

    /** Stories in this sprint */
    stories: UserStory[];

    /** Tasks in this sprint */
    tasks: TechnicalTask[];

    /** Generated code */
    generatedCode: CodeGenerationResult[];

    /** Start time */
    startedAt?: number;

    /** End time */
    completedAt?: number;
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

/**
 * Status of a project.
 */
export type ProjectStatus =
    | 'analyzing'     // Meta-agent analyzing
    | 'planning'      // Creating backlog
    | 'developing'    // Active sprints
    | 'completed'     // All done
    | 'failed';       // Project failed

/**
 * A project being built.
 */
export interface Project {
    /** Project ID */
    id: string;

    /** Project name */
    name: string;

    /** Original user request */
    request: string;

    /** Project analysis from meta-agent */
    analysis?: ProjectAnalysis;

    /** Status */
    status: ProjectStatus;

    /** All epics */
    epics: Epic[];

    /** All stories */
    stories: UserStory[];

    /** All sprints */
    sprints: Sprint[];

    /** Current sprint index */
    currentSprintIndex: number;

    /** Project root path */
    rootPath?: string;

    /** Created at */
    createdAt: number;

    /** Updated at */
    updatedAt: number;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Types of orchestrator events.
 */
export type OrchestratorEventType =
    | 'project:created'
    | 'project:analyzing'
    | 'project:analyzed'
    | 'sprint:started'
    | 'sprint:completed'
    | 'sprint:failed'
    | 'story:started'
    | 'story:completed'
    | 'task:started'
    | 'task:completed'
    | 'task:failed'
    | 'code:generated'
    | 'code:validated'
    | 'code:written'
    | 'tests:passed'
    | 'tests:failed'
    | 'agent:thinking'
    | 'agent:working'
    | 'agent:done'
    | 'error';

/**
 * An orchestrator event.
 */
export interface OrchestratorEvent {
    /** Event type */
    type: OrchestratorEventType;

    /** Timestamp */
    timestamp: number;

    /** Project ID */
    projectId: string;

    /** Sprint ID (if applicable) */
    sprintId?: string;

    /** Task ID (if applicable) */
    taskId?: string;

    /** Agent ID (if applicable) */
    agentId?: AgentId;

    /** Message */
    message: string;

    /** Additional data */
    data?: Record<string, unknown>;
}

/**
 * Event listener type.
 */
export type OrchestratorEventListener = (event: OrchestratorEvent) => void;

// ============================================================================
// AGENT TEAM
// ============================================================================

/**
 * Configuration for the agent team.
 */
export interface AgentTeamConfig {
    /** Roles to include in the team */
    roles: AgentRole[];

    /** LLM provider */
    provider?: 'gemini' | 'openai';
}

// ============================================================================
// ORCHESTRATOR CONFIG
// ============================================================================

/**
 * Configuration for the orchestrator.
 */
export interface OrchestratorConfig {
    /** Project root path */
    projectRoot?: string;

    /** LLM provider */
    provider?: 'gemini' | 'openai';

    /** Maximum stories per sprint */
    maxStoriesPerSprint?: number;

    /** Whether to write generated code to disk */
    writeCode?: boolean;

    /** Whether to run tests after code generation */
    runTests?: boolean;

    /** Maximum retry attempts for code generation */
    maxRetries?: number;
}
