// ==UserScript==
// @name         CircleFTP Enhancer (alpha)
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Addds various enhacements to CircleFTP
// @match        *://new.circleftp.net/content/*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  GM_addStyle(`
    /* Remove white top bar + unify dark background */
    body, main, .container, .card, section.bg-light {
      background-color: #0e0e0e !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
    }

    /* Main flex layout */
    .tm-flex {
      display: flex !important;
      justify-content: center !important;
      align-items: flex-start !important;
      gap: 24px !important;
      flex-wrap: nowrap !important;
      margin: 24px auto !important;
      width: calc(100% - 40px) !important;
      max-width: 1200px !important;
      box-sizing: border-box !important;
    }

    .tm-flex .tm-poster {
      width: 280px !important;
      flex-shrink: 0 !important;
      border-radius: 14px !important;
      overflow: hidden !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5) !important;
      transition: transform 0.3s ease;
    }
    .tm-flex .tm-poster:hover { transform: scale(1.02); }

    .tm-flex .tm-poster img {
      width: 100% !important;
      height: auto !important;
      display: block !important;
      border-radius: 14px !important;
      object-fit: cover !important;
    }

    .tm-flex .tm-season {
      flex: 1 1 auto !important;
      min-width: 400px !important;
      border-radius: 14px !important;
      background: #161616 !important;
      color: #fff !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important;
      padding: 10px 20px !important;
    }

    /* Table text colors */
    .tm-season table,
    .tm-season th,
    .tm-season td,
    .tm-season tr {
      color: #fff !important;
      background-color: transparent !important;
      border-color: #333 !important;
    }

    .tm-season th {
      font-weight: 600 !important;
      color: #ff4747 !important;
      font-size: 1rem !important;
    }

    /* Season Tabs - modern pill look */
    .tm-season .nav-tabs {
      border-bottom: none !important;
      justify-content: center !important;
      margin-bottom: 12px !important;
      gap: 10px !important;
    }

    .tm-season .nav-tabs .nav-link {
      background: #1f1f1f !important;
      color: #bbb !important;
      border: none !important;
      border-radius: 9999px !important;
      padding: 8px 20px !important;
      font-weight: 600 !important;
      transition: all 0.25s ease-in-out !important;
    }

    .tm-season .nav-tabs .nav-link:hover {
      color: #fff !important;
      background: #252525 !important;
      transform: translateY(-2px);
    }

    .tm-season .nav-tabs .nav-link.active {
      color: #fff !important;
      background: linear-gradient(90deg, #ff4747, #d92c2c) !important;
      box-shadow: 0 3px 10px rgba(255, 71, 71, 0.4) !important;
    }

    /* Responsive stack */
    @media (max-width: 850px) {
      .tm-flex {
        flex-direction: column !important;
        align-items: center !important;
      }
      .tm-flex .tm-poster {
        width: 90% !important;
      }
      .tm-flex .tm-season {
        width: 95% !important;
      }
    }
  `);

  // Arrange layout instantly on SPA navigation
  function arrangeLayout() {
    const img = document.querySelector('.container .card img');
    const section = document.querySelector('section.bg-light');
    if (!img || !section) return false;

    if (section.closest('.tm-flex')) return true; // already arranged

    const wrapper = document.createElement('div');
    wrapper.className = 'tm-flex';
    const posterWrap = document.createElement('div');
    posterWrap.className = 'tm-poster';
    posterWrap.appendChild(img);
    section.classList.add('tm-season');

    const container = section.parentNode;
    container.insertBefore(wrapper, section);
    wrapper.appendChild(posterWrap);
    wrapper.appendChild(section);
    return true;
  }

  // React to SPA content swaps
  const root = document.querySelector('#root');
  if (root) {
    const observer = new MutationObserver(() => arrangeLayout());
    observer.observe(root, { childList: true, subtree: true });
  }

  arrangeLayout();
})();
