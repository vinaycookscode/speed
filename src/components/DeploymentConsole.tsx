import React, { useEffect, useRef } from 'react';
import { Terminal, AlertTriangle, CheckCircle, XCircle, Play, Minimize2, Maximize2, ChevronUp, Minus, X } from 'lucide-react';
import { useAgentStore } from '../store/agentStore';
import RocketLoader from './RocketLoader';

const DeploymentConsole = () => {
    const { deployment, toggleDeploymentConsole, setDeploymentStatus, setDeploymentAnalysis, addDeploymentLog, agents } = useAgentStore();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isMaximized, setIsMaximized] = React.useState(false);
    const [isMinimized, setIsMinimized] = React.useState(false);

    const { logs, status, analysis } = deployment;

    const devOpsAgent = agents.find(a => a.role === 'DevOps Engineer') || { name: 'System', avatar: '' };

    useEffect(() => {
        if (scrollRef.current && !isMinimized) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [deployment.logs, isMinimized]);

    if (!deployment.isVisible) return null;

    const getStatusColor = () => {
        switch (deployment.status) {
            case 'failed': return 'text-red-500';
            case 'running': return 'text-green-500';
            case 'installing':
            case 'starting': return 'text-yellow-500';
            default: return 'text-zinc-500';
        }
    };

    // --- MINIMIZED STATE ---
    if (isMinimized) {
        return (
            <div className="fixed bottom-6 right-6 z-50 w-96 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 rounded-lg shadow-2xl flex items-center justify-between p-3 animate-in slide-in-from-bottom-5 fade-in duration-300">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="relative">
                        <Terminal className={`w-5 h-5 ${getStatusColor()}`} />
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-current animate-pulse opacity-75" style={{ color: 'inherit' }} />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-zinc-200 truncate">Vikram (DevOps)</span>
                        <span className="text-xs text-zinc-500 truncate">
                            {status === 'running' ? 'Application is running' :
                                status === 'failed' ? 'Process failed' :
                                    logs.length > 0 ? logs[logs.length - 1].text.slice(0, 30) + '...' : 'Idle'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                    <button
                        onClick={() => setIsMinimized(false)}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors text-zinc-400 hover:text-white"
                        title="Restore"
                    >
                        <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => toggleDeploymentConsole(false)}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors text-zinc-400 hover:text-white"
                        title="Close"
                    >
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    // --- EXPANDED STATE (Normal / Maximize) ---
    return (
        <div className={`fixed z-50 flex flex-col bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden transition-all duration-300 ease-in-out ${isMaximized
            ? 'inset-0 rounded-none w-screen h-screen'
            : 'inset-0 m-auto w-[900px] h-[600px] rounded-xl bg-black/60 backdrop-blur-sm'
            }`}>

            {!isMaximized && (
                null
            )}

            {/* Main Window Content */}
            <div className={`flex flex-col w-full h-full bg-zinc-950 ${!isMaximized ? 'border border-zinc-800 rounded-xl overflow-hidden' : ''}`}>

                {/* Header */}
                <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/50 shrink-0 cursor-default select-none group" onDoubleClick={() => setIsMaximized(!isMaximized)}>
                    <div className="flex items-center gap-3">
                        <Terminal className={`w-4 h-4 ${getStatusColor()}`} />
                        <h2 className="font-semibold text-sm text-zinc-300">Deployment Console</h2>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold ${status === 'failed' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                            status === 'running' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
                                'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                            }`}>
                            {status}
                        </span>
                    </div>

                    {/* Window Controls */}
                    <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => setIsMinimized(true)}
                            className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-zinc-400 hover:text-white"
                            title="Minimize"
                        >
                            <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => setIsMaximized(!isMaximized)}
                            className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-zinc-400 hover:text-white"
                            title={isMaximized ? "Restore" : "Maximize"}
                        >
                            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </button>
                        {/* Divider */}
                        <div className="w-px h-3 bg-zinc-700 mx-1" />
                        <button
                            onClick={() => toggleDeploymentConsole(false)}
                            className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors text-zinc-400"
                            title="Close"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex min-h-0">
                    {/* Terminal Output */}
                    <div className="flex-1 bg-black p-4 font-mono text-xs md:text-sm overflow-y-auto custom-scrollbar" ref={scrollRef}>
                        {logs.map((log, i) => (
                            <div key={i} className={`mb-1 leading-snug break-words ${log.type === 'error' ? 'text-red-400' :
                                log.type === 'success' ? 'text-green-400' :
                                    'text-zinc-400'
                                }`}>
                                <span className="opacity-30 mr-2 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                <span className="whitespace-pre-wrap">{log.text}</span>
                            </div>
                        ))}
                        {(status === 'installing' || status === 'starting') && (
                            <div className="animate-pulse text-yellow-500 mt-2">_</div>
                        )}
                        <div className="h-4" /> {/* Bototm padding */}
                    </div>

                    {/* DevOps Analysis Panel */}
                    <div className="w-72 md:w-80 border-l border-zinc-800 bg-zinc-900/30 flex flex-col shrink-0">
                        <div className="p-3 border-b border-zinc-800 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 shrink-0">
                                {devOpsAgent.avatar && <img src={devOpsAgent.avatar} alt="DevOps" className="w-full h-full object-cover" />}
                            </div>
                            <div className="min-w-0">
                                <div className="font-semibold text-sm text-zinc-200 truncate">{devOpsAgent.name}</div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">DevOps Engineer</div>
                            </div>
                        </div>

                        <div className="flex-1 p-4 overflow-y-auto">
                            {status === 'installing' || status === 'starting' ? (
                                <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
                                    <RocketLoader size={60} iconSize={20} />
                                    <p className="text-xs text-center px-4 animate-pulse">Monitoring build process...</p>
                                </div>
                            ) : analysis ? (
                                <div className="prose prose-invert prose-sm">
                                    <div className="bg-red-500/10 border border-red-500/20 rounded p-3 mb-4">
                                        <h4 className="text-red-400 m-0 mb-1 flex items-center gap-2 text-xs font-bold uppercase">
                                            <AlertTriangle className="w-3 h-3" /> Issue Detected
                                        </h4>
                                        <p className="text-zinc-300 text-xs m-0 leading-relaxed font-mono">{analysis}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Suggested Fix</h4>
                                        <div className="bg-zinc-950 rounded p-2 text-green-400 font-mono text-xs border border-zinc-800 select-all">
                                            nvm use node &amp;&amp; npm install
                                        </div>
                                    </div>
                                </div>
                            ) : status === 'running' ? (
                                <div className="flex flex-col items-center justify-center h-full text-green-500 gap-3">
                                    <div className="p-3 rounded-full bg-green-500/10 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.2)] animate-pulse-slow">
                                        <CheckCircle className="w-8 h-8" />
                                    </div>
                                    <p className="text-sm font-medium">System Operational</p>
                                    <div className="text-xs text-zinc-600 text-center max-w-[200px]">
                                        Vikram is monitoring the process for stability.
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                                    <Terminal className="w-8 h-8 opacity-20" />
                                    <p className="text-xs">Ready for deployment</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeploymentConsole;
