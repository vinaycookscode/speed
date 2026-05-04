import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, FolderOpen, Sparkles, ShoppingCart, BarChart3,
    MessageSquare, Globe, Smartphone, BookOpen, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAgentStore } from '../store/agentStore';

// ─── Suggestion cards ────────────────────────────────────────────────────────

const SUGGESTIONS = [
    {
        icon: ShoppingCart,
        label: 'E-commerce Platform',
        description: 'Multi-vendor marketplace with cart, payments & inventory',
        idea: 'A multi-vendor e-commerce marketplace where sellers can list products, manage inventory, and process orders. Buyers get a personalised feed, wishlist, reviews, and Stripe checkout. Includes admin panel for moderation.',
    },
    {
        icon: BarChart3,
        label: 'SaaS Dashboard',
        description: 'Multi-tenant SaaS with billing, RBAC & analytics',
        idea: 'A multi-tenant SaaS platform for real estate agencies with lead tracking, email campaigns, property listings, team RBAC, and Stripe billing. Includes an analytics dashboard with conversion funnels and exports.',
    },
    {
        icon: MessageSquare,
        label: 'AI Chat Interface',
        description: 'LLM-powered chat with history, tools & streaming',
        idea: 'An AI chat application powered by Claude with streaming responses, conversation history, tool use (web search, code execution), custom system prompts, and multi-model support. Includes usage analytics and team sharing.',
    },
    {
        icon: Smartphone,
        label: 'Mobile App Backend',
        description: 'REST API + push notifications + offline sync',
        idea: 'A backend API for a fitness tracking mobile app with user profiles, workout logging, social feed, push notifications via FCM, offline sync, and a coach dashboard for managing clients.',
    },
    {
        icon: Globe,
        label: 'Developer API Platform',
        description: 'Public API with keys, rate limits & docs portal',
        idea: 'A public REST API platform for location data with API key management, rate limiting, usage metering, Stripe billing per call, interactive docs portal, and a developer dashboard with quota graphs.',
    },
    {
        icon: BookOpen,
        label: 'Learning Management',
        description: 'Courses, quizzes, certificates & progress tracking',
        idea: 'An LMS platform for online courses with video hosting, quizzes, certificates, progress tracking, cohort-based learning, instructor dashboards, and Stripe subscription billing for course access.',
    },
];

const CHAR_THRESHOLD = 80;

// ─── Main component ───────────────────────────────────────────────────────────

