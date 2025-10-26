// ==UserScript==
// @name         Udvash Unmesh Auto-Login
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  Autofills Registration Number and Password on Udvash Unmesh Login Page
// @author       LazyDevUserX
// @match        https://online.udvash-unmesh.com/Account/Login*
// @match        https://online.udvash-unmesh.com/Account/Password*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/LazyDevUserX/LazyUserScripts/refs/heads/main/Udvash/UV-Auto-Login.user.js
// @updateURL    https://raw.githubusercontent.com/LazyDevUserX/LazyUserScripts/refs/heads/main/Udvash/UV-Auto-Login.user.js
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // --- IMPORTANT ---
    // Replace the placeholder values below with your actual credentials.
    const REGISTRATION_NUMBER = "Your Registration Number";
    const PASSWORD = "Your Password";
    // -----------------

    const regField = document.getElementById('RegistrationNumber');
    const nextButton = document.getElementById('btnSubmit');

    if (regField && nextButton) {
        regField.value = REGISTRATION_NUMBER;
        nextButton.click();
        return;
    }
    const passwordField = document.getElementById('Password');
    const loginButton = document.querySelector('form button[type="submit"], form input[type="submit"]');
    if (passwordField && loginButton) {
        passwordField.value = PASSWORD;
        loginButton.click();
    }
})();
