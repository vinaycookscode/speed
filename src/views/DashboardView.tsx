import { useState, useMemo } from 'react';
import { useAgentStore, Task } from '../store/agentStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Activity, Code, Bug, Layout, Terminal, Clock,
    FileText, Folder, FolderOpen, ChevronDown, ChevronRight,
    CheckCircle2, Circle, Rocket, Search, X, Database,
    Server, Globe, Wrench, FlaskConical, Box, Layers3,
    Zap, ArrowRight, BarChart3, Shield,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { selectDirectory, createDirectory, getDocumentsPath } from '../utils/fileSystem';

// ─── Task type config ────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; icon: any; pill: string; dot: string }> = {
    setup:        { label: 'Setup',        icon: Wrench,      pill: 'bg-slate-500/15 text-slate-300 border-slate-500/25',   dot: 'bg-slate-400' },
    architecture: { label: 'Architecture', icon: Layers3,     pill: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25', dot: 'bg-indigo-400' },
    database:     { label: 'Database',     icon: Database,    pill: 'bg-violet-500/15 text-violet-300 border-violet-500/25', dot: 'bg-violet-400' },
    backend:      { label: 'Backend',      icon: Server,      pill: 'bg-blue-500/15 text-blue-300 border-blue-500/25',       dot: 'bg-blue-400' },
    api:          { label: 'API',          icon: Globe,       pill: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',       dot: 'bg-cyan-400' },
    frontend:     { label: 'Frontend',     icon: Code,        pill: 'bg-amber-500/15 text-amber-300 border-amber-500/25',    dot: 'bg-amber-400' },
    test:         { label: 'Test',         icon: FlaskConical,pill: 'bg-rose-500/15 text-rose-300 border-rose-500/25',       dot: 'bg-rose-400' },
    devops:       { label: 'DevOps',       icon: Box,         pill: 'bg-orange-500/15 text-orange-300 border-orange-500/25', dot: 'bg-orange-400' },
};

const COMPLEXITY_COLOR = (n: number) =>
    n <= 3 ? 'text-emerald-400' : n <= 6 ? 'text-amber-400' : 'text-rose-400';

// ─── Description renderer ────────────────────────────────────────────────────

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
                <ul key={elements.length} className="space-y-1.5 my-3 ml-1">
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
                <ol key={elements.length} className="space-y-1.5 my-3 ml-1">
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

        // Continuation: non-empty line with no prefix while a list is open → append to last item
        if (listBuffer && listBuffer.items.length > 0) {
            listBuffer.items[listBuffer.items.length - 1] += ' ' + line;
            return;
        }

        flushList();

        // Section heading heuristic: short line ending in ':' or wrapped in **
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

// ─── Agent grid card (meeting tab) ───────────────────────────────────────────

const AgentCard = ({ agent, tasks, index }: { agent: any; tasks: Task[]; index: number }) => {
    const currentTask = tasks.find(t => t.id === agent.currentTaskId);
    const lastLog = agent.logs[agent.logs.length - 1];
    const getRoleIcon = (role: string) => {
        const cls = 'w-6 h-6';
        switch (role) {
            case 'Product Manager':   return <Users className={`${cls} text-blue-400`} />;
            case 'Architect':         return <Layout className={`${cls} text-purple-400`} />;
            case 'Tech Lead':         return <Terminal className={`${cls} text-green-400`} />;
            case 'Software Engineer': return <Code className={`${cls} text-yellow-400`} />;
            case 'Backend Engineer':  return <Terminal className={`${cls} text-orange-400`} />;
            case 'QA Engineer':       return <Bug className={`${cls} text-red-400`} />;
            default:                  return <Activity className={`${cls} text-gray-400`} />;
        }
    };
    return (
        <motion.div
            key={agent.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.07 }}
            className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center hover:border-primary/50 transition-colors group relative overflow-hidden shadow-sm"
        >
            <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${
                agent.status === 'working' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse' :
                agent.status === 'error'   ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                agent.status === 'idle'    ? 'bg-zinc-600' : 'bg-yellow-500'}`} />
            <div className="w-14 h-14 rounded-xl bg-surface border border-border mb-4 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-inner">
                {getRoleIcon(agent.role)}
            </div>
            <h3 className="font-semibold text-base mb-1 text-white truncate w-full px-2">{agent.name}</h3>
            <p className="text-xs font-medium text-primary mb-4 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/10 truncate max-w-[90%]">{agent.role}</p>
            <div className="w-full bg-surface border border-border rounded-lg p-3 text-xs text-left">
                <div className="text-muted mb-1.5 flex items-center gap-1.5 font-medium"><Clock className="w-3 h-3" /> Latest Activity</div>
                <div className={`font-mono mb-2 h-6 overflow-hidden ${agent.status === 'error' ? 'text-red-400' : 'text-zinc-300'}`}>
                    <p className="truncate">{lastLog || (agent.status === 'idle' ? 'Waiting for tasks...' : 'Working...')}</p>
                </div>
                {agent.status === 'working' && currentTask && (
                    <>
                        <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <motion.div className="bg-green-500 h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${currentTask.progress}%` }} transition={{ duration: 0.5 }} />
                        </div>
                        <div className="text-[10px] text-muted mt-1.5 truncate font-medium">{currentTask.title}</div>
                    </>
                )}
            </div>
        </motion.div>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

