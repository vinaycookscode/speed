import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Users, Layout, Terminal, Menu, List, CheckCircle, ChevronLeft, ChevronRight, Play, Code2, Shield, Folder, Settings } from 'lucide-react';
import { useAgentStore } from '../store/agentStore';
import DeploymentConsole from '../components/DeploymentConsole';
import { v4 as uuidv4 } from 'uuid';
import { detectProjectType, getRunConfig } from '../utils/projectRunner';

const MainLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { phase, projectIdea, tasks, approvePlan,
        toggleDeploymentConsole, setDeploymentStatus, addDeploymentLog, setDeploymentAnalysis,
        agents, addAgent, addToast,
        projects, activeProjectId, switchProject
    } = useAgentStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Recent Workspaces Logic
    const activeProject = projects.find(p => p.id === activeProjectId);
    const recentProjects = projects
        .filter(p => p.id !== activeProjectId)
        .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0))
        .slice(0, 2);

    const displayProjects = activeProject ? [activeProject, ...recentProjects] : recentProjects.slice(0, 3);
    const showPlaceholder = displayProjects.length === 0;

    // Ensure DevOps Agent (Vikram) exists
    useEffect(() => {
        if (agents.length > 0 && !agents.find(a => a.role === 'DevOps Engineer')) {
            addAgent({
                id: uuidv4(),
                name: 'Vikram',
                role: 'DevOps Engineer',
                status: 'idle',
                capability: 7,
                logs: []
            });
        }
    }, [agents, addAgent]);

    const isDashboard = location.pathname === '/dashboard';
    const isTaskBoard = location.pathname === '/task-board';

    const handleApprovePlan = () => {
        approvePlan();
        navigate('/dashboard');
    };

    const handleRunApp = async () => {
        const { rootPath, addToast } = useAgentStore.getState();

        console.log("Run App Clicked. RootPath:", rootPath, "IPC:", !!window.ipcRenderer);

        if (!window.ipcRenderer) {
            addToast('Error: Electron IPC not found.', 'error');
            return;
        }
        if (!rootPath) {
            addToast('Error: No project root path found.', 'error');
            return;
        }

        try {
            toggleDeploymentConsole(true);
            setDeploymentStatus('installing');
            setDeploymentAnalysis(null);
            useAgentStore.setState(state => ({ deployment: { ...state.deployment, logs: [] } }));

            addDeploymentLog(`Initializing deployment for: ${rootPath} `, 'info');

            let projectType;
            let config;

            try {
                projectType = await detectProjectType(rootPath);
                config = getRunConfig(projectType);
                console.log("Detected Project:", config);
            } catch (err) {
                console.error("Detection Error:", err);
                addDeploymentLog(`Vikram: Failed to analyze project structure.Error: ${String(err)} `, 'error');
                setDeploymentStatus('failed');
                return;
            }

            if (window.ipcRenderer.removeAllListeners) {
                window.ipcRenderer.removeAllListeners('deployment:log');
            }

            let browserOpened = false;

            const logListener = (_: any, log: { text: string, type: 'info' | 'error' }) => {
                const cleanText = log.text.replace(/\x1B\[[0-9;]*[mK]/g, '');

                if ((cleanText.includes('Port') || cleanText.includes('address')) && cleanText.includes('in use')) {
                    addDeploymentLog(`Vikram: ⚠️ Port conflict detected.`, 'info');
                    setTimeout(() => {
                        addDeploymentLog(`Vikram: searching for an available port...`, 'info');
                    }, 200);
                }

                const regex = config.urlRegex || /(http:\/\/localhost:\d+)/;
                const urlMatch = cleanText.match(regex);

                if (urlMatch && urlMatch[1] && !browserOpened) {
                    let url = urlMatch[1];
                    if (/^\d+$/.test(url)) url = `http://localhost:${url}`;

                    if (url && url !== 'undefined' && url.includes('localhost')) {
                        browserOpened = true;
                        addDeploymentLog(`Vikram: App is live! Opening ${url} in Chrome...`, 'success');
                        window.ipcRenderer.invoke('terminal:exec', {
                            cwd: rootPath,
                            cmd: `open -a "Google Chrome" ${url} || open ${url}`
                        });
                    }
                }

                if (cleanText.replace(/\s/g, '').length > 0) {
                    addDeploymentLog(cleanText.trimEnd(), log.type === 'error' ? 'error' : 'info');
                }
            };
            window.ipcRenderer.on('deployment:log', logListener);

            try {
                addDeploymentLog('Vikram: Analyzing project structure...', 'info');
                await new Promise(resolve => setTimeout(resolve, 500));
                addDeploymentLog(`Detected Stack: ${config.name}`, 'success');

                let attempts = 0;
                const maxAttempts = 3;
                let installSuccess = false;

                try {
                    while (attempts < maxAttempts) {
                        const msg = attempts === 0 ? `Starting build process (${config.installCmd})...` : `Retry Attempt ${attempts + 1}...`;
                        addDeploymentLog(msg, 'info');

                        const installResult: any = await window.ipcRenderer.invoke('terminal:exec', {
                            cwd: rootPath,
                            cmd: config.installCmd
                        });

                        if (installResult.success) {
                            installSuccess = true;
                            addDeploymentLog('Dependencies installed successfully.', 'success');
                            break;
                        }

                        setDeploymentStatus('failed');
                        const errorMsg = (installResult.stderr || '') + (installResult.error || '');
                        addDeploymentLog('Installation failed. Analyzing...', 'error');

                        if (projectType === 'node') {
                            let analysis = "Unknown error.";
                            let fixCmd = "";
                            if (errorMsg.includes('esbuild')) { analysis = "Native dependency 'esbuild' mismatch."; fixCmd = "npm rebuild esbuild"; }
                            else if (errorMsg.includes('node-gyp')) { analysis = "Native module compilation failed."; fixCmd = "npm install --force"; }
                            else if (errorMsg.includes('EACCES')) { analysis = "Permission denied."; fixCmd = "npm install --unsafe-perm"; }
                            else { analysis = "Standard installation failure."; fixCmd = "npm cache clean --force"; }

                            setDeploymentAnalysis(`${analysis} \n\nVikram is applying fix: ${fixCmd}`);
                            addDeploymentLog(`Vikram: ${analysis}`, 'info');
                            addDeploymentLog(`Vikram: Auto-fixing with "${fixCmd}"...`, 'info');

                            const fixResult: any = await window.ipcRenderer.invoke('terminal:exec', { cwd: rootPath, cmd: fixCmd });
                            if (fixResult.success) addDeploymentLog('Auto-fix executed successfully. Retrying install...', 'success');
                            else addDeploymentLog(`Auto-fix failed: ${fixResult.error}`, 'error');
                        } else {
                            addDeploymentLog(`Vikram: Auto-fix not available for ${config.name}.`, 'error');
                            break;
                        }

                        setDeploymentStatus('installing');
                        setDeploymentAnalysis(null);
                        attempts++;
                    }
                } catch (e) {
                    setDeploymentStatus('failed');
                    addDeploymentLog(`Critical Error during install: ${e}`, 'error');
                    return;
                }

                if (installSuccess) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    addDeploymentLog('Launching Application Server...', 'info');
                    setDeploymentStatus('running');
                    setDeploymentAnalysis(`SUCCESS: Dependencies installed.\n\nStarting ${config.name} server...`);
                    addDeploymentLog(`Starting server: ${config.runCmd}`, 'info');

                    const runResult: any = await window.ipcRenderer.invoke('terminal:exec', {
                        cwd: rootPath,
                        cmd: config.runCmd
                    });

                    if (!runResult.success) {
                        addDeploymentLog(`Server stopped with error: ${runResult.error}`, 'error');
                        setDeploymentStatus('failed');
                    } else {
                        addDeploymentLog('Server stopped.', 'info');
                        setDeploymentStatus('idle');
                    }
                } else {
                    setDeploymentStatus('failed');
                    setDeploymentAnalysis(`Vikram failed to install dependencies.`);
                }
            } finally {
                window.ipcRenderer.removeListener('deployment:log', logListener);
            }
        } catch (err) {
            addToast('Deployment Error: ' + String(err), 'error');
            setDeploymentStatus('failed');
        }
    };

    const NavItem = ({ icon: Icon, label, active, onClick, badge }: { icon: any, label: string, active?: boolean, onClick: () => void, badge?: string }) => (
        <button
            onClick={onClick}
            title={isCollapsed ? label : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 group relative cursor-pointer ${active
                ? 'bg-blue-500/10 text-blue-400'
                : 'text-zinc-400 hover:bg-white/10 hover:text-zinc-200'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
        >
            <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
            {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                    <span className="truncate">{label}</span>
                    {badge && <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-zinc-400">{badge}</span>}
                </div>
            )}

            {isCollapsed && (
                <div className="absolute left-[calc(100%+8px)] bg-zinc-900 border border-border text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
                    {label}
                </div>
            )}
        </button>
    );

    const SidebarSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <div className="mb-2">
            {!isCollapsed && (
                <div className="px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider opacity-70">
                    {title}
                </div>
            )}
            {isCollapsed && <div className="h-4" />}
            <div className="space-y-0.5">
                {children}
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-background text-white overflow-hidden font-sans relative selection:bg-primary/30">
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-float" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px] animate-float" style={{ animationDelay: '-4s' }} />
            </div>

            <aside className={`fixed md:relative z-20 h-full glass border-r border-border/50 transition-all duration-300 ${isMobileMenuOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0'} ${isCollapsed ? 'md:w-20' : 'md:w-64'} overflow-hidden flex flex-col`}>
                <div className={`p-4 border-b border-white/5 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0 p-1.5">
                            <img src="/assets/logo/icon_32x32.png" alt="Speed Logo" className="w-full h-full object-contain" />
                        </div>
                        {!isCollapsed && (
                            <h1 className="font-bold text-xl tracking-tight text-white">
                                Speed
                            </h1>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden md:flex absolute -right-3 top-20 bg-zinc-800 border border-zinc-600 text-zinc-300 hover:text-white hover:bg-zinc-700 hover:border-zinc-500 p-1.5 rounded-full z-50 transition-all shadow-lg hover:scale-110 cursor-pointer"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                </button>

                <nav className="p-3 flex-1 overflow-y-auto custom-scrollbar">

                    <SidebarSection title="Workspace">
                        {showPlaceholder ? (
                            <NavItem
                                icon={Folder}
                                label="My Workspace"
                                active={true}
                                onClick={() => { }}
                                badge="Free"
                            />
                        ) : (
                            displayProjects.map(p => (
                                <NavItem
                                    key={p.id}
                                    icon={Folder}
                                    label={p.name}
                                    active={p.id === activeProjectId}
                                    onClick={() => switchProject(p.id)}
                                    badge={p.id === activeProjectId ? "Active" : undefined}
                                />
                            ))
                        )}
                    </SidebarSection>

                    <SidebarSection title="Development">
                        <NavItem
                            icon={Code2}
                            label="Code Editor"
                            active={false}
                            onClick={() => addToast('Code Editor: Coming Soon', 'info')}
                        />
                        <NavItem
                            icon={List}
                            label="Project Backlog"
                            active={location.search.includes('tab=backlog')}
                            onClick={() => navigate('/dashboard?tab=backlog')}
                        />
                        <NavItem
                            icon={Layout}
                            label="Scrum Board"
                            active={isTaskBoard}
                            onClick={() => navigate('/task-board')}
                        />
                    </SidebarSection>

                    <SidebarSection title="Team">
                        <NavItem
                            icon={Users}
                            label="Team Members"
                            active={isDashboard && !location.search.includes('tab=backlog')}
                            onClick={() => navigate('/dashboard')}
                        />
                        <NavItem
                            icon={Shield}
                            label="Manage Roles"
                            active={false}
                            onClick={() => addToast('Role Management: Coming Soon', 'info')}
                        />
                    </SidebarSection>

                    <SidebarSection title="System">
                        <NavItem
                            icon={Terminal}
                            label="Terminal"
                            onClick={() => toggleDeploymentConsole(true)}
                        />
                        <NavItem
                            icon={Settings}
                            label="Settings"
                            onClick={() => addToast('Settings: Coming Soon', 'info')}
                        />
                    </SidebarSection>

                    <div className="mt-4 pt-4 border-t border-white/5">
                        {window.ipcRenderer && useAgentStore.getState().rootPath && (
                            <button
                                onClick={handleRunApp}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 group relative cursor-pointer ${isCollapsed ? 'justify-center px-2' : ''} ${isCollapsed ? 'text-green-500 hover:bg-green-500/10' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20'
                                    }`}
                                title={isCollapsed ? "Run Application" : undefined}
                            >
                                <Play className="w-4 h-4 shrink-0 fill-current" />
                                {!isCollapsed && <span>Run Application</span>}
                                {isCollapsed && (
                                    <div className="absolute left-[calc(100%+8px)] bg-zinc-900 border border-border text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
                                        Run Application
                                    </div>
                                )}
                            </button>
                        )}
                    </div>
                </nav>
            </aside>

            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-10 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <div className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10">
                <header className="h-16 border-b border-white/5 bg-background/30 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 hover:bg-white/5 rounded-lg transition-colors">
                            <Menu className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="font-semibold text-sm text-muted flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full animate-pulse ${phase === 'planning' ? 'bg-blue-500' :
                                    phase === 'approval' ? 'bg-yellow-500' :
                                        phase === 'architecture' ? 'bg-purple-500' : 'bg-green-500'
                                    }`} />
                                {phase === 'planning' ? 'Planning Phase' :
                                    phase === 'approval' ? 'Approval Phase' :
                                        phase === 'architecture' ? 'Architecture Phase' : 'Development Phase'}
                            </h2>
                            <p className="text-sm font-medium text-white truncate max-w-md opacity-90">{projectIdea}</p>
                        </div>
                    </div>

                    {phase === 'approval' && (
                        <button
                            onClick={handleApprovePlan}
                            disabled={tasks.filter(t => t.selected).length === 0}
                            className="bg-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-primary/20 flex items-center gap-2 hover:shadow-primary/40 hover:scale-105 active:scale-95"
                        >
                            <CheckCircle className="w-4 h-4" /> Approve Plan
                        </button>
                    )}
                </header>

                <main className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth">
                    <Outlet />
                </main>
            </div>

            <DeploymentConsole />

        </div>
    );
};

export default MainLayout;
