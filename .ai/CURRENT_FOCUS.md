# Speed - Current Focus

*This is a living document. Update this file at the end of every active coding session so LLMs can regain context instantly.*

## Current Status (v1.0.0 Era -> True Multi-Agent Shift)
- The core UI and monolithic `agentStore.ts` have been established as the foundation.
- The project is now transitioning from a mocked simulation loop to a **True Multi-Agent System**.
- An `implementation_plan.md` has been drafted to restructure the orchestrator into asynchronous LLM worker loops (PM, Architect, Developers interacting with external LLM APIs concurrently).

## Next High-Level Objectives
- Await user approval on the LLM API integration strategy (OpenAI/Anthropic/Gemini) and rate-limiting limits.
- Decouple the UI state tracking from the "Agent Brains" by building `src/agents/` worker classes.
- Implement true parallel code generation for the `Developer` agents and a code-review step for the `Architect`.
