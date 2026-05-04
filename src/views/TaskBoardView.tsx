import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, X, Terminal, MessageSquare, ChevronDown,
    Database, Server, Globe, Wrench, FlaskConical, Box, Layers3, Code,
    ArrowRight,
} from 'lucide-react';
import { useAgentStore, Task, TaskStatus } from '../store/agentStore';
import { v4 as uuidv4 } from 'uuid';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

// ─── Type config (mirrors DashboardView) ────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; icon: any; pill: string; dot: string }> = {
    setup:        { label: 'Setup',        icon: Wrench,       pill: 'bg-slate-500/15 text-slate-300 border-slate-500/25',   dot: 'bg-slate-400' },
    architecture: { label: 'Architecture', icon: Layers3,      pill: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25', dot: 'bg-indigo-400' },
    database:     { label: 'Database',     icon: Database,     pill: 'bg-violet-500/15 text-violet-300 border-violet-500/25', dot: 'bg-violet-400' },
    backend:      { label: 'Backend',      icon: Server,       pill: 'bg-blue-500/15 text-blue-300 border-blue-500/25',       dot: 'bg-blue-400' },
    api:          { label: 'API',          icon: Globe,        pill: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',       dot: 'bg-cyan-400' },
    frontend:     { label: 'Frontend',     icon: Code,         pill: 'bg-amber-500/15 text-amber-300 border-amber-500/25',    dot: 'bg-amber-400' },
    test:         { label: 'Test',         icon: FlaskConical, pill: 'bg-rose-500/15 text-rose-300 border-rose-500/25',       dot: 'bg-rose-400' },
    devops:       { label: 'DevOps',       icon: Box,          pill: 'bg-orange-500/15 text-orange-300 border-orange-500/25', dot: 'bg-orange-400' },
};

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
    { id: 'todo',        title: 'Backlog',      color: 'bg-zinc-500'   },
    { id: 'in-progress', title: 'In Progress',  color: 'bg-blue-500'   },
    { id: 'review',      title: 'Review',       color: 'bg-yellow-500' },
    { id: 'done',        title: 'Done',         color: 'bg-green-500'  },
];

// ─── Description renderer (shared with DashboardView) ────────────────────────

function parseDescription(raw: string) {
    const splitIdx = raw.search(/ACCEPTANCE CRITERIA:/i);
    const body = splitIdx !== -1 ? raw.slice(0, splitIdx).trim() : raw.trim();
    const criteriaBlock = splitIdx !== -1 ? raw.slice(splitIdx + 'ACCEPTANCE CRITERIA:'.length).trim() : '';
    const criteria = criteriaBlock
        ? criteriaBlock.split('\n').map(l => l.trim()).filter(l => l).map(l => l.replace(/^[✓•\-\*]\s*/, ''))
        : [];
    return { body, criteria };
}

function InlineText({ text }: { text: string }) {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**'))
                    return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
                if (part.startsWith('`') && part.endsWith('`'))
                    return <code key={i} className="text-zinc-200 bg-zinc-800 px-1.5 py-0.5 rounded text-[11px] font-mono border border-zinc-700">{part.slice(1, -1)}</code>;
                return <span key={i}>{part}</span>;
            })}
        </>
    );
}

