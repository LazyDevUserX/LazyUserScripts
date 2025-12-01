// ==UserScript==
// @name         AnimePahe Auto Downloader
// @namespace    https://animepahe.com/
// @version      2.1
// @description  Automatically start AnimePahe downloads, skip timers, and closes the tab
// @author       LazyDevUserX 
// @match        https://animepahe.com/*
// @match        https://animepahe.si/*
// @match        https://animepahe.ru/*
// @match        https://pahe.win/*
// @match        https://kwik.cx/*
// @match        https://kwik.si/*
// @grant        GM_notification
// ==/UserScript==

(function () {
  'use strict';

  const host = window.location.host;

  if (/animepahe\.(com|org|ru)/.test(host)) {
    console.log('[AutoDL] ✅ AnimePahe main site detected.');
  } else if (host === 'pahe.win') {
    skipTimer();
  } else if (/kwik\.(cx|si)/.test(host)) {
    handleKwikDownload();
  }

  // ---------- Safe Close Function ----------
  function tryCloseTab(delay = 1500) {
    console.log(`[AutoDL] 💤 Closing tab in ${delay}ms...`);
    setTimeout(() => {
      window.close();
      // Fallback overlay if close blocked
      setTimeout(() => {
        if (!document.hidden) {
          document.body.innerHTML = `
            <div style="
              position:fixed;top:0;left:0;width:100%;height:100%;
              background:#000;color:#ffcc00;
              font-family:monospace;
              display:flex;flex-direction:column;
              justify-content:center;align-items:center;
              z-index:999999;">
              <h2>✅ Download started!</h2>
              <p>You can now close this tab manually.</p>
            </div>`;
        }
      }, 1200);
    }, delay);
  }

  // ---------- Pahe.win ----------
  function skipTimer() {
    console.log('[AutoDL] ⏩ Skipping Pahe.win timer...');
    const timer = setInterval(() => {
      const scripts = [...document.scripts];
      for (let script of scripts) {
        const match = script.textContent.match(/https?:\/\/[^"']+/);
        if (match && match[0].includes('kwik')) {
          clearInterval(timer);
          console.log('[AutoDL] Redirecting to Kwik:', match[0]);
          window.location.href = match[0];
          return;
        }
      }
    }, 500);
  }

  // ---------- Kwik.cx / Kwik.si ----------
  function handleKwikDownload() {
    console.log('[AutoDL] 🚀 Handling Kwik download page...');
    const key = `downloaded_${window.location.pathname}`;

    if (sessionStorage.getItem(key) === 'true') {
      console.log('[AutoDL] ✅ Already handled. Closing tab.');
      tryCloseTab();
      return;
    }

    let triggered = false;
    const timer = setInterval(() => {
      if (triggered) {
        clearInterval(timer);
        return;
      }

      // --- Direct Link (already generated) ---
      const directLink = document.querySelector('a.btn[href*="https://"], a[href*=".mp4"], a[href*=".mkv"]');
      if (directLink) {
        triggered = true;
        clearInterval(timer);
        console.log('[AutoDL] ✅ Found direct download link:', directLink.href);
        sessionStorage.setItem(key, 'true');

        directLink.click();
        GM_notification({
          title: 'AnimePahe Auto Downloader',
          text: 'Download started successfully!',
          timeout: 2000
        });

        tryCloseTab(1500); // wait ~1.5s for browser to register download
        return;
      }

      // --- Form-based (most common case) ---
      const formButton = document.querySelector('button[type="submit"]');
      if (formButton && !triggered) {
        triggered = true;
        clearInterval(timer);
        console.log('[AutoDL] 🧩 Found form. Submitting once...');
        sessionStorage.setItem(key, 'true');

        try {
          formButton.disabled = true;
          formButton.form.submit();

          GM_notification({
            title: 'AnimePahe Auto Downloader',
            text: 'Form submitted — download starting...',
            timeout: 2000
          });

          tryCloseTab(1500); // wait 1.5s after submit
        } catch (err) {
          console.error('[AutoDL] ❌ Error submitting form:', err);
          triggered = false;
        }
      }
    }, 500);
  }
})();
