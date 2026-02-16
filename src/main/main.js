const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Create the application window
 */
function createWindow() {
    const win = new BrowserWindow({
        width: 720,
        height: 1280,
        minWidth: 360,
        minHeight: 640,
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

/**
 * App lifecycle: create window when ready
 */
app.whenReady().then(createWindow);

// Handle quit request from renderer
ipcMain.on('app-quit', () => {
    app.quit();
});

/**
 * Media file extensions to look for
 */
const MEDIA_EXTENSIONS = [
    // Images
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff',
    // Videos
    '.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm', '.m4v', '.mpg', '.mpeg', '.3gp', '.ogv'
];

/**
 * Handle folder dialog request and return selected folder path
 */
ipcMain.handle('open-folder-dialog', async () => {
    const mainWindow = BrowserWindow.getFocusedWindow();
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }

    return result.filePaths[0];
});

/**
 * Handle media file discovery from a given folder
 */
ipcMain.handle('get-media-from-folder', async (event, folderPath) => {
    try {
        if (!folderPath || !fs.existsSync(folderPath)) {
            return [];
        }

        const files = fs.readdirSync(folderPath, { withFileTypes: true });
        const mediaFiles = files
            .filter(file => {
                // Only include files (not directories)
                if (!file.isFile()) return false;
                // Check if file extension matches media types
                const ext = path.extname(file.name).toLowerCase();
                return MEDIA_EXTENSIONS.includes(ext);
            })
            .map(file => ({
                name: file.name,
                path: path.join(folderPath, file.name),
                ext: path.extname(file.name).toLowerCase()
            }));

        return mediaFiles;
    } catch (err) {
        console.error('Error reading media files:', err);
        return [];
    }
});

/**
 * App lifecycle: quit when all windows are closed (except macOS)
 */
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

/**
 * App lifecycle: re-create window on macOS when app is activated
 */
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
