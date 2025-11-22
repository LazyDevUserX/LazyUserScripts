// ==UserScript==
// @name         Udvash YT Auto Redirect
// @namespace    udvash.yt.autoredirect
// @version      1.0.1
// @description  Opens Udvash YouTube videos directly in YouTube ReVanced app on mobile, or in a new tab on desktop.
// @author       LazyDevUserX
// @match        https://online.udvash-unmesh.com/Content/DisplayContentCardDetails?*
// @match        https://online.udvash-unmesh.com/Routine/ClassDetails?*
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const handleRedirect = () => {
        const li = document.querySelector('li.nav-item.active[data-youtube-video]');
        if (!li) return false;

        const ytId = li.getAttribute('data-youtube-video');
        if (!ytId) return false;

        const ytWebUrl = `https://www.youtube.com/watch?v=${ytId}`;
        const revancedUrl = `app.revanced.android.youtube://www.youtube.com/watch?v=${ytId}`;

        if (isMobile) {
            // Try opening in YouTube ReVanced
            const a = document.createElement('a');
            a.href = revancedUrl;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();

            // Fallback to normal YouTube if app doesn't open
            setTimeout(() => {
                if (!document.hidden) {
                    window.location.href = ytWebUrl;
                }
            }, 1000);
        } else {
            // Desktop: open YouTube in new tab
            window.open(ytWebUrl, '_blank');
        }

        return true;
    };

    // Try immediately
    if (handleRedirect()) return;

    // Observe for dynamic DOM loading
    const observer = new MutationObserver(() => {
        if (handleRedirect()) observer.disconnect();
    });

    observer.observe(document, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 10000);
})();
