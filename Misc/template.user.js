// ==UserScript==
// @name        uBO Redirector
// @namespace   UserScripts
// @match       *://*/*
// @grant       none
// @run-at      document-start
// ==/UserScript==

// If uBO blocks a page, it often replaces the site content with a specific 
// element or title. This script detects if the page failed to load due to 
// a block and redirects you.

if (document.title.includes("uBlock Origin - Blocked")) {
    window.location.replace("https://www.google.com");
}