function DescriptionBody({ text }: { text: string }) {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;

    const flushList = () => {
        if (!listBuffer) return;
        if (listBuffer.type === 'ul') {
            elements.push(
                <ul key={elements.length} className="space-y-1.5 my-2 ml-1">
                    {listBuffer.items.map((item, i) => (
                        <li key={i} className="flex gap-2.5 text-sm text-zinc-300 leading-relaxed">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0" />
                            <span><InlineText text={item} /></span>
                        </li>
                    ))}
                </ul>
            );
        } else {
            elements.push(
                <ol key={elements.length} className="space-y-1.5 my-2 ml-1">
                    {listBuffer.items.map((item, i) => (
                        <li key={i} className="flex gap-2.5 text-sm text-zinc-300 leading-relaxed">
                            <span className="mt-0.5 text-xs font-mono text-zinc-500 shrink-0 w-4">{i + 1}.</span>
                            <span><InlineText text={item} /></span>
                        </li>
                    ))}
                </ol>
            );
        }
        listBuffer = null;
    };

    lines.forEach((raw, idx) => {
        const line = raw.trim();
        if (!line) { flushList(); elements.push(<div key={`sp-${idx}`} className="h-2" />); return; }

        const ulMatch = line.match(/^[-•]\s+(.+)/);
        const olMatch = line.match(/^\d+\.\s+(.+)/);

        if (ulMatch) {
            if (listBuffer?.type !== 'ul') { flushList(); listBuffer = { type: 'ul', items: [] }; }
            listBuffer.items.push(ulMatch[1]);
            return;
        }
        if (olMatch) {
            if (listBuffer?.type !== 'ol') { flushList(); listBuffer = { type: 'ol', items: [] }; }
            listBuffer.items.push(olMatch[1]);
            return;
        }

        if (listBuffer && listBuffer.items.length > 0) {
            listBuffer.items[listBuffer.items.length - 1] += ' ' + line;
            return;
        }

        flushList();

        const isHeading = (line.startsWith('**') && line.endsWith('**')) || (line.endsWith(':') && line.length < 80 && !ulMatch && !olMatch);
        if (isHeading) {
            elements.push(
                <p key={idx} className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-4 mb-2 first:mt-0">
                    <InlineText text={line.replace(/^[*]+|[*]+$/g, '')} />
                </p>
            );
            return;
        }

        elements.push(
            <p key={idx} className="text-sm text-zinc-300 leading-relaxed">
                <InlineText text={line} />
            </p>
        );
    });

    flushList();
    return <div className="space-y-0.5">{elements}</div>;
}

// ─── Output renderer: highlight code fences ──────────────────────────────────

