import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { generateDetailedTasks } from '../utils/taskGenerator';

export type Role = 'Product Manager' | 'Architect' | 'Tech Lead' | 'Software Engineer' | 'Backend Engineer' | 'QA Engineer' | 'DevOps Engineer';
export type AgentStatus = 'idle' | 'working' | 'blocked' | 'reviewing';
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
    outputHistory: { author: string; content: string; timestamp: number }[];
    comments: { author: string; text: string; timestamp: number }[];
    history: { status: TaskStatus; timestamp: number; by: string }[];
    originalAssigneeId?: string;
    type?: 'setup' | 'frontend' | 'backend' | 'architecture';
}

export interface Project {
    id: string;
    name: string;
    phase: ProjectPhase;
    agents: Agent[];
    tasks: Task[];
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
    toggleTaskSelection: (taskId: string) => void;
    toggleCategorySelection: (category: string, selected: boolean) => void;
    approvePlan: () => void;

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

    tick: () => void;
    reset: () => void;
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
            toasts: [],
            showCelebration: false,
            projects: [],

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

            createProject: (idea) => {
                const { activeProjectId, phase, agents, tasks, projects } = get();

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
                const { activeProjectId, phase, agents, tasks, projects } = get();

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
                            lastActive: Date.now()
                        };
                    }
                }

                // Load target project
                const targetProject = newProjects.find(p => p.id === projectId);
                if (targetProject) {
                    set({
                        projects: newProjects, // Update list with saved state
                        activeProjectId: targetProject.id,
                        projectIdea: targetProject.name,
                        rootPath: targetProject.rootPath || null,
                        phase: targetProject.phase,
                        agents: targetProject.agents,
                        tasks: targetProject.tasks
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
            toggleTaskSelection: (taskId) => set((state) => ({
                tasks: state.tasks.map((t) => t.id === taskId ? { ...t, selected: !t.selected } : t)
            })),
            toggleCategorySelection: (category, selected) => set((state) => ({
                tasks: state.tasks.map((t) => t.category === category ? { ...t, selected } : t)
            })),
            approvePlan: () => set((state) => ({
                phase: 'architecture',
                tasks: state.tasks.filter(t => t.selected === true) // Only keep explicitly selected tasks
            })),
            tick: () => {
                const { agents, tasks, phase, projectIdea, activeProjectId, projects } = get();
                let newAgents = [...agents];
                let newTasks = [...tasks];
                let newPhase = phase;

                // --- Phase 1: Planning (Product Manager & Architect) ---
                if (phase === 'planning') {
                    const pm = newAgents.find(a => a.role === 'Product Manager');
                    const architect = newAgents.find(a => a.role === 'Architect');

                    if (tasks.length === 0) {
                        // 1. PM Generates Feature Tasks
                        if (pm) {
                            pm.status = 'working';
                            pm.logs.push(`Analyzing project idea: "${projectIdea.slice(0, 20)}..."`);

                            const featureTasks = generateDetailedTasks(projectIdea);

                            newTasks = [...newTasks, ...featureTasks];
                            pm.logs.push('Generated detailed technical requirements (PRD).');
                            pm.status = 'idle';
                        }

                        // 2. Architect Generates Technical Tasks (Immediate)
                        if (architect) {
                            architect.status = 'working';
                            architect.logs.push(`Analyzing technical requirements for: "${projectIdea.slice(0, 20)}..."`);

                            const techTasks: Task[] = [
                                { id: uuidv4(), title: 'Architecture: Environment Setup', description: 'Install Node.js, Git, global packages, and initialize repo.', status: 'todo', progress: 0, complexity: 5, dependencies: [], selected: true, category: 'Architecture', comments: [], history: [], outputHistory: [], type: 'setup' },
                                { id: uuidv4(), title: 'Architecture: Define Tech Stack', description: `Select best tools for: ${projectIdea.slice(0, 20)}...`, status: 'todo', progress: 0, complexity: 8, dependencies: [], selected: true, category: 'Architecture', comments: [], history: [], outputHistory: [], type: 'architecture' },
                                { id: uuidv4(), title: 'Architecture: Setup Project Boilerplate', description: 'Initialize repository and structure', status: 'todo', progress: 0, complexity: 5, dependencies: [], selected: true, category: 'Architecture', comments: [], history: [], outputHistory: [], type: 'architecture' },
                                { id: uuidv4(), title: 'Architecture: Design Database Schema', description: `Model data for ${projectIdea.slice(0, 15)}...`, status: 'todo', progress: 0, complexity: 7, dependencies: [], selected: true, category: 'Architecture', comments: [], history: [], outputHistory: [], type: 'architecture' },
                            ];

                            newTasks = [...newTasks, ...techTasks];
                            architect.logs.push('Generated technical tasks.');
                            architect.status = 'idle';
                        }

                        newPhase = 'approval'; // Wait for user approval
                    }
                }

                // --- Phase 2: Approval (User) ---
                if (phase === 'approval') {
                    // Do nothing, wait for user to call approvePlan()
                    return;
                }

                // --- Global: Resume Work on Assigned Tasks (e.g., Rejected Tasks) ---
                newAgents.forEach(agent => {
                    if (agent.status === 'idle') {
                        const assignedTask = newTasks.find(t => t.assignedTo === agent.id && t.status === 'in-progress');
                        if (assignedTask) {
                            agent.status = 'working';
                            agent.currentTaskId = assignedTask.id;
                            agent.logs.push(`Resuming work on rejected task: ${assignedTask.title}`);
                        }
                    }
                });

                // --- Phase 3: Architecture (Architect) ---
                if (phase === 'architecture') {
                    const architect = newAgents.find(a => a.role === 'Architect');

                    // Note: Task generation moved to Planning phase


                    // Assign Architecture Tasks (Setup First, then others)
                    if (architect && architect.status === 'idle') {
                        // 1. Check for Setup Task
                        const setupTask = newTasks.find(t => t.type === 'setup' && t.status !== 'done');

                        // 2. Filter Architecture Tasks
                        const archTasks = newTasks
                            .filter(t => t.category === 'Architecture' && t.type !== 'setup' && t.status === 'todo')
                            .sort((a, b) => b.complexity - a.complexity);

                        let taskToAssign: Task | undefined;

                        if (setupTask && setupTask.status === 'todo') {
                            taskToAssign = setupTask;
                        } else if (setupTask && setupTask.status === 'in-progress') {
                            // Waiting for setup to finish
                            taskToAssign = undefined;
                        } else if (!setupTask || setupTask.status === 'done') {
                            // Setup done, move to Arch tasks
                            taskToAssign = archTasks[0];
                        }

                        if (taskToAssign) {
                            taskToAssign.assignedTo = architect.id;
                            taskToAssign.status = 'in-progress';
                            taskToAssign.progress = 5;
                            architect.status = 'working';
                            architect.currentTaskId = taskToAssign.id;
                            architect.logs.push(`Started working on: ${taskToAssign.title} ${taskToAssign.type === 'setup' ? '(Initial Setup)' : ''}`);
                        } else {
                            // Check if ALL architecture tasks are done
                            const incompleteArchTasks = newTasks.some(t => (t.category === 'Architecture' || t.type === 'setup') && t.status !== 'done');

                            if (!incompleteArchTasks) {
                                newPhase = 'development';
                                architect.logs.push('Architecture phase complete. Moving to Backend Development.');
                            }
                        }
                    }
                }

                // --- Phase 4: Development (Team) ---
                if (phase === 'development') {
                    // 1. Assign Tasks (Manager Logic)
                    // Logic: Backend First -> Frontend

                    const backendTasksDone = newTasks.filter(t => t.type === 'backend').every(t => t.status === 'done');

                    // -- BACKEND ASSIGNMENT --
                    const idleBackendEngineers = newAgents.filter(a => a.role === 'Backend Engineer' && a.status === 'idle');
                    const todoBackendTasks = newTasks.filter(t => t.type === 'backend' && t.status === 'todo' && !t.assignedTo);

                    idleBackendEngineers.forEach(agent => {
                        if (todoBackendTasks.length > 0) {
                            const task = todoBackendTasks.shift();
                            if (task) {
                                task.assignedTo = agent.id;
                                task.status = 'in-progress';
                                task.progress = 5;
                                agent.status = 'working';
                                agent.currentTaskId = task.id;
                                agent.logs.push(`Started Backend Task: ${task.title}`);
                            }
                        }
                    });

                    // -- FRONTEND ASSIGNMENT (Only if Backend is Done) --
                    if (backendTasksDone) {
                        const idleFrontendEngineers = newAgents.filter(a => (a.role === 'Software Engineer' || a.role === 'Tech Lead') && a.status === 'idle'); // Tech Lead can also do frontend
                        const todoFrontendTasks = newTasks.filter(t => t.type === 'frontend' && t.status === 'todo' && !t.assignedTo);

                        // Check if ALL tasks are done (Backend + Frontend)
                        const allTasksDone = newTasks.every(t => t.status === 'done');
                        if (allTasksDone && newTasks.length > 0) {
                            // Trigger Celebration
                            set({ showCelebration: true });
                            // Optional: Move phase to 'maintenance' or 'completed' to stop checking
                            // For now, we'll rely on the UI to handle the display duration
                            // But to prevent loop, let's mark phase as completed
                            newPhase = 'completed' as any; // Cast as any if 'completed' isn't in type, or update type. 
                            // Let's stick to just setting usage, but we need to stop this block running.
                            // We'll update phase to 'completed' which isn't in the union type yet. 
                            // Let's just update the TaskStatus to 'done' (already is).
                            // We can check if showCelebration is already true? No, it gets set to false after 5s.
                            // Let's add 'completed' to Phase type? 
                            // For now, let's just use a flag or check if we already celebrated?
                            // Actually, simpler: if all tasks done, we just stop assigning.
                            // We need to trigger it once.
                            // Let's add a 'completed' phase to the store definition later or implicitly handle it.
                            // How about: if phase is 'development' and all done -> phase = 'maintenance' (we need to add this type)
                            // Let's just assume we can stay in development but only trigger if !get().showCelebration?
                            // No, that resets.

                            // Let's just add logic: if all tasks done, and phase is 'development', set phase='done' (we need to add 'done' to types)
                            // I'll update the type definition in a separate edit or just use 'development' and check if we haven't logged it?
                            // Let's just add 'done' to ProjectPhase type in line 9 first? 
                            // It's safer to just enable it.
                        }

                        idleFrontendEngineers.forEach(agent => {
                            if (todoFrontendTasks.length > 0) {
                                const task = todoFrontendTasks.shift();
                                if (task) {
                                    task.assignedTo = agent.id;
                                    task.status = 'in-progress';
                                    task.progress = 5;
                                    agent.status = 'working';
                                    agent.currentTaskId = task.id;
                                    agent.logs.push(`Started Frontend Task: ${task.title} (integrating APIs)`);
                                }
                            }
                        });
                    }
                }

                // 2. Process Tasks (Global for all phases - Parallel Execution)
                // Auto-start assigned tasks
                newTasks.forEach(t => {
                    if (t.status === 'todo' && t.assignedTo) {
                        t.status = 'in-progress';
                        t.progress = 5;
                        const assignee = newAgents.find(a => a.id === t.assignedTo);
                        if (assignee) {
                            assignee.status = 'working';
                            assignee.logs.push(`Auto-started: ${t.title}`);
                        }
                    }
                });

                // Iterate through ALL in-progress tasks to simulate parallel work
                newTasks.forEach(task => {
                    if (task.status === 'in-progress' && task.assignedTo) {
                        const agent = newAgents.find(a => a.id === task.assignedTo);
                        if (agent) {
                            // Update Agent Status to Working
                            agent.status = 'working';
                            // Update UI to show this task (or keep existing if already working on one)
                            if (!agent.currentTaskId || agent.currentTaskId === task.id) {
                                agent.currentTaskId = task.id;
                            }

                            // Calculate Progress
                            const increment = (agent.capability || 5) / (task.complexity || 5) * 5; // Faster simulation
                            task.progress = Math.min(100, (task.progress || 0) + increment);

                            // Completion Logic
                            if (task.progress >= 100) {
                                // If task was in review, Architect decides
                                if (task.status === 'review' && agent.role === 'Architect') {
                                    // ... (Review logic handled separately or below)
                                    // Actually, if it's in-progress, it's not in review. 
                                    // Review tasks are 'review' status.
                                    // But wait, if an Architect is reviewing, the task status is 'review'.
                                    // We need to handle 'review' status progression too if assigned to Architect.
                                } else {
                                    // Normal completion -> Move to Review
                                    task.status = 'review';
                                    task.progress = 0; // Reset progress for review
                                    task.history.push({ status: 'review', timestamp: Date.now(), by: agent.name });
                                    task.originalAssigneeId = agent.id; // Remember who did it
                                    task.assignedTo = undefined; // Unassign so Architect can pick it up
                                    agent.logs.push(`Submitted for review: ${task.title}`);
                                    agent.currentTaskId = undefined; // Clear focus
                                    agent.status = 'idle'; // Reset status so they can pick up new tasks

                                    // Generate Detailed Output based on task title and category
                                    let outputContent = '';
                                    const timestamp = new Date().toLocaleTimeString();

                                    if (task.title.includes('Tech Stack')) {
                                        outputContent = `> Analyzing project requirements...\n> Selecting backend architecture...\n\n**Selected Tech Stack:**\n- **Frontend:** React 18, TailwindCSS\n- **Backend:** Node.js, Express\n\n> Writing architecture decision record (ADR-001)... DONE`;
                                        agent.logs.push(`Output generated: Tech Stack defined.`);
                                    } else if (task.title.includes('Database Schema')) {
                                        outputContent = `> Modeling 'Users' table...\n\`\`\`sql\nCREATE TABLE users (id UUID PRIMARY KEY, email VARCHAR(255) UNIQUE);\n\`\`\`\n> Schema validation passed.`;
                                        agent.logs.push(`Output generated: Database Schema designed.`);
                                    } else if (task.title.includes('Authentication') || task.title.includes('Login')) {
                                        outputContent = `> Implementing Login component...\n
\`\`\`tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate login
    setTimeout(() => {
        navigate('/dashboard');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl backdrop-blur-xl shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Welcome Back</h2>
          <p className="text-zinc-500 mt-2">Sign in to your account</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Email Address</label>
            <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white placeholder-zinc-600"
                  placeholder="name@company.com"
                />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white placeholder-zinc-600"
                  placeholder="••••••••"
                />
            </div>
          </div>

          <button type="submit" className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2">
            Sign In <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
\`\`\`
> Unit tests passed.`;
                                        agent.logs.push(`Output generated: Authentication component created.`);
                                    } else if (task.title.includes('Dashboard')) {
                                        outputContent = `> Scaffolding Dashboard layout...\n
\`\`\`tsx
import React from 'react';
import { LayoutDashboard, Users, BarChart3, Settings, Bell, Search } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900/50 border-r border-zinc-800 backdrop-blur-xl hidden md:block">
        <div className="p-6">
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Nexus<span className="text-white">Dash</span></h2>
        </div>
        <nav className="p-4 space-y-1">
            <a href="#" className="flex items-center gap-3 px-4 py-3 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 font-medium">
                <LayoutDashboard className="w-5 h-5" /> Dashboard
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                <Users className="w-5 h-5" /> Customers
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                <BarChart3 className="w-5 h-5" /> Analytics
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                <Settings className="w-5 h-5" /> Settings
            </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
            <h1 className="text-xl font-semibold text-white">Dashboard Overview</h1>
            <div className="flex items-center gap-4">
                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input type="text" placeholder="Search..." className="bg-zinc-900 border border-zinc-800 rounded-full pl-10 pr-4 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 w-64 transition-colors" />
                </div>
                <button className="p-2 text-zinc-400 hover:text-white transition-colors relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 ring-2 ring-zinc-800"></div>
            </div>
        </header>

        <div className="p-8 space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Revenue', value: '$45,231.89', change: '+20.1%', color: 'text-green-400' },
                    { label: 'Active Users', value: '+2,350', change: '+180.1%', color: 'text-blue-400' },
                    { label: 'Sales', value: '+12,234', change: '+19%', color: 'text-purple-400' }
                ].map((stat, i) => (
                    <div key={i} className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors group">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-zinc-500 text-sm font-medium">{stat.label}</span>
                            <span className={\`text-xs px-2 py-1 rounded-full bg-white/5 \${stat.color}\`}>{stat.change}</span>
                        </div>
                        <div className="text-3xl font-bold text-white group-hover:scale-[1.02] transition-transform origin-left">{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64 bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 flex flex-col justify-center items-center text-zinc-500 dashed-border">
                    <BarChart3 className="w-12 h-12 mb-4 opacity-20" />
                    <p>Sales Analytics Chart Component</p>
                </div>
                <div className="h-64 bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 flex flex-col justify-center items-center text-zinc-500 dashed-border">
                    <Users className="w-12 h-12 mb-4 opacity-20" />
                    <p>Recent Signups Table Component</p>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}
\`\`\`
> Dashboard verified.`;
                                        agent.logs.push(`Output generated: Dashboard layout created.`);
                                    } else if (task.title.includes('API') || task.title.includes('Backend')) {
                                        outputContent = `> Defining API endpoints...\n
\`\`\`typescript
import express from 'express';
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

router.post('/data', (req, res) => {
  const { payload } = req.body;
  // TODO: Database insert
  res.status(201).json({ success: true, id: '123' });
});

export default router;
\`\`\`
> Tests passed.`;
                                        agent.logs.push(`Output generated: Backend API implemented.`);
                                    } else {
                                        // Generic React Component fallback
                                        const compName = task.title.replace(/[^a-zA-Z0-9]/g, '');
                                        outputContent = `> Implementation complete for ${task.title}.\n
\`\`\`tsx
import React from 'react';

export default function ${compName}() {
  return (
    <div className="p-6 bg-zinc-800 border border-zinc-700 rounded-lg shadow-sm my-4">
      <h2 className="text-xl font-bold text-white mb-2">${task.title}</h2>
      <p className="text-zinc-400">
        This component has been implemented as per the requirements for 
        <strong> ${task.category}</strong>.
      </p>
      <div className="mt-4 p-4 bg-zinc-900 rounded border border-zinc-700/50 font-mono text-xs text-green-400">
        Status: Active<br/>
        Version: 1.0.0
      </div>
    </div>
  );
}
\`\`\`
> Unit tests passed.`;
                                        agent.logs.push(`Output generated: Implementation complete for ${task.title}.`);
                                    }

                                    if (outputContent) {
                                        task.output = outputContent; // Keep latest for backward compatibility if needed
                                        task.outputHistory.push({
                                            author: agent.name,
                                            content: outputContent,
                                            timestamp: Date.now()
                                        });

                                        // --- FILE WRITING LOGIC ---
                                        const { rootPath } = get();
                                        if (rootPath && window.ipcRenderer) {
                                            // Determine filename based on task
                                            let filePath = '';
                                            let fileContent = outputContent;

                                            // Extract code block if present
                                            const codeBlockMatch = outputContent.match(/```(?:typescript|sql|javascript|tsx|json)?\n([\s\S]*?)```/);
                                            if (codeBlockMatch) {
                                                fileContent = codeBlockMatch[1];
                                            }

                                            // Sanitize title for filename (Ensure PascalCase for React components)
                                            let rawTitle = task.title.replace(/[^a-zA-Z0-9]/g, '');
                                            if (rawTitle.length === 0) rawTitle = 'UntitledComponent';
                                            const sanitizedTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

                                            if (task.type === 'frontend') {
                                                filePath = `${rootPath}/src/components/${sanitizedTitle}.tsx`;

                                                // --- AUTO-WIRING LOGIC ---
                                                const appPath = `${rootPath}/src/App.tsx`;
                                                window.ipcRenderer.invoke('fs:readFile', appPath).then((appResult: any) => {
                                                    if (appResult.success) {
                                                        let appContent = appResult.data;
                                                        const componentName = sanitizedTitle;

                                                        // 1. Add Import if missing
                                                        if (!appContent.includes(`import ${componentName}`)) {
                                                            appContent = `import ${componentName} from './components/${componentName}';\n` + appContent;
                                                        }

                                                        // 2. Inject Component into JSX
                                                        // Fallback: Just append to the div if standard structure exists
                                                        // 2. Inject Route into App.tsx
                                                        // Strategy: Find <Routes> and append <Route ... /> logic

                                                        const routePath = componentName.toLowerCase().includes('login') ? '/login' :
                                                            componentName.toLowerCase().includes('dashboard') ? '/dashboard' :
                                                                `/${componentName.toLowerCase()}`;

                                                        const routeElement = `<Route path="${routePath}" element={<${componentName} />} />`;

                                                        if (appContent.includes('<Routes>')) {
                                                            // Inject before the closing </Routes> tag
                                                            appContent = appContent.replace(
                                                                '</Routes>',
                                                                `  ${routeElement}\n      </Routes>`
                                                            );

                                                            // Main Entry Point Logic (Direct Routing)
                                                            const isLogin = componentName.includes('Login') || componentName.includes('Auth');
                                                            const isDashboard = componentName.includes('Dashboard');

                                                            if (isLogin || isDashboard) {
                                                                const targetComponent = componentName;
                                                                // Replace the default Home route with the new component permanently
                                                                // This avoids redirects and 'Navigate' errors
                                                                if (appContent.includes('<Route path="/" element={<Home />} />')) {
                                                                    appContent = appContent.replace(
                                                                        '<Route path="/" element={<Home />} />',
                                                                        `<Route path="/" element={<${targetComponent} />} />`
                                                                    );
                                                                }
                                                            }
                                                        } else {
                                                            // Fallback for non-router apps (shouldn't happen with new boilerplate)
                                                            appContent = appContent.replace(
                                                                '</div>',
                                                                `<div className="mt-4"><${componentName} /></div></div>`
                                                            );
                                                        }

                                                        // Write updated App.tsx
                                                        window.ipcRenderer.invoke('fs:writeFile', appPath, appContent);
                                                    }
                                                });
                                                // -------------------------
                                            } else if (task.type === 'backend') {
                                                filePath = `${rootPath}/src/api/${sanitizedTitle}.ts`;
                                            } else if (task.type === 'setup') {
                                                // --- GENERATE FULL BOILERPLATE ---
                                                // We write multiple files here for a working setup
                                                const boilerplate = [
                                                    {
                                                        path: `${rootPath}/package.json`,
                                                        content: JSON.stringify({
                                                            name: "generated-app",
                                                            private: true,
                                                            version: "0.0.0",
                                                            type: "module",
                                                            scripts: { "dev": "vite", "build": "vite build", "preview": "vite preview" },
                                                            dependencies: { "react": "^18.2.0", "react-dom": "^18.2.0", "react-router-dom": "^6.22.3", "lucide-react": "^0.344.0" },
                                                            devDependencies: { "@types/react": "^18.2.66", "@types/react-dom": "^18.2.22", "@vitejs/plugin-react": "^4.2.1", "vite": "^5.2.0", "autoprefixer": "^10.4.18", "postcss": "^8.4.35", "tailwindcss": "^3.4.1" }
                                                        }, null, 2)
                                                    },
                                                    {
                                                        path: `${rootPath}/vite.config.ts`,
                                                        content: `import { defineConfig } from 'vite'; import react from '@vitejs/plugin-react'; export default defineConfig({ plugins: [react()] });`
                                                    },
                                                    {
                                                        path: `${rootPath}/postcss.config.js`,
                                                        content: `export default { plugins: { tailwindcss: {}, autoprefixer: {}, }, }`
                                                    },
                                                    {
                                                        path: `${rootPath}/tailwind.config.js`,
                                                        content: `/** @type {import('tailwindcss').Config} */\nexport default {\n  content: [\n    "./index.html",\n    "./src/**/*.{js,ts,jsx,tsx}",\n  ],\n  theme: {\n    extend: {},\n  },\n  plugins: [],\n}`
                                                    },
                                                    {
                                                        path: `${rootPath}/index.html`,
                                                        content: `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Generated App</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`
                                                    },
                                                    {
                                                        path: `${rootPath}/src/main.tsx`,
                                                        content: `import React from 'react'; import ReactDOM from 'react-dom/client'; import App from './App.tsx'; import './index.css'; ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>,);`
                                                    },
                                                    {
                                                        path: `${rootPath}/src/App.tsx`,
                                                        content: `import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';

function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent mb-4">
        Generated App Running! 🚀
      </h1>
      <p className="text-zinc-400 max-w-md text-center">
        The agents are currently building your application components.
        As tasks complete, new routes will appear here.
      </p>
      <div className="mt-8 p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-500">
        Waiting for active tasks...
      </div>
    </div>
  );
}

function App() { 
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  ); 
} 

export default App;`
                                                    },
                                                    {
                                                        path: `${rootPath}/src/index.css`,
                                                        content: `@tailwind base; @tailwind components; @tailwind utilities; body { font-family: system-ui; background: #09090b; color: #fff; }`
                                                    }
                                                ];

                                                for (const file of boilerplate) {
                                                    window.ipcRenderer.invoke('fs:writeFile', file.path, file.content);
                                                }

                                                filePath = `${rootPath}/README.md`; // Fallback for the loop below
                                                // -------------------------------
                                            } else if (task.title.includes('Database')) {
                                                filePath = `${rootPath}/db/schema.sql`;
                                            } else {
                                                filePath = `${rootPath}/docs/${sanitizedTitle}.md`;
                                            }

                                            // Trigger write (for the main file)
                                            if (filePath) {
                                                window.ipcRenderer.invoke('fs:writeFile', filePath, fileContent)
                                                    .then(() => agent.logs.push(`Wrote file: ${filePath}`))
                                                    .catch(err => agent.logs.push(`Failed to write file: ${err}`));
                                            }
                                        }
                                        // ---------------------------
                                    }
                                }
                            }
                        }
                    }

                    // Handle Review Progress (Architect)
                    if (task.status === 'review' && task.assignedTo) {
                        const agent = newAgents.find(a => a.id === task.assignedTo);
                        if (agent && agent.role === 'Architect') {
                            agent.status = 'working';
                            if (!agent.currentTaskId) agent.currentTaskId = task.id;

                            // Review happens faster
                            task.progress = Math.min(100, (task.progress || 0) + 20);

                            if (task.progress >= 100) {
                                const approved = Math.random() > 0.1; // 90% Architect approval rate
                                if (approved) {
                                    // Move to QA
                                    task.status = 'testing';
                                    task.progress = 0;
                                    task.history.push({ status: 'testing', timestamp: Date.now(), by: agent.name });
                                    task.assignedTo = undefined; // Unassign from Architect
                                    agent.logs.push(`Approved Implementation: ${task.title} -> Moving to QA`);
                                } else {
                                    task.status = 'in-progress';
                                    task.history.push({ status: 'in-progress', timestamp: Date.now(), by: agent.name });
                                    task.comments.push({
                                        author: agent.name,
                                        text: "Code review failed. Please refactor.",
                                        timestamp: Date.now()
                                    });
                                    if (task.originalAssigneeId) task.assignedTo = task.originalAssigneeId;
                                    else task.assignedTo = undefined;
                                    agent.logs.push(`Rejected task (Review): ${task.title}`);
                                }
                                agent.currentTaskId = undefined;
                                agent.status = 'idle';
                            }
                        }
                    }

                    // 4. QA Phase (QA Engineer)
                    const qaEngineer = newAgents.find(a => a.role === 'QA Engineer');
                    if (qaEngineer) {
                        // Assign Testing Tasks
                        if (qaEngineer.status === 'idle') {
                            const testingTask = newTasks.find(t => t.status === 'testing' && !t.assignedTo);
                            if (testingTask) {
                                testingTask.assignedTo = qaEngineer.id;
                                testingTask.progress = 5;
                                qaEngineer.status = 'working';
                                qaEngineer.currentTaskId = testingTask.id;
                                qaEngineer.logs.push(`Started Testing: ${testingTask.title}`);
                            }
                        }

                        // Process Testing
                        const currentQaTask = newTasks.find(t => t.assignedTo === qaEngineer.id && t.status === 'testing');
                        if (currentQaTask && qaEngineer.status === 'working') {
                            // Work on testing
                            currentQaTask.progress = Math.min(100, (currentQaTask.progress || 0) + 15); // Testing is relatively fast

                            if (currentQaTask.progress >= 100) {
                                const passed = Math.random() > 0.1; // 90% QA Pass rate
                                if (passed) {
                                    currentQaTask.status = 'done';
                                    currentQaTask.history.push({ status: 'done', timestamp: Date.now(), by: qaEngineer.name });
                                    qaEngineer.logs.push(`QA Passed ✅: ${currentQaTask.title}`);
                                } else {
                                    currentQaTask.status = 'in-progress'; // Send back to dev
                                    currentQaTask.history.push({ status: 'in-progress', timestamp: Date.now(), by: qaEngineer.name });
                                    currentQaTask.comments.push({
                                        author: qaEngineer.name,
                                        text: "QA Failed: Bugs found in integration test.",
                                        timestamp: Date.now()
                                    });
                                    // Assign back to original dev if possible
                                    if (currentQaTask.originalAssigneeId) {
                                        currentQaTask.assignedTo = currentQaTask.originalAssigneeId;
                                    } else {
                                        currentQaTask.assignedTo = undefined;
                                    }
                                    qaEngineer.logs.push(`QA Failed ❌: ${currentQaTask.title}`);
                                }
                                qaEngineer.currentTaskId = undefined;
                                qaEngineer.status = 'idle';
                            }
                        }
                    }
                });

                // 3. Assign Review Tasks to Architect (if idle or parallel)
                // We allow Architect to review multiple things if we want, but typically review is sequential.
                // However, user said "Every task... parallel". So let's assign ALL unassigned review tasks to Architect if available.
                const architect = newAgents.find(a => a.role === 'Architect');
                if (architect) {
                    newTasks.forEach(t => {
                        if (t.status === 'review' && !t.assignedTo) {
                            t.assignedTo = architect.id;
                            t.progress = 0; // Start review
                            architect.logs.push(`Started reviewing: ${t.title}`);
                        }
                    });
                }

                // Auto-save current project state to projects array
                let updatedProjects = [...projects];
                if (activeProjectId) {
                    const currentProjectIndex = updatedProjects.findIndex(p => p.id === activeProjectId);
                    if (currentProjectIndex >= 0) {
                        updatedProjects[currentProjectIndex] = {
                            ...updatedProjects[currentProjectIndex],
                            phase: newPhase,
                            agents: newAgents,
                            tasks: newTasks,
                            lastActive: Date.now()
                        };
                    }
                }

                set({ agents: newAgents, tasks: newTasks, phase: newPhase, projects: updatedProjects });
            },

            reset: () => set({ projectIdea: '', agents: [], tasks: [], phase: 'planning', activeProjectId: null }),

            addToast: (message, type = 'info') => {
                const id = uuidv4();
                set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
                setTimeout(() => {
                    get().removeToast(id);
                }, 3000);
            },

            removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
        }),
        {
            name: 'agent-storage',
            partialize: (state) => ({
                projects: state.projects,
                activeProjectId: state.activeProjectId,
                agents: state.agents,
                tasks: state.tasks,
                phase: state.phase,
                projectIdea: state.projectIdea,
                rootPath: state.rootPath
            }),
        }
    )
);


