/**
 * @fileoverview Base Agent Implementation
 * @module lib/agents/base
 *
 * The base class for all agents in the multi-agent system.
 * Provides core functionality for LLM interaction, tool usage,
 * and inter-agent communication.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

import { v4 as uuidv4 } from 'uuid';

import type {
    AgentId,
    AgentRole,
    AgentStatus,
    AgentBrain,
    AgentMemory,
    AgentConfig,
    AgentState,
    AgentLog,
    AgentMessage,
    AgentInput,
    AgentOutput,
    IAgent,
} from './types';

import type {
    ILLMClient,
    ToolDefinition,
    ToolCall,
    ToolResult,
    Message,
} from '../llm/types';

import { createLLMClient } from '../llm';
import { getApiKey } from '../config/env';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum messages to keep in short-term memory */
const MAX_SHORT_TERM_MEMORY = 20;

/** Maximum log entries to keep */
const MAX_LOG_ENTRIES = 100;

// ============================================================================
// BASE AGENT CLASS
// ============================================================================

/**
 * Base class for all agents in the system.
 * Extend this class to create specialized agents (PM, Engineer, etc.).
 *
 * @example
 * ```typescript
 * class PMAgent extends BaseAgent {
 *   constructor() {
 *     super({
 *       name: 'Maya',
 *       role: 'pm',
 *       expertise: ['requirements', 'user-stories'],
 *       brain: {
 *         provider: 'gemini',
 *         model: 'gemini-2.0-flash-exp',
 *         temperature: 0.7,
 *         maxTokens: 4096,
 *         systemPrompt: 'You are Maya, a PM...'
 *       },
 *       tools: [createUserStoryTool, askUserTool]
 *     });
 *   }
 * }
 * ```
 */
export abstract class BaseAgent implements IAgent {
    // ==========================================================================
    // PUBLIC PROPERTIES
    // ==========================================================================

    /** Unique agent identifier */
    public readonly id: AgentId;

    /** Agent display name */
    public readonly name: string;

    /** Agent role */
    public readonly role: AgentRole;

    /** Areas of expertise */
    public readonly expertise: string[];

    // ==========================================================================
    // PROTECTED PROPERTIES
    // ==========================================================================

    /** The LLM client */
    protected readonly llmClient: ILLMClient;

    /** Brain configuration */
    protected readonly brain: AgentBrain;

    /** Available tools */
    protected readonly tools: ToolDefinition[];

    /** Agent memory */
    protected memory: AgentMemory;

    /** Current status */
    protected status: AgentStatus;

    /** Current task ID */
    protected currentTaskId?: string;

    /** Activity logs */
    protected logs: AgentLog[];

    /** Message inbox */
    protected inbox: AgentMessage[];

    /** Received message handlers */
    protected messageHandlers: ((message: AgentMessage) => void)[];

    // ==========================================================================
    // CONSTRUCTOR
    // ==========================================================================

    /**
     * Create a new agent.
     *
     * @param config - Agent configuration
     */
    constructor(config: AgentConfig) {
        // Set identity
        this.id = config.id ?? uuidv4();
        this.name = config.name;
        this.role = config.role;
        this.expertise = config.expertise;

        // Set brain config
        this.brain = config.brain;

        // Set tools
        this.tools = config.tools;

        // Initialize LLM client
        this.llmClient = createLLMClient({
            provider: config.brain.provider,
            apiKey: getApiKey(config.brain.provider),
            model: config.brain.model,
        });

        // Initialize memory
        this.memory = {
            shortTerm: [],
            workingContext: {},
        };

        // Initialize state
        this.status = 'idle';
        this.logs = [];
        this.inbox = [];
        this.messageHandlers = [];
    }

    // ==========================================================================
    // PUBLIC GETTERS
    // ==========================================================================

    /**
     * Get the current state of the agent.
     */
    get state(): AgentState {
        return {
            id: this.id,
            name: this.name,
            role: this.role,
            status: this.status,
            currentTaskId: this.currentTaskId,
            logs: [...this.logs],
        };
    }

    // ==========================================================================
    // PUBLIC METHODS
    // ==========================================================================

