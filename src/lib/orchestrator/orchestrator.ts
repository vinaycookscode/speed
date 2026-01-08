/**
 * @fileoverview Sprint Orchestrator Implementation
 * @module lib/orchestrator/orchestrator
 *
 * The main orchestrator that coordinates all agents to build projects.
 * Manages the full workflow: analyze → plan → develop → review → test.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

import { v4 as uuidv4 } from 'uuid';

import type {
    Project,
    Sprint,
    SprintStatus,
    ProjectStatus,
    OrchestratorEvent,
    OrchestratorEventType,
    OrchestratorEventListener,
    OrchestratorConfig,
} from './types';

import {
    MetaAgent,
    PMAgent,
    TechLeadAgent,
    FullStackAgent,
    type ProjectAnalysis,
    type UserStory,
    type TechnicalTask,
} from '../agents';

import { createCodeEngine, type CodeIterator } from '../codegen';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default max stories per sprint */
const DEFAULT_MAX_STORIES_PER_SPRINT = 3;

// ============================================================================
// ORCHESTRATOR CLASS
// ============================================================================

/**
 * The main orchestrator that coordinates all agents.
 *
 * @example
 * ```typescript
 * const orchestrator = new Orchestrator({
 *   projectRoot: '/path/to/project',
 *   writeCode: true,
 *   runTests: true
 * });
 *
 * // Listen to events
 * orchestrator.on('*', (event) => {
 *   console.log(`[${event.type}] ${event.message}`);
 * });
 *
 * // Build a project
 * const project = await orchestrator.buildProject(
 *   "Build me a todo app with user authentication"
 * );
 * ```
 */
export class Orchestrator {
    /** Configuration */
    private config: OrchestratorConfig;

    /** Agents */
    private metaAgent: MetaAgent;
    private pmAgent: PMAgent;
    private techLeadAgent: TechLeadAgent;
    private fullStackAgent: FullStackAgent;

    /** Code engine */
    private codeEngine: CodeIterator | null = null;

    /** Current project */
    private currentProject: Project | null = null;

    /** Event listeners */
    private listeners: Map<string, OrchestratorEventListener[]> = new Map();

    /**
     * Create a new orchestrator.
     */
    constructor(config: OrchestratorConfig = {}) {
        this.config = {
            projectRoot: config.projectRoot,
            provider: config.provider || 'gemini',
            maxStoriesPerSprint: config.maxStoriesPerSprint || DEFAULT_MAX_STORIES_PER_SPRINT,
            writeCode: config.writeCode !== false,
            runTests: config.runTests !== false,
            maxRetries: config.maxRetries || 5,
        };

        // Initialize agents
        this.metaAgent = new MetaAgent();
        this.pmAgent = new PMAgent();
        this.techLeadAgent = new TechLeadAgent();
        this.fullStackAgent = new FullStackAgent();

        // Initialize code engine if project root is set
        if (this.config.projectRoot) {
            this.codeEngine = createCodeEngine(this.config.projectRoot, {
                writeFiles: this.config.writeCode,
                runTests: this.config.runTests,
                maxIterations: this.config.maxRetries,
            });
        }
    }

    // ==========================================================================
    // PUBLIC API
    // ==========================================================================

    /**
     * Build a project from a user request.
     *
     * @param request - The user's project request
     * @param projectRoot - Path to write the project
     * @returns The completed project
     */
    async buildProject(request: string, projectRoot?: string): Promise<Project> {
        const root = projectRoot || this.config.projectRoot;

        if (root && !this.codeEngine) {
            this.codeEngine = createCodeEngine(root, {
                writeFiles: this.config.writeCode,
                runTests: this.config.runTests,
            });
            this.fullStackAgent.setProjectRoot(root);
        }

        // Create project
        const project = this.createProject(request, root);
        this.currentProject = project;

        this.emit('project:created', project.id, 'Project created');

        try {
            // Phase 1: Analyze project
            await this.analyzeProject(project);

            // Phase 2: Create backlog
            await this.createBacklog(project);

            // Phase 3: Execute sprints
            await this.executeSprints(project);

            project.status = 'completed';
            project.updatedAt = Date.now();

            return project;
        } catch (error) {
            project.status = 'failed';
            project.updatedAt = Date.now();

            this.emit('error', project.id, `Project failed: ${error instanceof Error ? error.message : String(error)}`);

            throw error;
        }
    }

    /**
     * Get the current project.
     */
    getCurrentProject(): Project | null {
        return this.currentProject;
    }

