import { useState } from 'react';
import { useAgentStore, Task } from '../store/agentStore';
import { motion } from 'framer-motion';
import { Users, Activity, Code, Bug, Layout, Terminal, CheckCircle, Clock, X, FileText, Folder, FolderOpen } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { selectDirectory, createDirectory, getDocumentsPath } from '../utils/fileSystem';

const DashboardView = () => {
    const { agents, tasks, toggleTaskSelection, toggleCategorySelection, rootPath, setProjectRoot, activeProjectId, projects } = useAgentStore();
    const location = useLocation();
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const handleSelectDirectory = async () => {
        try {
            const activeProject = projects.find(p => p.id === activeProjectId);
            const rawName = activeProject ? activeProject.name : 'Untitled-Project';
            const safeName = rawName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();

            let basePath = await selectDirectory();

            if (!basePath) {
                // User cancelled or didn't select -> Use Default
                const docsPath = await getDocumentsPath();
                if (docsPath) {
                    basePath = `${docsPath}/Speed`;
                } else {
                    return; // Cannot determine path
                }
            }

            const projectPath = `${basePath}/${safeName}`;

            // Create the directory
            await createDirectory(projectPath);
            setProjectRoot(projectPath);
        } catch (error) {
            console.error('Failed to create project directory:', error);
            alert('Failed to create project directory: ' + error);
        }
    };

    // Determine active tab from URL
    const searchParams = new URLSearchParams(location.search);
    const activeTab = searchParams.get('tab') === 'backlog' ? 'backlog' : 'meeting';

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'Product Manager': return <Users className="w-6 h-6 text-blue-400" />;
            case 'Architect': return <Layout className="w-6 h-6 text-purple-400" />;
            case 'Tech Lead': return <Terminal className="w-6 h-6 text-green-400" />;
            case 'Software Engineer': return <Code className="w-6 h-6 text-yellow-400" />;
            case 'Backend Engineer': return <Terminal className="w-6 h-6 text-orange-400" />;
            case 'QA Engineer': return <Bug className="w-6 h-6 text-red-400" />;
            default: return <Activity className="w-6 h-6 text-gray-400" />;
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex items-end justify-between">
                <div>
                    <h2 className="text-2xl font-bold mb-2 tracking-tight">
                        {activeTab === 'backlog' ? 'Project Backlog' : 'Team Meeting'}
                    </h2>
                    <p className="text-muted">
                        {activeTab === 'backlog'
                            ? 'Review and approve tasks for the team.'
                            : 'Monitor your AI team as they collaborate on your project.'}
                    </p>
                </div>

                <button
                    onClick={() => {
                        if (!window.ipcRenderer) {
                            alert('File System access is only available in the Desktop Application.\nPlease open the Electron app window to use this feature.');
                            return;
                        }
                        handleSelectDirectory();
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border hover:bg-white/5 transition-colors text-sm text-muted hover:text-white"
                    title="Select Project Folder"
                >
                    {rootPath ? (
                        <>
                            <FolderOpen className="w-4 h-4 text-primary" />
                            <span className="truncate max-w-[200px]">{rootPath}</span>
                        </>
                    ) : (
                        <>
                            <Folder className="w-4 h-4" />
                            <span>Select Project Folder</span>
                        </>
                    )}
                </button>
            </div>

            {/* Content Switcher */}
            {activeTab === 'meeting' ? (
                /* Agents Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-8">
                    {agents.map((agent, index) => {
                        const currentTask = tasks.find(t => t.id === agent.currentTaskId);
                        const lastLog = agent.logs[agent.logs.length - 1];

                        return (
                            <motion.div
                                key={agent.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center hover:border-primary/50 transition-colors group relative overflow-hidden shadow-sm"
                            >
                                {/* Status Indicator */}
                                <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${agent.status === 'working' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse' :
                                    agent.status === 'idle' ? 'bg-zinc-600' : 'bg-yellow-500'
                                    }`} />

                                <div className="w-14 h-14 rounded-xl bg-surface border border-border mb-4 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-inner">
                                    {getRoleIcon(agent.role)}
                                </div>

                                <h3 className="font-semibold text-base mb-1 text-white truncate w-full px-2" title={agent.name}>{agent.name}</h3>
                                <p className="text-xs font-medium text-primary mb-4 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/10 truncate max-w-[90%]" title={agent.role}>{agent.role}</p>

                                <div className="w-full bg-surface border border-border rounded-lg p-3 text-xs text-left">
                                    <div className="text-muted mb-1.5 flex items-center gap-1.5 font-medium">
                                        <Clock className="w-3 h-3" /> Latest Activity
                                    </div>
                                    <div className="font-mono text-zinc-300 mb-2 h-6 overflow-hidden" title={lastLog || (agent.status === 'idle' ? 'Waiting for tasks...' : 'Working...')}>
                                        <p className="truncate">{lastLog || (agent.status === 'idle' ? 'Waiting for tasks...' : 'Working...')}</p>
                                    </div>

                                    {/* Task Progress Bar */}
                                    {agent.status === 'working' && currentTask && (
                                        <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                            <motion.div
                                                className="bg-green-500 h-full rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${currentTask.progress}%` }}
                                                transition={{ duration: 0.5 }}
                                            />
                                        </div>
                                    )}
                                    {agent.status === 'working' && currentTask && (
                                        <div className="text-[10px] text-muted mt-1.5 truncate font-medium" title={currentTask.title}>
                                            {currentTask.title}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            ) : (
                /* Backlog Split Screen (Master-Detail) */
                <div className="flex h-[calc(100vh-14rem)] gap-6 pb-2">
                    {/* Left Panel: Task List */}
                    <div className="w-1/3 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                        {Array.from(new Set(tasks.filter(t => t.status === 'todo').map(t => t.category || 'Uncategorized'))).map((category) => {
                            const categoryTasks = tasks
                                .filter(t => t.status === 'todo' && (t.category || 'Uncategorized') === category)
                                .sort((a, b) => b.complexity - a.complexity);
                            const allSelected = categoryTasks.every(t => t.selected);

                            return (
                                <div key={category} className="space-y-3">
                                    <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10 border-b border-border">
                                        <h3 className="text-xs font-bold text-muted uppercase tracking-wider">{category}</h3>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleCategorySelection(category, !allSelected);
                                            }}
                                            className="text-[10px] px-2 py-1 rounded border border-border hover:bg-surface transition-colors flex items-center gap-1.5 text-muted hover:text-white"
                                        >
                                            <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${allSelected ? 'bg-primary border-primary' : 'border-zinc-600'}`}>
                                                {allSelected && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                                            </div>
                                            {allSelected ? 'Deselect Phase' : 'Select Phase'}
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {categoryTasks.map((task) => (
                                            <div
                                                key={task.id}
                                                onClick={() => setSelectedTask(task)}
                                                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 group ${selectedTask?.id === task.id
                                                    ? 'bg-primary/5 border-primary/50 shadow-sm'
                                                    : 'bg-card border-border hover:border-zinc-700'
                                                    }`}
                                            >
                                                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${task.selected
                                                    ? 'bg-primary border-primary'
                                                    : 'border-zinc-600 group-hover:border-zinc-500'
                                                    }`}>
                                                    {task.selected && <CheckCircle className="w-3 h-3 text-white" />}
                                                </div>
                                                <div>
                                                    <h4 className={`text-sm font-medium leading-tight mb-1 truncate ${task.selected ? 'text-white' : 'text-muted group-hover:text-zinc-300'}`} title={task.title}>
                                                        {task.title}
                                                    </h4>
                                                    <p className="text-[10px] text-muted line-clamp-1" title={task.description}>{task.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Panel: Task Details */}
                    <div className="flex-1 bg-card border border-border rounded-xl p-8 overflow-y-auto relative shadow-sm">
                        {selectedTask ? (
                            <div className="max-w-2xl mx-auto">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="px-3 py-1 bg-surface rounded-full text-xs font-medium text-muted border border-border">
                                        {selectedTask.category || 'Uncategorized'}
                                    </div>
                                    {selectedTask.selected && (
                                        <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold border border-primary/20 flex items-center gap-1.5">
                                            <CheckCircle className="w-3.5 h-3.5" /> Included in Scope
                                        </div>
                                    )}
                                </div>

                                <h1 className="text-3xl font-bold text-white mb-2">{selectedTask.title}</h1>

                                <div className="prose prose-invert max-w-none mb-8">
                                    <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Description</h3>
                                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{selectedTask.description}</p>

                                    {selectedTask.outputHistory && selectedTask.outputHistory.length > 0 && (
                                        <div className="mt-6 bg-surface/50 border border-primary/20 rounded-lg p-4">
                                            <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                                                <Terminal className="w-3 h-3" /> Output History
                                            </h4>
                                            <div className="space-y-4">
                                                {selectedTask.outputHistory.slice().reverse().map((output, index) => (
                                                    <div key={index} className="border-b border-primary/10 last:border-0 pb-3 last:pb-0">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-xs font-semibold text-primary">{output.author}</span>
                                                            <span className="text-[10px] text-muted">{new Date(output.timestamp).toLocaleTimeString()}</span>
                                                        </div>
                                                        <div className="prose prose-invert prose-sm max-w-none">
                                                            <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-300 bg-transparent p-0">
                                                                {output.content}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-surface rounded-lg p-4 border border-border">
                                        <div className="text-xs font-medium text-muted mb-1">Complexity</div>
                                        <div className="text-xl font-mono text-white">{selectedTask.complexity}/10</div>
                                    </div>
                                    <div className="bg-surface rounded-lg p-4 border border-border">
                                        <div className="text-xs font-medium text-muted mb-1">Status</div>
                                        <div className="text-xl capitalize text-white">{selectedTask.status}</div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-8 border-t border-border">
                                    <button
                                        onClick={() => toggleTaskSelection(selectedTask.id)}
                                        className={`flex-1 py-3.5 rounded-lg font-bold text-base flex items-center justify-center gap-2 transition-all ${selectedTask.selected
                                            ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20'
                                            : 'bg-primary text-white hover:bg-blue-600 shadow-lg shadow-primary/20 hover:scale-[1.01]'
                                            }`}
                                    >
                                        {selectedTask.selected ? (
                                            <>
                                                <X className="w-5 h-5" /> Remove from Scope
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-5 h-5" /> Include in Scope
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Write to Disk Action for Completed Tasks */}
                                {selectedTask.status === 'done' && rootPath && window.ipcRenderer && (
                                    <div className="mt-4 pt-4 border-t border-border">
                                        <button
                                            onClick={() => {
                                                // TODO: Implement actual writing logic here using writeFile
                                                // For now just alert
                                                alert(`Writing code to ${rootPath}...`);
                                            }}
                                            className="w-full py-3 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all font-medium flex items-center justify-center gap-2"
                                        >
                                            <Folder className="w-4 h-4" /> Write Code to Disk
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted opacity-50">
                                <FileText className="w-16 h-16 mb-4 stroke-1" />
                                <p className="text-lg font-medium">Select a task to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardView;
