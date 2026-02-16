const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose a minimal, secure API to the renderer process via contextBridge.
 * This allows the renderer to safely call main process functions without
 * enabling full nodeIntegration.
 */
contextBridge.exposeInMainWorld('api', {
    // Example: Expose a simple function
    ping: () => 'pong',

    // Request the main process to quit the application
    quit: () => ipcRenderer.send('app-quit'),

    // Request the main process to open a folder dialog and get media files
    openFolder: () => ipcRenderer.invoke('open-folder-dialog'),

    // Get media files from a specific folder
    getMediaFromFolder: (folderPath) => ipcRenderer.invoke('get-media-from-folder', folderPath),

    // Save removed files to JSON
    saveRemovedFilesJson: (data, filename) => ipcRenderer.invoke('save-removed-files-json', data, filename),

    // Get home directory
    getHomeDir: () => ipcRenderer.invoke('get-home-dir'),

    // Open JSON file dialog
    openJsonFile: () => ipcRenderer.invoke('open-json-file-dialog'),

    // Delete files in batch (array of file paths)
    deleteFiles: (filePaths) => ipcRenderer.invoke('delete-files', filePaths)
});
