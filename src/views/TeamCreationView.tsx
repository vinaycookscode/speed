import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, UserPlus, Trash2, ArrowRight, Briefcase, Layout, Terminal, Code, Bug } from 'lucide-react';
import { useAgentStore, Agent, Role } from '../store/agentStore';
import { v4 as uuidv4 } from 'uuid';

const ROLES: Role[] = ['Product Manager', 'Architect', 'Tech Lead', 'Software Engineer', 'QA Engineer'];

const TeamCreationView = () => {
    const navigate = useNavigate();
    const { agents, addAgent, removeAgent } = useAgentStore();
    const [newAgentName, setNewAgentName] = useState('');
    const [selectedRole, setSelectedRole] = useState<Role>('Software Engineer');

    const handleAddAgent = (e: React.FormEvent) => {
        e.preventDefault();
        if (newAgentName.trim()) {
            const newAgent: Agent = {
                id: uuidv4(),
                name: newAgentName,
                role: selectedRole,
                status: 'idle',
                capability: Math.floor(Math.random() * 5) + 5, // Random capability 5-10
                logs: [],
            };
            addAgent(newAgent);
            setNewAgentName('');
        }
    };

    const handleStartProject = () => {
        if (agents.length > 0) {
            navigate('/dashboard');
        }
    };

    return (
        <div className="w-full min-h-screen bg-background text-white p-4 md:p-8 flex flex-col">
            <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
                <header className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                        <Users className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                        Assemble Your Team
                    </h1>
                    <p className="text-secondary mt-2 text-sm md:text-base">
                        Select the experts who will build your vision.
                    </p>
                </header>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Add Agent Form */}
                    <div className="bg-surface rounded-xl border border-white/10 p-6 h-fit">
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-accent" />
                            Add Team Member
                        </h2>
                        <form onSubmit={handleAddAgent} className="space-y-4">
                            <div>
                                <label className="block text-sm text-secondary mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newAgentName}
                                    onChange={(e) => setNewAgentName(e.target.value)}
                                    placeholder="e.g. Alice"
                                    className="w-full bg-background border border-white/10 rounded-lg p-3 focus:border-primary outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-secondary mb-2">Role</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {ROLES.map((role) => {
                                        const Icon = role === 'Product Manager' ? Users :
                                            role === 'Architect' ? Layout :
                                                role === 'Tech Lead' ? Terminal :
                                                    role === 'Software Engineer' ? Code :
                                                        role === 'QA Engineer' ? Bug : Users;

                                        return (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => setSelectedRole(role)}
                                                className={`flex items-center gap-2 px-3 py-3 rounded-lg border transition-all text-sm ${selectedRole === role
                                                    ? 'bg-primary/20 border-primary text-primary'
                                                    : 'bg-background border-white/10 hover:border-white/20 text-secondary hover:text-white'
                                                    }`}
                                            >
                                                <Icon className="w-4 h-4 shrink-0" />
                                                {role}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={!newAgentName.trim()}
                                className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                            >
                                Add to Team
                            </button>
                        </form>
                    </div>

                    {/* Right Column: Team Roster */}
                    <div className="lg:col-span-2 bg-surface rounded-xl border border-white/10 p-6 flex flex-col min-h-[400px]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-accent" />
                                Current Team ({agents.length})
                            </h2>
                            <button
                                onClick={handleStartProject}
                                disabled={agents.length === 0}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                            >
                                Start Project <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[500px] lg:max-h-none">
                            {agents.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-secondary opacity-50">
                                    <Users className="w-16 h-16 mb-4" />
                                    <p>No team members yet. Add someone to get started.</p>
                                </div>
                            ) : (
                                agents.map((agent) => (
                                    <motion.div
                                        key={agent.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="flex items-center justify-between bg-background border border-white/5 rounded-lg p-4 group hover:border-white/10 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-lg font-bold shrink-0">
                                                {agent.name[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-medium">{agent.name}</h3>
                                                <p className="text-sm text-secondary">{agent.role}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeAgent(agent.id)}
                                            className="p-2 text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamCreationView;
