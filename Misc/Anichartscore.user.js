// ==UserScript==
// @name         AniChart: AniList Score Overlay
// @namespace    https://anichart.net/
// @version      1.1
// @description  Overlays accurate AniList scores on top of anime posters on AniChart.net using the AniList API.
// @author       WebDev Pro
// @match        https://anichart.net/*
// @grant        GM_xmlhttpRequest
// @connect      graphql.anilist.co
// ==/UserScript==

(function() {
    'use strict';

    // CSS for the elegant overlay badge
    const style = document.createElement('style');
    style.innerHTML = `
        .anilist-score-badge {
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(31, 38, 49, 0.85);
            color: #edf1f5;
            padding: 4px 8px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 13px;
            backdrop-filter: blur(4px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 5;
            pointer-events: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            transition: opacity 0.3s ease;
        }
        .media-card:hover .anilist-score-badge {
            opacity: 0.2; /* Fade out slightly on hover to not block the site's own overlay */
        }
    `;
    document.head.appendChild(style);

    const scoreCache = new Map();

    // GraphQL query to fetch multiple scores at once for efficiency
    const query = `
    query ($ids: [Int]) {
      Page {
        media(id_in: $ids) {
          id
          averageScore
        }
      }
    }`;

    async function fetchScores(ids) {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: "https://graphql.anilist.co",
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({ query, variables: { ids } }),
                onload: (response) => {
                    const data = JSON.parse(response.responseText);
                    if (data.data && data.data.Page.media) {
                        data.data.Page.media.forEach(m => {
                            scoreCache.set(m.id, m.averageScore);
                        });
                    }
                    resolve();
                }
            });
        });
    }

    async function processCards() {
        [span_3](start_span)// Targets the media-card containers identified in the HTML[span_3](end_span)
        const cards = document.querySelectorAll('.media-card:not([data-score-processed])');
        const idsToFetch = [];
        const cardMap = [];

        cards.forEach(card => {
            [span_4](start_span)const link = card.querySelector('a.cover'); //[span_4](end_span)
            if (link) {
                const match = link.href.match(/anime\/(\ +)/);
                if (match) {
                    const id = parseInt(match[1]);
                    card.setAttribute('data-score-processed', 'true');
                    idsToFetch.push(id);
                    cardMap.push({ id, container: link });
                }
            }
        });

        if (idsToFetch.length === 0) return;

        // Fetch scores in batches to stay within AniList rate limits
        await fetchScores(idsToFetch);

        cardMap.forEach(({ id, container }) => {
            const score = scoreCache.get(id);
            if (score) {
                const badge = document.createElement('div');
                badge.className = 'anilist-score-badge';
                badge.innerText = `${score}%`;
                container.appendChild(badge);
            }
        });
    }

    // Initialize and handle dynamic loading (infinite scroll)
    processCards();
    const observer = new MutationObserver(processCards);
    observer.observe(document.body, { childList: true, subtree: true });

})();
                        
