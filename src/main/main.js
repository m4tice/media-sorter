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
 * Handle deleting files in batch
 * Uses trash package for cross-platform Recycle/Trash support
 */
ipcMain.handle('delete-files', async (event, filePaths) => {
    console.log('[delete-files handler] Starting deletion for', filePaths.length, 'files');
    const results = [];
    
    // Require trash package for CommonJS compatibility with electron-builder
    const trash = require('trash');
    
    // Normalize paths and filter existing files
    const existingPaths = [];
    const pathMap = {}; // Track original -> normalized
    
    for (const originalPath of filePaths) {
        try {
            const normalized = path.normalize(originalPath);
            console.log('[delete-files handler] Checking file:', originalPath, '-> normalized:', normalized);
            
            if (fs.existsSync(normalized)) {
                console.log('[delete-files handler] File exists:', normalized);
                existingPaths.push(normalized);
                pathMap[normalized] = originalPath;
            } else {
                console.log('[delete-files handler] File not found:', normalized, '(original:', originalPath, ')');
                results.push({ path: originalPath, success: false, error: 'File not found' });
            }
        } catch (err) {
            console.error('[delete-files handler] Error checking file:', originalPath, err.message);
            results.push({ path: originalPath, success: false, error: err.message });
        }
    }
    
    console.log('[delete-files handler] Found', existingPaths.length, 'existing files out of', filePaths.length);
    
    // Move all existing files to trash in one call
    if (existingPaths.length > 0) {
        try {
            console.log('[delete-files handler] Attempting to delete files with trash:', existingPaths);
            console.log('[delete-files handler] Trash module available:', typeof trash === 'function');
            
            // Call trash with the paths
            const trashResult = await trash(existingPaths, { force: true });
            console.log('[delete-files handler] Successfully deleted files with trash:', trashResult);
            
            // All succeeded if no exception thrown
            for (const normalizedPath of existingPaths) {
                const originalPath = pathMap[normalizedPath];
                console.log('[delete-files handler] Marked as success:', originalPath);
                results.push({ path: originalPath, success: true });
            }
        } catch (err) {
            // If batch fails, report each as failed
            console.error('[delete-files handler] Trash operation failed:', err.message, err.stack);
            for (const normalizedPath of existingPaths) {
                const originalPath = pathMap[normalizedPath];
                console.error('[delete-files handler] Marked as failed:', originalPath, '-', err.message);
                results.push({ path: originalPath, success: false, error: err.message });
            }
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