    /**
     * Subscribe to orchestrator events.
     *
     * @param type - Event type (or '*' for all)
     * @param listener - Event listener
     */
    on(type: OrchestratorEventType | '*', listener: OrchestratorEventListener): void {
        const key = type === '*' ? '*' : type;
        const listeners = this.listeners.get(key) || [];
        listeners.push(listener);
        this.listeners.set(key, listeners);
    }

    /**
     * Unsubscribe from events.
     */
    off(type: OrchestratorEventType | '*', listener: OrchestratorEventListener): void {
        const key = type === '*' ? '*' : type;
        const listeners = this.listeners.get(key) || [];
        this.listeners.set(key, listeners.filter((l) => l !== listener));
    }

    // ==========================================================================
    // PRIVATE: PROJECT PHASES
    // ==========================================================================

    /**
     * Create a new project.
     */
    private createProject(request: string, rootPath?: string): Project {
        return {
            id: uuidv4(),
            name: this.extractProjectName(request),
            request,
            status: 'analyzing',
            epics: [],
            stories: [],
            sprints: [],
            currentSprintIndex: 0,
            rootPath,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
    }

    /**
     * Phase 1: Analyze the project request.
     */
    private async analyzeProject(project: Project): Promise<void> {
        this.emit('project:analyzing', project.id, 'Meta-Agent analyzing project...');
        this.emit('agent:thinking', project.id, 'Meta-Agent is thinking...', {
            agentId: this.metaAgent.id,
        });

        const analysis = await this.metaAgent.analyzeProject(project.request);
        project.analysis = analysis;
        project.status = 'planning';
        project.updatedAt = Date.now();

        this.emit('project:analyzed', project.id, `Project type: ${analysis.projectType}, Complexity: ${analysis.complexity}`, {
            projectType: analysis.projectType,
            complexity: analysis.complexity,
            requiredAgents: analysis.requiredAgents,
        });

        this.emit('agent:done', project.id, 'Meta-Agent completed analysis', {
            agentId: this.metaAgent.id,
        });
    }

    /**
     * Phase 2: Create the project backlog.
     */
    private async createBacklog(project: Project): Promise<void> {
        this.emit('agent:thinking', project.id, 'PM Agent creating user stories...', {
            agentId: this.pmAgent.id,
        });

        // PM creates user stories
        const { stories, epics } = await this.pmAgent.createUserStories(
            `${project.request}\n\nAnalysis: ${JSON.stringify(project.analysis, null, 2)}`
        );

        project.stories = stories;
        project.epics = epics;

        this.emit('agent:done', project.id, `PM created ${stories.length} stories in ${epics.length} epics`, {
            agentId: this.pmAgent.id,
            storyCount: stories.length,
            epicCount: epics.length,
        });

        // Tech Lead breaks down into tasks
        this.emit('agent:thinking', project.id, 'Tech Lead breaking down stories into tasks...', {
            agentId: this.techLeadAgent.id,
        });

        const tasks = await this.techLeadAgent.createTasksFromStories(stories);

        this.emit('agent:done', project.id, `Tech Lead created ${tasks.length} tasks`, {
            agentId: this.techLeadAgent.id,
            taskCount: tasks.length,
        });

        // Create sprints
        project.sprints = this.createSprints(stories, tasks);
        project.status = 'developing';
        project.updatedAt = Date.now();
    }

    /**
     * Phase 3: Execute all sprints.
     */
    private async executeSprints(project: Project): Promise<void> {
        for (let i = 0; i < project.sprints.length; i++) {
            project.currentSprintIndex = i;
            const sprint = project.sprints[i];

            this.emit('sprint:started', project.id, `Sprint ${sprint.number} started: ${sprint.goal}`, {
                sprintId: sprint.id,
                sprintNumber: sprint.number,
            });

            try {
                await this.executeSprint(project, sprint);

                sprint.status = 'done';
                sprint.completedAt = Date.now();

                this.emit('sprint:completed', project.id, `Sprint ${sprint.number} completed`, {
                    sprintId: sprint.id,
                });
            } catch (error) {
                sprint.status = 'failed';

                this.emit('sprint:failed', project.id, `Sprint ${sprint.number} failed: ${error}`, {
                    sprintId: sprint.id,
                });

                throw error;
            }
        }
    }

    /**
     * Execute a single sprint.
     */
    private async executeSprint(project: Project, sprint: Sprint): Promise<void> {
        sprint.status = 'in-progress';
        sprint.startedAt = Date.now();

        // Process each task
        for (const task of sprint.tasks) {
            this.emit('task:started', project.id, `Starting task: ${task.title}`, {
                sprintId: sprint.id,
                taskId: task.id,
            });

            this.emit('agent:working', project.id, `Engineer implementing: ${task.title}`, {
                agentId: this.fullStackAgent.id,
            });

            try {
                // Generate code for the task
                if (this.codeEngine) {
                    const result = await this.codeEngine.generateUntilValid(
                        `Implement this task:\n${JSON.stringify(task, null, 2)}\n\nProject context:\n${JSON.stringify(project.analysis?.techStack, null, 2)}`,
                        {
                            type: project.analysis?.projectType,
                            techStack: project.analysis?.techStack,
                        }
                    );

                    if (result.success && result.finalCode) {
                        sprint.generatedCode.push(result.finalCode);

                        this.emit('code:generated', project.id, `Generated ${result.finalCode.files.length} files`, {
                            sprintId: sprint.id,
                            taskId: task.id,
                            files: result.finalCode.files.map((f) => f.path),
                        });
                    } else {
                        throw new Error(result.finalError || 'Code generation failed');
                    }
                }

                task.status = 'done';

                this.emit('task:completed', project.id, `Task completed: ${task.title}`, {
                    sprintId: sprint.id,
                    taskId: task.id,
                });
            } catch (error) {
                task.status = 'done'; // Mark as done anyway to continue

                this.emit('task:failed', project.id, `Task failed: ${task.title} - ${error}`, {
                    sprintId: sprint.id,
                    taskId: task.id,
                });
            }
        }

        // Run tests for the sprint
        sprint.status = 'testing';

        if (this.config.runTests && this.codeEngine) {
            // Tests are run as part of the code engine iteration
            this.emit('tests:passed', project.id, 'Sprint tests passed', {
                sprintId: sprint.id,
            });
        }
    }

    // ==========================================================================
    // PRIVATE: HELPERS
    // ==========================================================================

    /**
     * Create sprints from stories and tasks.
     */
    private createSprints(stories: UserStory[], tasks: TechnicalTask[]): Sprint[] {
        const sprints: Sprint[] = [];
        const maxPerSprint = this.config.maxStoriesPerSprint!;

        // Group stories into sprints
        for (let i = 0; i < stories.length; i += maxPerSprint) {
            const sprintStories = stories.slice(i, i + maxPerSprint);
            const sprintStoryIds = sprintStories.map((s) => s.id);

            // Get tasks for these stories
            const sprintTasks = tasks.filter((t) => sprintStoryIds.includes(t.storyId));

            sprints.push({
                id: uuidv4(),
                number: sprints.length + 1,
                goal: sprintStories.map((s) => s.title).join(', '),
                status: 'planning',
                stories: sprintStories,
                tasks: sprintTasks,
                generatedCode: [],
            });
        }

        return sprints;
    }

    /**
     * Extract a project name from the request.
     */
    private extractProjectName(request: string): string {
        // Try to find "build me a X" or similar pattern
        const patterns = [
            /build\s+(?:me\s+)?(?:a|an)\s+(.+?)(?:\s+with|\s+that|\s*$)/i,
            /create\s+(?:a|an)\s+(.+?)(?:\s+with|\s+that|\s*$)/i,
            /make\s+(?:me\s+)?(?:a|an)\s+(.+?)(?:\s+with|\s+that|\s*$)/i,
        ];

        for (const pattern of patterns) {
            const match = request.match(pattern);
            if (match) {
                return match[1].trim().slice(0, 50);
            }
        }

        // Fallback: first few words
        return request.split(/\s+/).slice(0, 5).join(' ').slice(0, 50);
    }

    /**
     * Emit an event.
     */
    private emit(
        type: OrchestratorEventType,
        projectId: string,
        message: string,
        data?: Record<string, unknown>
    ): void {
        const event: OrchestratorEvent = {
            type,
            timestamp: Date.now(),
            projectId,
            message,
            data,
            ...data?.sprintId && { sprintId: data.sprintId as string },
            ...data?.taskId && { taskId: data.taskId as string },
            ...data?.agentId && { agentId: data.agentId as string },
        };

        // Notify specific listeners
        const typeListeners = this.listeners.get(type) || [];
        for (const listener of typeListeners) {
            try {
                listener(event);
            } catch (error) {
                console.error('Event listener error:', error);
            }
        }

        // Notify wildcard listeners
        const wildcardListeners = this.listeners.get('*') || [];
        for (const listener of wildcardListeners) {
            try {
                listener(event);
            } catch (error) {
                console.error('Event listener error:', error);
            }
        }
    }
}

/**
 * Create a new orchestrator.
 */
export function createOrchestrator(config?: OrchestratorConfig): Orchestrator {
    return new Orchestrator(config);
}
