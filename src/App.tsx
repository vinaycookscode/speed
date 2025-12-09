import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import IdeaInputView from './views/IdeaInputView';
import TeamCreationView from './views/TeamCreationView';
import DashboardView from './views/DashboardView';
import TaskBoardView from './views/TaskBoardView';

import MainLayout from './layouts/MainLayout';
import { useOrchestrator } from './utils/orchestrator';
import { useEffect } from 'react';
import { useAgentStore } from './store/agentStore';
import { v4 as uuidv4 } from 'uuid';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<IdeaInputView />} />
        <Route path="/team-creation" element={<TeamCreationView />} />

        {/* Main App Layout */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardView />} />
          <Route path="/task-board" element={<TaskBoardView />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  // Start the simulation loop globally
  useOrchestrator(1000);

  // Temporary: Ensure Ajit is added to existing projects and handle duplicates
  const { agents, addAgent, removeAgent } = useAgentStore();
  useEffect(() => {
    const ajits = agents.filter(a => a.name === 'Ajit');

    if (ajits.length === 0 && agents.length > 0) {
      // Add Ajit if missing
      addAgent({
        id: uuidv4(),
        name: 'Ajit',
        role: 'Backend Engineer',
        status: 'idle',
        capability: 8,
        logs: []
      });
    } else if (ajits.length > 1) {
      // Remove duplicates (keep the first one)
      ajits.slice(1).forEach(a => removeAgent(a.id));
    }
  }, [agents, addAgent, removeAgent]);

  return (
    <HashRouter>
      <AnimatedRoutes />
    </HashRouter>
  );
}

export default App;
