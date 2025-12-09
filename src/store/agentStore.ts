import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { generateDetailedTasks } from '../utils/taskGenerator';

export type Role = 'Product Manager' | 'Architect' | 'Tech Lead' | 'Software Engineer' | 'Backend Engineer' | 'QA Engineer' | 'DevOps Engineer';
export type AgentStatus = 'idle' | 'working' | 'blocked' | 'reviewing';
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'testing' | 'done';
export type ProjectPhase = 'planning' | 'approval' | 'architecture' | 'development';

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
                                        outputContent = `> Analyzing project requirements...\n> Evaluating frontend frameworks...\n> Selecting backend architecture...\n\n**Selected Tech Stack:**\n- **Frontend:** React 18, TailwindCSS, Framer Motion\n- **Backend:** Node.js, Express, TypeScript\n- **Database:** PostgreSQL (Supabase)\n- **Auth:** Firebase Auth\n- **State:** Zustand\n\n> Writing architecture decision record (ADR-001)... DONE`;
                                        agent.logs.push(`Output generated: Tech Stack defined.`);
                                    } else if (task.title.includes('Database Schema')) {
                                        outputContent = `> Connecting to database designer...\n> Modeling 'Users' table...\n> Modeling 'Projects' table...\n> Modeling 'Tasks' table...\n\n\`\`\`sql\nCREATE TABLE users (\n  id UUID PRIMARY KEY,\n  email VARCHAR(255) UNIQUE,\n  role VARCHAR(50)\n);\n\nCREATE TABLE projects (\n  id UUID PRIMARY KEY,\n  name VARCHAR(255),\n  owner_id UUID REFERENCES users(id)\n);\n\`\`\`\n\n> Schema validation passed.`;
                                        agent.logs.push(`Output generated: Database Schema designed.`);
                                    } else if (task.title.includes('Authentication')) {
                                        outputContent = `> Installing dependencies...\n$ npm install firebase @firebase/auth\n\n> Configuring Firebase SDK...\n> Implementing 'useAuth' hook...\n> Creating Login component...\n> Creating Signup component...\n\n**Status:**\n- Auth Context: ✅ Implemented\n- Protected Routes: ✅ Configured\n- Login/Signup UI: ✅ Ready`;
                                        agent.logs.push(`Output generated: Authentication implemented.`);
                                    } else if (task.title.includes('Dashboard')) {
                                        outputContent = `> Scaffolding Dashboard layout...\n> Creating Sidebar component...\n> Creating Header component...\n> Integrating 'Recharts' for data visualization...\n\n$ git commit -m "feat: add dashboard layout"\n\n**Preview:** Dashboard is responsive and includes a collapsible sidebar.`;
                                        agent.logs.push(`Output generated: Dashboard layout created.`);
                                    } else if (task.title.includes('API') || task.title.includes('Backend')) {
                                        outputContent = `> Initializing Express router...\n> Defining API endpoints...\n> Implementing middleware for auth...\n\n\`\`\`typescript\nrouter.get('/projects', authMiddleware, getProjects);\nrouter.post('/projects', authMiddleware, createProject);\n\`\`\`\n\n> Running API tests...\n> Tests passed (12/12).`;
                                        agent.logs.push(`Output generated: Backend API implemented.`);
                                    } else {
                                        outputContent = `> Analyzing task requirements...\n> Checking out branch 'feature/${task.title.toLowerCase().replace(/\s+/g, '-')}'...\n> Writing code...\n> Running unit tests...\n\n$ npm test\nPASS src/components/${task.title.replace(/\s+/g, '')}.test.tsx\n\n> Committing changes...\n> Pushing to remote...`;
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

                                            // Sanitize title for filename
                                            const sanitizedTitle = task.title.replace(/[^a-zA-Z0-9]/g, '');

                                            if (task.type === 'frontend') {
                                                filePath = `${rootPath}/src/components/${sanitizedTitle}.tsx`;
                                                // Also update App.tsx to include it? (Too complex for now, user just wants to see it running)
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
                                                            dependencies: { "react": "^18.2.0", "react-dom": "^18.2.0" },
                                                            devDependencies: { "@types/react": "^18.2.66", "@types/react-dom": "^18.2.22", "@vitejs/plugin-react": "^4.2.1", "vite": "^5.2.0" }
                                                        }, null, 2)
                                                    },
                                                    {
                                                        path: `${rootPath}/vite.config.ts`,
                                                        content: `import { defineConfig } from 'vite'; import react from '@vitejs/plugin-react'; export default defineConfig({ plugins: [react()] });`
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
                                                        content: `import { useState } from 'react'; function App() { return (<div className="p-10"><h1>Generated App Running! 🚀</h1><p>The agents have successfully set up this environment.</p></div>); } export default App;`
                                                    },
                                                    {
                                                        path: `${rootPath}/src/index.css`,
                                                        content: `@tailwind base; @tailwind components; @tailwind utilities; body { font-family: system-ui; background: #111; color: #fff; }`
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


