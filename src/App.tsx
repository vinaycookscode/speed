import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import IdeaInputView from './views/IdeaInputView';
import TeamCreationView from './views/TeamCreationView';
import DashboardView from './views/DashboardView';
import TaskBoardView from './views/TaskBoardView';
import PlanningScreen from './components/PlanningScreen';

import MainLayout from './layouts/MainLayout';
import { useOrchestrator } from './utils/orchestrator';
import { useEffect, useRef, useState } from 'react';
import { useAgentStore } from './store/agentStore';
import { v4 as uuidv4 } from 'uuid';

function AnimatedRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { phase, tasks } = useAgentStore();
  const prevPhaseRef = useRef(phase);

  // When planning finishes and we transition to approval, open the backlog tab
  useEffect(() => {
    if (prevPhaseRef.current === 'planning' && phase === 'approval') {
      navigate('/dashboard?tab=backlog', { replace: true });
    }
    prevPhaseRef.current = phase;
  }, [phase, navigate]);

  // Also switch to backlog immediately if tasks arrive while already on dashboard
  useEffect(() => {
    if (phase === 'approval' && tasks.length > 0 && location.pathname === '/dashboard' && !location.search.includes('tab=backlog')) {
      navigate('/dashboard?tab=backlog', { replace: true });
    }
  }, [phase, tasks.length, location.pathname, location.search, navigate]);

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

  const { agents, addAgent, removeAgent, phase, tasks } = useAgentStore();
  const pm = agents.find(a => a.role === 'Product Manager');

  // Keep the planning overlay alive long enough to show 100% before unmounting.
  const [showPlanning, setShowPlanning] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isWorking = phase === 'planning' && pm?.status === 'working';
    const justFinished = phase === 'approval' && tasks.length > 0;

    if (isWorking) {
      // Clear any pending hide timer and keep visible
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setShowPlanning(true);
    } else if (justFinished && showPlanning) {
      // Hold open for 1.5 s so the 100% animation plays, then fade out
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setShowPlanning(false), 1500);
    } else if (!isWorking && !justFinished) {
      setShowPlanning(false);
    }
  }, [phase, pm?.status, tasks.length, showPlanning]);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

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
      <AnimatePresence>
        {showPlanning && <PlanningScreen key="planning-screen" />}
      </AnimatePresence>
    </HashRouter>
  );
}

export default App;
