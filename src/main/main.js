const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync, exec } = require('child_process');
const os = require('os');

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

        console.log('[save-removed-files-json handler] Downloads dir:', downloadsDir);
        console.log('[save-removed-files-json handler] Target dir:', targetDir);

        // Ensure target directory exists
        if (!fs.existsSync(targetDir)) {
            console.log('[save-removed-files-json handler] Creating target directory...');
            fs.mkdirSync(targetDir, { recursive: true });
            console.log('[save-removed-files-json handler] Directory created successfully');
        }

        const filepath = path.join(targetDir, filename);
        console.log('[save-removed-files-json handler] Saving JSON to:', filepath);
        console.log('[save-removed-files-json handler] Removed files count:', data.removedCount);
        
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
        
        console.log('[save-removed-files-json handler] JSON saved successfully');
        return { success: true, path: filepath };
    } catch (err) {
        console.error('[save-removed-files-json handler] Error saving JSON:', err.message, err.stack);
        return { success: false, error: err.message };
    }
});

/**
 * Handle saving debug logs to text file
 */
ipcMain.handle('save-debug-log', async (event, logContent, filename) => {
    try {
        // Default target folder: user's Downloads/MediaSorter
        const downloadsDir = app.getPath('downloads');
        const targetDir = path.join(downloadsDir, 'MediaSorter');

        console.log('[save-debug-log handler] Downloads dir:', downloadsDir);
        console.log('[save-debug-log handler] Target dir:', targetDir);

        // Ensure target directory exists
        if (!fs.existsSync(targetDir)) {
            console.log('[save-debug-log handler] Creating target directory...');
            fs.mkdirSync(targetDir, { recursive: true });
            console.log('[save-debug-log handler] Directory created successfully');
        }

        const filepath = path.join(targetDir, filename);
        console.log('[save-debug-log handler] Saving debug log to:', filepath);
        console.log('[save-debug-log handler] Log content length:', logContent.length);
        
        fs.writeFileSync(filepath, logContent, 'utf-8');
        
        console.log('[save-debug-log handler] Debug log saved successfully');
        return { success: true, path: filepath };
    } catch (err) {
        console.error('[save-debug-log handler] Error saving debug log:', err.message, err.stack);
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
 * Move a file to trash/recycle bin using platform-specific methods
 */
async function moveFileToTrash(filePath) {
    const platform = process.platform;
    
    // Primary method: Use Electron's shell.trashItem() - modern async API
    try {
        if (shell && typeof shell.trashItem === 'function') {
            await shell.trashItem(filePath);
            console.log('[moveFileToTrash] Successfully moved to trash via shell.trashItem():', filePath);
            return { success: true };
        }
    } catch (err) {
        console.error('[moveFileToTrash] shell.trashItem() failed:', err.message);
    }

    // Fallback: Use older shell.moveItemToTrash() for compatibility
    try {
        if (shell && typeof shell.moveItemToTrash === 'function') {
            const moved = shell.moveItemToTrash(filePath);
            if (moved) {
                console.log('[moveFileToTrash] Successfully moved to trash via shell.moveItemToTrash():', filePath);
                return { success: true };
            }
        }
    } catch (err) {
        console.error('[moveFileToTrash] shell.moveItemToTrash() failed:', err.message);
    }

    // macOS: use rm with -P flag for secure deletion
    if (platform === 'darwin') {
        try {
            const cmd = `rm -P "${filePath.replace(/"/g, '\\"')}"`;
            execSync(cmd, { stdio: 'pipe' });
            console.log('[moveFileToTrash] Safely deleted via rm -P:', filePath);
            return { success: true };
        } catch (err) {
            console.error('[moveFileToTrash] rm -P deletion failed:', err.message);
        }
    }

    // Linux: use trash-cli or similar utility if available
    if (platform === 'linux') {
        try {
            const cmd = `trash "${filePath.replace(/"/g, '\\"')}"`;
            execSync(cmd, { stdio: 'pipe' });
            console.log('[moveFileToTrash] Deleted via trash-cli:', filePath);
            return { success: true };
        } catch (err) {
            console.error('[moveFileToTrash] trash-cli not available:', err.message);
        }
    }

    return { success: false, error: 'No trash method available' };
}

/**
 * Handle deleting files in batch
 * Uses Electron's shell.trashItem() to move files to trash/recycle bin
 */
ipcMain.handle('delete-files', async (event, filePaths) => {
    console.log('[delete-files handler] Starting deletion for', filePaths.length, 'files');
    const results = [];

    for (const originalPath of filePaths) {
        try {
            const normalized = path.normalize(originalPath);
            console.log('[delete-files handler] Processing file:', originalPath, '->', normalized);

            // Check if file exists
            if (!fs.existsSync(normalized)) {
                console.log('[delete-files handler] File not found:', normalized);
                results.push({ path: originalPath, success: false, error: 'File not found' });
                continue;
            }

            // Use the async trash function
            const result = await moveFileToTrash(normalized);
            if (result.success) {
                console.log('[delete-files handler] Successfully moved to trash:', normalized);
                results.push({ path: originalPath, success: true });
            } else {
                console.error('[delete-files handler] Failed to move to trash:', normalized, result.error);
                results.push({ path: originalPath, success: false, error: result.error });
            }
        } catch (err) {
            console.error('[delete-files handler] Unexpected error for file:', originalPath, err.message);
            results.push({ path: originalPath, success: false, error: err.message });
        }
    }

    console.log('[delete-files handler] Final results:', results);
    return results;
});

/**
 * Check which files exist on disk
 */
ipcMain.handle('check-files-exist', async (event, filePaths) => {
    console.log('[check-files-exist handler] Checking existence of', filePaths.length, 'files');
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

            const result = {
                path: filepath,
                exists,
                resolved,
                resolvedExists,
                alt,
                altExists
            };
            
            console.log('[check-files-exist handler] File check result:', {
                path: filepath,
                exists,
                resolvedExists,
                altExists
            });
            
            results.push(result);
        } catch (err) {
            console.error('[check-files-exist handler] Error checking file:', filepath, err.message);
            results.push({ path: filepath, exists: false, error: err.message });
        }
    }
    console.log('[check-files-exist handler] Total results:', results.length);
    return results;
});

/**
 * Handle media file discovery from a given folder
 */
ipcMain.handle('get-media-from-folder', async (event, folderPath) => {
    try {
        console.log('[get-media-from-folder handler] Loading media from:', folderPath);
        
        if (!folderPath || !fs.existsSync(folderPath)) {
            console.log('[get-media-from-folder handler] Folder not found or invalid');
            return [];
        }

        const files = fs.readdirSync(folderPath, { withFileTypes: true });
        console.log('[get-media-from-folder handler] Total files found in folder:', files.length);
        
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

        console.log('[get-media-from-folder handler] Media files filtered:', mediaFiles.length);
        console.log('[get-media-from-folder handler] Media files list:', mediaFiles.map(f => f.name));
        
        return mediaFiles;
    } catch (err) {
        console.error('[get-media-from-folder handler] Error reading media files:', err);
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
