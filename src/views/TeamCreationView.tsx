import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, UserPlus, Trash2, ArrowRight, Briefcase,
    Terminal, Code, Bug, Layers, Rocket, Zap,
} from 'lucide-react';
import { useAgentStore, Agent, Role } from '../store/agentStore';
import { v4 as uuidv4 } from 'uuid';

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<Role, { icon: any; color: string; description: string }> = {
    'Product Manager':   { icon: Users,   color: 'text-blue-400',   description: 'Drives requirements, epics & sprint planning' },
    'Architect':         { icon: Layers,  color: 'text-purple-400', description: 'Designs system architecture & tech stack decisions' },
    'Tech Lead':         { icon: Terminal,color: 'text-green-400',  description: 'Guides implementation standards & code reviews' },
    'Software Engineer': { icon: Code,    color: 'text-amber-400',  description: 'Builds features across frontend and backend' },
    'Backend Engineer':  { icon: Zap,     color: 'text-orange-400', description: 'Implements APIs, services & database layers' },
    'QA Engineer':       { icon: Bug,     color: 'text-rose-400',   description: 'Writes tests and validates acceptance criteria' },
    'DevOps Engineer':   { icon: Rocket,  color: 'text-cyan-400',   description: 'Manages CI/CD, infra, and deployment pipelines' },
};

const ALL_ROLES = Object.keys(ROLE_CONFIG) as Role[];

// ─── Preset templates ─────────────────────────────────────────────────────────

interface TemplateAgent { role: Role; name: string }

const TEMPLATES: { label: string; icon: any; description: string; agents: TemplateAgent[] }[] = [
    {
        label: 'Full-Stack Startup',
        icon: Rocket,
        description: 'PM + Backend + Frontend + QA',
        agents: [
            { role: 'Product Manager',   name: 'Priya'  },
            { role: 'Backend Engineer',  name: 'Ajit'   },
            { role: 'Software Engineer', name: 'Sarah'  },
            { role: 'QA Engineer',       name: 'Marcus' },
        ],
    },
    {
        label: 'API Service',
        icon: Zap,
        description: 'Architect + 2× Backend + QA',
        agents: [
            { role: 'Architect',        name: 'Elena'  },
            { role: 'Backend Engineer', name: 'Ajit'   },
            { role: 'Backend Engineer', name: 'Ravi'   },
            { role: 'QA Engineer',      name: 'Marcus' },
        ],
    },
    {
        label: 'Full Team',
        icon: Users,
        description: 'PM · Architect · TechLead · Backend · QA · DevOps',
        agents: [
            { role: 'Product Manager',   name: 'Priya'  },
            { role: 'Architect',         name: 'Elena'  },
            { role: 'Tech Lead',         name: 'Sam'    },
            { role: 'Backend Engineer',  name: 'Ajit'   },
            { role: 'QA Engineer',       name: 'Marcus' },
            { role: 'DevOps Engineer',   name: 'Chris'  },
        ],
    },
];

// Rotating default names per role
const DEFAULT_NAMES: Record<Role, string[]> = {
    'Product Manager':   ['Priya', 'Jordan', 'Nadia'],
    'Architect':         ['Elena', 'Viktor', 'Sanjay'],
    'Tech Lead':         ['Sam', 'Dana', 'Leo'],
    'Software Engineer': ['Sarah', 'Tom', 'Mei'],
    'Backend Engineer':  ['Ajit', 'Ravi', 'Omar'],
    'QA Engineer':       ['Marcus', 'Aisha', 'Pat'],
    'DevOps Engineer':   ['Chris', 'Yuki', 'Alex'],
};

const getDefaultName = (role: Role, existingAgents: Agent[]): string => {
    const names = DEFAULT_NAMES[role];
    const usedNames = new Set(existingAgents.map(a => a.name));
    return names.find(n => !usedNames.has(n)) ?? names[0];
};

// ─── Main component ───────────────────────────────────────────────────────────