const IdeaInputView = () => {
    const [idea, setIdea] = useState('');
    const [showAllProjects, setShowAllProjects] = useState(false);
    const navigate = useNavigate();
    const { createProject, projects, switchProject } = useAgentStore();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!idea.trim()) return;
        createProject(idea.trim());
        navigate('/team-creation');
    };

    const handleProjectClick = (projectId: string) => {
        switchProject(projectId);
        navigate('/dashboard');
    };

    const charCount = idea.length;
    const charColor =
        charCount === 0 ? 'text-zinc-600' :
        charCount < CHAR_THRESHOLD ? 'text-amber-500' :
        'text-emerald-400';
    const charHint =
        charCount === 0 ? 'Describe your idea in detail for a better plan' :
        charCount < CHAR_THRESHOLD ? `${CHAR_THRESHOLD - charCount} more chars recommended` :
        'Great detail — your plan will be comprehensive';

    const sortedProjects = [...projects].sort((a, b) => b.lastActive - a.lastActive);
    const visibleProjects = showAllProjects ? sortedProjects : sortedProjects.slice(0, 3);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-3xl w-full flex flex-col items-center text-center"
            >
                {/* Logo */}
                <div className="mb-8 relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-[40px] rounded-full animate-pulse" />
                    <img
                        src="/assets/logo/icon_256x256.png"
                        alt="App Logo"
                        className="relative w-24 h-24 md:w-32 md:h-32 object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                    />
                </div>

                <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight text-white">
                    What do you want to{' '}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                        build
                    </span>
                    ?
                </h1>

                <p className="text-zinc-400 text-lg mb-8 max-w-lg mx-auto leading-relaxed">
                    Describe your vision. Our AI agents will assemble the perfect team and build it.
                </p>

                {/* Idea textarea */}
                <form onSubmit={handleSubmit} className="w-full max-w-2xl relative group mb-3">
                    <div className="absolute -inset-1 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition duration-1000 bg-gradient-to-r from-blue-500/20 to-purple-500/20" />
                    <div className="relative bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/5 hover:ring-white/10 transition-all">
                        <textarea
                            value={idea}
                            onChange={e => setIdea(e.target.value)}
                            placeholder="I want to build a..."
                            className="w-full h-44 bg-transparent p-6 text-lg focus:outline-none text-white placeholder:text-zinc-600 resize-none font-light"
                            autoFocus
                            onKeyDown={e => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as any);
                            }}
                        />

                        <div className="px-6 py-3 bg-white/5 border-t border-white/5 flex items-center justify-between gap-4">
                            <p className={`text-xs ${charColor} transition-colors`}>{charHint}</p>
                            <button
                                type="submit"
                                disabled={!idea.trim()}
                                className="flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-sm transition-all shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-blue-900/30"
                            >
                                <Sparkles className="w-4 h-4" />
                                Start Planning
                            </button>
                        </div>
                    </div>
                </form>

                {/* Char counter */}
                <p className="text-[11px] text-zinc-600 mb-8 self-end mr-2">
                    {charCount} chars
                </p>

                {/* Suggestion cards */}
                <div className="w-full mb-10">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-3">
                        Try one of these ideas
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {SUGGESTIONS.map(({ icon: Icon, label, description, idea: suggestionIdea }) => (
                            <button
                                key={label}
                                type="button"
                                onClick={() => setIdea(suggestionIdea)}
                                className="flex flex-col items-start gap-2 p-4 rounded-xl bg-zinc-900/40 border border-white/5 hover:border-blue-500/30 hover:bg-zinc-900/80 text-left transition-all group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                    <Icon className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-white">{label}</p>
                                    <p className="text-[11px] text-zinc-500 leading-snug mt-0.5">{description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recent projects */}
                {projects.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="w-full max-w-4xl"
                    >
                        <div className="flex items-center gap-3 mb-4 mx-2">
                            <div className="h-px flex-1 bg-white/10" />
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-semibold text-zinc-500 flex items-center gap-2 uppercase tracking-wider">
                                    <Clock className="w-3.5 h-3.5" /> Recent Projects
                                </span>
                                <button
                                    onClick={() => {
                                        if (window.confirm('Clear all recent projects? This cannot be undone.')) {
                                            useAgentStore.getState().clearProjects();
                                        }
                                    }}
                                    className="text-[10px] px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors uppercase tracking-tighter font-bold"
                                >
                                    Clear All
                                </button>
                            </div>
                            <div className="h-px flex-1 bg-white/10" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
                            <AnimatePresence initial={false}>
                                {visibleProjects.map((project, i) => (
                                    <motion.div
                                        key={project.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ delay: i * 0.05 }}
                                        onClick={() => handleProjectClick(project.id)}
                                        className="bg-zinc-900/40 backdrop-blur-sm border border-white/5 hover:border-blue-500/30 p-4 rounded-xl cursor-pointer transition-all hover:bg-white/5 group shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                                                <FolderOpen className="w-4 h-4" />
                                            </div>
                                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${
                                                project.phase === 'development' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                project.phase === 'planning'    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                                  'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                            }`}>
                                                {project.phase}
                                            </div>
                                        </div>
                                        <h3 className="font-semibold text-sm mb-1 truncate text-zinc-200 group-hover:text-white transition-colors">
                                            {project.name}
                                        </h3>
                                        <div className="flex items-center gap-3 text-xs text-zinc-500 mt-3">
                                            <div className="flex -space-x-1.5 overflow-hidden">
                                                {project.agents.slice(0, 3).map((agent, ai) => (
                                                    <div key={ai} className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[8px] text-zinc-400">
                                                        {agent.name[0]}
                                                    </div>
                                                ))}
                                                {project.agents.length > 3 && (
                                                    <div className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[8px] text-zinc-500">
                                                        +{project.agents.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                            <span>{project.tasks.length} Tasks</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Show more / less */}
                        {projects.length > 3 && (
                            <button
                                onClick={() => setShowAllProjects(v => !v)}
                                className="mt-4 mx-auto flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                {showAllProjects ? (
                                    <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                                ) : (
                                    <><ChevronDown className="w-3.5 h-3.5" /> Show {projects.length - 3} more</>
                                )}
                            </button>
                        )}
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default IdeaInputView;
