// ==UserScript==
// @name         Pinterest Mobile Downloader (Refined)
// @description  Replaces the "Save" button with a specific "Download" button on all mobile views (Fixed & Docked).
// @version      5.1
// @author       ShrekBytes
// @match        https://*.pinterest.com/*
// @match        https://*.pinterest.*/*
// @grant        GM_download
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  // ===== CONFIGURATION =====
  const THEME_COLOR = '#e60023'; // Pinterest Red
  const HOVER_COLOR = '#ad081b'; // Darker Red for visual feedback
  
  // ===== UTILITIES =====
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => root.querySelectorAll(sel);

  function sanitizeFilename(filename) {
    return (filename || 'pinterest_img').replace(/[\/\\?%*:|"<>]/g, '-').slice(0, 50);
  }

  function getFileExtension(url) {
    if (!url) return '.jpg';
    const cleanUrl = url.split('?')[0];
    const match = cleanUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    return match ? match[0] : '.jpg';
  }

  // ===== DOWNLOADER =====
  function downloadFile(url, filename) {
    if (!url) return false;
    const name = sanitizeFilename(filename) + getFileExtension(url);
    try {
      if (typeof GM_download === 'function') {
        GM_download({ url, name });
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => a.remove(), 100);
      }
      return true;
    } catch (e) { return false; }
  }

  // ===== TOAST SYSTEM (THEMED) =====
  const Toast = (() => {
    let container;
    function show(msg) {
      if (!container) {
        container = document.createElement('div');
        Object.assign(container.style, {
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          zIndex: '9999999', pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '8px', width: 'max-content'
        });
        document.body.appendChild(container);
      }
      
      const el = document.createElement('div');
      el.textContent = msg;
      Object.assign(el.style, {
        background: THEME_COLOR, // Always Red
        color: '#fff',
        padding: '12px 20px',
        borderRadius: '30px',
        fontSize: '14px',
        fontWeight: 'bold',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", Helvetica, "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", メイリオ, Meiryo, "ＭＳ Ｐゴシック", Arial, sans-serif',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        opacity: '0',
        transform: 'translateY(-20px)'
      });
      
      container.appendChild(el);
      requestAnimationFrame(() => Object.assign(el.style, { opacity: '1', transform: 'translateY(0)' }));
      
      setTimeout(() => {
        Object.assign(el.style, { opacity: '0', transform: 'translateY(-20px)' });
        setTimeout(() => el.remove(), 300);
      }, 2500);
    }
    return { show };
  })();

  // ===== PIN DATA LOGIC =====
  function getPinId() {
    const m = location.href.match(/\/pin\/([^\/?#]+)/i);
    return m ? m[1] : null;
  }

  async function fetchPinData(pinId) {
    try {
      const u = `https://${location.host}/resource/PinResource/get/?source_url=%2Fpin%2F${pinId}%2F&data=%7B%22options%22%3A%7B%22id%22%3A%22${pinId}%22%2C%22field_set_key%22%3A%22detailed%22%2C%22noCache%22%3Atrue%7D%2C%22context%22%3A%7B%7D%7D&_=${Date.now()}`;
      const res = await fetch(u, { headers: { 'X-Pinterest-PWS-Handler': 'www/pin/[id].js' }, credentials: 'include' });
      return (await res.json())?.resource_response?.data;
    } catch { return null; }
  }

  async function startDownload() {
    Toast.show('Fetching High-Res...');
    const pinId = getPinId();
    let url, title = document.title.replace(' | Pinterest', '').trim();

    if (pinId) {
      const data = await fetchPinData(pinId);
      if (data) {
        url = data.images?.orig?.url || data.images?.large?.url || data.story_pin_data?.pages?.[0]?.image?.images?.originals?.url;
        title = data.grid_title || data.title || title;
      }
    }
    // Fallback
    if (!url) url = qs('img[src*="/originals/"]')?.src || qs('div[data-test-id="visual-content-container"] img')?.src;

    if (url) {
      if (downloadFile(url, title)) Toast.show('Download Started 📥');
      else Toast.show('Error: Could not save');
    } else {
      Toast.show('No image found');
    }
  }

  // ===== HIJACKER =====
  function scanAndHijack() {
    // We look for ANY button-like element containing exactly "Save"
    // This covers both the sticky footer (docked) and the main button (fixed)
    const candidates = Array.from(qsa('div[role="button"], button'));
    
    candidates.forEach(btn => {
      // Skip if already processed or incorrect text
      if (btn.dataset.pmdHijacked || btn.innerText.trim() !== 'Save') return;

      // 1. Mark as hijacked
      btn.dataset.pmdHijacked = 'true';

      // 2. Clone the node to strip Pinterest's React event listeners
      // This is crucial for the "Docked" button to stop it from saving
      const newBtn = btn.cloneNode(true);
      
      // 3. VISUAL MODIFICATION
      // Recursively find the text node to replace "Save" with "Download 📥"
      // while keeping the existing structure (padding, fonts) intact.
      const textNode = findTextNode(newBtn, 'Save');
      if (textNode) {
        textNode.textContent = 'Download 📥';
      } else {
        newBtn.innerText = 'Download 📥';
      }
      
      // Apply darker red background to indicate script is active
      newBtn.style.backgroundColor = HOVER_COLOR; 
      newBtn.style.transition = 'background-color 0.2s';
      newBtn.style.borderColor = 'transparent'; // Remove borders if any

      // 4. Attach new click handler
      newBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        startDownload();
      };

      // 5. Replace the original button
      if (btn.parentNode) {
        btn.parentNode.replaceChild(newBtn, btn);
      }
    });
  }

  // Helper to find the specific text node "Save" deeply nested
  function findTextNode(el, text) {
    if (el.nodeType === 3 && el.nodeValue.trim() === text) return el;
    for (let i = 0; i < el.childNodes.length; i++) {
      const found = findTextNode(el.childNodes[i], text);
      if (found) return found;
    }
    return null;
  }

  // ===== INIT =====
  function init() {
    // Run frequently because the "Docked" button appears/disappears on scroll
    const observer = new MutationObserver(() => {
      scanAndHijack();
    });
    
    // Observe the whole body for changes
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Initial run
    scanAndHijack();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

