/**
 * @fileoverview File System Tools
 * @module lib/tools/file
 *
 * Tools for file system operations.
 * Works with Electron's file system access.
 *
 * @copyright 2026 Speed Team
 * @license MIT
 *
 * @author Speed Team
 * @created 2026-01-08
 */

import type {
    Tool,
    ReadFileParams,
    WriteFileParams,
    ToolExecutionResult,
} from './types';

// ============================================================================
// FILE TOOLS
// ============================================================================

/**
 * Tool for reading file contents.
 */
export const readFileTool: Tool<ReadFileParams, string> = {
    name: 'read_file',
    description: 'Read the contents of a file at the specified path',
    category: 'file',
    parameters: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'The absolute path to the file to read',
            },
            encoding: {
                type: 'string',
                description: 'The file encoding (default: utf-8)',
                default: 'utf-8',
            },
        },
        required: ['path'],
    },

    async execute(params: ReadFileParams): Promise<ToolExecutionResult<string>> {
        try {
            // Check if we're in Electron
            if (typeof window !== 'undefined' && (window as any).electron?.readFile) {
                const content = await (window as any).electron.readFile(params.path);
                return {
                    success: true,
                    data: content,
                    output: `Read ${content.length} bytes from ${params.path}`,
                };
            }

            // Node.js environment
            if (typeof require !== 'undefined') {
                const fs = require('fs').promises;
                const content = await fs.readFile(params.path, params.encoding || 'utf-8');
                return {
                    success: true,
                    data: content,
                    output: `Read ${content.length} bytes from ${params.path}`,
                };
            }

            return {
                success: false,
                output: 'File system access not available',
                error: {
                    code: 'NO_FS_ACCESS',
                    message: 'Neither Electron nor Node.js file system available',
                },
            };
        } catch (error) {
            return {
                success: false,
                output: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
                error: {
                    code: 'READ_ERROR',
                    message: error instanceof Error ? error.message : String(error),
                },
            };
        }
    },
};

/**
 * Tool for writing file contents.
 */
export const writeFileTool: Tool<WriteFileParams, void> = {
    name: 'write_file',
    description: 'Write content to a file at the specified path. Creates directories if needed.',
    category: 'file',
    parameters: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'The absolute path to the file to write',
            },
            content: {
                type: 'string',
                description: 'The content to write to the file',
            },
            createDirs: {
                type: 'boolean',
                description: 'Whether to create parent directories if they do not exist',
                default: true,
            },
        },
        required: ['path', 'content'],
    },

    async execute(params: WriteFileParams): Promise<ToolExecutionResult<void>> {
        try {
            // Check if we're in Electron
            if (typeof window !== 'undefined' && (window as any).electron?.writeFile) {
                await (window as any).electron.writeFile(params.path, params.content);
                return {
                    success: true,
                    output: `Wrote ${params.content.length} bytes to ${params.path}`,
                };
            }

            // Node.js environment
            if (typeof require !== 'undefined') {
                const fs = require('fs').promises;
                const path = require('path');

                // Create directories if needed
                if (params.createDirs !== false) {
                    await fs.mkdir(path.dirname(params.path), { recursive: true });
                }

                await fs.writeFile(params.path, params.content, 'utf-8');
                return {
                    success: true,
                    output: `Wrote ${params.content.length} bytes to ${params.path}`,
                };
            }

            return {
                success: false,
                output: 'File system access not available',
                error: {
                    code: 'NO_FS_ACCESS',
                    message: 'Neither Electron nor Node.js file system available',
                },
            };
        } catch (error) {
            return {
                success: false,
                output: `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
                error: {
                    code: 'WRITE_ERROR',
                    message: error instanceof Error ? error.message : String(error),
                },
            };
        }
    },
};

/**
 * Tool for listing directory contents.
 */
export const listDirectoryTool: Tool<{ path: string }, string[]> = {
    name: 'list_directory',
    description: 'List all files and directories in the specified path',
    category: 'file',
    parameters: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'The absolute path to the directory',
            },
        },
        required: ['path'],
    },

    async execute(params: { path: string }): Promise<ToolExecutionResult<string[]>> {
        try {
            // Check if we're in Electron
            if (typeof window !== 'undefined' && (window as any).electron?.listDirectory) {
                const entries = await (window as any).electron.listDirectory(params.path);
                return {
                    success: true,
                    data: entries,
                    output: `Found ${entries.length} entries in ${params.path}`,
                };
            }

            // Node.js environment
            if (typeof require !== 'undefined') {
                const fs = require('fs').promises;
                const entries = await fs.readdir(params.path);
                return {
                    success: true,
                    data: entries,
                    output: `Found ${entries.length} entries in ${params.path}`,
                };
            }

            return {
                success: false,
                output: 'File system access not available',
                error: {
                    code: 'NO_FS_ACCESS',
                    message: 'Neither Electron nor Node.js file system available',
                },
            };
        } catch (error) {
            return {
                success: false,
                output: `Failed to list directory: ${error instanceof Error ? error.message : String(error)}`,
                error: {
                    code: 'LIST_ERROR',
                    message: error instanceof Error ? error.message : String(error),
                },
            };
        }
    },
};
