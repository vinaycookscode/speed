
/**
 * Utility module for file system operations.
 * Uses Electron IPC to communicate with the main process.
 */

// Define the IPC interface type (partial)
interface IpcRenderer {
    invoke(channel: string, ...args: any[]): Promise<any>;
}

declare global {
    interface Window {
        ipcRenderer: IpcRenderer;
    }
}

export const selectDirectory = async (): Promise<string | null> => {
    console.log('[FileSystem] selectDirectory called');
    if (window.ipcRenderer) {
        try {
            console.log('[FileSystem] Invoking dialog:openDirectory');
            const result = await window.ipcRenderer.invoke('dialog:openDirectory');
            console.log('[FileSystem] Result:', result);
            return result;
        } catch (error) {
            console.error('[FileSystem] Error selecting directory:', error);
            alert('Failed to select directory: ' + error);
            return null;
        }
    } else {
        console.warn('[FileSystem] ipcRenderer not found');
        return null;
    }
};

export const writeFile = async (path: string, content: string): Promise<void> => {
    if (window.ipcRenderer) {
        const result = await window.ipcRenderer.invoke('fs:writeFile', path, content);
        if (!result.success) {
            throw new Error(result.error);
        }
    } else {
        console.log(`[Mock Write] ${path}:\n${content.slice(0, 50)}...`);
    }
};

export const readFile = async (path: string): Promise<string> => {
    if (window.ipcRenderer) {
        const result = await window.ipcRenderer.invoke('fs:readFile', path);
        if (!result.success) {
            throw new Error(result.error);
        }
        return result.data;
    }
    return '';
};

export const createDirectory = async (path: string): Promise<void> => {
    if (window.ipcRenderer) {
        const result = await window.ipcRenderer.invoke('fs:createDirectory', path);
        if (!result.success) {
            throw new Error(result.error);
        }
    }
};
