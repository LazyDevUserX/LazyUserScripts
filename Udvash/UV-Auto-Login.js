// ==UserScript==
// @name         Udvash Unmesh Auto-Login
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Autofills Reg and Pass on Udvash Unmesh ASAP
// @author       LazyDevUserX
// @match        https://online.udvash-unmesh.com/Account/Login*
// @match        https://online.udvash-unmesh.com/Account/Password*
// @grant        none
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
