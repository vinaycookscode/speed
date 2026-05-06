import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'


const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()

  // IPC Handlers

  // ── Claude API via Node.js main process ─────────────────────────────────────
  // Chromium's SSE implementation drops content_block_delta events on long streams.
  // Running the call here (Node.js) + forwarding progress via webContents.send() fixes it.
  ipcMain.handle('claude:generatePlan', async (_event, { apiKey, systemPrompt, userMessage, toolSchema }: {
    apiKey: string
    systemPrompt: string
    userMessage: string
    toolSchema: any
  }) => {
    const send = (channel: string, ...args: any[]) => {
      if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
        win.webContents.send(channel, ...args)
      }
    }

    console.log('[Main] claude:generatePlan — IPC received')
    send('claude:planLog', 'IPC connected — calling Claude API…')
    send('claude:planProgress', 0)

    const client = new Anthropic({ apiKey })

    try {
      send('claude:planLog', 'Sending request to Claude…')
      const stream = await client.messages.create({
        model: 'claude-sonnet-4-6',
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        max_tokens: 32000,
        tools: [toolSchema],
        tool_choice: { type: 'tool', name: 'output_plan' },
        stream: true,
      }, { headers: { 'anthropic-beta': 'output-128k-2025-02-19' } })

      send('claude:planLog', 'Stream opened — waiting for first token…')
      let jsonBuffer = ''
      let inputTokens = 0
      let outputTokens = 0

      for await (const event of stream) {
        if (event.type === 'message_start') {
          inputTokens = event.message?.usage?.input_tokens ?? 0
          send('claude:planLog', `Generating… (${inputTokens} input tokens)`)
          send('claude:planProgress', 1)
        } else if (
          event.type === 'content_block_delta' &&
          (event.delta as any)?.type === 'input_json_delta'
        ) {
          jsonBuffer += (event.delta as any).partial_json
          send('claude:planProgress', jsonBuffer.length)
        } else if (event.type === 'message_delta') {
          outputTokens = (event.usage as any)?.output_tokens ?? outputTokens
        } else if (event.type === 'message_stop') {
          console.log(`[Main] Stream done — ${jsonBuffer.length} bytes, ${outputTokens} output tokens`)
          send('claude:planLog', `Done — ${outputTokens} output tokens`)
        }
      }

      if (!jsonBuffer) {
        return { success: false, error: 'Stream produced no JSON output.' }
      }

      const parsed = JSON.parse(jsonBuffer)
      return { success: true, epics: parsed.epics, inputTokens, outputTokens }
    } catch (err: any) {
      const msg = err?.message ?? String(err)
      console.error('[Main] claude:generatePlan error:', msg)
      send('claude:planLog', `ERROR: ${msg}`)
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('dialog:openDirectory', async () => {
    console.log('[Main] dialog:openDirectory invoked');
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory']
    })
    console.log('[Main] Dialog result:', result.canceled ? 'canceled' : result.filePaths[0]);
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('fs:writeFile', async (_: any, filePath: string, content: string) => {
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, content, 'utf-8')
      return { success: true }
    } catch (error: any) {
      console.error('Error writing file:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('fs:readFile', async (_: any, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return { success: true, data: content }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('fs:createDirectory', async (_: any, dirPath: string) => {
    try {
      await fs.mkdir(dirPath, { recursive: true })
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('fs:writeFiles', async (_: any, basePath: string, files: { path: string; content: string }[]) => {
    try {
      for (const file of files) {
        const fullPath = path.join(basePath, file.path)
        await fs.mkdir(path.dirname(fullPath), { recursive: true })
        await fs.writeFile(fullPath, file.content, 'utf-8')
      }
      return { success: true, filesWritten: files.length }
    } catch (error: any) {
      console.error('Error writing multiple files:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('app:getDocumentsPath', () => {
    return app.getPath('documents');
  })

  ipcMain.handle('terminal:exec', async (event, { cwd, cmd }: { cwd: string, cmd: string }) => {
    try {
      const { spawn } = await import('node:child_process');
      return new Promise((resolve) => {
        let stdout = '';
        let stderr = '';

        // Source profile to ensure PATH is correct
        const sourceProfile = "source ~/.zshrc 2>/dev/null || source ~/.bash_profile 2>/dev/null || source ~/.bashrc 2>/dev/null || true";
        const finalCmd = `${sourceProfile} && ${cmd}`;

        // Use shell: true (defaults to /bin/sh on unix) but sh might not support 'source' (use '.')
        // To be safe, let's explicitly use /bin/bash or /bin/zsh if we need complex sourcing, 
        // OR just simple '.' which works in sh too if files are sh-compatible.
        // But .zshrc might have zsh syntax.
        // Safest: Use the user's default shell.
        const shell = process.env.SHELL || '/bin/sh';

        const child = spawn(finalCmd, { cwd, shell, env: { ...process.env, FORCE_COLOR: 'true' } });

        child.stdout.on('data', (data) => {
          const text = data.toString();
          stdout += text;
          // Stream logs
          if (!event.sender.isDestroyed()) {
            event.sender.send('deployment:log', { text, type: 'info' });
          }
        });

        child.stderr.on('data', (data) => {
          const text = data.toString();
          stderr += text;
          if (!event.sender.isDestroyed()) {
            event.sender.send('deployment:log', { text, type: 'error' });
          }
        });

        let resolved = false;
        const cleanup = () => {
          resolved = true;
          child.removeAllListeners();
          if (child.stdout) child.stdout.removeAllListeners();
          if (child.stderr) child.stderr.removeAllListeners();
        };

        child.on('close', (code) => {
          if (resolved) return;
          cleanup();
          if (code === 0) {
            resolve({ success: true, stdout, stderr });
          } else {
            resolve({ success: false, error: `Process exited with code ${code}`, stdout, stderr });
          }
        });

        child.on('exit', (code) => {
          if (resolved) return;
          cleanup();
          if (code === 0) {
            resolve({ success: true, stdout, stderr });
          } else {
            resolve({ success: false, error: `Process exited with code ${code}`, stdout, stderr });
          }
        });

        child.on('error', (err) => {
          if (resolved) return;
          cleanup();
          resolve({ success: false, error: err.message, stdout, stderr });
        });
      });
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  })

  ipcMain.handle('terminal:run', async (_: any, { cwd, cmd }: { cwd: string, cmd: string }) => {
    try {
      const { exec } = await import('node:child_process');
      const util = await import('node:util');
      const execAsync = util.promisify(exec);

      // Escape quotes for AppleScript
      const safeCmd = cmd.replace(/"/g, '\\"').replace(/'/g, "'\\''");
      const safeCwd = cwd.replace(/"/g, '\\"').replace(/'/g, "'\\''");

      // Source common profile files to ensure PATH contains npm/node
      // We try zshrc, bash_profile, bashrc, and ignore errors if they don't exist
      const sourceProfile = "source ~/.zshrc 2>/dev/null || source ~/.bash_profile 2>/dev/null || source ~/.bashrc 2>/dev/null || true";

      const appleScript = `
            tell application "Terminal"
                activate
                do script "cd \\"${safeCwd}\\" && ${sourceProfile} && ${safeCmd}"
            end tell
         `;

      console.log('[Main] Running AppleScript:', appleScript);

      await execAsync(`osascript -e '${appleScript}'`);
      return { success: true };
    } catch (error: any) {
      console.error('Terminal run error:', error);
      return { success: false, error: error.message };
    }
  })
})
