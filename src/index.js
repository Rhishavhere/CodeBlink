require('dotenv').config();
const { spawn } = require('child_process');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs/promises');

// Determine the correct shell for the user's OS
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        title: 'CodeBlink IDE',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        icon: path.join(__dirname, 'icon.png') // Optional: add an icon
    });

    win.loadFile(path.join(__dirname, 'index.html'));
    
    ipcMain.handle('get-api-key', () => {
        return process.env.GEMINI_API_KEY;
    });

    ipcMain.on('run:external', (event, filePath) => {
        // Use PowerShell on Windows, and keep the window open after the script finishes
        if (process.platform === 'win32') {
            const command = `start powershell.exe -NoExit -Command "& python \\"${filePath}\\""`;

            const child = spawn(command, {
                shell: true, 
            });

            child.on('error', (err) => {
                console.error('Failed to start subprocess.', err);
            });

            child.on('exit', (code, signal) => {
                console.log(`Subprocess exited with code ${code} and signal ${signal}`);
                win.webContents.send('terminal:closed', 'Terminal closed');
            });
        } else {
            // A basic fallback for macOS/Linux (might need a specific terminal installed)
            spawn('xterm', ['-e', `python "${filePath}"; read`]);
        }
    });

    ipcMain.handle('file:openDialog', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Open Natural Language File',
            properties: ['openFile'],
            filters: [
                { name: 'Natural Language Files', extensions: ['nl', 'txt'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (canceled || filePaths.length === 0) {
            return null; // User canceled or closed the dialog
        }

        const filePath = filePaths[0];
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return { filePath, content }; // Return both path and content
        } catch (err) {
            console.error('Failed to open the file', err);
            return null;
        }
    });

    ipcMain.handle('file:saveDialog', async (event, content) => {
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Save Natural Language File',
            defaultPath: 'untitled.nl',
            filters: [
                { name: 'Natural Language Files', extensions: ['nl', 'txt'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (canceled) {
            return; // User canceled the save
        } else {
            try {
                await fs.writeFile(filePath, content);
                return filePath; // Return the path on success
            } catch (err) {
                console.error('Failed to save the file', err);
                return null;
            }
        }
    });


    // --- File System Integration ---
    ipcMain.handle('file:save', async (event, { filePath, content }) => {
        try {
            const dir = path.dirname(filePath);
            await fs.mkdir(dir, { recursive: true }); // Ensure directory exists
            await fs.writeFile(filePath, content);
            return { success: true, path: filePath };
        } catch (error) {
            console.error('File save error:', error);
            return { success: false, error: error.message };
        }
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});