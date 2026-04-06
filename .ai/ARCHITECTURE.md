# Speed - Architecture

## High-Level Overview
Speed is an autonomous agentic orchestrator wrapped in an Electron application. It allows users to define a high-level project idea and simulates a team of AI agents executing it through defined phases. Rather than just returning strings, it interacts directly with the file system to produce a working codebase.

## Core Modules

### 1. State Hub (`src/store/agentStore.ts`)
The entire application state and business logic reside in a single Zustand slice. 
It tracks:
- `projects`: Past and active projects.
- `agents`: The AI team (PM, Architect, Engineers, QA). Each has parameters like `capability`, `status` (idle/working), and internal `logs`.
- `tasks`: Generated user stories and technical tickets with dependencies and complexity ratings.
- `phase`: The state machine phase of the current project.

### 2. The Orchestrator Engine (`src/utils/orchestrator.ts`)
A tiny React hook (`useOrchestrator`) initiated exactly once in `App.tsx`. 
It repeatedly calls `agentStore.tick()` every second. 
The `tick()` function acts as a game-loop:
1. Evaluates the current `phase`.
2. Finds `idle` agents matching role requirements.
3. Assigns `todo` tasks to available agents.
4. Increments the `progress` of actively worked tasks based on the agent's `capability`.
5. Promotes completed tasks to review and auto-generates simulated code blocks.

### 3. IPC & File System
Running inside Electron, Speed has local file system privileges. Simulated tasks generate code payloads. Inside the `tick()` function, `window.ipcRenderer` commands (via `src/utils/projectRunner.ts` or `fileSystem.ts`) push these payloads directly to the user's disk to create real, executable software logic. Updates to app-level routing (like `App.tsx` imports) are done in real-time.

### 4. UI Layer (`src/views/`)
- `IdeaInputView`: The genesis point for creating new projects. Glow effects and dynamic input.
- `DashboardView`: High-level overview of agent logs, current team configuration, and system readouts.
- `TaskBoardView`: Kanban view of current tasks, grouping them by Epic/Story.

## State Machine (Project Phases)
1. **Planning**: The Product Manager agent acts independently to synthesize requirements (`tasks`).
2. **Approval**: A human-in-the-loop pause holding state until the user validates generated tasks.
3. **Architecture**: The Architect generates boilerplate, defines the tech stack, and scaffolds root environments.
4. **Development**: Parallel execution loop. Backend engineers pick up backend-typed tasks first, followed by Frontend engineers bridging APIs and views.
