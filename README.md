# Hustle Connect

Find the right skills for your next big idea, or help someone else bring theirs to life.

## Run it on your computer
Needs Node 18+ (no packages to install).

    node server/server.js

Open http://localhost:3000. Accounts, listings and messages are saved in `server/data/db.json`.

## Files
- `index.html`, `explore.html`, `about.html`, `services.html` : the pages (the last three are slideshows)
- `style.css`, `script.js` (shared), `pages.js` (page features), `assets/` : styles, scripts, pictures
- `server/server.js` : the backend (signup/login, service listings, contact form)

## Publishing
- Website only (free): GitHub Pages. Without a backend, the site runs in demo mode (data stays in each visitor's browser).
- Full site with backend: deploy to a Node host (e.g. Render) and set `SECRET` and `ALLOWED_ORIGIN` environment variables.
