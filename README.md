# VendorLink Website

Marketing site, careers page and (optional) admin dashboard for VendorLink.

## Hosting on GitHub Pages (current)

The site runs as plain static files, with no build step.

1. Push to `main`.
2. In the repo on GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**, then pick `main` and `/ (root)`.
3. The site is published at `https://<user>.github.io/vendor-link/`.

In this mode (`apiBase: null` in [js/config.js](js/config.js)):

- **Job openings** come from [data/careers.json](data/careers.json). Edit that file to add, change or remove positions.
- **Partner inquiries and job applications** open the visitor's email app addressed to `contactEmail`. Applicants share a link to their resume instead of uploading a file.
- To receive submissions without relying on the visitor's email app, create a form at a service such as [Formspree](https://formspree.io) and put its URL in `formEndpoint`.
- **admin.html** shows a notice instead of the dashboard, because there is no server.

All links are relative, so the site also works on a custom domain without changes.

## Running the full backend (later)

The [server/](server/) folder is an Express + SQLite app. It stores applications and inquiries, accepts file uploads, sends email alerts, and powers `admin.html`. It needs a host that runs Node.js; GitHub Pages can't run it.

```bash
cd server
npm install
npm start          # http://localhost:3000
```

Then set `apiBase: ''` in [js/config.js](js/config.js). On first run the server fills its job list from `data/careers.json`; after that, manage openings from the admin dashboard.

> ⚠️ The admin dashboard and `/api/admin/*` routes have no login yet. Add authentication before exposing the server publicly.
