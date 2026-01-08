/**
 * @fileoverview Tools Module Exports
 * @module lib/tools
 *
 * Main entry point for the tool system.
 * Exports tool types, registry, and built-in tools.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

// Export types
export * from './types';

// Export registry
export { ToolRegistry, getToolRegistry } from './registry';

// Export built-in tools
export { readFileTool, writeFileTool, listDirectoryTool } from './file';
