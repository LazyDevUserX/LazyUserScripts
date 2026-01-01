
// ==UserScript==
// @name         Circle FTP Playlist Maker (Lite)
// @namespace    http://tampermonkey.net/
// @version      1.00
// @description  Lightweight version for low-end systems. Generates XSPF playlist with optional season filtering for CircleFTP
// @author       LazyDevUserX
// @match        http://15.1.1.50/*
// @match        http://new.circleftp.net/*
// @downloadURL  https://raw.githubusercontent.com/LazyDevUserX/CircleFTP-Playlist-Maker-Lite/main/userscript/circle-ftp-playlist-maker-lite.user.js
// @updateURL    https://raw.githubusercontent.com/LazyDevUserX/CircleFTP-Playlist-Maker-Lite/main/userscript/circle-ftp-playlist-maker-lite.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        ext: ['.mp4', '.mkv', '.avi', '.mov', '.webm'],
        max: 1000,
        len: 200,
        sel: {
            1: '/html/body/div[1]/main/div[2]/section/div/div[1]',
            2: '/html/body/div[1]/main/div[2]/section/div/div[2]',
            3: '/html/body/div[1]/main/div[2]/section/div/div[3]',
            4: '/html/body/div[1]/main/div[2]/section/div/div[4]',
            5: '/html/body/div[1]/main/div[2]/section/div/div[5]',
            6: '/html/body/div[1]/main/div[2]/section/div/div[6]',
            7: '/html/body/div[1]/main/div[2]/section/div/div[7]',
            8: '/html/body/div[1]/main/div[2]/section/div/div[8]',
        }
    };

    let ui = null;

    function getSeasons() {
        const s = [];
        for (const n in CONFIG.sel) {
            try {
                if (document.evaluate(CONFIG.sel[n], document, null, 9, null).singleNodeValue) {
                    s.push(n);
                }
            } catch(e) {}
        }
        return s;
    }

    function hasMedia() {
        const a = document.getElementsByTagName('a');
        for (let i = 0; i < Math.min(a.length, 50); i++) {
            const h = a[i].href;
            if (h && CONFIG.ext.some(e => h.toLowerCase().includes(e))) return true;
        }
        return false;
    }

    function buildUI() {
        if (ui) { ui.remove(); ui = null; }
        if (!hasMedia()) return;

        ui = document.createElement('div');
        ui.style.cssText = 'position:fixed;bottom:10px;right:10px;z-index:9999;background:#fff;border:1px solid #000;padding:5px;font:12px sans-serif;';

        const b = document.createElement('button');
        b.textContent = 'Download';
        b.style.cssText = 'margin-right:5px;padding:2px 4px;font:12px sans-serif;';

        const s = document.createElement('select');
        s.style.cssText = 'font:12px sans-serif;padding:1px;';

        const a = document.createElement('option');
        a.value = 'all'; a.textContent = 'All Seasons';
        s.appendChild(a);

        getSeasons().forEach(n => {
            const o = document.createElement('option');
            o.value = n; o.textContent = 'Season '+n;
            s.appendChild(o);
        });

        ui.appendChild(b); ui.appendChild(s);
        document.body.appendChild(ui);

        b.onclick = () => download(s.value);
    }

    function getTitle() {
        // Try multiple XPath expressions for title
        const xpaths = [
            "/html/body/div/main/div[1]/div",
            "/html/body/div[1]/main/div[1]/div",
            "//h1",
            "//title"
        ];

        for (const xpath of xpaths) {
            try {
                const result = document.evaluate(xpath, document, null, 9, null);
                if (result.singleNodeValue && result.singleNodeValue.textContent.trim()) {
                    let title = result.singleNodeValue.textContent.trim();
                    return title.replace(/[\\/:*?"<>|]/g, '').substring(0, CONFIG.len);
                }
            } catch(e) {}
        }

        // Fallback to querySelector
        for (const sel of ['h1', '.title', '.page-title', 'title']) {
            const el = document.querySelector(sel);
            if (el && el.textContent.trim()) {
                return el.textContent.trim().replace(/[\\/:*?"<>|]/g, '').substring(0, CONFIG.len);
            }
        }

        return 'CircleFTP_Playlist';
    }

    function collect(season = 'all') {
        const links = new Set();
        let area = document;

        if (season !== 'all') {
            try {
                const el = document.evaluate(CONFIG.sel[season], document, null, 9, null).singleNodeValue;
                if (el) area = el;
            } catch(e) {}
        }

        const a = area.querySelectorAll('a[href]');
        for (let i = 0; i < a.length && links.size < CONFIG.max; i++) {
            const h = a[i].href;
            if (h && CONFIG.ext.some(e => h.toLowerCase().includes(e))) {
                links.add(h);
            }
        }
        return Array.from(links);
    }

    function escape(str) {
        return str.replace(/[<>&'"]/g, c =>
            ({'<':'<','>':'>','&':'&amp;','\'':'&apos;','"':'&quot;'})[c]);
    }

    function xspf(links, title) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<playlist version="1" xmlns="http://xspf.org/ns/0/">\n';
        xml += `<title>${escape(title)}</title>\n<trackList>\n`;
        links.forEach(l => {
            xml += `<track>\n<location>${escape(l)}</location>\n</track>\n`;
        });
        xml += '</trackList>\n</playlist>';
        return xml;
    }

    function download(season) {
        const links = collect(season);
        if (!links.length) return alert('No media found');

        const title = getTitle();
        const label = season === 'all' ? 'All Seasons' : `Season ${season}`;
        const xml = xspf(links, `${title} - ${label}`);

        const blob = new Blob([xml], {type: 'application/xspf+xml'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title} - ${label}.xspf`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Page change detection only
    let last = location.href;
    const check = () => {
        if (location.href !== last) {
            last = location.href;
            setTimeout(buildUI, 500);
        }
    };

    setInterval(check, 500);
    setTimeout(buildUI, 1000);
})();