    /**
     * Process input and generate output using the LLM.
     *
     * @param input - The input to process
     * @returns The agent's output
     */
    async think(input: AgentInput): Promise<AgentOutput> {
        this.setStatus('thinking');
        this.addLog('thought', `Processing: ${input.task.slice(0, 100)}...`);

        try {
            // Build the conversation
            const messages = this.buildConversation(input);

            // Check if we have tools
            if (this.tools.length > 0) {
                // Generate with tool support
                const response = await this.llmClient.generateWithTools(
                    {
                        systemPrompt: this.brain.systemPrompt,
                        userMessage: this.formatUserMessage(input),
                        history: messages,
                        options: {
                            temperature: this.brain.temperature,
                            maxTokens: this.brain.maxTokens,
                        },
                    },
                    this.tools
                );

                // Store in memory
                this.addToMemory('user', this.formatUserMessage(input));
                this.addToMemory('assistant', response.content);

                // Log tool calls if any
                if (response.toolCalls.length > 0) {
                    this.addLog(
                        'tool',
                        `Tool calls: ${response.toolCalls.map((t) => t.name).join(', ')}`
                    );
                }

                this.setStatus('idle');

                return {
                    result: response.content,
                    toolCalls: response.toolCalls,
                    done: response.finishReason === 'stop' && response.toolCalls.length === 0,
                };
            } else {
                // Generate without tools
                const response = await this.llmClient.generate({
                    systemPrompt: this.brain.systemPrompt,
                    userMessage: this.formatUserMessage(input),
                    history: messages,
                    options: {
                        temperature: this.brain.temperature,
                        maxTokens: this.brain.maxTokens,
                    },
                });

                // Store in memory
                this.addToMemory('user', this.formatUserMessage(input));
                this.addToMemory('assistant', response.content);

                this.setStatus('idle');

                return {
                    result: response.content,
                    done: response.finishReason === 'stop',
                };
            }
        } catch (error) {
            this.setStatus('blocked');
            this.addLog('error', `Error: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Execute a tool call.
     * This method should be overridden or tools should be registered with executors.
     *
     * @param toolCall - The tool call to execute
     * @returns The result of the tool execution
     */
    async useTool(toolCall: ToolCall): Promise<ToolResult> {
        this.setStatus('working');
        this.addLog('tool', `Executing tool: ${toolCall.name}`);

        // This is a placeholder - actual tool execution should be implemented
        // by subclasses or through a tool registry with executors
        return {
            toolCallId: toolCall.id,
            content: 'Tool execution not implemented',
            success: false,
            error: 'Tool executor not configured',
        };
    }

    /**
     * Send a message to another agent.
     *
     * @param message - The message to send (without id, from, timestamp)
     */
    sendMessage(message: Omit<AgentMessage, 'id' | 'from' | 'timestamp'>): void {
        const fullMessage: AgentMessage = {
            ...message,
            id: uuidv4(),
            from: this.id,
            timestamp: Date.now(),
        };

        this.addLog('message', `Sent ${message.type} to ${message.to}: ${message.content.slice(0, 50)}...`);

        // Emit to message bus (to be implemented with orchestrator)
        this.emitMessage(fullMessage);
    }

    /**
     * Receive a message from another agent.
     *
     * @param message - The received message
     */
    receiveMessage(message: AgentMessage): void {
        this.inbox.push(message);
        this.addLog('message', `Received ${message.type} from ${message.from}: ${message.content.slice(0, 50)}...`);

        // Notify handlers
        for (const handler of this.messageHandlers) {
            try {
                handler(message);
            } catch (error) {
                this.addLog('error', `Message handler error: ${error}`);
            }
        }
    }

    /**
     * Reset the agent's state.
     */
    reset(): void {
        this.memory = {
            shortTerm: [],
            workingContext: {},
        };
        this.status = 'idle';
        this.currentTaskId = undefined;
        this.logs = [];
        this.inbox = [];

        this.addLog('action', 'Agent reset');
    }

    /**
     * Register a message handler.
     *
     * @param handler - The handler function
     */
    onMessage(handler: (message: AgentMessage) => void): void {
        this.messageHandlers.push(handler);
    }

    // ==========================================================================
    // PROTECTED METHODS
    // ==========================================================================

    /**
     * Set the agent's status.
     */
    protected setStatus(status: AgentStatus): void {
        this.status = status;
    }

    /**
     * Add a log entry.
     */
    protected addLog(type: AgentLog['type'], content: string, metadata?: Record<string, unknown>): void {
        const log: AgentLog = {
            timestamp: Date.now(),
            type,
            content,
            metadata,
        };

        this.logs.push(log);

        // Trim if too many logs
        if (this.logs.length > MAX_LOG_ENTRIES) {
            this.logs = this.logs.slice(-MAX_LOG_ENTRIES);
        }
    }

    /**
     * Add a message to short-term memory.
     */
    protected addToMemory(role: Message['role'], content: string): void {
        this.memory.shortTerm.push({ role, content });

        // Trim if too many messages
        if (this.memory.shortTerm.length > MAX_SHORT_TERM_MEMORY) {
            this.memory.shortTerm = this.memory.shortTerm.slice(-MAX_SHORT_TERM_MEMORY);
        }
    }

    /**
     * Build the conversation history for LLM context.
     */
    protected buildConversation(input: AgentInput): Message[] {
        const messages: Message[] = [...this.memory.shortTerm];

        // Add context from other agents' messages if provided
        if (input.messages && input.messages.length > 0) {
            for (const agentMessage of input.messages) {
                messages.push({
                    role: 'user',
                    content: `[From ${agentMessage.from}]: ${agentMessage.content}`,
                    name: agentMessage.from,
                });
            }
        }

        return messages;
    }

    /**
     * Format the user message with any additional context.
     */
    protected formatUserMessage(input: AgentInput): string {
        let message = input.task;

        // Add context if provided
        if (input.context && Object.keys(input.context).length > 0) {
            message += '\n\nContext:\n' + JSON.stringify(input.context, null, 2);
        }

        return message;
    }

    /**
     * Emit a message to the message bus.
     * This should be connected to the orchestrator.
     */
    protected emitMessage(message: AgentMessage): void {
        // Placeholder - will be connected to message queue
        console.log(`[${this.name}] Emitting message:`, message);
    }
}
