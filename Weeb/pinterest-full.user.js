// ==UserScript==
// @name         Pinterest Save-to-Download (Mobile)
// @description  Replaces the "Save" button with a "Download" button on Pinterest Mobile.
// @version      5.0
// @author       ShrekBytes
// @match        https://*.pinterest.com/*
// @match        https://*.pinterest.*/*
// @grant        GM_download
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  // ===== CONFIGURATION =====
  const SELECTORS = [
    '.Nt6yCq.LbyOQL.ADXRXN', // User provided class
    '[data-test-id="save-button"] button',
    '[data-test-id="save-button"]',
    'div[role="button"]:has(div:contains("Save"))' // Fallback
  ];

  // ===== UTILITIES =====
  const qs = (sel, root = document) => root.querySelector(sel);

  function getFileExtension(url) {
    if (!url) return '.jpg';
    const cleanUrl = url.split('?')[0];
    const match = cleanUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    return match ? match[0] : '.jpg';
  }

  function sanitizeFilename(filename) {
    return (filename || 'pinterest_img').replace(/[\/\\?%*:|"<>]/g, '-').slice(0, 50);
  }

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

  // ===== TOAST NOTIFICATIONS =====
  const Toast = (() => {
    let container;
    function show(msg, type) {
      if (!container) {
        container = document.createElement('div');
        Object.assign(container.style, {
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          zIndex: '999999', pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '8px'
        });
        document.body.appendChild(container);
      }
      const el = document.createElement('div');
      el.textContent = msg;
      Object.assign(el.style, {
        background: type === 'error' ? '#e60023' : '#333', color: '#fff',
        padding: '10px 16px', borderRadius: '20px', fontSize: '14px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)', transition: '0.3s', opacity: '0', transform: 'translateY(-10px)'
      });
      container.appendChild(el);
      requestAnimationFrame(() => Object.assign(el.style, { opacity: '1', transform: 'translateY(0)' }));
      setTimeout(() => {
        Object.assign(el.style, { opacity: '0', transform: 'translateY(-10px)' });
        setTimeout(() => el.remove(), 300);
      }, 2000);
    }
    return { show };
  })();

  // ===== DATA FETCHING =====
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

  async function handleDownload() {
    Toast.show('Fetching...', 'info');
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
      if (downloadFile(url, title)) Toast.show('Downloading!', 'success');
      else Toast.show('Error starting download', 'error');
    } else {
      Toast.show('No image found', 'error');
    }
  }

  // ===== BUTTON REPLACEMENT LOGIC =====
  function hijackButton() {
    // Only run on Pin pages
    if (!getPinId()) return;

    let oldBtn;
    // Find the button using the list of selectors
    for (const sel of SELECTORS) {
      oldBtn = qs(sel);
      if (oldBtn) break;
    }

    // Check if valid and not already hijacked
    if (!oldBtn || oldBtn.dataset.pmdHijacked) return;

    // Clone the button to strip existing React event listeners
    const newBtn = oldBtn.cloneNode(true);
    newBtn.dataset.pmdHijacked = 'true';
    
    // Change Text: Traverse specific children or fallback to innerText
    // We try to preserve the icon if it exists
    const textNode = Array.from(newBtn.querySelectorAll('div')).find(d => d.textContent.trim() === 'Save');
    if (textNode) {
      textNode.textContent = 'Download';
    } else {
      // Fallback: Just replace visible text, keep structure if possible
      newBtn.innerHTML = newBtn.innerHTML.replace('Save', 'Download');
    }

    // Force style to green (optional, visual indicator that it's safe to download)
    // newBtn.style.backgroundColor = '#008a00'; 
    // ^ Uncomment above line if you want the button to turn Green
    
    // Attach new listener
    newBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleDownload();
    };

    // Replace in DOM
    oldBtn.replaceWith(newBtn);
  }

  // ===== INIT =====
  function init() {
    // Observer to catch the button when it renders (Pinterest is a SPA)
    const observer = new MutationObserver(() => {
      hijackButton();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Also try immediately
    hijackButton();
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();

})();

