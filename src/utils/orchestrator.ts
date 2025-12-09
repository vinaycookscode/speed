import { useEffect } from 'react';
import { useAgentStore } from '../store/agentStore';

export const useOrchestrator = (intervalMs: number = 1000) => {
    const tick = useAgentStore((state) => state.tick);

    useEffect(() => {
        const intervalId = setInterval(() => {
            tick();
        }, intervalMs);

        return () => clearInterval(intervalId);
    }, [tick, intervalMs]);
};
