# Architectural Decision Records (ADRs)

This file documents the major technical decisions that must NOT be refactored or overridden by LLM suggestions without explicit permission from the user.

## 1. Monolithic Zustand Store (`agentStore.ts`)
- **Decision:** All state (projects, tasks, agents, simulation ticks) lives inside a single, large Zustand store instead of being split into multiple domain-specific slices.
- **Reasoning:** The entire application revolves around the `tick()` simulation loop. This function runs per second and requires synchronous read/write access to tasks, agent capabilities, project phases, and IPC events simultaneously. Splicing the store would introduce complex cross-module dependencies and break the synchronous simulation step.
- **Constraint:** Do NOT attempt to refactor `agentStore.ts` into smaller files. Keep it monolithic.

## 2. Hardcoded Phase Execution
- **Decision:** Project simulation must follow a strict, linear state machine: `planning` -> `approval` -> `architecture` -> `development`.
- **Reasoning:** To emulate an actual engineering team, tasks cannot be worked on randomly. Setup tasks run before dev tasks; Backend tasks run before Frontend tasks.
- **Constraint:** When adding new task types, they MUST be injected into this specific sequence inside the `tick()` function. Do not bypass the staging logic.

## 3. Direct File IPC Generation within the Tick Loop
- **Decision:** When an agent successfully "completes" an in-progress task (progress hits 100%), the code output is strictly generated in the `agentStore.ts` logic and immediately written to disk via `window.ipcRenderer`.
- **Reasoning:** Speed is bridging the gap between a UI simulation and real file generation. 
- **Constraint:** Do not replace file generation with "mock" outputs if `ipcRenderer` is available. Always format simulated outputs as realistic markdown or code payloads.
