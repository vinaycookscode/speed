---
description: Standard operating procedure for adding a new AI Agent role to the Speed orchestrator ecosystem.
---

# Workflow: Add a New Agent Role

When requested to add a new AI agent (e.g., "Add a Data Scientist" or "Add a UI/UX Designer"), you MUST follow this exact sequence to ensure the agent correctly mounts into the orchestration engine.

## Step 1: Update the Types
File: `src/store/agentStore.ts`
1. Locate the `export type Role` union type.
2. Append the exact string name of the new role (e.g., `| 'Data Scientist'`).

## Step 2: Register the Default Agent
File: `src/store/agentStore.ts`
1. Locate the `createProject: (idea) => { ... }` action function.
2. Inside the `agents: [...]` initial array, add a new agent object using `uuidv4()`:
```typescript
{ id: uuidv4(), name: 'Alex', role: 'Data Scientist', status: 'idle', capability: 8, logs: [] }
```

## Step 3: Integrate into the Simulation Logic
File: `src/store/agentStore.ts`
1. Go to the `tick: () => { ... }` function.
2. Determine which `phase` (`planning`, `architecture`, or `development`) this agent operates in.
3. Add assignment logic to parse `todo` tasks suitable for this role, and change the task status to `in-progress` and assign the agent.

## Step 4: Define Output Generation
File: `src/store/agentStore.ts`
1. Scroll down to where the `if (task.progress >= 100)` review logic occurs.
2. Under the section mapping output strings (`else if (task.title.includes('...'))`), add a specific text/code template that this new agent produces when they complete their type of task.

## Step 5: (Optional) UI Update
1. Check `src/views/DashboardView.tsx` or `TaskBoardView.tsx` to ensure any role-specific color coding or avatars apply nicely to the new title.
