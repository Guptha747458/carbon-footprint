/**
 * EcoStride — API Configuration
 *
 * In development (same-origin), API_BASE is empty so calls go to /api/...
 * In production (GitHub Pages), API_BASE points to the Render backend URL.
 *
 * To configure for production, set window.ECOSTRIDE_API_BASE before this
 * script loads, OR this script auto-detects by checking the hostname.
 */

(function () {
  // If running on GitHub Pages (or any non-localhost host), use the
  // Render backend URL. Change this to your actual Render deployment URL.
  const RENDER_BACKEND = 'https://ecostride.onrender.com';

  const isLocalhost =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '';

  // Expose a global helper for all fetch calls
  window.API_BASE = isLocalhost ? '' : RENDER_BACKEND;

  window.apiFetch = function (path, options = {}) {
    return fetch(`${window.API_BASE}${path}`, options);
  };
})();
