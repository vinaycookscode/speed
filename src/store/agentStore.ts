import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { ProductManagerAgent } from '../agents/ProductManager';
import { getSkill } from '../agents/skills';

export type Role = 'Product Manager' | 'Architect' | 'Tech Lead' | 'Software Engineer' | 'Backend Engineer' | 'QA Engineer' | 'DevOps Engineer';
export type AgentStatus = 'idle' | 'working' | 'blocked' | 'reviewing' | 'error';
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'testing' | 'done';
export type ProjectPhase = 'planning' | 'approval' | 'architecture' | 'development' | 'completed';

export interface Toast {
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
}

export interface LogEntry {
    timestamp: number;
    text: string;
    type: 'info' | 'error' | 'success';
}

export interface DeploymentState {
    status: 'idle' | 'installing' | 'starting' | 'running' | 'failed';
    logs: LogEntry[];
    analysis: string | null;
    isVisible: boolean;
}

export interface Epic {
    id: string;
    title: string;
    description: string;
}

export interface Story {
    id: string;
    epicId: string;
    title: string;
}

export interface Agent {
    id: string;
    name: string;
    role: Role;
    status: AgentStatus;
    currentTaskId?: string;
    capability: number; // 1-10 speed multiplier
    logs: string[];
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    assignedTo?: string;
    progress: number; // 0-100
    complexity: number; // 1-10 difficulty
    dependencies: string[];
    selected?: boolean;
    category?: string; // e.g., "Phase 1: MVP", "Phase 2: Advanced"
    output?: string; // The result of the task (e.g., "Tech Stack: React, Node.js")
    currentActivity?: string; // One-liner showing what the agent is currently working on
    outputHistory: { author: string; content: string; timestamp: number }[];
    comments: { author: string; text: string; timestamp: number }[];
    history: { status: TaskStatus; timestamp: number; by: string }[];
    originalAssigneeId?: string;
    epicId?: string;
    storyId?: string;
    assignableTo?: Role[];
    type?: 'setup' | 'frontend' | 'backend' | 'architecture' | 'database' | 'api' | 'test' | 'devops';
}

export interface Project {
    id: string;
    name: string;
    phase: ProjectPhase;
    agents: Agent[];
    tasks: Task[];
    epics: Epic[];
    stories: Story[];
    lastActive: number;
    rootPath?: string;
}

interface AgentStore {
    // Active Project State
    activeProjectId: string | null;
    projectIdea: string;
    rootPath: string | null;
    phase: ProjectPhase;
    agents: Agent[];
    tasks: Task[];
    epics: Epic[];
    stories: Story[];
    toasts: Toast[];
    showCelebration: boolean;

    // All Projects
    projects: Project[];

    // Actions
    createProject: (idea: string) => void;
    switchProject: (projectId: string) => void;

    setProjectIdea: (idea: string) => void;
    setProjectRoot: (path: string) => void;
    addAgent: (agent: Agent) => void;
    removeAgent: (id: string) => void;
    addTask: (task: Task) => void;
    updateTaskStatus: (taskId: string, status: TaskStatus) => void;
    assignTask: (taskId: string, agentId: string) => void;
    addComment: (taskId: string, text: string, author: string) => void;
    toggleTaskSelection: (taskId: string) => void;
    toggleCategorySelection: (category: string, selected: boolean) => void;
    toggleEpicSelection: (epicId: string) => void;
    selectAllTasks: () => void;
    deselectAllTasks: () => void;
    startPlanning: () => void;
    approvePlan: () => void;
    setPlanningData: (epics: Epic[], stories: Story[], tasks: Task[]) => void;

    // PM streaming progress
    pmProgress: { charsReceived: number; estimatedTotal: number; streamedText: string } | null;
    setPmProgress: (charsReceived: number, chunk: string) => void;
    clearPmProgress: () => void;

    // PM epic-level status (parallel phase 2)
    planningEpics: {
        id: string;
        title: string;
        description: string;
        status: 'pending' | 'working' | 'done' | 'error';
        taskCount?: number;
    }[];
    upsertPlanningEpic: (id: string, title: string, description: string, status: 'pending' | 'working' | 'done' | 'error', taskCount?: number) => void;
    clearPlanningEpics: () => void;

    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    removeToast: (id: string) => void;

    // Deployment Actions
    deployment: DeploymentState;
    setDeploymentStatus: (status: DeploymentState['status']) => void;
    addDeploymentLog: (text: string, type: 'info' | 'error' | 'success') => void;
    setDeploymentAnalysis: (analysis: string | null) => void;
    toggleDeploymentConsole: (visible: boolean) => void;

