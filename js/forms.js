/**
 * VendorLink — Data & form helpers shared by the public pages
 * Works on static hosting (GitHub Pages) and with the Node backend; see js/config.js
 */

(function () {
    const config = window.VENDORLINK_CONFIG || {};

    function isStatic() {
        return config.apiBase === null || config.apiBase === undefined;
    }

    function apiUrl(path) {
        return (config.apiBase || '') + path;
    }

    // Show elements marked data-only="static" or data-only="api" for the current mode.
    // Hidden inputs are disabled so they are neither validated nor submitted.
    function applyModeVisibility(root = document) {
        const mode = isStatic() ? 'static' : 'api';
        root.querySelectorAll('[data-only]').forEach(el => {
            const show = el.dataset.only === mode;
            el.hidden = !show;
            el.querySelectorAll('input, select, textarea').forEach(input => { input.disabled = !show; });
        });
    }

    /**
     * Submit a form.
     * Returns { method: 'api' | 'endpoint' | 'email' }; throws on failure.
     */
    async function submit({ apiPath, formData, asJson = false, subject, emailLines }) {
        if (!isStatic()) {
            const res = await fetch(apiUrl(apiPath), asJson
                ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(formData)) }
                : { method: 'POST', body: formData });
            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'Submission failed');
            return { method: 'api' };
        }

        if (config.formEndpoint) {
            formData.append('_subject', subject);
            const res = await fetch(config.formEndpoint, {
                method: 'POST',
                body: formData,
                headers: { Accept: 'application/json' }
            });
            if (!res.ok) throw new Error(`Submission failed. Please email us at ${config.contactEmail}.`);
            return { method: 'endpoint' };
        }

        const mailto = `mailto:${config.contactEmail}`
            + `?subject=${encodeURIComponent(subject)}`
            + `&body=${encodeURIComponent(emailLines.join('\n'))}`;
        window.location.href = mailto;
        return { method: 'email' };
    }

    window.VendorLink = { config, isStatic, apiUrl, applyModeVisibility, submit };
})();
