const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

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
