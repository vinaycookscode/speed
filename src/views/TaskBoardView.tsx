import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MoreHorizontal, X, Terminal, User, Activity, MessageSquare, History } from 'lucide-react';
import { useAgentStore, Task, TaskStatus } from '../store/agentStore';
import { v4 as uuidv4 } from 'uuid';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
    { id: 'todo', title: 'Backlogs', color: 'bg-zinc-500' },
    { id: 'in-progress', title: 'In Progress', color: 'bg-blue-500' },
    { id: 'review', title: 'Review', color: 'bg-yellow-500' },
    { id: 'done', title: 'Done', color: 'bg-green-500' },
];

const TaskBoardView = () => {
    const { tasks, addTask, agents, assignTask, updateTaskStatus } = useAgentStore();
    const [isCreating, setIsCreating] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const toggleTaskSelection = (taskId: string) => {
        if (selectedTask?.id === taskId) {
            setSelectedTask(null);
        } else {
            const task = tasks.find(t => t.id === taskId);
            if (task) setSelectedTask(task);
        }
    };

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        const newStatus = destination.droppableId as TaskStatus;
        updateTaskStatus(draggableId, newStatus);
    };

    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskTitle.trim()) {
            const newTask: Task = {
                id: uuidv4(),
                title: newTaskTitle,
                description: '',
                status: 'todo',
                progress: 0,
                complexity: 5,
                dependencies: [],
                comments: [],
                history: [],
                outputHistory: []
            };
            addTask(newTask);
            setNewTaskTitle('');
            setIsCreating(false);
        }
    };

    const assignedAgent = selectedTask?.assignedTo ? agents.find(a => a.id === selectedTask.assignedTo) : null;

    return (
        <motion.div
            className="h-full flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="flex justify-between items-center mb-6 px-1">
                <h1 className="text-2xl font-bold tracking-tight">Scrum Board</h1>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/20"
                >
                    <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Task</span>
                </button>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 flex gap-6 overflow-hidden">
                    {/* Board Columns */}
                    <div className={`flex-1 overflow-x-auto pb-4 transition-all duration-300 ${selectedTask ? 'w-2/3' : 'w-full'}`}>
                        <div className="flex gap-4 h-full min-w-full">
                            {COLUMNS.map((column) => (
                                <div key={column.id} className="flex-1 flex flex-col bg-surface/50 rounded-xl border border-border h-full min-w-[280px]">
                                    {/* Column Header */}
                                    <div className="p-4 border-b border-border flex items-center justify-between bg-surface/80 backdrop-blur-sm rounded-t-xl sticky top-0 z-10">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${column.color}`} />
                                            <h2 className="font-medium text-sm flex items-center gap-2">
                                                {column.title}
                                            </h2>
                                            <span className="text-xs text-muted bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                                {tasks.filter(t => t.status === column.id).length}
                                            </span>
                                        </div>
                                        <button className="text-muted hover:text-white transition-colors">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Tasks List */}
                                    <Droppable droppableId={column.id}>
                                        {(provided) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar"
                                            >
                                                <AnimatePresence>
                                                    {tasks
                                                        .filter((task) => task.status === column.id)
                                                        .map((task, index) => (
                                                            <Draggable key={task.id} draggableId={task.id} index={index}>
                                                                {(provided, snapshot) => (
                                                                    <motion.div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        style={{ ...provided.draggableProps.style }}
                                                                        onClick={() => toggleTaskSelection(task.id)}
                                                                        initial={{ opacity: 0, y: 10 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        transition={{ duration: 0.2 }}
                                                                        className={`bg-card/80 backdrop-blur-sm p-4 rounded-lg border border-white/5 group hover:border-primary/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all cursor-pointer relative overflow-hidden ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-primary rotate-2 scale-105 z-50' : ''}`}
                                                                    >
                                                                        {/* Hover Glow Effect */}
                                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />

                                                                        <div className="flex justify-between items-start mb-2 relative z-10">
                                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${task.category === 'Architecture' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                                                task.category === 'Phase 1: Core Features' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                                    'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                                                                }`}>
                                                                                {task.category || 'General'}
                                                                            </span>
                                                                            <div className={`w-2 h-2 rounded-full ${task.complexity >= 8 ? 'bg-red-500' : task.complexity >= 5 ? 'bg-yellow-500' : 'bg-green-500'}`} title={`Complexity: ${task.complexity}`} />
                                                                        </div>

                                                                        <h4 className="font-medium text-sm text-zinc-100 mb-3 leading-snug group-hover:text-primary transition-colors relative z-10">{task.title}</h4>

                                                                        <div className="flex items-center justify-between relative z-10">
                                                                            {task.assignedTo ? (
                                                                                <div className="flex items-center gap-1.5 bg-surface/50 border border-white/10 px-2 py-1 rounded text-[10px] text-muted">
                                                                                    <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[8px] font-bold">
                                                                                        {agents.find(a => a.id === task.assignedTo)?.name[0]}
                                                                                    </div>
                                                                                    <span className="truncate max-w-[60px]" title={agents.find(a => a.id === task.assignedTo)?.name}>
                                                                                        {agents.find(a => a.id === task.assignedTo)?.name}
                                                                                    </span>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-[10px] text-muted/50 italic px-1">Unassigned</span>
                                                                            )}

                                                                            {/* Status Badge */}
                                                                            <div className={`text-[10px] px-1.5 py-0.5 rounded border ${task.status === 'done' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                                                task.status === 'in-progress' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                                                    task.status === 'review' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                                                        'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                                                                }`}>
                                                                                {task.status.replace('-', ' ')}
                                                                            </div>
                                                                        </div>

                                                                        {/* Progress Bar */}
                                                                        {(task.status === 'in-progress' || task.status === 'review') && (
                                                                            <div className="w-full bg-zinc-800/50 rounded-full h-1 mt-3 overflow-hidden relative z-10">
                                                                                <motion.div
                                                                                    className={`${task.status === 'review' ? 'bg-yellow-500' : 'bg-blue-500'} h-full rounded-full`}
                                                                                    initial={{ width: 0 }}
                                                                                    animate={{ width: `${task.progress}%` }}
                                                                                    transition={{ duration: 0.5 }}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </motion.div>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                </AnimatePresence>
                                                {provided.placeholder}

                                                {column.id === 'todo' && isCreating && (
                                                    <motion.form
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        onSubmit={handleCreateTask}
                                                        className="bg-surface border border-primary/50 p-4 rounded-lg shadow-lg"
                                                    >
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            value={newTaskTitle}
                                                            onChange={(e) => setNewTaskTitle(e.target.value)}
                                                            placeholder="Task title..."
                                                            className="w-full bg-transparent border-none focus:outline-none text-sm mb-3 placeholder:text-muted/50"
                                                        />
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsCreating(false)}
                                                                className="text-xs text-muted hover:text-white px-2 py-1 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="submit"
                                                                className="text-xs bg-primary text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                                                            >
                                                                Add
                                                            </button>
                                                        </div>
                                                    </motion.form>
                                                )}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </DragDropContext >

            {/* Task Detail Pane (Slide-over) */}
            <AnimatePresence>
                {
                    selectedTask && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => toggleTaskSelection(selectedTask.id)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                            />
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="fixed right-0 top-0 h-full w-[500px] glass border-l border-white/10 z-50 p-8 shadow-2xl overflow-y-auto"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${selectedTask.status === 'done' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                        selectedTask.status === 'in-progress' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                            selectedTask.status === 'review' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                        }`}>
                                        {selectedTask.status.toUpperCase().replace('-', ' ')}
                                    </div>
                                    <button onClick={() => toggleTaskSelection(selectedTask.id)} className="text-muted hover:text-white transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <h2 className="text-3xl font-bold text-white mb-2 leading-tight">{selectedTask.title}</h2>

                                <div className="prose prose-invert max-w-none mb-8">
                                    <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Description</h3>
                                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{selectedTask.description || "No description provided."}</p>

                                    {selectedTask.outputHistory && selectedTask.outputHistory.length > 0 && (
                                        <div className="mt-4 bg-surface/50 border border-primary/20 rounded-lg p-3">
                                            <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                                                <Terminal className="w-3 h-3" /> Output History
                                            </h4>
                                            <div className="space-y-3">
                                                {selectedTask.outputHistory.slice().reverse().map((output, index) => (
                                                    <div key={index} className="border-b border-primary/10 last:border-0 pb-2 last:pb-0">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-xs font-semibold text-primary">{output.author}</span>
                                                            <span className="text-[10px] text-muted">{new Date(output.timestamp).toLocaleTimeString()}</span>
                                                        </div>
                                                        <div className="prose prose-invert prose-sm max-w-none">
                                                            <pre className="whitespace-pre-wrap font-mono text-xs text-zinc-300 bg-transparent p-0">
                                                                {output.content}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Comments / History */}
                                <div>
                                    <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Activity History</h3>
                                    <div className="space-y-4 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[1px] before:bg-zinc-800">
                                        {selectedTask.history.map((item, i) => (
                                            <div key={i} className="flex gap-4 relative">
                                                <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0 z-10">
                                                    <div className="w-2 h-2 rounded-full bg-zinc-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-zinc-300">
                                                        <span className="font-semibold text-white">{item.by}</span> moved to <span className="text-primary">{item.status}</span>
                                                    </p>
                                                    <p className="text-xs text-muted mt-0.5">{new Date(item.timestamp).toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Comment Input */}
                                <div className="mt-6">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Add a comment..."
                                            className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    // Handle comment submission (mock for now)
                                                    e.currentTarget.value = '';
                                                }
                                            }}
                                        />
                                        <button className="bg-primary hover:bg-blue-600 text-white p-2 rounded-lg transition-colors">
                                            <MessageSquare className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )
                }
            </AnimatePresence >
        </motion.div >
    );
};

export default TaskBoardView;