const DashboardView = () => {
    const { agents, tasks, epics, stories, toggleTaskSelection, toggleEpicSelection, selectAllTasks, deselectAllTasks, approvePlan, rootPath, setProjectRoot, activeProjectId, projects, phase } = useAgentStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [collapsedStories, setCollapsedStories] = useState<Set<string>>(new Set());
    const [collapsedEpics, setCollapsedEpics] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    const [highlightedDeps, setHighlightedDeps] = useState<Set<string>>(new Set());

    const searchParams = new URLSearchParams(location.search);
    const activeTab = searchParams.get('tab') === 'backlog' ? 'backlog' : 'meeting';

    const handleSelectDirectory = async () => {
        try {
            const activeProject = projects.find(p => p.id === activeProjectId);
            const rawName = activeProject ? activeProject.name : 'Untitled-Project';
            const safeName = rawName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
            let basePath = await selectDirectory();
            if (!basePath) {
                const docsPath = await getDocumentsPath();
                if (docsPath) basePath = `${docsPath}/Speed`;
                else return;
            }
            const projectPath = `${basePath}/${safeName}`;
            await createDirectory(projectPath);
            setProjectRoot(projectPath);
        } catch (error) {
            console.error('Failed to create project directory:', error);
        }
    };

    const handleApprove = () => {
        approvePlan();
        navigate('/task-board');
    };

    // ── Build epic-grouped tree ──────────────────────────────────────────────
    const todoTasks = useMemo(() => tasks.filter(t => t.status === 'todo'), [tasks]);

    const filteredTasks = useMemo(() => {
        return todoTasks.filter(t => {
            const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
            const matchesType = !typeFilter || t.type === typeFilter;
            return matchesSearch && matchesType;
        });
    }, [todoTasks, search, typeFilter]);

    const epicTree = useMemo(() => {
        if (epics.length === 0) {
            // Fallback: group by category
            const cats = Array.from(new Set(filteredTasks.map(t => t.category || 'Uncategorized')));
            return cats.map(cat => ({
                id: cat,
                title: cat,
                description: '',
                stories: [{
                    id: cat,
                    epicId: cat,
                    title: '',
                    tasks: filteredTasks.filter(t => (t.category || 'Uncategorized') === cat),
                }],
            }));
        }
        return epics.map(epic => ({
            ...epic,
            stories: stories
                .filter(s => s.epicId === epic.id)
                .map(s => ({
                    ...s,
                    tasks: filteredTasks.filter(t => t.storyId === s.id),
                }))
                .filter(s => s.tasks.length > 0),
        })).filter(e => e.stories.length > 0);
    }, [epics, stories, filteredTasks]);

    const selectedCount = todoTasks.filter(t => t.selected).length;
    const totalCount = todoTasks.length;

    // All unique task types present
    const presentTypes = useMemo(() =>
        Array.from(new Set(todoTasks.map(t => t.type).filter(Boolean))) as string[],
    [todoTasks]);

    // Find epic + story for selected task
    const selectedEpic = selectedTask ? epics.find(e => e.id === selectedTask.epicId) : null;
    const selectedStory = selectedTask ? stories.find(s => s.id === selectedTask.storyId) : null;
    const { body: descBody, criteria } = selectedTask ? parseDescription(selectedTask.description) : { body: '', criteria: [] };

    const toggleStory = (id: string) => setCollapsedStories(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const toggleEpic = (id: string) => setCollapsedEpics(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="h-full flex flex-col max-w-[1600px] mx-auto">

            {/* ── Top bar ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-5 gap-4 shrink-0">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-white">
                        {activeTab === 'backlog' ? 'Project Backlog' : 'Team Activity'}
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        {activeTab === 'backlog'
                            ? `${epics.length} epics · ${stories.length} stories · ${totalCount} tasks`
                            : 'Live view of your AI agents at work'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {activeTab === 'backlog' && (
                        <>
                            <button
                                onClick={() => { if (!window.ipcRenderer) return; handleSelectDirectory(); }}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors text-xs text-zinc-400 hover:text-white"
                            >
                                {rootPath ? <FolderOpen className="w-3.5 h-3.5 text-primary" /> : <Folder className="w-3.5 h-3.5" />}
                                <span className="truncate max-w-[140px]">{rootPath || 'Select Folder'}</span>
                            </button>

                            {phase === 'approval' && selectedCount > 0 && (
                                <button
                                    onClick={handleApprove}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-900/30 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Rocket className="w-4 h-4" />
                                    Approve & Build
                                    <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{selectedCount}</span>
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── Content ─────────────────────────────────────────────────── */}
            {activeTab === 'meeting' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pb-8 overflow-y-auto">
                    {agents.map((agent, i) => <AgentCard key={agent.id} agent={agent} tasks={tasks} index={i} />)}
                </div>
            ) : (
                <div className="flex gap-5 min-h-0 flex-1">

                    {/* ── Left: Epic tree ───────────────────────────────────── */}
                    <div className="w-[380px] shrink-0 flex flex-col gap-3 min-h-0">

                        {/* Search + filter */}
                        <div className="space-y-2 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search tasks…"
                                    className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                                />
                                {search && (
                                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Type filter chips */}
                            {presentTypes.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
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
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${typeFilter === type ? cfg.pill + ' ring-1 ring-inset ring-current/20' : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'}`}
                                            >{cfg.label}</button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Task tree */}
                        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                            {epicTree.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
                                    <Search className="w-8 h-8 mb-3 opacity-40" />
                                    <p className="text-sm">No tasks match your filter</p>
                                </div>
                            ) : epicTree.map((epic, ei) => {
                                const epicCollapsed = collapsedEpics.has(epic.id);
                                const epicTaskCount = epic.stories.reduce((s, st) => s + st.tasks.length, 0);
                                const epicSelectedCount = epic.stories.reduce((s, st) => s + st.tasks.filter(t => t.selected).length, 0);

                                return (
                                    <motion.div
                                        key={epic.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: ei * 0.04 }}
                                        className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden"
                                    >
                                        {/* Epic header */}
                                        <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-zinc-800/60 transition-colors">
                                            {/* Epic scope checkbox */}
                                            <div
                                                onClick={e => { e.stopPropagation(); toggleEpicSelection(epic.id); }}
                                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                                                    epicSelectedCount === 0
                                                        ? 'border-zinc-700 hover:border-zinc-500'
                                                        : epicSelectedCount === epicTaskCount
                                                            ? 'bg-blue-500 border-blue-500'
                                                            : 'bg-blue-500/40 border-blue-500/60'
                                                }`}
                                            >
                                                {epicSelectedCount > 0 && (
                                                    epicSelectedCount === epicTaskCount
                                                        ? <CheckCircle2 className="w-3 h-3 text-white" />
                                                        : <div className="w-2 h-0.5 bg-blue-300 rounded-full" />
                                                )}
                                            </div>
                                            <button
                                                onClick={() => toggleEpic(epic.id)}
                                                className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                                            >
                                                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600/30 to-violet-600/30 border border-blue-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-blue-300">
                                                    {epic.title.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-white truncate">{epic.title}</p>
                                                    <p className="text-[10px] text-zinc-500 mt-0.5">{epicTaskCount} tasks · {epicSelectedCount} selected</p>
                                                </div>
                                                {epicCollapsed
                                                    ? <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                                                    : <ChevronDown className="w-3.5 h-3.5 text-zinc-600 shrink-0" />}
                                            </button>
                                        </div>

                                        {/* Stories */}
                                        <AnimatePresence initial={false}>
                                            {!epicCollapsed && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="border-t border-zinc-800/60"
                                                >
                                                    {epic.stories.map((story, si) => {
                                                        const storyCollapsed = collapsedStories.has(story.id);
                                                        const hasTitle = story.title && !story.title.startsWith('Untitled');

                                                        return (
                                                            <div key={story.id} className={si > 0 ? 'border-t border-zinc-800/40' : ''}>
                                                                {/* Story row */}
                                                                {hasTitle && (
                                                                    <button
                                                                        onClick={() => toggleStory(story.id)}
                                                                        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-zinc-800/40 transition-colors text-left"
                                                                    >
                                                                        {storyCollapsed
                                                                            ? <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0 ml-1" />
                                                                            : <ChevronDown className="w-3 h-3 text-zinc-600 shrink-0 ml-1" />}
                                                                        <p className="text-[11px] text-zinc-400 leading-tight truncate flex-1">{story.title}</p>
                                                                        <span className="text-[10px] text-zinc-600 shrink-0">{story.tasks.length}</span>
                                                                    </button>
                                                                )}

                                                                {/* Tasks */}
                                                                <AnimatePresence initial={false}>
                                                                    {(!hasTitle || !storyCollapsed) && (
                                                                        <motion.div
                                                                            initial={hasTitle ? { height: 0 } : false}
                                                                            animate={{ height: 'auto' }}
                                                                            exit={{ height: 0 }}
                                                                            transition={{ duration: 0.15 }}
                                                                            className="overflow-hidden"
                                                                        >
                                                                            <div className="px-2 pb-2 pt-1 space-y-1">
                                                                                {story.tasks.map(task => {
                                                                                    const typeCfg = TYPE_CONFIG[task.type ?? ''];
                                                                                    const isSelected = selectedTask?.id === task.id;
                                                                                    return (
                                                                                        <button
                                                                                            key={task.id}
                                                                                            onClick={() => setSelectedTask(task)}
                                                                                            className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all group ${
                                                                                                isSelected
                                                                                                    ? 'bg-blue-500/8 border-blue-500/30 shadow-sm'
                                                                                                    : highlightedDeps.has(task.id)
                                                                                                        ? 'bg-amber-500/5 border-amber-500/30'
                                                                                                        : 'bg-zinc-900/0 border-transparent hover:bg-zinc-800/50 hover:border-zinc-700/60'
                                                                                            }`}
                                                                                        >
                                                                                            {/* Scope checkbox */}
                                                                                            <div
                                                                                                onClick={e => { e.stopPropagation(); toggleTaskSelection(task.id); }}
                                                                                                className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                                                                                    task.selected
                                                                                                        ? 'bg-blue-500 border-blue-500'
                                                                                                        : 'border-zinc-700 group-hover:border-zinc-500'
                                                                                                }`}
                                                                                            >
                                                                                                {task.selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                                                            </div>

                                                                                            <div className="flex-1 min-w-0">
                                                                                                <p className={`text-[12px] font-medium leading-snug truncate ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                                                                                                    {task.title}
                                                                                                </p>
                                                                                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                                                                    {typeCfg && (
                                                                                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeCfg.pill}`}>
                                                                                                            <span className={`w-1 h-1 rounded-full ${typeCfg.dot}`} />
                                                                                                            {typeCfg.label}
                                                                                                        </span>
                                                                                                    )}
                                                                                                    <span className={`text-[10px] font-mono font-bold ${COMPLEXITY_COLOR(task.complexity)}`}>
                                                                                                        {task.complexity}/10
                                                                                                    </span>
                                                                                                    {task.dependencies && task.dependencies.length > 0 && (
                                                                                                        <button
                                                                                                            onClick={e => {
                                                                                                                e.stopPropagation();
                                                                                                                setHighlightedDeps(prev => {
                                                                                                                    const next = new Set(prev);
                                                                                                                    const deps = new Set(task.dependencies as string[]);
                                                                                                                    const alreadySet = task.dependencies!.every(d => prev.has(d));
                                                                                                                    if (alreadySet) deps.forEach(d => next.delete(d));
                                                                                                                    else deps.forEach(d => next.add(d));
                                                                                                                    return next;
                                                                                                                });
                                                                                                            }}
                                                                                                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border border-amber-500/25 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                                                                                                        >
                                                                                                            {task.dependencies.length} dep{task.dependencies.length > 1 ? 's' : ''}
                                                                                                        </button>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Bottom summary */}
                        <div className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-500">
                                    <span className="text-white font-semibold">{selectedCount}</span> / {totalCount} in scope
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => selectAllTasks()}
                                        className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                                    >All</button>
                                    <button
                                        onClick={() => deselectAllTasks()}
                                        className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                                    >None</button>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="h-1.5 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
                                        animate={{ width: totalCount ? `${(selectedCount / totalCount) * 100}%` : '0%' }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                                <span className="text-[10px] font-mono text-zinc-500 shrink-0">{totalCount ? Math.round((selectedCount / totalCount) * 100) : 0}%</span>
                            </div>
                            {/* Type breakdown */}
                            {presentTypes.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {presentTypes.map(type => {
                                        const cfg = TYPE_CONFIG[type];
                                        if (!cfg) return null;
                                        const count = todoTasks.filter(t => t.type === type).length;
                                        return (
                                            <span key={type} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border ${cfg.pill}`}>
                                                <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
                                                {count} {cfg.label}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Right: Task detail ────────────────────────────────── */}
                    <div className="flex-1 min-w-0 min-h-0 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/30">
                        {selectedTask ? (
                            <div className="p-8 max-w-3xl">

                                {/* Breadcrumb */}
                                {(selectedEpic || selectedStory) && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 mb-5 flex-wrap">
                                        {selectedEpic && <span className="text-zinc-400 font-medium">{selectedEpic.title}</span>}
                                        {selectedEpic && selectedStory?.title && <ArrowRight className="w-3 h-3 shrink-0" />}
                                        {selectedStory?.title && <span className="text-zinc-500 truncate max-w-[280px]">{selectedStory.title}</span>}
                                    </div>
                                )}

                                {/* Type + Scope badge row */}
                                <div className="flex items-center gap-2 mb-4 flex-wrap">
                                    {selectedTask.type && TYPE_CONFIG[selectedTask.type] && (() => {
                                        const cfg = TYPE_CONFIG[selectedTask.type!];
                                        const Icon = cfg.icon;
                                        return (
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${cfg.pill}`}>
                                                <Icon className="w-3.5 h-3.5" />
                                                {cfg.label}
                                            </span>
                                        );
                                    })()}
                                    {selectedTask.selected ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> In Scope
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-500 border border-zinc-700">
                                            <Circle className="w-3.5 h-3.5" /> Out of Scope
                                        </span>
                                    )}
                                    {/* Assignable roles */}
                                    {selectedTask.assignableTo?.map(role => (
                                        <span key={role} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                                            {role}
                                        </span>
                                    ))}
                                </div>

                                {/* Title */}
                                <h1 className="text-2xl font-bold text-white leading-snug mb-5">{selectedTask.title}</h1>

                                {/* Meta cards */}
                                <div className="grid grid-cols-3 gap-3 mb-7">
                                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
                                        <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                            <BarChart3 className="w-3 h-3" /> Complexity
                                        </p>
                                        <div className="flex items-end gap-2">
                                            <span className={`text-2xl font-bold font-mono ${COMPLEXITY_COLOR(selectedTask.complexity)}`}>
                                                {selectedTask.complexity}
                                            </span>
                                            <span className="text-zinc-600 text-sm mb-0.5">/10</span>
                                        </div>
                                        <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${selectedTask.complexity <= 3 ? 'bg-emerald-500' : selectedTask.complexity <= 6 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                style={{ width: `${selectedTask.complexity * 10}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
                                        <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                            <Shield className="w-3 h-3" /> Status
                                        </p>
                                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white capitalize">
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                selectedTask.status === 'done'        ? 'bg-green-500' :
                                                selectedTask.status === 'in-progress' ? 'bg-blue-500' :
                                                selectedTask.status === 'review'      ? 'bg-yellow-500' :
                                                selectedTask.status === 'testing'     ? 'bg-purple-500' :
                                                'bg-zinc-500'
                                            }`} />
                                            {selectedTask.status.replace('-', ' ')}
                                        </span>
                                    </div>
                                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
                                        <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                            <Zap className="w-3 h-3" /> Epic
                                        </p>
                                        <span className="text-xs text-zinc-300 font-medium line-clamp-2 leading-snug">
                                            {selectedEpic?.title || selectedTask.category || '—'}
                                        </span>
                                    </div>
                                </div>

                                                {/* Dependencies */}
                                                {selectedTask.dependencies && selectedTask.dependencies.length > 0 && (() => {
                                                    const depTasks = selectedTask.dependencies
                                                        .map(id => tasks.find(t => t.id === id))
                                                        .filter(Boolean) as typeof tasks;
                                                    return depTasks.length > 0 ? (
                                                        <div className="mb-7">
                                                            <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                <ArrowRight className="w-3 h-3" /> Dependencies ({depTasks.length})
                                                            </h3>
                                                            <div className="space-y-1.5">
                                                                {depTasks.map(dep => {
                                                                    const depCfg = dep.type ? TYPE_CONFIG[dep.type] : null;
                                                                    return (
                                                                        <div key={dep.id} className="flex items-center gap-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2">
                                                                            {depCfg && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${depCfg.dot}`} />}
                                                                            <p className="text-xs text-zinc-400 truncate flex-1">{dep.title}</p>
                                                                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${depCfg?.pill ?? 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                                                                                {depCfg?.label ?? dep.type}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ) : null;
                                                })()}

                                {/* Description */}
                                {descBody && (
                                    <div className="mb-7">
                                        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <FileText className="w-3 h-3" /> Technical Specification
                                        </h3>
                                        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5">
                                            <DescriptionBody text={descBody} />
                                        </div>
                                    </div>
                                )}

                                {/* Acceptance criteria */}
                                {criteria.length > 0 && (
                                    <div className="mb-8">
                                        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <CheckCircle2 className="w-3 h-3" /> Acceptance Criteria
                                        </h3>
                                        <div className="space-y-2">
                                            {criteria.map((c, i) => (
                                                <div key={i} className="flex items-start gap-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-4 py-3">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                    <p className="text-sm text-zinc-300 leading-relaxed">
                                                        <InlineText text={c} />
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action button */}
                                <div className="sticky bottom-0 pt-5 pb-1 bg-gradient-to-t from-zinc-900/80 to-transparent -mx-8 px-8">
                                    <button
                                        onClick={() => toggleTaskSelection(selectedTask.id)}
                                        className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                                            selectedTask.selected
                                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/15 border border-red-500/20 hover:border-red-500/30'
                                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 hover:scale-[1.01] active:scale-[0.99]'
                                        }`}
                                    >
                                        {selectedTask.selected ? (
                                            <><Circle className="w-4 h-4" /> Remove from Scope</>
                                        ) : (
                                            <><CheckCircle2 className="w-4 h-4" /> Add to Scope</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Empty state */
                            <div className="h-full flex flex-col items-center justify-center text-center p-12">
                                <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center mb-4">
                                    <FileText className="w-7 h-7 text-zinc-600" />
                                </div>
                                <p className="text-sm font-medium text-zinc-500 mb-1">Select a task to inspect</p>
                                <p className="text-xs text-zinc-700">Click any task in the backlog to view its full technical specification</p>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
};

export default DashboardView;