const TeamCreationView = () => {
    const navigate = useNavigate();
    const { agents, addAgent, removeAgent, startPlanning } = useAgentStore();
    const [newAgentName, setNewAgentName] = useState('');
    const [selectedRole, setSelectedRole] = useState<Role>('Backend Engineer');
    const [capability, setCapability] = useState(7);

    const handleRoleSelect = (role: Role) => {
        setSelectedRole(role);
        setNewAgentName(getDefaultName(role, agents));
    };

    const handleAddAgent = (e: React.FormEvent) => {
        e.preventDefault();
        const name = newAgentName.trim() || getDefaultName(selectedRole, agents);
        const newAgent: Agent = {
            id: uuidv4(),
            name,
            role: selectedRole,
            status: 'idle',
            capability,
            logs: [],
        };
        addAgent(newAgent);
        setNewAgentName('');
        setCapability(7);
    };

    const handleApplyTemplate = (templateAgents: TemplateAgent[]) => {
        // Clear existing agents and add template ones
        agents.forEach(a => removeAgent(a.id));
        templateAgents.forEach(({ role, name }) => {
            addAgent({ id: uuidv4(), name, role, status: 'idle', capability: 7, logs: [] });
        });
    };

    const handleStartProject = () => {
        if (agents.length > 0) {
            startPlanning();
            navigate('/dashboard');
        }
    };

    return (
        <div className="w-full min-h-screen bg-background text-white p-4 md:p-8 flex flex-col">
            <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">

                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                        <Users className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                        Assemble Your Team
                    </h1>
                    <p className="text-secondary mt-2 text-sm md:text-base">
                        Pick a template or build your team manually.
                    </p>
                </header>

                {/* Template chips */}
                <div className="flex flex-wrap gap-3 mb-8">
                    {TEMPLATES.map(({ label, icon: TIcon, description, agents: tAgents }) => (
                        <button
                            key={label}
                            onClick={() => handleApplyTemplate(tAgents)}
                            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-zinc-700 hover:border-blue-500/50 bg-zinc-900/50 hover:bg-blue-500/5 text-sm transition-all group"
                        >
                            <TIcon className="w-4 h-4 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                            <div className="text-left">
                                <span className="font-semibold text-zinc-200 group-hover:text-white transition-colors">{label}</span>
                                <span className="text-zinc-600 text-[11px] block">{description}</span>
                            </div>
                        </button>
                    ))}
                    <button
                        onClick={() => agents.forEach(a => removeAgent(a.id))}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-800 hover:border-red-500/30 bg-zinc-900/30 hover:bg-red-500/5 text-sm text-zinc-600 hover:text-red-400 transition-all"
                    >
                        Clear all
                    </button>
                </div>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left: Add agent form */}
                    <div className="bg-surface rounded-xl border border-white/10 p-6 h-fit">
                        <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-accent" />
                            Add Member
                        </h2>
                        <form onSubmit={handleAddAgent} className="space-y-5">

                            {/* Role selector */}
                            <div>
                                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2 font-semibold">Role</label>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {ALL_ROLES.map(role => {
                                        const cfg = ROLE_CONFIG[role];
                                        const Icon = cfg.icon;
                                        const isSelected = selectedRole === role;
                                        return (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => handleRoleSelect(role)}
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm text-left transition-all ${
                                                    isSelected
                                                        ? 'bg-blue-500/10 border-blue-500/40 text-white'
                                                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                                                }`}
                                            >
                                                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? cfg.color : 'text-zinc-600'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-medium block">{role}</span>
                                                    {isSelected && (
                                                        <span className="text-[11px] text-zinc-500 leading-tight block mt-0.5">{cfg.description}</span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5 font-semibold">Name</label>
                                <input
                                    type="text"
                                    value={newAgentName}
                                    onChange={e => setNewAgentName(e.target.value)}
                                    placeholder={getDefaultName(selectedRole, agents)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:border-blue-500/50 outline-none transition-colors text-white placeholder:text-zinc-600"
                                />
                            </div>

                            {/* Capability slider */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Speed</label>
                                    <span className={`text-xs font-bold font-mono ${
                                        capability >= 8 ? 'text-emerald-400' :
                                        capability >= 5 ? 'text-amber-400' : 'text-zinc-400'
                                    }`}>{capability}/10</span>
                                </div>
                                <input
                                    type="range"
                                    min={1}
                                    max={10}
                                    value={capability}
                                    onChange={e => setCapability(Number(e.target.value))}
                                    className="w-full accent-blue-500 h-1.5 rounded-full cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] text-zinc-700 mt-1">
                                    <span>Slow</span><span>Fast</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg font-medium text-sm transition-all active:scale-95"
                            >
                                <UserPlus className="w-4 h-4" />
                                Add to Team
                            </button>
                        </form>
                    </div>

                    {/* Right: Team roster */}
                    <div className="lg:col-span-2 bg-surface rounded-xl border border-white/10 p-6 flex flex-col min-h-[400px]">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-accent" />
                                Team ({agents.length})
                            </h2>
                            <button
                                onClick={handleStartProject}
                                disabled={agents.length === 0}
                                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-green-900/30 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Start Project <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2">
                            <AnimatePresence initial={false}>
                                {agents.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="h-full flex flex-col items-center justify-center text-zinc-600 py-16"
                                    >
                                        <Users className="w-12 h-12 mb-3 opacity-30" />
                                        <p className="text-sm">No team members yet — pick a template above or add manually.</p>
                                    </motion.div>
                                ) : (
                                    agents.map((agent, i) => {
                                        const cfg = ROLE_CONFIG[agent.role] ?? ROLE_CONFIG['Software Engineer'];
                                        const Icon = cfg.icon;
                                        return (
                                            <motion.div
                                                key={agent.id}
                                                initial={{ opacity: 0, x: -16 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                                className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 group hover:border-zinc-700 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-zinc-700 flex items-center justify-center shrink-0 text-sm font-bold text-white">
                                                        {agent.name[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm text-white">{agent.name}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <Icon className={`w-3 h-3 ${cfg.color}`} />
                                                            <p className="text-xs text-zinc-500">{agent.role}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                                                        <span className={`font-mono font-bold ${
                                                            agent.capability >= 8 ? 'text-emerald-500' :
                                                            agent.capability >= 5 ? 'text-amber-500' : 'text-zinc-500'
                                                        }`}>{agent.capability}</span>
                                                        <span className="text-zinc-700">/10</span>
                                                    </div>
                                                    <button
                                                        onClick={() => removeAgent(agent.id)}
                                                        className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamCreationView;
