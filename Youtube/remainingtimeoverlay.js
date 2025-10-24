// ==UserScript==
// @name         YouTube Remaining Time Overlay
// @namespace    yt.remaining.time.overlay
// @version      1.4
// @description  Shows remaining time adjusted for playback speed in two overlays: pill near controls, and toggleable always-on top overlay (Alt+T).
// @author       LazyDevUserX
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const OVERLAY_ID = 'yt-remaining-time-overlay';
  const TOP_OVERLAY_ID = 'yt-remaining-time-top-overlay';

  let currentVideo = null;
  let overlay = null;
  let topOverlay = null;
  let observers = [];
  let topOverlayEnabled = false;

  function qs(sel, root = document) { return root.querySelector(sel); }

  // === Bottom pill overlay ===
  function createOverlay() {
    if (document.getElementById(OVERLAY_ID)) return document.getElementById(OVERLAY_ID);

    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;

    Object.assign(overlay.style, {
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: '40px',
      zIndex: '9999',
      pointerEvents: 'none',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      opacity: '0',
      transition: 'opacity 160ms linear, transform 160ms linear',
      padding: '4px 10px',
      lineHeight: '1.4',
      background: 'rgba(0, 0, 0, 0.65)',
      borderRadius: '9999px',
      backdropFilter: 'blur(2px)',
      boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
      fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
      fontSize: '13px',
      fontWeight: '700',
      color: '#fff',
      textShadow: '0 0 2px rgba(0,0,0,0.8)',
    });

    overlay.textContent = '';

    const player = qs('.html5-video-player');
    if (player) {
      player.appendChild(overlay);
    } else {
      document.body.appendChild(overlay);
    }

    return overlay;
  }

  function copyYTTimeStyles() {
    if (!overlay) return;
    const sample = qs('.ytp-time-text') || qs('.ytp-time-display') || qs('.ytp-time-current');
    if (!sample) return;
    const cs = window.getComputedStyle(sample);

    overlay.style.fontSize = cs.fontSize || '13px';
    overlay.style.fontWeight = cs.fontWeight || '700';
    overlay.style.fontFamily = cs.fontFamily || 'Roboto, Arial, Helvetica, sans-serif';
    overlay.style.color = '#fff'; // force white
  }

  // === Top always-on overlay ===
  function createTopOverlay() {
    if (document.getElementById(TOP_OVERLAY_ID)) return document.getElementById(TOP_OVERLAY_ID);

    topOverlay = document.createElement('div');
    topOverlay.id = TOP_OVERLAY_ID;

    Object.assign(topOverlay.style, {
      position: 'absolute',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '9999',
      pointerEvents: 'none',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
      fontSize: '18px',
      fontWeight: '900',
      color: '#fff',
      textShadow: `
        -1px -1px 0 #000,
         1px -1px 0 #000,
        -1px  1px 0 #000,
         1px  1px 0 #000`, // black border effect
      opacity: '0',
      transition: 'opacity 200ms ease-in-out',
    });

    topOverlay.textContent = '';

    const player = qs('.html5-video-player');
    if (player) {
      player.appendChild(topOverlay);
    } else {
      document.body.appendChild(topOverlay);
    }

    return topOverlay;
  }

  // === Shared ===
  function formatTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    if (!isFinite(sec)) return '';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return (h > 0 ? h + ':' : '') +
      (h > 0 && m < 10 ? '0' : '') + m + ':' +
      (s < 10 ? '0' : '') + s;
  }

  function updateOverlayText(video) {
    if (!video) return;

    if (!isFinite(video.duration) || video.duration <= 0) {
      if (overlay) overlay.textContent = '';
      if (topOverlay) topOverlay.textContent = '';
      return;
    }

    const remaining = (video.duration - video.currentTime) / Math.max(0.0001, video.playbackRate);
    const text = formatTime(remaining);

    if (overlay) overlay.textContent = text;
    if (topOverlay) topOverlay.textContent = text;
  }

  function updateOverlayPosition() {
    const player = qs('.html5-video-player');
    if (!player || !overlay) return;

    const chromeBottom = qs('.ytp-chrome-bottom', player);
    if (!chromeBottom) {
      overlay.style.bottom = '40px';
      return;
    }

    const rectPlayer = player.getBoundingClientRect();
    const rectChrome = chromeBottom.getBoundingClientRect();

    const distanceFromBottom = Math.max(6, Math.round(rectPlayer.bottom - rectChrome.top));
    const bottomPx = distanceFromBottom + 8;
    overlay.style.bottom = `${bottomPx}px`;
  }

  function updateOverlayVisibility() {
    if (overlay) {
      const player = qs('.html5-video-player');
      const chromeBottom = player ? qs('.ytp-chrome-bottom', player) : null;

      if (chromeBottom) {
        const opacity = parseFloat(window.getComputedStyle(chromeBottom).opacity || '1');
        overlay.style.opacity = opacity < 0.5 ? '0' : '1';
      } else {
        overlay.style.opacity = '1';
      }
    }

    if (topOverlay) {
      topOverlay.style.opacity = topOverlayEnabled ? '1' : '0';
    }
  }

  // === Video listeners ===
  function attachVideoListeners(video) {
    if (!video) return;
    detachVideoListeners();
    currentVideo = video;

    const onTime = () => updateOverlayText(video);
    const onRate = () => updateOverlayText(video);
    const onMeta = () => {
      updateOverlayText(video);
      updateOverlayPosition();
    };

    video.addEventListener('timeupdate', onTime);
    video.addEventListener('ratechange', onRate);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('seeked', onTime);
    video.addEventListener('loadeddata', onMeta);

    currentVideo._ytOverlayListeners = { onTime, onRate, onMeta };
    updateOverlayText(video);
  }

  function detachVideoListeners() {
    if (currentVideo && currentVideo._ytOverlayListeners) {
      const { onTime, onRate, onMeta } = currentVideo._ytOverlayListeners;
      currentVideo.removeEventListener('timeupdate', onTime);
      currentVideo.removeEventListener('ratechange', onRate);
      currentVideo.removeEventListener('loadedmetadata', onMeta);
      currentVideo.removeEventListener('seeked', onTime);
      currentVideo.removeEventListener('loadeddata', onMeta);
      delete currentVideo._ytOverlayListeners;
    }
    currentVideo = null;
  }

  // === Observers ===
  function watchForPlayerAndVideo() {
    const mo = new MutationObserver(() => {
      const player = qs('.html5-video-player');
      if (player) {
        if (overlay && overlay.parentElement !== player) player.appendChild(overlay);
        if (topOverlay && topOverlay.parentElement !== player) player.appendChild(topOverlay);
      }
      if (!overlay) createOverlay();
      if (!topOverlay) createTopOverlay();

      const video = qs('video');
      if (video && video !== currentVideo) {
        attachVideoListeners(video);
      }

      copyYTTimeStyles();
      updateOverlayPosition();
      updateOverlayVisibility();
    });

    mo.observe(document.body, { childList: true, subtree: true });
    observers.push(mo);

    const resizeHandler = () => {
      updateOverlayPosition();
      copyYTTimeStyles();
      updateOverlayVisibility();
    };
    window.addEventListener('resize', resizeHandler);
    observers.push({ disconnect: () => window.removeEventListener('resize', resizeHandler) });
  }

  // === Toggle shortcut ===
  function setupKeybind() {
    window.addEventListener('keydown', (e) => {
      if (e.altKey && e.code === 'KeyT') {
        topOverlayEnabled = !topOverlayEnabled;
        updateOverlayVisibility();
      }
    });
  }

  // === Init / Cleanup ===
  function cleanup() {
    detachVideoListeners();
    observers.forEach(o => o.disconnect && o.disconnect());
    observers = [];
    if (overlay && overlay.parentElement) overlay.parentElement.removeChild(overlay);
    if (topOverlay && topOverlay.parentElement) topOverlay.parentElement.removeChild(topOverlay);
    overlay = null;
    topOverlay = null;
  }

  function init() {
    createOverlay();
    createTopOverlay();
    copyYTTimeStyles();
    updateOverlayPosition();
    updateOverlayVisibility();
    watchForPlayerAndVideo();
    setupKeybind();

    const sanity = setInterval(() => {
      if (!overlay) createOverlay();
      if (!topOverlay) createTopOverlay();
      const video = qs('video');
      if (video && video !== currentVideo) attachVideoListeners(video);
      updateOverlayPosition();
      updateOverlayVisibility();
    }, 1500);
    observers.push({ disconnect: () => clearInterval(sanity) });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    window.addEventListener('DOMContentLoaded', init, { once: true });
  }

  window.__ytRemainingOverlayCleanup = cleanup;

})();
