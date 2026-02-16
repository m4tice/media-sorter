const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
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
 * Handle saving removed files to JSON
 */
ipcMain.handle('save-removed-files-json', async (event, data, filename) => {
    try {
        // Default target folder: user's Downloads/MediaSorter
        const downloadsDir = app.getPath('downloads');
        const targetDir = path.join(downloadsDir, 'MediaSorter');

        // Ensure target directory exists
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const filepath = path.join(targetDir, filename);
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
        return { success: true, path: filepath };
    } catch (err) {
        console.error('Error saving JSON:', err);
        return { success: false, error: err.message };
    }
});

/**
 * Handle getting home directory
 */
ipcMain.handle('get-home-dir', async () => {
    return app.getPath('documents');
});

/**
 * Handle opening JSON file dialog
 */
ipcMain.handle('open-json-file-dialog', async () => {
    const mainWindow = BrowserWindow.getFocusedWindow();
    if (!mainWindow) return null;

    const downloadsDir = app.getPath('downloads');
    const result = await dialog.showOpenDialog(mainWindow, {
        defaultPath: path.join(downloadsDir, 'MediaSorter'),
        filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }

    return result.filePaths[0];
});

/**
 * Handle deleting files in batch
 * Uses trash package for cross-platform Recycle/Trash support
 */
ipcMain.handle('delete-files', async (event, filePaths) => {
    const results = [];
    
    // Dynamic import for ESM package
    const { default: trash } = await import('trash');
    
    // Normalize paths and filter existing files
    const existingPaths = [];
    const pathMap = {}; // Track original -> normalized
    
    for (const originalPath of filePaths) {
        try {
            const normalized = path.normalize(originalPath);
            if (fs.existsSync(normalized)) {
                existingPaths.push(normalized);
                pathMap[normalized] = originalPath;
            } else {
                results.push({ path: originalPath, success: false, error: 'File not found' });
            }
        } catch (err) {
            results.push({ path: originalPath, success: false, error: err.message });
        }
    }
    
    // Move all existing files to trash in one call
    if (existingPaths.length > 0) {
        try {
            await trash(existingPaths);
            // All succeeded if no exception thrown
            for (const normalizedPath of existingPaths) {
                const originalPath = pathMap[normalizedPath];
                results.push({ path: originalPath, success: true });
            }
        } catch (err) {
            // If batch fails, report each as failed
            for (const normalizedPath of existingPaths) {
                const originalPath = pathMap[normalizedPath];
                results.push({ path: originalPath, success: false, error: err.message });
            }
        }
    }
    
    return results;
});

/**
 * Check which files exist on disk
 */
ipcMain.handle('check-files-exist', async (event, filePaths) => {
    const results = [];
    for (const filepath of filePaths) {
        try {
            const exists = fs.existsSync(filepath);
            // try resolved path
            const resolved = path.resolve(filepath);
            const resolvedExists = fs.existsSync(resolved);
            // try with forward slashes
            const alt = filepath.replace(/\\/g, '/');
            const altExists = fs.existsSync(alt);

            results.push({
                path: filepath,
                exists,
                resolved,
                resolvedExists,
                alt,
                altExists
            });
        } catch (err) {
            results.push({ path: filepath, exists: false, error: err.message });
        }
    }
    return results;
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