    // Celebration
    setShowCelebration: (show: boolean) => void;

    // Skills execution
    skillRunning: Set<string>;
    completeTaskExecution: (taskId: string, agentName: string, files: { path: string; content: string }[], summary: string) => void;

    tick: () => void;
    reset: () => void;
    clearProjects: () => void;
}

export const useAgentStore = create<AgentStore>()(
    persist(
        (set, get) => ({
            activeProjectId: null,
            projectIdea: '',
            rootPath: null,
            phase: 'planning',
            agents: [],
            tasks: [],
            epics: [],
            stories: [],
            toasts: [],
            showCelebration: false,
            projects: [],
            pmProgress: null,
            planningEpics: [],

            deployment: {
                status: 'idle',
                logs: [],
                analysis: null,
                isVisible: false
            },

            setDeploymentStatus: (status) => set(state => ({ deployment: { ...state.deployment, status } })),
            addDeploymentLog: (text, type) => set(state => ({
                deployment: {
                    ...state.deployment,
                    logs: [...state.deployment.logs, { timestamp: Date.now(), text, type }]
                }
            })),
            setDeploymentAnalysis: (analysis) => set(state => ({ deployment: { ...state.deployment, analysis } })),
            toggleDeploymentConsole: (visible) => set(state => ({ deployment: { ...state.deployment, isVisible: visible } })),

            setShowCelebration: (show) => set({ showCelebration: show }),

            skillRunning: new Set(),

            completeTaskExecution: (taskId, agentName, files, summary) => set(state => {
                const tasks = state.tasks.map(t => {
                    if (t.id !== taskId) return t;
                    const filesSummary = files.map(f => `\`${f.path}\`\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n');
                    return {
                        ...t,
                        progress: 100,
                        output: summary,
                        outputHistory: [...t.outputHistory, {
                            author: agentName,
                            content: `${summary}\n\n${filesSummary}`,
                            timestamp: Date.now(),
                        }],
                    };
                });
                state.skillRunning.delete(taskId);

                // Write files to disk if rootPath is set and we're in Electron
                if (state.rootPath && files.length > 0 && typeof window !== 'undefined' && (window as any).ipcRenderer) {
                    (window as any).ipcRenderer.invoke('fs:writeFiles', state.rootPath, files).then((result: any) => {
                        if (result.success) {
                            console.log(`✅ Wrote ${result.filesWritten} files to ${state.rootPath}`);
                        } else {
                            console.error(`❌ Failed to write files:`, result.error);
                        }
                    });
                }

                return { tasks };
            }),

            createProject: (idea) => {
                const { activeProjectId, phase, agents, tasks, epics, stories, projects } = get();

                // Save current project if exists
                let newProjects = [...projects];
                if (activeProjectId) {
                    const currentProjectIndex = newProjects.findIndex(p => p.id === activeProjectId);
                    if (currentProjectIndex >= 0) {
                        newProjects[currentProjectIndex] = {
                            ...newProjects[currentProjectIndex],
                            phase,
                            agents,
                            tasks,
                            epics,
                            stories,
                            lastActive: Date.now()
                        };
                    }
                }

                // Create new project
                const newProjectId = uuidv4();
                const newProject: Project = {
                    id: newProjectId,
                    name: idea,
                    phase: 'planning',
                    agents: [],
                    tasks: [],
                    epics: [],
                    stories: [],
                    lastActive: Date.now(),
                    rootPath: undefined
                };

                set({
                    projects: [newProject, ...newProjects],
                    activeProjectId: newProjectId,
                    projectIdea: idea,
                    rootPath: null,
                    phase: 'planning',
                    agents: [
                        { id: uuidv4(), name: 'Vinay', role: 'Product Manager', status: 'idle', capability: 8, logs: [] },
                        { id: uuidv4(), name: 'Nikhil', role: 'Architect', status: 'idle', capability: 9, logs: [] },
                        { id: uuidv4(), name: 'Sarthak', role: 'Tech Lead', status: 'idle', capability: 8, logs: [] },
                        { id: uuidv4(), name: 'Abhinesh', role: 'Software Engineer', status: 'idle', capability: 7, logs: [] },
                        { id: uuidv4(), name: 'Ajit', role: 'Backend Engineer', status: 'idle', capability: 8, logs: [] },
                        { id: uuidv4(), name: 'Manoj', role: 'QA Engineer', status: 'idle', capability: 7, logs: [] },
                        { id: uuidv4(), name: 'Vikram', role: 'DevOps Engineer', status: 'idle', capability: 7, logs: [] },
                    ],
                    tasks: [],
                    deployment: {
                        status: 'idle',
                        logs: [],
                        analysis: null,
                        isVisible: false
                    },
                });
            },

            switchProject: (projectId) => {
                const { activeProjectId, phase, agents, tasks, epics, stories, projects } = get();

                // Save current project
                let newProjects = [...projects];
                if (activeProjectId) {
                    const currentProjectIndex = newProjects.findIndex(p => p.id === activeProjectId);
                    if (currentProjectIndex >= 0) {
                        newProjects[currentProjectIndex] = {
                            ...newProjects[currentProjectIndex],
                            phase,
                            agents,
                            tasks,
                            epics,
                            stories,
                            lastActive: Date.now()
                        };
                    }
                }

                // Load target project
                const targetProject = newProjects.find(p => p.id === projectId);
                if (targetProject) {
                    set({
                        projects: newProjects,
                        activeProjectId: targetProject.id,
                        projectIdea: targetProject.name,
                        rootPath: targetProject.rootPath || null,
                        phase: targetProject.phase,
                        agents: targetProject.agents,
                        tasks: targetProject.tasks,
                        epics: targetProject.epics ?? [],
                        stories: targetProject.stories ?? [],
                    });
                }
            },

            setProjectRoot: (path) => {
                set({ rootPath: path });
                // Update project in list
                const { activeProjectId, projects } = get();
                if (activeProjectId) {
                    const updatedProjects = projects.map(p =>
                        p.id === activeProjectId ? { ...p, rootPath: path } : p
                    );
                    set({ projects: updatedProjects });
                }
            },

            setProjectIdea: (idea) => set({ projectIdea: idea }),
            addAgent: (agent) => {
                set((state) => ({ agents: [...state.agents, agent] }));
                get().addToast(`Added ${agent.name} to the team`, 'success');
            },
            removeAgent: (id) => {
                const agent = get().agents.find(a => a.id === id);
                set((state) => ({ agents: state.agents.filter((a) => a.id !== id) }));
                if (agent) get().addToast(`Removed ${agent.name} from the team`, 'info');
            },
            addTask: (task) => set((state) => ({ tasks: [...state.tasks, { ...task, comments: [], history: [], outputHistory: [] }] })),
            updateTaskStatus: (taskId, status) => set((state) => ({
                tasks: state.tasks.map((t) => t.id === taskId ? { ...t, status } : t)
            })),
            assignTask: (taskId, agentId) => set((state) => ({
                tasks: state.tasks.map((t) => t.id === taskId ? { ...t, assignedTo: agentId } : t),
                agents: state.agents.map((a) => a.id === agentId ? { ...a, currentTaskId: taskId, status: 'working' } : a)
            })),
            addComment: (taskId, text, author) => set((state) => ({
                tasks: state.tasks.map(t =>
                    t.id === taskId
                        ? { ...t, comments: [...t.comments, { author, text, timestamp: Date.now() }] }
                        : t
                ),
            })),
            toggleTaskSelection: (taskId) => set((state) => ({
                tasks: state.tasks.map((t) => t.id === taskId ? { ...t, selected: !t.selected } : t)
            })),
            toggleCategorySelection: (category, selected) => set((state) => ({
                tasks: state.tasks.map((t) => t.category === category ? { ...t, selected } : t)
            })),
            toggleEpicSelection: (epicId) => set((state) => {
                const epicTasks = state.tasks.filter(t => t.epicId === epicId && t.status === 'todo');
                const allSelected = epicTasks.every(t => t.selected);
                return {
                    tasks: state.tasks.map(t =>
                        t.epicId === epicId && t.status === 'todo' ? { ...t, selected: !allSelected } : t
                    ),
                };
            }),
            selectAllTasks: () => set((state) => ({
                tasks: state.tasks.map(t => t.status === 'todo' ? { ...t, selected: true } : t)
            })),
            deselectAllTasks: () => set((state) => ({
                tasks: state.tasks.map(t => t.status === 'todo' ? { ...t, selected: false } : t)
            })),
            approvePlan: () => set((state) => ({
                phase: 'architecture',
                tasks: state.tasks.filter(t => t.selected === true)
            })),

            startPlanning: () => {
                const { projectIdea, agents } = get();
                const pm = agents.find(a => a.role === 'Product Manager');
                if (!pm || pm.status === 'working') return;

                set(state => ({
                    agents: state.agents.map(a =>
                        a.id === pm.id
                            ? { ...a, status: 'working', logs: [...a.logs, `Analyzing project idea: "${projectIdea.slice(0, 20)}..." (LLM)`] }
                            : a
                    )
                }));

                console.log('PM Agent: Starting task generation for:', projectIdea);

                const timeoutId = setTimeout(() => {
                    set((state) => {
                        const updatedPm = state.agents.find(a => a.id === pm.id);
                        if (updatedPm && updatedPm.status === 'working') {
                            console.warn('PM Agent: Generation timed out after 600s.');
                            return {
                                agents: state.agents.map(a => a.id === pm.id
                                    ? { ...a, status: 'error', logs: [...a.logs, 'Error: PM Analysis timed out (10 min). Check your API key and network.'] }
                                    : a
                                )
                            };
                        }
                        return {};
                    });
                }, 600000); // 600s (10 min): full plans can be 50K+ tokens at ~150 tok/s = 5-8 min

                get().clearPlanningEpics();

                (async () => {
                    try {
                        const pmAgent = new ProductManagerAgent();
                        const plan = await pmAgent.generatePlan(
                            projectIdea,
                            (charsReceived, chunk) => get().setPmProgress(charsReceived, chunk),
                            (id, title, description, status, taskCount) =>
                                get().upsertPlanningEpic(id, title, description, status, taskCount)
                        );
                        clearTimeout(timeoutId);
                        get().clearPmProgress();
                        get().clearPlanningEpics();

                        set((state) => {
                            const updatedPm = state.agents.find(a => a.id === pm.id);
                            const updatedLogs = updatedPm
                                ? [...updatedPm.logs, `Plan ready: ${plan.epics.length} epics, ${plan.stories.length} stories, ${plan.tasks.length} tasks.`]
                                : [];
                            console.log(`PM Agent: Plan ready — ${plan.epics.length} epics, ${plan.stories.length} stories, ${plan.tasks.length} tasks`);
                            return {
                                phase: 'approval',
                                epics: [...state.epics, ...plan.epics],
                                stories: [...state.stories, ...plan.stories],
                                tasks: [...state.tasks, ...plan.tasks],
                                agents: state.agents.map(a =>
                                    a.id === pm.id ? { ...a, status: 'idle', logs: updatedLogs } : a
                                ),
                            };
                        });
                    } catch (error: any) {
                        clearTimeout(timeoutId);
                        get().clearPmProgress();
                        console.error('PM Agent: Error during generation:', error);
                        const errMsg = error?.message ?? String(error);
                        set((state) => {
                            const updatedPm = state.agents.find(a => a.id === pm.id);
                            const updatedLogs = updatedPm
                                ? [...updatedPm.logs, `❌ Failed: ${errMsg}`]
                                : [];
                            return {
                                agents: state.agents.map(a => a.id === pm.id
                                    ? { ...a, status: 'error', logs: updatedLogs }
                                    : a
                                )
                            };
                        });
                    }
                })();
            },

            setPlanningData: (epics, stories, pmTasks) => set((state) => ({
                epics,
                stories,
                tasks: [...state.tasks, ...pmTasks],
            })),

            setPmProgress: (charsReceived, chunk) => set((state) => {
                const prev = state.pmProgress;
                const streamedText = (prev?.streamedText ?? '') + chunk;
                // Use a FIXED target of ~24 000 chars (16 000 tokens × 1.5 chars/token).
                // Only expand if we exceed it — never shrink — so the ratio actually grows
                // from 0 → 1 as streaming progresses instead of being locked at 0.91.
                const estimatedTotal = Math.max(prev?.estimatedTotal ?? 24000, charsReceived + 1000);
                return { pmProgress: { charsReceived, estimatedTotal, streamedText } };
            }),

            clearPmProgress: () => set({ pmProgress: null }),

            upsertPlanningEpic: (id, title, description, status, taskCount) => set(state => {
                const existing = state.planningEpics.findIndex(e => e.id === id);
                const entry = { id, title, description, status, taskCount };
                if (existing >= 0) {
                    const updated = [...state.planningEpics];
                    updated[existing] = entry;
                    return { planningEpics: updated };
                }
                return { planningEpics: [...state.planningEpics, entry] };
            }),

            clearPlanningEpics: () => set({ planningEpics: [] }),
            tick: () => {
                const { agents, tasks, phase, activeProjectId, projects } = get();
                if (phase === 'planning' || phase === 'approval') return;

                let newAgents = [...agents];
                let newTasks = [...tasks];
                let newPhase = phase;

                // Skip architecture phase — go straight to development
                if (phase === 'architecture') {
                    newPhase = 'development';
                }

                // Helper: check if a task's dependencies are all done
                const depsReady = (task: Task) => {
                    if (!task.dependencies || task.dependencies.length === 0) return true;
                    return task.dependencies.every(depId =>
                        newTasks.find(t => t.id === depId)?.status === 'done'
                    );
                };

                // Role -> compatible task types
                const roleCanWork: Record<string, string[]> = {
                    'Architect':         ['architecture', 'setup', 'database', 'backend', 'api', 'devops'],
                    'Tech Lead':         ['architecture', 'setup', 'backend', 'api', 'frontend', 'database'],
                    'Software Engineer': ['frontend', 'backend', 'api', 'test', 'setup'],
                    'Backend Engineer':  ['backend', 'api', 'database', 'setup', 'devops'],
                    'QA Engineer':       ['test', 'frontend', 'backend'],
                    'DevOps Engineer':   ['devops', 'setup', 'backend'],
                    'Product Manager':   [],
                };

                // Activity phrases by task type — gives users a feel for what the agent is doing
                const activityByType: Record<string, string[]> = {
                    setup:        ['Initializing project scaffolding', 'Configuring build toolchain', 'Setting up dev environment', 'Installing core dependencies'],
                    architecture: ['Designing system architecture', 'Defining module boundaries', 'Mapping data flow patterns', 'Planning service topology'],
                    database:     ['Writing database migrations', 'Defining table schemas', 'Setting up indexes & constraints', 'Configuring connection pooling'],
                    backend:      ['Implementing business logic', 'Building service layer', 'Writing data models', 'Setting up middleware'],
                    api:          ['Defining API endpoints', 'Implementing request handlers', 'Adding input validation', 'Setting up route guards'],
                    frontend:     ['Building React components', 'Implementing UI layout', 'Adding state management', 'Styling with Tailwind CSS'],
                    test:         ['Writing unit tests', 'Setting up test fixtures', 'Implementing integration tests', 'Adding edge case coverage'],
                    devops:       ['Configuring CI/CD pipeline', 'Setting up Docker containers', 'Writing deployment scripts', 'Configuring monitoring'],
                };
                const getActivity = (type: string | undefined, progress: number): string => {
                    const phrases = activityByType[type ?? 'backend'] ?? activityByType.backend;
                    const idx = Math.min(Math.floor((progress / 100) * phrases.length), phrases.length - 1);
                    return phrases[idx];
                };

                // 1. Assign tasks to idle agents
                const idleAgents = newAgents.filter(a => a.status === 'idle' && a.role !== 'Product Manager');

                for (const agent of idleAgents) {
                    const compatibleTypes = roleCanWork[agent.role] ?? [];
                    const task = newTasks.find(t =>
                        t.status === 'todo' &&
                        !t.assignedTo &&
                        compatibleTypes.includes(t.type ?? 'backend') &&
                        depsReady(t)
                    );

                    if (task) {
                        task.assignedTo = agent.id;
                        task.status = 'in-progress';
                        task.progress = 10;
                        task.currentActivity = getActivity(task.type, 10);
                        agent.status = 'working';
                        agent.currentTaskId = task.id;
                        agent.logs.push(`Working on: ${task.title}`);
                    }
                }

                // 2. Progress in-progress tasks
                newTasks.forEach(task => {
                    if (task.status !== 'in-progress' || !task.assignedTo) return;

                    const agent = newAgents.find(a => a.id === task.assignedTo);
                    if (!agent) return;

                    agent.status = 'working';
                    agent.currentTaskId = task.id;
                    task.currentActivity = getActivity(task.type, task.progress || 0);

                    // Try LLM skill execution
                    const { skillRunning, projectIdea } = get();
                    if (!skillRunning.has(task.id)) {
                        skillRunning.add(task.id);
                        const skill = getSkill(task.type);
                        if (skill) {
                            skill.execute({
                                taskTitle: task.title,
                                taskDescription: task.description,
                                projectName: projectIdea,
                            })
                                .then(output => {
                                    get().completeTaskExecution(task.id, agent.name, output.files, output.summary);
                                })
                                .catch(err => {
                                    console.error(`Skill failed for "${task.title}":`, err);
                                    skillRunning.delete(task.id);
                                });
                        } else {
                            // Fast fake progress — complete in 3-5 ticks
                            const speed = (agent.capability || 5) / (task.complexity || 5);
                            const increment = Math.round(Math.max(15, speed * 25));
                            task.progress = Math.min(100, (task.progress || 0) + increment);
                        }
                    }

                    // Completion: straight to done (no review/QA gating)
                    if (task.progress >= 100) {
                        task.status = 'done';
                        task.progress = 100;
                        task.currentActivity = undefined;
                        task.history.push({ status: 'done', timestamp: Date.now(), by: agent.name });
                        agent.logs.push(`Completed: ${task.title}`);
                        agent.currentTaskId = undefined;
                        agent.status = 'idle';

                        task.output = `Implemented by ${agent.name}`;
                        task.outputHistory.push({
                            author: agent.name,
                            content: `Implemented: ${task.title}`,
                            timestamp: Date.now(),
                        });

                        // Write files if in Electron
                        const { rootPath } = get();
                        if (rootPath && typeof window !== 'undefined' && (window as any).ipcRenderer) {
                            const ipc = (window as any).ipcRenderer;
                            let rawTitle = task.title.replace(/[^a-zA-Z0-9]/g, '');
                            if (!rawTitle) rawTitle = 'Untitled';
                            const name = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

                            const pathMap: Record<string, string> = {
                                frontend: `${rootPath}/src/components/${name}.tsx`,
                                backend: `${rootPath}/src/services/${name}.ts`,
                                api: `${rootPath}/src/routes/${name}.ts`,
                                database: `${rootPath}/db/${name}.sql`,
                                test: `${rootPath}/src/__tests__/${name}.test.ts`,
                                setup: `${rootPath}/src/config/${name}.ts`,
                                devops: `${rootPath}/infra/${name}.yml`,
                                architecture: `${rootPath}/docs/${name}.md`,
                            };
                            const filePath = pathMap[task.type ?? 'backend'] ?? `${rootPath}/src/${name}.ts`;
                            ipc.invoke('fs:writeFile', filePath, `// ${task.title}\n// Generated by ${agent.name}\n`)
                                .catch(() => { /* ignore write errors */ });
                        }
                    }
                });

                // 3. Check completion
                const allDone = newTasks.length > 0 && newTasks.every(t => t.status === 'done');
                if (allDone && newPhase === 'development') {
                    newPhase = 'completed' as any;
                    set({ showCelebration: true });
                }

                // 4. Auto-save project state
                let updatedProjects = [...projects];
                if (activeProjectId) {
                    const idx = updatedProjects.findIndex(p => p.id === activeProjectId);
                    if (idx >= 0) {
                        updatedProjects[idx] = {
                            ...updatedProjects[idx],
                            phase: newPhase,
                            agents: newAgents,
                            tasks: newTasks,
                            epics: get().epics,
                            stories: get().stories,
                            lastActive: Date.now(),
                        };
                    }
                }

                set({ agents: newAgents, tasks: newTasks, phase: newPhase, projects: updatedProjects });
            },

            reset: () => set({ projectIdea: '', agents: [], tasks: [], epics: [], stories: [], phase: 'planning', activeProjectId: null }),

            addToast: (message, type = 'info') => {
                const id = uuidv4();
                set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
                setTimeout(() => {
                    get().removeToast(id);
                }, 3000);
            },

            removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

            clearProjects: () => set({ projects: [], activeProjectId: null, projectIdea: '', agents: [], tasks: [], epics: [], stories: [], phase: 'planning' })
        }),
        {
            name: 'agent-storage',
            partialize: (state) => ({
                projects: state.projects,
                activeProjectId: state.activeProjectId,
                agents: state.agents,
                tasks: state.tasks,
                epics: state.epics,
                stories: state.stories,
                phase: state.phase,
                projectIdea: state.projectIdea,
                rootPath: state.rootPath
            }),
            onRehydrateStorage: () => (state) => {
                if (!state) return;
                // Reset any stale 'working'/'error' agent statuses from a previous session
                // so the planning screen never shows on startup unexpectedly.
                state.agents = state.agents.map(a =>
                    a.status === 'working' || a.status === 'error'
                        ? { ...a, status: 'idle', currentTaskId: undefined }
                        : a
                );
                state.pmProgress = null;
            },
        }
    )
);