function OutputContent({ content }: { content: string }) {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return (
        <div className="space-y-2">
            {parts.map((part, i) => {
                if (part.startsWith('```')) {
                    const code = part.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
                    return (
                        <pre key={i} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[11px] font-mono text-zinc-300 whitespace-pre-wrap overflow-x-auto">
                            {code}
                        </pre>
                    );
                }
                return part ? <p key={i} className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{part}</p> : null;
            })}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

const TaskBoardView = () => {
    const { tasks, addTask, agents, assignTask, updateTaskStatus, addComment } = useAgentStore();
    const [isCreating, setIsCreating] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    const [agentFilter, setAgentFilter] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');
    const [reassignOpen, setReassignOpen] = useState(false);
    const reassignRef = useRef<HTMLDivElement>(null);

    // Keep selectedTask in sync with store updates
    const liveTask = selectedTask ? (tasks.find(t => t.id === selectedTask.id) ?? selectedTask) : null;
    const { body: descBody, criteria } = liveTask ? parseDescription(liveTask.description) : { body: '', criteria: [] };

    const presentTypes = Array.from(new Set(tasks.map(t => t.type).filter(Boolean))) as string[];
    const activeAgents = agents.filter(a => a.role !== 'Product Manager');

    const filteredTasks = (status: TaskStatus) =>
        tasks.filter(t => {
            if (t.status !== status) return false;
            if (typeFilter && t.type !== typeFilter) return false;
            if (agentFilter && t.assignedTo !== agentFilter) return false;
            return true;
        });

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        if (result.destination.droppableId === result.source.droppableId && result.destination.index === result.source.index) return;
        updateTaskStatus(result.draggableId, result.destination.droppableId as TaskStatus);
    };

    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        addTask({
            id: uuidv4(),
            title: newTaskTitle.trim(),
            description: '',
            status: 'todo',
            progress: 0,
            complexity: 5,
            dependencies: [],
            comments: [],
            history: [],
            outputHistory: [],
        });
        setNewTaskTitle('');
        setIsCreating(false);
    };

    const handleAddComment = () => {
        if (!commentText.trim() || !liveTask) return;
        addComment(liveTask.id, commentText.trim(), 'You');
        setCommentText('');
    };

    const handleReassign = (agentId: string) => {
        if (!liveTask) return;
        assignTask(liveTask.id, agentId);
        setReassignOpen(false);
        // Refresh the selected task reference
        setSelectedTask(tasks.find(t => t.id === liveTask.id) ?? liveTask);
    };

    return (
        <motion.div
            className="h-full flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* Header + filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 px-1">
                <h1 className="text-xl font-bold tracking-tight">Scrum Board</h1>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Type filter */}
                    {presentTypes.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                            <button
                                onClick={() => setTypeFilter(null)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${!typeFilter ? 'bg-zinc-700 border-zinc-600 text-white' : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'}`}
                            >All</button>
                            {presentTypes.map(type => {
                                const cfg = TYPE_CONFIG[type];
                                if (!cfg) return null;
                                return (
                                    <button
                                        key={type}
                                        onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${typeFilter === type ? cfg.pill : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'}`}
                                    >{cfg.label}</button>
                                );
                            })}
                        </div>
                    )}

                    {/* Agent filter */}
                    {activeAgents.length > 0 && (
                        <select
                            value={agentFilter ?? ''}
                            onChange={e => setAgentFilter(e.target.value || null)}
                            className="text-[11px] bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-400 focus:outline-none focus:border-zinc-600 cursor-pointer"
                        >
                            <option value="">All agents</option>
                            {activeAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    )}

                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-lg shadow-primary/20"
                    >
                        <Plus className="w-3.5 h-3.5" /> New Task
                    </button>
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 overflow-x-auto pb-4">
                    <div className="flex gap-4 h-full min-w-full" style={{ minWidth: 900 }}>
                        {COLUMNS.map(column => {
                            const colTasks = filteredTasks(column.id);
                            return (
                                <div key={column.id} className="flex-1 flex flex-col bg-surface/50 rounded-xl border border-border h-full min-w-[240px]">
                                    {/* Column header */}
                                    <div className="p-3.5 border-b border-border flex items-center gap-2 bg-surface/80 backdrop-blur-sm rounded-t-xl sticky top-0 z-10">
                                        <div className={`w-2 h-2 rounded-full ${column.color}`} />
                                        <h2 className="font-medium text-sm flex-1">{column.title}</h2>
                                        <motion.span
                                            key={colTasks.length}
                                            initial={{ scale: 0.8 }}
                                            animate={{ scale: 1 }}
                                            className="text-xs text-muted bg-white/5 px-2 py-0.5 rounded-full border border-white/5 tabular-nums"
                                        >
                                            {colTasks.length}
                                        </motion.span>
                                    </div>

                                    <Droppable droppableId={column.id}>
                                        {(provided) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar"
                                            >
                                                <AnimatePresence>
                                                    {colTasks.map((task, index) => {
                                                        const typeCfg = task.type ? TYPE_CONFIG[task.type] : null;
                                                        const assignedAgent = task.assignedTo ? agents.find(a => a.id === task.assignedTo) : null;
                                                        return (
                                                            <Draggable key={task.id} draggableId={task.id} index={index}>
                                                                {(provided, snapshot) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        style={provided.draggableProps.style}
                                                                        onClick={() => setSelectedTask(task)}
                                                                        className={`bg-card/80 backdrop-blur-sm p-3.5 rounded-xl border border-white/5 group hover:border-primary/30 hover:shadow-[0_0_12px_rgba(59,130,246,0.08)] transition-all cursor-pointer relative overflow-hidden ${
                                                                            snapshot.isDragging ? 'shadow-2xl ring-2 ring-primary rotate-1 scale-[1.02] z-50' : ''
                                                                        }`}
                                                                    >
                                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />

                                                                        <div className="flex items-start justify-between gap-2 mb-2 relative z-10">
                                                                            {typeCfg ? (
                                                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border ${typeCfg.pill}`}>
                                                                                    <span className={`w-1 h-1 rounded-full ${typeCfg.dot}`} />
                                                                                    {typeCfg.label}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[9px] px-1.5 py-0.5 rounded border bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
                                                                                    {task.category || 'General'}
                                                                                </span>
                                                                            )}
                                                                            <div className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${task.complexity >= 8 ? 'bg-red-500' : task.complexity >= 5 ? 'bg-yellow-500' : 'bg-green-500'}`} title={`Complexity: ${task.complexity}`} />
                                                                        </div>

                                                                        <h4 className="font-medium text-sm text-zinc-100 mb-3 leading-snug group-hover:text-primary transition-colors relative z-10 line-clamp-2">{task.title}</h4>

                                                                        <div className="flex items-center justify-between relative z-10 gap-2">
                                                                            {assignedAgent ? (
                                                                                <div className="flex items-center gap-1.5 bg-surface/50 border border-white/10 px-2 py-1 rounded text-[10px] text-muted max-w-[120px]">
                                                                                    <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[8px] font-bold shrink-0">
                                                                                        {assignedAgent.name[0]}
                                                                                    </div>
                                                                                    <span className="truncate">{assignedAgent.name}</span>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-[10px] text-muted/40 italic">Unassigned</span>
                                                                            )}
                                                                            <div className={`text-[9px] px-1.5 py-0.5 rounded border shrink-0 ${
                                                                                task.status === 'done'        ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                                                task.status === 'in-progress' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                                                task.status === 'review'      ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                                                                               'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                                                            }`}>
                                                                                {task.status.replace('-', ' ')}
                                                                            </div>
                                                                        </div>

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
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        );
                                                    })}
                                                </AnimatePresence>
                                                {provided.placeholder}

                                                {column.id === 'todo' && isCreating && (
                                                    <motion.form
                                                        initial={{ opacity: 0, y: -8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        onSubmit={handleCreateTask}
                                                        className="bg-surface border border-primary/40 p-3.5 rounded-xl shadow-lg"
                                                    >
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            value={newTaskTitle}
                                                            onChange={e => setNewTaskTitle(e.target.value)}
                                                            placeholder="Task title…"
                                                            className="w-full bg-transparent border-none focus:outline-none text-sm mb-3 placeholder:text-muted/40"
                                                        />
                                                        <div className="flex justify-end gap-2">
                                                            <button type="button" onClick={() => setIsCreating(false)} className="text-xs text-muted hover:text-white px-2 py-1 transition-colors">Cancel</button>
                                                            <button type="submit" className="text-xs bg-primary text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors">Add</button>
                                                        </div>
                                                    </motion.form>
                                                )}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </DragDropContext>

            {/* Task detail slide-over */}
            <AnimatePresence>
                {liveTask && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedTask(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 h-full w-[520px] glass border-l border-white/10 z-50 flex flex-col shadow-2xl"
                        >
                            {/* Panel header */}
                            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5 shrink-0">
                                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                    liveTask.status === 'done'        ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                    liveTask.status === 'in-progress' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                    liveTask.status === 'review'      ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                                        'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                }`}>
                                    {liveTask.status.toUpperCase().replace('-', ' ')}
                                </div>
                                <button onClick={() => setSelectedTask(null)} className="text-muted hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Scrollable body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white leading-tight mb-3">{liveTask.title}</h2>

                                    {/* Type + Agent row */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {liveTask.type && TYPE_CONFIG[liveTask.type] && (() => {
                                            const cfg = TYPE_CONFIG[liveTask.type!];
                                            const Icon = cfg.icon;
                                            return (
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${cfg.pill}`}>
                                                    <Icon className="w-3 h-3" />{cfg.label}
                                                </span>
                                            );
                                        })()}

                                        {/* Agent badge with reassign */}
                                        <div className="relative" ref={reassignRef}>
                                            <button
                                                onClick={() => setReassignOpen(v => !v)}
                                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border border-zinc-700 bg-zinc-900 hover:border-zinc-600 text-zinc-300 transition-colors"
                                            >
                                                {liveTask.assignedTo ? (
                                                    <>
                                                        <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                                                            {agents.find(a => a.id === liveTask.assignedTo)?.name[0]}
                                                        </div>
                                                        {agents.find(a => a.id === liveTask.assignedTo)?.name}
                                                    </>
                                                ) : (
                                                    <span className="text-zinc-500">Unassigned</span>
                                                )}
                                                <ChevronDown className="w-3 h-3 text-zinc-600" />
                                            </button>
                                            <AnimatePresence>
                                                {reassignOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -4 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -4 }}
                                                        className="absolute top-full mt-1 left-0 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-10 min-w-[160px] py-1 overflow-hidden"
                                                    >
                                                        {activeAgents.map(agent => (
                                                            <button
                                                                key={agent.id}
                                                                onClick={() => handleReassign(agent.id)}
                                                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-zinc-800 transition-colors ${agent.id === liveTask.assignedTo ? 'text-primary' : 'text-zinc-300'}`}
                                                            >
                                                                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                                                                    {agent.name[0]}
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium">{agent.name}</p>
                                                                    <p className="text-zinc-600 text-[10px]">{agent.role}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>

                                {/* Technical Specification */}
                                {descBody && (
                                    <div>
                                        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Technical Specification</h3>
                                        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
                                            <DescriptionBody text={descBody} />
                                        </div>
                                    </div>
                                )}

                                {/* Acceptance Criteria */}
                                {criteria.length > 0 && (
                                    <div>
                                        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Acceptance Criteria</h3>
                                        <div className="space-y-1.5">
                                            {criteria.map((c, i) => (
                                                <div key={i} className="flex items-start gap-2.5 bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-2.5">
                                                    <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                    <p className="text-xs text-zinc-300 leading-relaxed"><InlineText text={c} /></p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Dependencies */}
                                {liveTask.dependencies && liveTask.dependencies.length > 0 && (() => {
                                    const depTasks = liveTask.dependencies
                                        .map(id => tasks.find(t => t.id === id))
                                        .filter(Boolean) as Task[];
                                    return depTasks.length > 0 ? (
                                        <div>
                                            <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                <ArrowRight className="w-3 h-3" /> Dependencies ({depTasks.length})
                                            </h3>
                                            <div className="space-y-1.5">
                                                {depTasks.map(dep => {
                                                    const depCfg = dep.type ? TYPE_CONFIG[dep.type] : null;
                                                    return (
                                                        <div key={dep.id} className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2">
                                                            {depCfg && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${depCfg.dot}`} />}
                                                            <p className="text-xs text-zinc-400 flex-1 truncate">{dep.title}</p>
                                                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${
                                                                dep.status === 'done' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                                                            }`}>{dep.status}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : null;
                                })()}

                                {/* Output history */}
                                {liveTask.outputHistory && liveTask.outputHistory.length > 0 && (
                                    <div>
                                        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <Terminal className="w-3 h-3" /> Output History
                                        </h3>
                                        <div className="space-y-3">
                                            {liveTask.outputHistory.slice().reverse().map((output, i) => (
                                                <div key={i} className="border border-zinc-800 rounded-xl p-3 bg-zinc-900/40">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-semibold text-primary">{output.author}</span>
                                                        <span className="text-[10px] text-zinc-600">{new Date(output.timestamp).toLocaleTimeString()}</span>
                                                    </div>
                                                    <OutputContent content={output.content} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Activity history */}
                                {liveTask.history.length > 0 && (
                                    <div>
                                        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Activity</h3>
                                        <div className="space-y-3 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-zinc-800">
                                            {liveTask.history.map((item, i) => (
                                                <div key={i} className="flex gap-3 relative">
                                                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0 z-10">
                                                        <div className="w-2 h-2 rounded-full bg-zinc-500" />
                                                    </div>
                                                    <div className="pt-1">
                                                        <p className="text-sm text-zinc-300">
                                                            <span className="font-semibold text-white">{item.by}</span> moved to <span className="text-primary">{item.status}</span>
                                                        </p>
                                                        <p className="text-xs text-zinc-600 mt-0.5">{new Date(item.timestamp).toLocaleTimeString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Comments */}
                                {liveTask.comments.length > 0 && (
                                    <div>
                                        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                            <MessageSquare className="w-3 h-3" /> Comments
                                        </h3>
                                        <div className="space-y-2">
                                            {liveTask.comments.map((c, i) => (
                                                <div key={i} className="flex gap-2.5">
                                                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary shrink-0 mt-0.5">
                                                        {c.author[0]}
                                                    </div>
                                                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 flex-1">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-semibold text-white">{c.author}</span>
                                                            <span className="text-[10px] text-zinc-600">{new Date(c.timestamp).toLocaleTimeString()}</span>
                                                        </div>
                                                        <p className="text-sm text-zinc-300">{c.text}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Comment input — sticky at bottom */}
                            <div className="p-4 border-t border-white/5 shrink-0">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={commentText}
                                        onChange={e => setCommentText(e.target.value)}
                                        placeholder="Add a comment…"
                                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-600"
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                                    />
                                    <button
                                        onClick={handleAddComment}
                                        disabled={!commentText.trim()}
                                        className="bg-primary hover:bg-blue-600 disabled:opacity-40 text-white p-2.5 rounded-xl transition-colors"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default TaskBoardView;
