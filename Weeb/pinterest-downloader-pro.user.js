// ==UserScript==
// @name         Pinterest Downloader Pro
// @description  Adds a Download button for uncompressed HQ downloads without login
// @author       LazyDevUserX 
// @match        https://*.pinterest.com/*
// @match        https://*.pinterest.*/*
// @grant        GM_download
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  // ===== CONFIGURATION =====
  const THEME_COLOR = '#e60023'; // Pinterest Red
  const HOVER_COLOR = '#ad081b'; // Darker Red for "active" state
  
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

  // ===== DOWNLOAD LOGIC =====
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

  // ===== TOAST NOTIFICATIONS (NATIVE STYLE) =====
  const Toast = (() => {
    let container;
    function show(msg) {
      if (!container) {
        container = document.createElement('div');
        Object.assign(container.style, {
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: '9999999', pointerEvents: 'none', display: 'flex', flexDirection: 'column', 
          gap: '8px', alignItems: 'center', width: '100%'
        });
        document.body.appendChild(container);
      }
      
      const el = document.createElement('div');
      el.textContent = msg;
      Object.assign(el.style, {
        background: THEME_COLOR,
        color: '#fff',
        padding: '14px 24px',
        borderRadius: '9999px', // Pill shape
        fontSize: '15px',
        fontWeight: '700', // Pinterest bold font
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
        opacity: '0',
        transform: 'translateY(-20px)'
      });
      
      container.appendChild(el);
      requestAnimationFrame(() => Object.assign(el.style, { opacity: '1', transform: 'translateY(0)' }));
      
      setTimeout(() => {
        Object.assign(el.style, { opacity: '0', transform: 'translateY(-20px)' });
        setTimeout(() => el.remove(), 300);
      }, 2000);
    }
    return { show };
  })();

  // ===== PIN DATA & ACTION =====
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
    Toast.show('Fetching...');
    const pinId = getPinId();
    let url, title = document.title.replace(' | Pinterest', '').trim();

    if (pinId) {
      const data = await fetchPinData(pinId);
      if (data) {
        url = data.images?.orig?.url || data.images?.large?.url || data.story_pin_data?.pages?.[0]?.image?.images?.originals?.url;
        title = data.grid_title || data.title || title;
      }
    }
    if (!url) url = qs('img[src*="/originals/"]')?.src || qs('div[data-test-id="visual-content-container"] img')?.src;

    if (url) {
      if (downloadFile(url, title)) Toast.show('Download Started');
      else Toast.show('Error: Save Failed');
    } else {
      Toast.show('No image found');
    }
  }

  // ===== BUTTON HIJACKER =====
  function scanAndHijack() {
    // Find all potential "Save" buttons (covers docked and static positions)
    const candidates = Array.from(qsa('div[role="button"], button'));
    
    candidates.forEach(btn => {
      // Filter: Must say "Save", must not be hijacked, must be visible
      if (btn.dataset.pmdHijacked || btn.innerText.trim() !== 'Save') return;

      // 1. Mark as hijacked
      btn.dataset.pmdHijacked = 'true';

      // 2. Clone to strip events
      const newBtn = btn.cloneNode(true);
      
      // 3. Update Text
      const textNode = findTextNode(newBtn, 'Save');
      if (textNode) {
        textNode.textContent = 'Download';
      } else {
        newBtn.innerText = 'Download';
      }
      
      // 4. Force Native Styling (Fixes the Square Shape issue)
      Object.assign(newBtn.style, {
        backgroundColor: HOVER_COLOR,
        borderRadius: '9999px', // Force Pill Shape
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        transition: 'transform 0.1s linear',
        display: 'inline-flex', // Ensure flex layout is kept
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box'
      });

      // 5. Attach Handler
      newBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        startDownload();
      };
      
      // 6. Active (Press) Effect
      newBtn.onmousedown = () => newBtn.style.transform = 'scale(0.96)';
      newBtn.onmouseup = () => newBtn.style.transform = 'scale(1)';
      newBtn.ontouchstart = () => newBtn.style.transform = 'scale(0.96)';
      newBtn.ontouchend = () => newBtn.style.transform = 'scale(1)';

      // 7. Swap
      if (btn.parentNode) {
        btn.parentNode.replaceChild(newBtn, btn);
      }
    });
  }

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
    const observer = new MutationObserver(() => scanAndHijack());
    observer.observe(document.body, { childList: true, subtree: true });
    scanAndHijack();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

