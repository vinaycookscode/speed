/**
 * @fileoverview Agent Type Definitions
 * @module lib/agents/types
 *
 * Core type definitions for the multi-agent system.
 * Defines the Agent interface, brain configuration, and related types.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

import type { ToolDefinition, ToolCall, ToolResult, Message } from '../llm/types';

// ============================================================================
// AGENT IDENTITY
// ============================================================================

/**
 * Unique identifier for an agent.
 */
export type AgentId = string;

/**
 * Possible roles an agent can have.
 */
export type AgentRole =
    | 'meta'           // Project analyzer
    | 'research'       // Knowledge gatherer
    | 'pm'             // Product manager
    | 'architect'      // System architect
    | 'tech-lead'      // Technical lead
    | 'fullstack'      // Full stack engineer
    | 'frontend'       // Frontend engineer
    | 'backend'        // Backend engineer
    | 'qa'             // QA engineer
    | 'devops'         // DevOps engineer
    | 'systems'        // Systems programmer
    | 'compiler'       // Compiler engineer
    | 'cloud'          // Cloud architect
    | 'security';      // Security engineer

/**
 * Current status of an agent.
 */
export type AgentStatus =
    | 'idle'           // Waiting for work
    | 'thinking'       // Processing with LLM
    | 'working'        // Executing tools
    | 'waiting'        // Waiting for other agent
    | 'blocked'        // Cannot proceed
    | 'done';          // Completed current task

// ============================================================================
// AGENT BRAIN CONFIGURATION
// ============================================================================

/**
 * Configuration for an agent's "brain" (LLM integration).
 */
export interface AgentBrain {
    /**
     * The LLM provider to use.
     * @default 'gemini'
     */
    provider: 'gemini' | 'openai';

    /**
     * The specific model to use.
     * @default 'gemini-2.0-flash-exp'
     */
    model: string;

    /**
     * Temperature for generation (0.0 - 1.0).
     * Lower = more deterministic, higher = more creative.
     */
    temperature: number;

    /**
     * Maximum tokens for responses.
     */
    maxTokens: number;

    /**
     * The system prompt that defines the agent's behavior.
     */
    systemPrompt: string;
}

// ============================================================================
// AGENT MEMORY
// ============================================================================

/**
 * Agent's memory for maintaining context.
 */
export interface AgentMemory {
    /** Short-term memory: current conversation */
    shortTerm: Message[];

    /** Working memory: current task context */
    workingContext: Record<string, unknown>;

    /** Long-term memory: persisted learnings (future feature) */
    longTerm?: unknown[];
}

// ============================================================================
// AGENT INTERFACE
// ============================================================================

/**
 * Configuration for creating an agent.
 */
export interface AgentConfig {
    /** Unique identifier */
    id?: AgentId;

    /** Display name */
    name: string;

    /** Agent's role */
    role: AgentRole;

    /** Areas of expertise */
    expertise: string[];

    /** Brain configuration */
    brain: AgentBrain;

    /** Available tools */
    tools: ToolDefinition[];

    /** Whether this agent can delegate to others */
    canDelegate?: boolean;

    /** Whether this agent can ask the user questions */
    canAskUser?: boolean;
}

/**
 * Read-only snapshot of agent state.
 */
export interface AgentState {
    /** Agent ID */
    readonly id: AgentId;

    /** Agent name */
    readonly name: string;

    /** Agent role */
    readonly role: AgentRole;

    /** Current status */
    readonly status: AgentStatus;

    /** Current task ID (if any) */
    readonly currentTaskId?: string;

    /** Activity log */
    readonly logs: AgentLog[];
}

/**
 * An entry in the agent's activity log.
 */
export interface AgentLog {
    /** Timestamp of the log entry */
    timestamp: number;

    /** Type of log entry */
    type: 'thought' | 'action' | 'tool' | 'message' | 'error';

    /** Log content */
    content: string;

    /** Additional metadata */
    metadata?: Record<string, unknown>;
}

// ============================================================================
// AGENT COMMUNICATION
// ============================================================================

/**
 * A message sent between agents.
 */
export interface AgentMessage {
    /** Unique message ID */
    id: string;

    /** Sender agent ID */
    from: AgentId;

    /** Recipient agent ID (or 'broadcast') */
    to: AgentId | 'broadcast';

    /** Message type */
    type: AgentMessageType;

    /** Message content */
    content: string;

    /** Structured payload */
    payload?: Record<string, unknown>;

    /** Thread ID for grouping related messages */
    threadId?: string;

    /** Timestamp */
    timestamp: number;
}

/**
 * Types of messages agents can send.
 */
export type AgentMessageType =
    | 'request'        // Asking another agent to do something
    | 'response'       // Reply to a request
    | 'handoff'        // Passing work to another agent
    | 'status'         // Status update
    | 'question'       // Asking for information
    | 'answer'         // Response to a question
    | 'error';         // Error notification

// ============================================================================
// AGENT INPUT/OUTPUT
// ============================================================================

/**
 * Input to an agent's think() method.
 */
export interface AgentInput {
    /** The task or query for the agent */
    task: string;

    /** Additional context */
    context?: Record<string, unknown>;

    /** Messages from other agents */
    messages?: AgentMessage[];
}

/**
 * Output from an agent's think() method.
 */
export interface AgentOutput {
    /** The agent's response/result */
    result: string;

    /** Tool calls the agent wants to make */
    toolCalls?: ToolCall[];

    /** Messages to send to other agents */
    messages?: Omit<AgentMessage, 'id' | 'from' | 'timestamp'>[];

    /** Whether the agent is done with the current task */
    done: boolean;

    /** Next steps or pending actions */
    nextSteps?: string[];
}

// ============================================================================
// AGENT FACTORY
// ============================================================================

/**
 * Factory function type for creating agents.
 */
export type AgentFactory = (config: AgentConfig) => IAgent;

/**
 * Interface that all agents must implement.
 */
export interface IAgent {
    /** Agent's unique ID */
    readonly id: AgentId;

    /** Agent's name */
    readonly name: string;

    /** Agent's role */
    readonly role: AgentRole;

    /** Current state */
    readonly state: AgentState;

    /**
     * Process input and generate output.
     *
     * @param input - The input to process
     * @returns The agent's output
     */
    think(input: AgentInput): Promise<AgentOutput>;

    /**
     * Execute a tool call.
     *
     * @param toolCall - The tool call to execute
     * @returns The result of the tool execution
     */
    useTool(toolCall: ToolCall): Promise<ToolResult>;

    /**
     * Send a message to another agent.
     *
     * @param message - The message to send
     */
    sendMessage(message: Omit<AgentMessage, 'id' | 'from' | 'timestamp'>): void;

    /**
     * Receive a message from another agent.
     *
     * @param message - The received message
     */
    receiveMessage(message: AgentMessage): void;

    /**
     * Reset the agent's state.
     */
    reset(): void;
}
