/**
 * Renderer Process - Frontend Logic
 * 
 * This file runs in the renderer process and handles UI interactions.
 * It has access to the DOM and the secure API exposed via preload.js.
 * 
 * Note: Do NOT use require() or require('electron') directly here.
 * Use only DOM APIs and the api object exposed from preload.js.
 */

// Access the preload API (if defined in preload.js)
// Example: window.api.ping()

/**
 * Add your frontend logic here
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Renderer process loaded');
    // Initialize your app here
    const shutdownBtn = document.getElementById('shutdown-btn');
    if (shutdownBtn && window.api && typeof window.api.quit === 'function') {
        shutdownBtn.addEventListener('click', () => {
            window.api.quit();
        });
    }

    // Buttons group keyboard bindings and visual press effect
    const removeBtn = document.getElementById('remove-btn');
    const backBtn = document.getElementById('back-btn');
    const keepBtn = document.getElementById('keep-btn');

    function pressVisual(btn) {
        if (!btn) return;
        btn.classList.add('pressed');
        // trigger actual click after a small delay so :active isn't necessary
        btn.click();
        setTimeout(() => btn.classList.remove('pressed'), 300);
    }

    // Media file navigation
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            undoRemoveMedia();
        });
    }

    if (keepBtn) {
        keepBtn.addEventListener('click', () => {
            goToNextMedia();
        });
    }

    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            removeCurrentMedia();
        });
    }

    document.addEventListener('keydown', (ev) => {
        if (ev.repeat) return; // ignore held keys
        const k = ev.key.toLowerCase();
        if (k === '1' || k === 'j') {
            ev.preventDefault();
            pressVisual(removeBtn);
        } else if (k === 'k') {
            ev.preventDefault();
            pressVisual(backBtn);
        } else if (k === 'l') {
            ev.preventDefault();
            pressVisual(keepBtn);
        }
    });

    // Menu dropdown toggle and behavior
    const menuBtn = document.getElementById('menu-btn');
    const menuDropdown = document.getElementById('menu-dropdown');
    if (menuBtn && menuDropdown) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isShown = menuDropdown.classList.toggle('show');
            menuDropdown.setAttribute('aria-hidden', (!isShown).toString());
        });

        // Close on outside click
        document.addEventListener('click', () => {
            if (menuDropdown.classList.contains('show')) {
                menuDropdown.classList.remove('show');
                menuDropdown.setAttribute('aria-hidden', 'true');
            }
        });

        // Close on Escape
        document.addEventListener('keydown', (ev) => {
            if (ev.key === 'Escape' && menuDropdown.classList.contains('show')) {
                menuDropdown.classList.remove('show');
                menuDropdown.setAttribute('aria-hidden', 'true');
            }
        });

        // Menu item clicks
        menuDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = e.target.closest('.menu-item');
            if (!item) return;
            // If About menu item was clicked, show About dialog
            if (item.id === 'about-menu-item') {
                showAbout();
            } else if (item.id === 'run-job-menu-item') {
                runJobFlow();
            } else if (item.textContent.trim() === 'Open Folder') {
                openFolderAndLoadMedia();
            } else {
                console.log('Menu item clicked:', item.textContent.trim());
            }
            menuDropdown.classList.remove('show');
            menuDropdown.setAttribute('aria-hidden', 'true');
        });
    }

    // --- Error/Alert dialog implementation ---
    function showErrorDialog(title, message) {
        return new Promise((resolve) => {
            const backdrop = document.createElement('div');
            backdrop.className = 'error-backdrop';
            backdrop.style.cssText = `
                position: fixed;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(13, 22, 30, 0.45);
                z-index: 1001;
            `;

            const box = document.createElement('div');
            box.className = 'error-box';
            box.style.cssText = `
                width: min(520px, 92%);
                max-width: 720px;
                background: #dce8ec;
                border-radius: 12px;
                padding: 18px;
                box-shadow: 12px 12px 24px rgba(163,177,198,0.35), -8px -8px 16px rgba(255,255,255,0.8);
                color: #2d3748;
            `;

            const titleEl = document.createElement('h3');
            titleEl.textContent = title;
            titleEl.style.cssText = 'margin: 0 0 12px 0; font-size: 18px; color: #d32f2f;';
            box.appendChild(titleEl);

            const msgEl = document.createElement('p');
            msgEl.textContent = message;
            msgEl.style.cssText = 'margin: 0 0 16px 0; font-size: 14px; line-height: 1.5;';
            box.appendChild(msgEl);

            const btn = document.createElement('button');
            btn.textContent = 'OK';
            btn.style.cssText = `
                background-color: #2d3e50;
                color: #ffffff;
                border: none;
                padding: 8px 14px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                box-shadow: 4px 4px 8px rgba(0,0,0,0.12);
            `;
            btn.onmouseover = () => btn.style.filter = 'brightness(1.05)';
            btn.onmouseout = () => btn.style.filter = 'brightness(1)';
            btn.onclick = () => {
                document.body.removeChild(backdrop);
                resolve();
            };
            box.appendChild(btn);

            backdrop.appendChild(box);
            document.body.appendChild(backdrop);
            btn.focus();
        });
    }

    // --- Run Job functionality ---
    async function runJobFlow() {
        if (!window.api || typeof window.api.openJsonFile !== 'function') {
            await showErrorDialog('Error', 'API not available');
            return;
        }

        try {
            // Step 1: Open file picker for JSON
            const jsonPath = await window.api.openJsonFile();
            if (!jsonPath) {
                console.log('JSON selection cancelled');
                return;
            }

            // Step 2: Read and validate JSON
            const jsonContent = await readFileAsText(jsonPath);
            let jobData;
            try {
                jobData = JSON.parse(jsonContent);
            } catch (err) {
                await showErrorDialog('Invalid JSON', `Failed to parse JSON file: ${err.message}`);
                return;
            }

            // Step 3: Validate required fields
            if (!jobData.removedFiles || !Array.isArray(jobData.removedFiles)) {
                await showErrorDialog('Invalid Job File', 'The JSON file does not contain a valid "removedFiles" array.');
                return;
            }

            const fileCount = jobData.removedFiles.length;
            if (fileCount === 0) {
                await showErrorDialog('No Files', 'The job file does not contain any files to remove.');
                return;
            }

            // Step 4: Run the job with progress
            await runDeletionJob(jobData.removedFiles);
        } catch (err) {
            console.error('Error in runJobFlow:', err);
            await showErrorDialog('Error', `An unexpected error occurred: ${err.message}`);
        }
    }

    function readFileAsText(filepath) {
        return new Promise((resolve, reject) => {
            // Use fetch with file:// protocol (works in Electron)
            fetch(`file://${filepath}`)
                .then(res => res.text())
                .then(resolve)
                .catch(reject);
        });
    }

    async function runDeletionJob(filePaths) {
        const progressBackdrop = document.getElementById('progress-backdrop');
        const progressBar = document.getElementById('progress-bar');
        const progressCurrent = document.getElementById('progress-current');
        const progressTotal = document.getElementById('progress-total');

        if (!progressBackdrop) return;

        const total = filePaths.length;
        progressTotal.textContent = total;
        progressBackdrop.removeAttribute('hidden');

        try {
            // Delete files with progress updates
            const results = await window.api.deleteFiles(filePaths);

            let successCount = 0;
            results.forEach((result, index) => {
                if (result.success) successCount++;
                const percent = ((index + 1) / total) * 100;
                progressCurrent.textContent = index + 1;
                progressBar.style.width = percent + '%';
            });

            progressBackdrop.setAttribute('hidden', '');

            const failedCount = total - successCount;
            const message = failedCount > 0
                ? `${successCount} files deleted successfully.\n${failedCount} files could not be deleted.`
                : `All ${total} files deleted successfully!`;

            await showErrorDialog('Job Complete', message);
        } catch (err) {
            progressBackdrop.setAttribute('hidden', '');
            await showErrorDialog('Error', `Failed to delete files: ${err.message}`);
        }
    }

    // --- About dialog implementation ---
    const aboutBackdrop = document.getElementById('about-backdrop');
    const aboutContent = document.getElementById('about-content');
    const aboutOk = document.getElementById('about-ok');

    // --- Export dialog implementation ---
    const exportBackdrop = document.getElementById('export-backdrop');
    const exportExportBtn = document.getElementById('export-export-btn');
    const exportDiscardBtn = document.getElementById('export-discard-btn');

    function showExportDialog() {
        if (!exportBackdrop) return;
        // Update the count display
        const countElement = document.getElementById('export-count');
        if (countElement) {
            countElement.textContent = removedFiles.length;
        }
        exportBackdrop.removeAttribute('hidden');
        if (exportExportBtn) exportExportBtn.focus();
    }

    function hideExportDialog() {
        if (!exportBackdrop) return;
        exportBackdrop.setAttribute('hidden', '');
    }

    if (exportExportBtn) {
        exportExportBtn.addEventListener('click', async () => {
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const folderName = currentFolderPath.split(/[\\/]/).filter(Boolean).pop();
            const filename = `${folderName}_${timestamp}.json`;

            // Prepare data to export
            const exportData = {
                folder: currentFolderPath,
                timestamp: new Date().toISOString(),
                removedFiles: removedFiles,
                totalFiles: mediaFiles.length,
                removedCount: removedFiles.length
            };

            try {
                const result = await window.api.saveRemovedFilesJson(exportData, filename);
                if (result.success) {
                    console.log('Exported to:', result.path);
                    hideExportDialog();
                    // Reset for next session
                    removedFiles = [];
                    mediaFiles = [];
                    currentMediaIndex = 0;
                    if (contentCont) {
                        contentCont.innerHTML = '<p style="color: #666; font-size: 14px;">Exported successfully. Open a new folder to continue.</p>';
                    }
                } else {
                    console.error('Export failed:', result.error);
                }
            } catch (err) {
                console.error('Error exporting:', err);
            }
        });
    }

    if (exportDiscardBtn) {
        exportDiscardBtn.addEventListener('click', () => {
            hideExportDialog();
            // Clear data without exporting
            removedFiles = [];
            mediaFiles = [];
            currentMediaIndex = 0;
            if (contentCont) {
                contentCont.innerHTML = '<p style="color: #666; font-size: 14px;">Discarded. Open a new folder to continue.</p>';
            }
        });
    }

    // Close export dialog by clicking backdrop
    if (exportBackdrop) {
        exportBackdrop.addEventListener('click', (ev) => {
            if (ev.target === exportBackdrop) hideExportDialog();
        });
    }

    // --- Open Folder and display media files ---
    const contentCont = document.getElementById('content-cont');
    let currentFolderPath = null;
    let mediaFiles = [];
    let currentMediaIndex = 0;
    let removedFiles = []; // Track removed file paths

    async function openFolderAndLoadMedia() {
        if (!window.api || typeof window.api.openFolder !== 'function') {
            console.error('API not available');
            return;
        }

        try {
            // Show folder picker dialog
            const folderPath = await window.api.openFolder();
            if (!folderPath) {
                console.log('Folder selection cancelled');
                return;
            }

            currentFolderPath = folderPath;
            const statusText = document.getElementById('status-text');
            if (statusText) {
                // Extract just the last folder name from the path
                const folderName = folderPath.split(/[\\/]/).filter(Boolean).pop();
                statusText.textContent = folderName;
                statusText.title = folderPath; // Full path on hover
            }

            // Get media files from that folder
            mediaFiles = await window.api.getMediaFromFolder(folderPath);
            currentMediaIndex = 0;
            displayCurrentMediaFile();
        } catch (err) {
            console.error('Error opening folder:', err);
            if (contentCont) {
                contentCont.innerHTML = '<p style="color: #d32f2f;">Error loading folder</p>';
            }
        }
    }

    function displayCurrentMediaFile() {
        if (!contentCont) return;

        if (mediaFiles.length === 0) {
            contentCont.innerHTML = '<p style="color: #666; font-size: 14px;">No media files found</p>';
            return;
        }

        const file = mediaFiles[currentMediaIndex];
        const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].includes(file.ext.toLowerCase());

        let mediaElement;
        if (isImage) {
            mediaElement = document.createElement('img');
            mediaElement.src = file.path;
            mediaElement.style.cssText = `
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                border-radius: 4px;
            `;
            mediaElement.onerror = () => {
                mediaElement.src = '';
                mediaElement.textContent = 'Failed to load image';
            };
        } else {
            // Video
            mediaElement = document.createElement('video');
            mediaElement.src = file.path;
            mediaElement.controls = true;
            mediaElement.style.cssText = `
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                border-radius: 4px;
                background: #000;
            `;
        }

        // Create info div
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = `
            font-size: 12px;
            color: #666;
            margin-top: 8px;
            text-align: center;
        `;
        infoDiv.textContent = `${currentMediaIndex + 1} / ${mediaFiles.length} - ${file.name}`;

        contentCont.innerHTML = '';
        contentCont.appendChild(mediaElement);
        contentCont.appendChild(infoDiv);
    }

    function goToPreviousMedia() {
        if (mediaFiles.length === 0) return;
        currentMediaIndex = (currentMediaIndex - 1 + mediaFiles.length) % mediaFiles.length;
        displayCurrentMediaFile();
    }

    function goToNextMedia() {
        if (mediaFiles.length === 0) return;
        currentMediaIndex = (currentMediaIndex + 1) % mediaFiles.length;
        
        // Check if we've cycled back to the start (end of cycle)
        if (currentMediaIndex === 0) {
            displayCurrentMediaFile();
            showExportDialog();
        } else {
            displayCurrentMediaFile();
        }
    }

    function removeCurrentMedia() {
        if (mediaFiles.length === 0) return;
        const currentFile = mediaFiles[currentMediaIndex];
        removedFiles.push(currentFile.path);
        console.log('Removed:', currentFile.path);
        goToNextMedia();
    }

    function undoRemoveMedia() {
        if (removedFiles.length === 0) {
            console.log('Nothing to undo');
            return;
        }
        removedFiles.pop();
        console.log('Undo - Remaining removed files:', removedFiles.length);
    }

    // Template for about information — edit these values as desired
    const aboutTemplate = {
        appName: 'Media Sorter',
        version: '1.0.0',
        author: '<strong>TUAN</strong>, Nguyen Duc',
        description: 'Quickly review and sort media files with keyboard shortcuts.',
        website: 'https://github.com/m4tice/media-sorter',
        license: 'MIT License'
    };

    function renderAbout(info) {
        const parts = [];
        parts.push(`<p><strong>${info.appName}</strong> — version ${info.version}</p>`);
        if (info.author) parts.push(`<p><i>Author:</i> ${info.author}</p>`);
        if (info.description) parts.push(`<p>${info.description}</p>`);
        if (info.website) parts.push(`<p><i>Website:</i> <a href="${info.website}" target="_blank" rel="noopener noreferrer">${info.website}</a></p>`);
        if (info.license) parts.push(`<p><i>License:</i> ${info.license}</p>`);
        return parts.join('\n');
    }

    function showAbout() {
        if (!aboutBackdrop || !aboutContent) return;
        aboutContent.innerHTML = renderAbout(aboutTemplate);
        aboutBackdrop.removeAttribute('hidden');
        // focus OK button for accessibility
        if (aboutOk) aboutOk.focus();
    }

    function hideAbout() {
        if (!aboutBackdrop) return;
        aboutBackdrop.setAttribute('hidden', '');
    }

    if (aboutOk) {
        aboutOk.addEventListener('click', () => {
            hideAbout();
        });
    }

    // Close when clicking backdrop outside the box
    if (aboutBackdrop) {
        aboutBackdrop.addEventListener('click', (ev) => {
            if (ev.target === aboutBackdrop) hideAbout();
        });
    }

    // Close on Escape key when about is visible
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && aboutBackdrop && !aboutBackdrop.hasAttribute('hidden')) {
            hideAbout();
        }
    });
});
