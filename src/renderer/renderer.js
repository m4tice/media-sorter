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
            } else {
                console.log('Menu item clicked:', item.textContent.trim());
            }
            menuDropdown.classList.remove('show');
            menuDropdown.setAttribute('aria-hidden', 'true');
        });
    }

    // --- About dialog implementation ---
    const aboutBackdrop = document.getElementById('about-backdrop');
    const aboutContent = document.getElementById('about-content');
    const aboutOk = document.getElementById('about-ok');

    // Template for about information — edit these values as desired
    const aboutTemplate = {
        appName: 'Media Sorter',
        version: '1.0.0',
        author: 'TUAN, Nguyen Duc',
        description: 'Quickly review and sort media files with keyboard shortcuts.',
        website: 'https://github.com/m4tice/media-sorter',
        license: 'MIT License'
    };

    function renderAbout(info) {
        const parts = [];
        parts.push(`<p><strong>${info.appName}</strong> — version ${info.version}</p>`);
        if (info.author) parts.push(`<p>Author: ${info.author}</p>`);
        if (info.description) parts.push(`<p>${info.description}</p>`);
        if (info.website) parts.push(`<p>Website: <a href="${info.website}" target="_blank" rel="noopener noreferrer">${info.website}</a></p>`);
        if (info.license) parts.push(`<p>License: ${info.license}</p>`);
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
