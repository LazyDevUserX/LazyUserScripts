// ==UserScript==
// @name         Udvash To YouTube
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  Adds a button to UV website to watch classes directly in Youtube
// @author       LazyDevUserX
// @match        https://online.udvash-unmesh.com/Routine/ClassDetails*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  GM_addStyle(`
    /* Panel container */
    #ytHelperPanel {
      position: fixed;
      bottom: 30px;
      right: 30px;
      background: #ffffff;
      color: #222;
      font-family: "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 14px;
      padding: 14px;
      border-radius: 12px;
      box-shadow: 0 6px 22px rgba(87,43,117,0.12);
      z-index: 99999;
      width: 320px;
      border: 1px solid rgba(90,44,160,0.08);
      animation: slideUp 260ms cubic-bezier(.2,.9,.2,1);
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Header */
    #ytHelperPanel .title {
      margin: 0 0 10px 0;
      font-size: 15px;
      font-weight: 600;
      color: #5a2ca0; /* brand purple */
      text-align: left;
    }

    /* Link row */
    #ytHelperPanel .link-row {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fbf8ff;
      border: 1px solid rgba(90,44,160,0.06);
      padding: 8px;
      border-radius: 8px;
      margin-bottom: 12px;
      overflow: hidden;
    }

    #ytHelperPanel .link-row .link {
      flex: 1;
      font-size: 13px;
      color: #2b2b2b;
      text-decoration: none;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      padding-right: 6px;
    }

    /* Icon-only copy button next to link */
    #ytHelperPanel .copy-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #fff;
      border: 1px solid rgba(90,44,160,0.06);
      cursor: pointer;
      transition: background 160ms, transform 80ms;
    }
    #ytHelperPanel .copy-btn:hover { background: rgba(90,44,160,0.04); transform: translateY(-2px); }
    #ytHelperPanel .copy-btn:active { transform: scale(0.98); }

    /* Actions row */
    #ytHelperPanel .actions {
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
    }

    #ytHelperPanel .open-btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      justify-content: center;
      border: none;
      background: linear-gradient(180deg,#6d39c0 0%, #5a2ca0 100%);
      color: #fff;
      padding: 10px 12px;
      font-weight: 600;
      border-radius: 10px;
      cursor: pointer;
      box-shadow: 0 6px 14px rgba(90,44,160,0.12);
      transition: transform 120ms, box-shadow 120ms;
      font-size: 13px;
    }
    #ytHelperPanel .open-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(90,44,160,0.14); }
    #ytHelperPanel .open-btn:active { transform: scale(0.99); }

    /* Small status text */
    #ytHelperPanel .status {
      font-size: 12px;
      color: #666;
      margin-top: 8px;
      text-align: left;
    }

    /* Responsive tweak */
    @media (max-width: 420px) {
      #ytHelperPanel { right: 12px; left: 12px; width: auto; }
    }
  `);

  window.addEventListener('load', () => {
    const videoItem = document.querySelector('ul#video-tab li[data-youtube-video]');
    if (!videoItem) return;

    const ytId = videoItem.getAttribute('data-youtube-video');
    if (!ytId) return;

    const ytUrl = 'https://www.youtube.com/watch?v=' + ytId;

    // Build panel
    const panel = document.createElement('div');
    panel.id = 'ytHelperPanel';
    panel.innerHTML = `
      <div class="title">YouTube Video</div>

      <div class="link-row" title="${ytUrl}">
        <a class="link" href="${ytUrl}" target="_blank" rel="noopener noreferrer">${ytUrl}</a>
        <button class="copy-btn" type="button" aria-label="Copy video link" title="Copy link">
          <!-- Copy SVG (professional, simple) -->
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 21H8a2 2 0 0 1-2-2V7" stroke="#5a2ca0" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="9" y="3" width="11" height="14" rx="2" stroke="#5a2ca0" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <div class="actions">
        <button class="open-btn" type="button" aria-label="Open video in new tab" title="Open in new tab">
          <!-- External link SVG -->
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 3h7v7" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 14L21 3" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M21 21H3V3" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.0"/>
          </svg>
          Open
        </button>
      </div>

      <div class="status">Click <strong>Open</strong> to view the video, or copy the link to share.</div>
    `;

    document.body.appendChild(panel);

    // Elements
    const linkEl = panel.querySelector('.link');
    const copyBtn = panel.querySelector('.copy-btn');
    const openBtn = panel.querySelector('.open-btn');

    // Copy handler
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(ytUrl);
        // temporary visual feedback
        const orig = copyBtn.innerHTML;
        copyBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17l-5-5" stroke="#5a2ca0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        setTimeout(() => (copyBtn.innerHTML = orig), 1200);
      } catch (e) {
        console.error('Copy failed', e);
        panel.querySelector('.status').textContent = 'Unable to copy (browser blocked).';
      }
    });

    // Open handler (single open button)
    openBtn.addEventListener('click', () => {
      window.open(ytUrl, '_blank', 'noopener');
    });

    // Make link text clickable/selectable for quick select by user
    linkEl.addEventListener('click', (e) => {
      // allow normal navigation on ctrl/cmd+click or middle click; otherwise prevent and open in new tab for consistent behavior
      if (!e.ctrlKey && !e.metaKey && e.button === 0) {
        e.preventDefault();
        window.open(ytUrl, '_blank', 'noopener');
      }
    });
  });
})();
