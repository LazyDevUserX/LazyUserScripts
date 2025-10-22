// ==UserScript==
// @name         Circle FTP Playlist Maker (Ultimate)
// @namespace    http://tampermonkey.net/
// @version      7.0
// @description  Collects links on Circle FTP and creates a XPF playlist for VLC
// @author       LazyDevUserX
// @match        http://15.1.1.50/*
// @match        http://new.circleftp.net/*
// @downloadURL  https://raw.githubusercontent.com/LazyDevUserX/CircleFTP-Playlist-Maker-Ultimate/main/userscript/circle-ftp-playlist-maker-ultimate.user.js
// @updateURL    https://raw.githubusercontent.com/LazyDevUserX/CircleFTP-Playlist-Maker-Ultimate/main/userscript/circle-ftp-playlist-maker-ultimate.user.js
// @grant        none
// ==/UserScript==
(function () {
    'use strict';

    // Configuration
    const config = {
        excludedDomains: ['new.circleftp.net', 'hd.circleftp.net'],
        allowedExtensions: ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'],
        minFileSize: 1024 * 1024, // 1MB minimum file size
        maxLinks: 1000, // Safety limit
        maxTitleLength: 200, // Maximum title length for filenames
        contentPaths: ['/content/'], // Paths where button should be visible
        seasonSelectors: {
            1: '/html/body/div[1]/main/div[2]/section/div/div[1]',
            2: '/html/body/div[1]/main/div[2]/section/div/div[2]',
            3: '/html/body/div[1]/main/div[2]/section/div/div[3]',
            4: '/html/body/div[1]/main/div[2]/section/div/div[4]',
            5: '/html/body/div[1]/main/div[2]/section/div/div[5]',
            6: '/html/body/div[1]/main/div[2]/section/div/div[6]',
            7: '/html/body/div[1]/main/div[2]/section/div/div[7]',
            8: '/html/body/div[1]/main/div[2]/section/div/div[8]'
        }
    };

    // Check if current page is a content page
    function isContentPage() {
        return config.contentPaths.some(path => window.location.pathname.includes(path));
    }

    // Detect available seasons
    function detectAvailableSeasons() {
        const availableSeasons = [];

        // Check each season selector
        for (const [season, selector] of Object.entries(config.seasonSelectors)) {
            try {
                const element = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (element) {
                    availableSeasons.push(parseInt(season));
                }
            } catch (e) {
                console.error(`Error checking season ${season}:`, e);
            }
        }

        // If no seasons found with XPath, try alternative method
        if (availableSeasons.length === 0) {
            console.log("No seasons found with XPath, trying alternative method");
            // Try to find season buttons by text content
            const seasonButtons = document.querySelectorAll('button');
            seasonButtons.forEach(button => {
                const text = button.textContent.trim();
                const seasonMatch = text.match(/Season\s+(\d+)/i);
                if (seasonMatch) {
                    const seasonNum = parseInt(seasonMatch[1]);
                    if (!availableSeasons.includes(seasonNum)) {
                        availableSeasons.push(seasonNum);
                    }
                }
            });
        }

        // Sort seasons numerically
        availableSeasons.sort((a, b) => a - b);
        return availableSeasons;
    }

    // Create the modern UI
    function createModernUI() {
        // Remove existing UI if any
        const existingUI = document.getElementById('playlistModernUI');
        if (existingUI) {
            existingUI.remove();
        }

        // Create main container
        const uiContainer = document.createElement('div');
        uiContainer.id = 'playlistModernUI';
        uiContainer.innerHTML = `
            <div class="fab-container">
                <button class="fab-button" id="playlistBtn" aria-label="Create Playlist">
                    <div class="fab-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </div>
                    <div class="fab-pulse"></div>
                </button>

                <div class="season-menu" id="seasonMenu">
                    <div class="season-menu-header">Select Season</div>
                    <div class="season-menu-items" id="seasonMenuItems">
                        <div class="season-item" data-season="all">
                            <div class="season-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="9" y1="9" x2="15" y2="9"></line>
                                    <line x1="9" y1="15" x2="15" y2="15"></line>
                                </svg>
                            </div>
                            <div class="season-text">All Seasons</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="notification-container" id="notificationContainer"></div>
        `;

        document.body.appendChild(uiContainer);

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
        /* Modern UI Styles */
        .fab-container {
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 10000;
        }

        .fab-button {
            position: relative;
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            cursor: pointer;
            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
            overflow: visible;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .fab-button:hover {
            transform: scale(1.1);
            box-shadow: 0 12px 30px rgba(102, 126, 234, 0.5);
        }

        .fab-button:active {
            transform: scale(0.95);
        }

        .fab-button.processing {
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7); }
            70% { box-shadow: 0 0 0 15px rgba(102, 126, 234, 0); }
            100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0); }
        }

        .fab-icon {
            position: relative;
            z-index: 2;
            width: 28px;
            height: 28px;
            color: white;
            transition: transform 0.3s ease;
        }

        .fab-button:hover .fab-icon {
            transform: translateY(-3px);
        }

        .fab-pulse {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: inherit;
            z-index: 1;
            opacity: 0;
            transform: scale(1);
        }

        .fab-button.right-clicked .fab-pulse {
            animation: ripple-effect 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes ripple-effect {
            0% {
                transform: scale(1);
                opacity: 0.7;
            }
            100% {
                transform: scale(2.5);
                opacity: 0;
            }
        }

        .season-menu {
            position: absolute;
            bottom: 80px;
            right: 0;
            background: rgba(30, 30, 40, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            padding: 16px;
            min-width: 200px;
            opacity: 0;
            transform: translateY(20px) scale(0.9);
            transform-origin: bottom right;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            pointer-events: none;
            z-index: 10001;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .season-menu.show {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }

        .season-menu-header {
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .season-menu-items {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .season-item {
            display: flex;
            align-items: center;
            padding: 12px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
        }

        .season-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            opacity: 0;
            transition: opacity 0.2s ease;
            z-index: 0;
        }

        .season-item:hover::before {
            opacity: 0.1;
        }

        .season-icon {
            width: 20px;
            height: 20px;
            color: rgba(255, 255, 255, 0.8);
            margin-right: 12px;
            position: relative;
            z-index: 1;
            transition: transform 0.2s ease;
        }

        .season-item:hover .season-icon {
            transform: translateX(3px);
        }

        .season-text {
            color: white;
            font-size: 14px;
            font-weight: 500;
            position: relative;
            z-index: 1;
        }

        /* Notification Styles */
        .notification-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10002;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .notification {
            background: rgba(30, 30, 40, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 16px 20px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.1);
            transform: translateX(400px);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            max-width: 320px;
            position: relative;
            overflow: hidden;
        }

        .notification.show {
            transform: translateX(0);
            opacity: 1;
        }

        .notification::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .notification.success::before {
            background: linear-gradient(135deg, #4CAF50, #45a049);
        }

        .notification.warning::before {
            background: linear-gradient(135deg, #FF9800, #F57C00);
        }

        .notification.error::before {
            background: linear-gradient(135deg, #F44336, #D32F2F);
        }

        .notification-close {
            position: absolute;
            top: 12px;
            right: 12px;
            width: 16px;
            height: 16px;
            cursor: pointer;
            opacity: 0.6;
            transition: opacity 0.2s ease;
        }

        .notification-close:hover {
            opacity: 1;
        }

        .notification-close::before,
        .notification-close::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            width: 100%;
            height: 2px;
            background: white;
        }

        .notification-close::before {
            transform: rotate(45deg);
        }

        .notification-close::after {
            transform: rotate(-45deg);
        }
        `;
        document.head.appendChild(style);

        // Hide UI if not on content page
        if (!isContentPage()) {
            uiContainer.style.display = 'none';
        }

        // Set up event listeners
        setupEventListeners();
    }

    // Set up event listeners
    function setupEventListeners() {
        const button = document.getElementById('playlistBtn');
        const seasonMenu = document.getElementById('seasonMenu');

        // Left click - download all
        button.addEventListener('click', function(e) {
            createRipple(e, this);
            generatePlaylist('all');
        });

        // Right click - show season menu
        button.addEventListener('contextmenu', function(e) {
            e.preventDefault();

            // Add right-click animation
            this.classList.add('right-clicked');
            setTimeout(() => {
                this.classList.remove('right-clicked');
            }, 800);

            // Detect available seasons and update menu
            const availableSeasons = detectAvailableSeasons();
            updateSeasonMenu(availableSeasons);

            // Toggle menu
            seasonMenu.classList.toggle('show');
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!button.contains(e.target) && !seasonMenu.contains(e.target)) {
                seasonMenu.classList.remove('show');
            }
        });

        // Handle season selection
        document.getElementById('seasonMenuItems').addEventListener('click', function(e) {
            const seasonItem = e.target.closest('.season-item');
            if (seasonItem) {
                const season = seasonItem.getAttribute('data-season');
                seasonMenu.classList.remove('show');
                generatePlaylist(season);
            }
        });
    }

    // Create ripple effect
    function createRipple(event, button) {
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.position = 'absolute';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'rgba(255, 255, 255, 0.6)';
        ripple.style.transform = 'scale(0)';
        ripple.style.animation = 'ripple-animation 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        ripple.style.pointerEvents = 'none';
        ripple.style.zIndex = '3';

        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 800);
    }

    // Update season menu with available seasons
    function updateSeasonMenu(availableSeasons) {
        const seasonMenuItems = document.getElementById('seasonMenuItems');

        // Clear existing items except "All Seasons"
        const allSeasonsItem = seasonMenuItems.querySelector('[data-season="all"]');
        seasonMenuItems.innerHTML = '';
        seasonMenuItems.appendChild(allSeasonsItem);

        // Add season items
        availableSeasons.forEach(season => {
            const item = document.createElement('div');
            item.className = 'season-item';
            item.setAttribute('data-season', season);
            item.innerHTML = `
                <div class="season-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                </div>
                <div class="season-text">Season ${season}</div>
            `;
            seasonMenuItems.appendChild(item);
        });
    }

    // Show notification
    function showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-close"></div>
            <div>${message}</div>
        `;

        container.appendChild(notification);

        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Set up close button
        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 400);
        });

        // Auto dismiss
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 400);
        }, 4000);
    }

    // Enhanced title extraction with fallbacks
    function getTitle() {
        // Try multiple selectors for reliability
        const selectors = [
            "/html/body/div/main/div[1]/div",
            "h1",
            ".title",
            ".page-title",
            "head title"
        ];
        for (const selector of selectors) {
            let element;
            if (selector.startsWith('/')) {
                element = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            } else {
                element = document.querySelector(selector);
            }
            if (element && element.textContent.trim()) {
                // Clean the title but don't truncate it yet
                return element.textContent.trim()
                    .replace(/[\\/:*?"<>|]/g, '') // Remove invalid filename characters
                    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                    .trim(); // Remove leading/trailing spaces
            }
        }
        return "CircleFTP_Playlist";
    }

    // Sanitize filename to ensure it's valid and not too long
    function sanitizeFilename(filename) {
        // First, remove any special characters that might cause issues
        let sanitized = filename.replace(/[\\/:*?"<>|]/g, '');
        // If the filename is too long, truncate it
        if (sanitized.length > config.maxTitleLength) {
            // Try to break at a space to avoid cutting words in half
            const truncated = sanitized.substring(0, config.maxTitleLength);
            const lastSpace = truncated.lastIndexOf(' ');
            if (lastSpace > config.maxTitleLength * 0.8) {
                // If we found a space near the end, break there
                sanitized = truncated.substring(0, lastSpace);
            } else {
                // Otherwise, just truncate at the max length
                sanitized = truncated;
            }
        }
        return sanitized.trim();
    }

    // Optimized link collection with filtering
    function collectLinks(season = 'all') {
        const links = new Set();
        let contentArea;

        if (season === 'all') {
            contentArea = document.querySelector('main, .content, #content') || document.body;
        } else {
            // Get the specific season container using XPath
            const seasonXPath = config.seasonSelectors[season];
            if (seasonXPath) {
                const seasonElement = document.evaluate(seasonXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (seasonElement) {
                    contentArea = seasonElement;
                } else {
                    showNotification(`Season ${season} container not found`, 'warning');
                    return [];
                }
            } else {
                showNotification(`No selector defined for Season ${season}`, 'warning');
                return [];
            }
        }

        const linkElements = contentArea.querySelectorAll('a[href]');
        for (const link of linkElements) {
            if (links.size >= config.maxLinks) break;
            const href = link.getAttribute('href');
            if (!href) continue;
            // Skip excluded domains
            if (config.excludedDomains.some(domain => href.includes(domain))) continue;
            // Skip non-media files
            const hasExtension = config.allowedExtensions.some(ext => href.toLowerCase().includes(ext));
            if (!hasExtension) continue;
            // Convert relative URLs to absolute
            const absoluteUrl = new URL(href, window.location.href).href;
            // Skip if already added
            if (links.has(absoluteUrl)) continue;
            links.add(absoluteUrl);
        }
        return Array.from(links);
    }

    // Generate playlist with progress feedback
    async function generatePlaylist(season = 'all') {
        const button = document.getElementById('playlistBtn');
        button.classList.add('processing');
        try {
            const links = collectLinks(season);
            if (links.length === 0) {
                showNotification('No valid media links found', 'warning');
                return;
            }
            const title = getTitle();
            const seasonText = season === 'all' ? 'All Seasons' : `Season ${season}`;
            const xspfContent = createXSPF(links, `${title} - ${seasonText}`);
            downloadPlaylist(xspfContent, `${title} - ${seasonText}`);
            showNotification(`Playlist created with ${links.length} items from ${seasonText}`, 'success');
        } catch (error) {
            console.error('Playlist generation failed:', error);
            showNotification('Failed to create playlist', 'error');
        } finally {
            setTimeout(() => {
                button.classList.remove('processing');
            }, 1000);
        }
    }

    // Create XSPF content
    function createXSPF(links, title) {
        let xspfContent = `<?xml version="1.0" encoding="UTF-8"?>
<playlist version="1" xmlns="http://xspf.org/ns/0/" xmlns:vlc="http://www.videolan.org/vlc/playlist/ns/0/">
    <title>${escapeXml(title)}</title>
    <trackList>
`;
        links.forEach((link, index) => {
            xspfContent += `        <track>
            <location>${escapeXml(link)}</location>
            <extension application="http://www.videolan.org/vlc/playlist/0">
                <vlc:id>${index}</vlc:id>
            </extension>
        </track>
`;
        });
        xspfContent += `    </trackList>
    <extension application="http://www.videolan.org/vlc/playlist/0">
`;
        links.forEach((link, index) => {
            xspfContent += `        <vlc:item tid="${index}"/>
`;
        });
        xspfContent += `    </extension>
</playlist>`;
        return xspfContent;
    }

    // Download playlist file
    function downloadPlaylist(content, title) {
        // Sanitize the title for use as a filename
        const filename = sanitizeFilename(title);
        const blob = new Blob([content], { type: 'application/xspf+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.xspf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // XML escape utility
    function escapeXml(unsafe) {
        return unsafe.replace(/[<>&'"]/g,
            c => ({
                '<': '&lt;',
                '>': '&gt;',
                '&': '&amp;',
                '\'': '&apos;',
                '"': '&quot;'
            }[c]));
    }

    // Initialize
    createModernUI();

    // Handle navigation changes (for single-page applications)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            // Check if we need to show/hide the UI based on new URL
            const uiContainer = document.getElementById('playlistModernUI');
            if (uiContainer) {
                if (isContentPage()) {
                    uiContainer.style.display = '';
                } else {
                    uiContainer.style.display = 'none';
                }
            }
        }
    }).observe(document, { subtree: true, childList: true });
})();
