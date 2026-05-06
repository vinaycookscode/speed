import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStore } from '../store/agentStore';
import {
    Brain, CheckCircle2, AlertCircle, Loader2,
    Sparkles, Layers, ListChecks, Zap,
} from 'lucide-react';

// ─── Epic card ────────────────────────────────────────────────────────────────

interface EpicCardProps {
    title: string;
    description: string;
    taskCount?: number;
    index: number;
}

function EpicCard({ title, description, taskCount, index }: EpicCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -16, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: index * 0.12, duration: 0.35, ease: 'easeOut' }}
            className="flex items-start gap-3 px-4 py-3 rounded-xl border bg-emerald-500/8 border-emerald-500/20 transition-all"
        >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white truncate">{title}</span>
                    {taskCount !== undefined && (
                        <span className="text-xs font-medium text-emerald-400 shrink-0">
                            {taskCount} tasks
                        </span>
                    )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{description}</p>
            </div>
        </motion.div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const PlanningScreen = () => {
    const { planningEpics, pmProgress, agents, epics, tasks, phase } = useAgentStore();
    const pm = agents.find(a => a.role === 'Product Manager');
    const isError = pm?.status === 'error';
    const lastLog = pm?.logs[pm.logs.length - 1] ?? '';

    // Completion
    const [complete, setComplete] = useState(false);
    useEffect(() => {
        if (phase === 'approval' && tasks.length > 0) setComplete(true);
    }, [phase, tasks.length]);

    // Progress
    const epicsDone = planningEpics.filter(e => e.status === 'done').length;
    const epicsTotal = planningEpics.length;
    const totalTasks = planningEpics.reduce((s, e) => s + (e.taskCount ?? 0), 0);

    // Derive percentage & labels
    let pct = 0;
    let statusLabel = 'Connecting to Claude…';
    let statusDetail = 'Preparing your project analysis';

    if (complete) {
        pct = 100;
        statusLabel = 'Plan complete!';
        statusDetail = `${epics.length} epics · ${tasks.length} tasks ready for review`;
    } else if (epicsTotal > 0) {
        // Reveal phase — rapid reveal of epics after call completes
        pct = Math.round(85 + (epicsDone / epicsTotal) * 15);
        statusLabel = 'Building your backlog…';
        statusDetail = `${epicsDone} of ${epicsTotal} epics loaded`;
    } else if (pmProgress) {
        // During API call — simulate progress from heartbeat
        const ratio = Math.min(1, pmProgress.charsReceived / (pmProgress.estimatedTotal || 20000));
        pct = Math.round(5 + ratio * 80);
        statusLabel = 'Claude is writing your plan…';
        statusDetail = 'Generating epics, stories, tasks & specs';
    } else if (pm?.status === 'working') {
        pct = 3;
        statusLabel = 'Analysing project requirements…';
        statusDetail = 'Identifying features, entities & architecture';
    }

    if (isError) {
        pct = 0;
        statusLabel = 'Something went wrong';
        statusDetail = lastLog.replace(/^❌ Failed: /, '');
    }

    // ── Steps for visual checklist ────────────────────────────────────────────
    const steps = [
        { icon: Brain,       label: 'Analyse requirements',         done: pct >= 15 },
        { icon: Layers,      label: 'Design epics & stories',       done: pct >= 40 },
        { icon: ListChecks,  label: 'Generate tasks & specs',       done: pct >= 70 },
        { icon: Sparkles,    label: 'Add dependencies & criteria',  done: pct >= 90 },
    ];

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center bg-zinc-950/97 backdrop-blur-sm px-4 overflow-y-auto">
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-[120px] animate-pulse" />
            </div>

            <div className="relative w-full max-w-lg my-auto py-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-6"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
                        <Sparkles className="w-3 h-3" />
                        PM Agent · Claude AI
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">
                        {complete ? 'Project plan ready!' : 'Planning your project'}
                    </h1>
                    <p className="text-zinc-500 text-sm">
                        {complete
                            ? 'Opening your backlog…'
                            : 'One API call — all epics generated at once'}
                    </p>
                </motion.div>

                {/* Progress card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 mb-5 shadow-xl"
                >
                    {/* Status */}
                    <div className="flex items-center justify-between mb-3">
                        <span className={`text-sm font-semibold flex items-center gap-2 ${
                            isError ? 'text-red-400' : complete ? 'text-emerald-400' : 'text-white'
                        }`}>
                            {complete && <CheckCircle2 className="w-4 h-4" />}
                            {!complete && !isError && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                            {statusLabel}
                        </span>
                        {!isError && (
                            <span className="text-xs font-mono text-zinc-500 tabular-nums">{pct}%</span>
                        )}
                    </div>

                    {/* Bar */}
                    {!isError ? (
                        <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
                            <motion.div
                                className={`absolute inset-y-0 left-0 rounded-full ${
                                    complete
                                        ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                                        : 'bg-gradient-to-r from-blue-500 to-purple-500'
                                }`}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                            {!complete && (
                                <motion.div
                                    className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                                    animate={{ left: ['-80px', '110%'] }}
                                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.4 }}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-3">
                            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-red-400 leading-relaxed">{statusDetail}</p>
                        </div>
                    )}

                    {!isError && (
                        <p className="text-xs text-zinc-500">{statusDetail}</p>
                    )}
                </motion.div>

                {/* Step checklist — shown during API call */}
                {epicsTotal === 0 && !complete && !isError && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-2 mb-5"
                    >
                        {steps.map(({ icon: Icon, label, done }, i) => (
                            <motion.div
                                key={label}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.08 * i }}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-500 ${
                                    done
                                        ? 'bg-blue-500/8 border-blue-500/20 text-white'
                                        : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-600'
                                }`}
                            >
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                    done ? 'bg-blue-500/20' : 'bg-zinc-800'
                                }`}>
                                    <Icon className={`w-3.5 h-3.5 ${done ? 'text-blue-400' : 'text-zinc-600'}`} />
                                </div>
                                <span className="text-sm font-medium">{label}</span>
                                {done && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="ml-auto w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                    </motion.div>
                                )}
                                {!done && steps.findIndex(s => !s.done) === i && (
                                    <div className="ml-auto w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                )}
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {/* Stats row — after epics start revealing */}
                <AnimatePresence>
                    {epicsTotal > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-3 gap-3 mb-5"
                        >
                            {[
                                { icon: Layers,    label: 'Epics', value: epicsTotal, color: 'text-purple-400' },
                                { icon: CheckCircle2, label: 'Ready', value: epicsDone, color: 'text-emerald-400' },
                                { icon: Zap,       label: 'Tasks', value: totalTasks, color: 'text-blue-400' },
                            ].map(({ icon: Icon, label, value, color }) => (
                                <div key={label} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center">
                                    <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
                                    <motion.div
                                        key={value}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className={`text-xl font-bold ${color} tabular-nums`}
                                    >
                                        {value}
                                    </motion.div>
                                    <div className="text-xs text-zinc-600 font-medium">{label}</div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Epic cards — revealed one by one after API call completes */}
                <AnimatePresence>
                    {planningEpics.filter(e => e.status === 'done').length > 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-2"
                        >
                            <p className="text-xs text-zinc-600 font-medium uppercase tracking-wider px-1 mb-2">
                                Epics
                            </p>
                            {planningEpics
                                .filter(e => e.status === 'done')
                                .map((epic, i) => (
                                    <EpicCard
                                        key={epic.id}
                                        title={epic.title}
                                        description={epic.description}
                                        taskCount={epic.taskCount}
                                        index={i}
                                    />
                                ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer */}
                <p className="text-center text-xs text-zinc-600 mt-6">
                    {complete
                        ? 'Redirecting to your backlog…'
                        : 'This usually takes 30–60 seconds.'}
                </p>

                {/* Thinking dots */}
                {!isError && !complete && epicsTotal === 0 && (
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                        <Brain className="w-3 h-3 text-zinc-600" />
                        <div className="flex gap-1">
                            {[0, 1, 2].map(i => (
                                <motion.div
                                    key={i}
                                    className="w-1 h-1 rounded-full bg-zinc-600"
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlanningScreen;
