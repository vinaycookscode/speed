import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStore } from '../store/agentStore';
import { Brain, Layers, BookOpen, CheckSquare, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Full-screen overlay shown while the PM agent is generating the project plan.
 *
 * Progress lifecycle:
 *   0–5 %   → initialising / connecting
 *   5–95%   → streaming (driven by charsReceived / estimatedTotal)
 *   95–99%  → parsing JSON (streaming ended, store not yet updated)
 *   100%    → complete — brief flash before the overlay unmounts
 */
const PlanningScreen = () => {
    const { pmProgress, agents, epics, tasks, phase } = useAgentStore();
    const pm = agents.find(a => a.role === 'Product Manager');
    const isError = pm?.status === 'error';
    const lastLog = pm?.logs[pm.logs.length - 1] ?? '';

    // Track whether we've seen at least one streaming chunk
    const hadProgressRef = useRef(false);
    if (pmProgress) hadProgressRef.current = true;

    // Once streaming ends (pmProgress → null after we had chunks), lock into "parsing" state
    const [streamingDone, setStreamingDone] = useState(false);
    const prevProgressRef = useRef(pmProgress);

    useEffect(() => {
        const wasStreaming = prevProgressRef.current !== null;
        const nowNull = pmProgress === null;
        if (wasStreaming && nowNull && hadProgressRef.current) {
            setStreamingDone(true);
        }
        prevProgressRef.current = pmProgress;
    }, [pmProgress]);

    // When phase flips to 'approval' (tasks in store) → briefly show 100 %
    const [complete, setComplete] = useState(false);
    useEffect(() => {
        if (phase === 'approval' && tasks.length > 0) {
            setComplete(true);
        }
    }, [phase, tasks.length]);

    // ── Derive display percentage ──────────────────────────────────────────
    let pct = 0;
    let statusLabel = 'Initialising…';
    let statusDetail = 'Connecting to Claude AI';

    if (complete) {
        pct = 100;
        statusLabel = 'Plan complete!';
        statusDetail = `${epics.length} epics · ${tasks.length} tasks ready`;
    } else if (streamingDone) {
        pct = 98;
        statusLabel = 'Structuring the plan…';
        statusDetail = 'Parsing epics, stories, and tasks';
    } else if (pmProgress) {
        const { charsReceived, estimatedTotal } = pmProgress;
        // Map 0→estimatedTotal  to  5→95 so the bar visibly travels the full range
        const ratio = Math.min(1, charsReceived / estimatedTotal);
        pct = Math.round(5 + ratio * 90);
        statusLabel = 'Writing execution plan…';
        statusDetail = `${charsReceived.toLocaleString()} characters generated`;
    } else if (pm?.status === 'working') {
        pct = 3;
        statusLabel = 'Analysing project requirements…';
        statusDetail = 'Inferring personas, entities, features & integrations';
    }

    if (isError) {
        pct = 0;
        statusLabel = 'Something went wrong';
        statusDetail = lastLog;
    }

    // ── Step checklist ─────────────────────────────────────────────────────
    const steps = [
        { icon: Brain,        label: 'Analyse requirements & infer features',  done: pct >= 20 },
        { icon: Layers,       label: 'Identify epics & user personas',          done: pct >= 40 },
        { icon: BookOpen,     label: 'Write detailed user stories',              done: pct >= 60 },
        { icon: CheckSquare,  label: 'Break stories into actionable tasks',     done: pct >= 80 },
        { icon: Sparkles,     label: 'Add acceptance criteria & specs',         done: pct >= 98 },
    ];

    const epicCount  = epics.length;
    const taskCount  = tasks.length;

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-sm px-4">
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-[120px] animate-pulse" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-purple-600/8 blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative w-full max-w-lg">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
                        <Sparkles className="w-3 h-3" />
                        PM Agent · Claude AI
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {complete ? 'Project plan ready!' : 'Planning your project'}
                    </h1>
                    <p className="text-zinc-400 text-sm">
                        {complete
                            ? 'Opening your backlog now…'
                            : 'Breaking your idea into epics, stories & tasks'}
                    </p>
                </motion.div>

                {/* Progress card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 mb-6 shadow-xl"
                >
                    {/* Status row */}
                    <div className="flex items-center justify-between mb-3">
                        <span className={`text-sm font-semibold flex items-center gap-2 ${isError ? 'text-red-400' : complete ? 'text-green-400' : 'text-white'}`}>
                            {complete && <CheckCircle2 className="w-4 h-4" />}
                            {statusLabel}
                        </span>
                        {!isError && (
                            <span className="text-xs font-mono text-zinc-500 tabular-nums">
                                {pct}%
                            </span>
                        )}
                    </div>

                    {/* Bar */}
                    {!isError ? (
                        <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
                            <motion.div
                                className={`absolute inset-y-0 left-0 rounded-full ${complete ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: complete ? 0.4 : 0.6, ease: 'easeOut' }}
                            />
                            {/* Shimmer — only during active streaming */}
                            {!complete && !isError && (
                                <motion.div
                                    className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                                    animate={{ left: ['-80px', '110%'] }}
                                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.4 }}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="flex items-start gap-2 mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-red-400 leading-relaxed">{statusDetail}</p>
                        </div>
                    )}

                    {!isError && (
                        <p className="text-xs text-zinc-500">{statusDetail}</p>
                    )}
                </motion.div>

                {/* Step checklist */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-2 mb-6"
                >
                    {steps.map(({ icon: Icon, label, done }, i) => (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * i }}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-500 ${
                                done
                                    ? 'bg-blue-500/8 border-blue-500/20 text-white'
                                    : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-600'
                            }`}
                        >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-500 ${
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
                            {/* Pulsing dot for the currently active step */}
                            {!done && steps.findIndex(s => !s.done) === i && (
                                <div className="ml-auto w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            )}
                        </motion.div>
                    ))}
                </motion.div>

                {/* Live counters */}
                <AnimatePresence>
                    {(epicCount > 0 || taskCount > 0) && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-2 gap-3"
                        >
                            {[
                                { label: 'Epics',  value: epicCount,  color: 'text-purple-400' },
                                { label: 'Tasks',  value: taskCount,  color: 'text-blue-400'   },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
                                    <motion.div
                                        key={value}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className={`text-2xl font-bold ${color} mb-0.5 tabular-nums`}
                                    >
                                        {value}
                                    </motion.div>
                                    <div className="text-xs text-zinc-500 font-medium">{label}</div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <p className="text-center text-xs text-zinc-600 mt-8">
                    This usually takes 30–90 seconds. Please don't close the window.
                </p>
            </div>
        </div>
    );
};

export default PlanningScreen;
