/**
 * @fileoverview Agents Module Exports
 * @module lib/agents
 *
 * Main entry point for the agent system.
 * Exports agent types, base class, and specialized agents.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

// Export types
export * from './types';

// Export base agent
export { BaseAgent } from './base';

// Export specialized agents
export { MetaAgent, createMetaAgent } from './meta';
export type { ProjectAnalysis, ProjectType, ComplexityLevel } from './meta';

export { PMAgent, createPMAgent } from './pm';
export type { UserStory, Epic } from './pm';

export { TechLeadAgent, createTechLeadAgent } from './tech-lead';
export type { TechnicalTask, CodeReview } from './tech-lead';

export { FullStackAgent, createFullStackAgent } from './fullstack';
export type { CodeOutput } from './fullstack';
