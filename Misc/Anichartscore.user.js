// ==UserScript==
// @name         AniChart: AniList & MAL Score Overlay (Jikan Free API)
// @namespace    https://anichart.net/
// @version      3.0
// @description  Overlays AniList and MAL scores on posters using Jikan API. Mobile friendly & no API key required.
// @author       WebDev Pro
// @match        https://anichart.net/*
// @grant        GM_xmlhttpRequest
// @connect      graphql.anilist.co
// @connect      api.jikan.moe
// ==/UserScript==

(function() {
    'use strict';

    // CSS for mobile-friendly elegant overlay
    const style = document.createElement('style');
    style.innerHTML = `
        .score-overlay-box {
            position: absolute;
            top: 6px;
            left: 6px;
            right: 6px;
            display: flex;
            justify-content: space-between;
            pointer-events: none;
            z-index: 10;
        }
        .score-item {
            background: rgba(11, 22, 34, 0.8);
            color: #fff;
            padding: 3px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            backdrop-filter: blur(4px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .al-label { color: #3db4f2; margin-right: 4px; }
        .mal-label { color: #2e51a2; margin-right: 4px; }

        /* Tablet/Mobile optimization */
        @media (max-width: 768px) {
            .score-overlay-box { top: 4px; left: 4px; right: 4px; }
            .score-item { font-size: 9px; padding: 2px 4px; }
        }
    `;
    document.head.appendChild(style);

    const cache = new Map();

    // Fetch AniList score and MAL ID
    async function getAniListData(ids) {
        const query = `query($ids:[Int]){Page{media(id_in:$ids){id idMal averageScore}}}`;
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: "https://graphql.anilist.co",
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({ query, variables: { ids } }),
                onload: (res) => {
                    const data = JSON.parse(res.responseText);
                    if (data.data && data.data.Page.media) {
                        data.data.Page.media.forEach(m => {
                            cache.set(m.id, { 
                                al: m.averageScore ? m.averageScore + '%' : 'N/A', 
                                malId: m.idMal 
                            });
                        });
                    }
                    resolve();
                }
            });
        });
    }

    // Fetch MAL score using Jikan (Free API)
    async function getMALScore(malId) {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://api.jikan.moe/v4/anime/${malId}`,
                onload: (res) => {
                    if (res.status === 200) {
                        const data = JSON.parse(res.responseText);
                        resolve(data.data.score ? data.data.score.toFixed(2) : 'N/A');
                    } else {
                        resolve('N/A');
                    }
                },
                onerror: () => resolve('N/A')
            });
        });
    }

    async function process() {
        const cards = document.querySelectorAll('.media-card:not([data-loaded])');
        if (cards.length === 0) return;

        const ids = [];
        const targets = [];

        cards.forEach(card => {
            [span_0](start_span)const link = card.querySelector('a.cover'); //[span_0](end_span)
            const match = link ? link.href.match(/anime\/(\d+)/) : null;
            if (match) {
                const id = parseInt(match[1]);
                card.setAttribute('data-loaded', 'true');
                ids.push(id);
                targets.push({ id, container: link });
            }
        });

        if (ids.length === 0) return;

        await getAniListData(ids);

        for (const target of targets) {
            const info = cache.get(target.id);
            if (!info) continue;

            // Create container
            const box = document.createElement('div');
            box.className = 'score-overlay-box';
            
            // Create AL Badge
            const alBadge = document.createElement('div');
            alBadge.className = 'score-item';
            alBadge.innerHTML = `<span class="al-label">AL</span>${info.al}`;
            box.appendChild(alBadge);

            // Create MAL Badge
            const malBadge = document.createElement('div');
            malBadge.className = 'score-item';
            malBadge.innerHTML = `<span class="mal-label">MAL</span>...`;
            box.appendChild(malBadge);

            target.container.appendChild(box);

            // Lazy fetch MAL score to avoid Jikan rate limits (1 request per second)
            if (info.malId) {
                getMALScore(info.malId).then(score => {
                    malBadge.innerHTML = `<span class="mal-label">MAL</span>${score}`;
                });
            } else {
                malBadge.innerHTML = `<span class="mal-label">MAL</span>N/A`;
            }
        }
    }

    // Initial run and infinite scroll observer
    process();
    const observer = new MutationObserver(() => process());
    observer.observe(document.body, { childList: true, subtree: true });

})();
                          
