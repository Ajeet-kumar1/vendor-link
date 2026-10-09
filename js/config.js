/**
 * VendorLink — Site configuration
 *
 * GitHub Pages (static hosting, current setup):
 *   apiBase: null
 *   Job openings are read from data/careers.json. Forms are sent to `formEndpoint`
 *   if one is set, otherwise the visitor's email app opens addressed to `contactEmail`.
 *
 * Node backend (server/ folder deployed on a host that runs Node.js):
 *   apiBase: ''  (same origin) or 'https://api.your-domain.com'
 *   Jobs, applications and inquiries go through the API and show up in admin.html.
 */
window.VENDORLINK_CONFIG = {
    apiBase: null,

    // Optional hosted form service for static hosting, e.g. 'https://formspree.io/f/xxxxxxx'
    formEndpoint: '',

    // Receives form submissions when no backend or form service is configured
    contactEmail: 'admin@vendorlink.kr'
};
