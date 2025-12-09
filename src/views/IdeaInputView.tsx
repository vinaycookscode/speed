import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, FolderOpen, Sparkles, Zap } from 'lucide-react';
import { useAgentStore } from '../store/agentStore';

const IdeaInputView = () => {
    const [idea, setIdea] = useState('');
    const navigate = useNavigate();
    const { createProject, projects, switchProject } = useAgentStore();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (idea.trim()) {
            createProject(idea);
            navigate('/team-creation');
        }
    };

    const handleProjectClick = (projectId: string) => {
        switchProject(projectId);
        navigate('/dashboard');
    };

    const suggestions = [
        "E-commerce Platform",
        "SaaS Dashboard",
        "AI Chat Interface",
        "Portfolio Website"
    ];

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="max-w-3xl w-full flex flex-col items-center text-center"
            >
                <div className="mb-8 relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-[40px] rounded-full animate-pulse" />
                    <img src="/assets/logo/icon_256x256.png" alt="App Logo" className="relative w-24 h-24 md:w-32 md:h-32 object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
                </div>

                <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight text-white">
                    What do you want to <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">build</span>?
                </h1>

                <p className="text-zinc-400 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
                    Describe your vision. Our AI agents will assemble the perfect team to bring it to life.
                </p>

                <form onSubmit={handleSubmit} className="w-full max-w-2xl relative group mb-12">
                    {/* Glow Effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition duration-1000"></div>

                    <div className="relative bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/5 hover:ring-white/10 transition-all">
                        <textarea
                            value={idea}
                            onChange={(e) => setIdea(e.target.value)}
                            placeholder="I want to build a..."
                            className="w-full h-48 bg-transparent p-6 text-lg focus:outline-none text-white placeholder:text-zinc-600 resize-none font-light"
                            autoFocus
                        />

                        {/* Footer area inside the glass container */}
                        <div className="px-6 py-4 bg-white/5 border-t border-white/5 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold shrink-0">Try:</span>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar mask-gradient-right">
                                    {suggestions.map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setIdea(s)}
                                            className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
                                        >
                                            <Zap className="w-3 h-3 inline-block mr-1 opacity-50" />
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!idea.trim()}
                                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-5 py-2 rounded-lg font-medium text-sm transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            >
                                <Sparkles className="w-4 h-4" /> Start Building
                            </button>
                        </div>
                    </div>
                </form>

                {/* Recent Projects */}
                {projects.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="w-full max-w-4xl" // Wider container for grid
                    >
                        <div className="flex items-center gap-3 mb-4 mx-2">
                            <div className="h-px flex-1 bg-white/10" />
                            <span className="text-xs font-semibold text-zinc-500 flex items-center gap-2 uppercase tracking-wider">
                                <Clock className="w-3.5 h-3.5" /> Recent Projects
                            </span>
                            <div className="h-px flex-1 bg-white/10" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
                            {projects.sort((a, b) => b.lastActive - a.lastActive).slice(0, 3).map((project) => (
                                <div
                                    key={project.id}
                                    onClick={() => handleProjectClick(project.id)}
                                    className="bg-zinc-900/40 backdrop-blur-sm border border-white/5 hover:border-blue-500/30 p-4 rounded-xl cursor-pointer transition-all hover:bg-white/5 group shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                                            <FolderOpen className="w-4 h-4" />
                                        </div>
                                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${project.phase === 'development' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                            project.phase === 'planning' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                            }`}>
                                            {project.phase}
                                        </div>
                                    </div>
                                    <h3 className="font-semibold text-sm mb-1 truncate text-zinc-200 group-hover:text-white transition-colors">{project.name}</h3>
                                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-3">
                                        <div className="flex -space-x-1.5 overflow-hidden">
                                            {project.agents.slice(0, 3).map((agent, i) => (
                                                <div key={i} className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[8px] text-zinc-400 relative z-10">
                                                    {agent.name[0]}
                                                </div>
                                            ))}
                                            {project.agents.length > 3 && (
                                                <div className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[8px] text-zinc-500 z-0">
                                                    +{project.agents.length - 3}
                                                </div>
                                            )}
                                        </div>
                                        <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                        <span>{project.tasks.length} Tasks</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default IdeaInputView;
