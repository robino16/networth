# Future Plans

## Phase 1 — Client-side web app

The current architecture requires running a local Python backend, which limits who can use the app. The goal is to rewrite it as a fully client-side web app that anyone can open in a browser with no setup.

- Port all business logic (account management, snapshot calculations, summary/growth metrics) from Python to TypeScript
- Replace SQLite with **IndexedDB** for in-browser persistent storage
- Deploy as a static site (Vercel, Cloudflare Pages, or as a subpath on my portfolio website)
- No backend, no server, no data collection — fully private by default

## Phase 2 — Data export and backup

Users should be able to get their data out easily.

- **Export to JSON** — full snapshot of all accounts, snapshots, and assets
- **Import from JSON** — restore a previous export or migrate between devices
- Export should be human-readable and versioned so it stays useful long-term

## Phase 3 — Cloud backup (optional, opt-in)

For users who want to access the same data across devices, an optional cloud sync layer could be added.

- Sign in with Google (or another OAuth2 provider) — no separate account to create
- Data stored encrypted in a managed database (e.g. Supabase or Cloudflare D1)
- Strictly opt-in — the app works fully offline without it
- User owns their data and can export/delete it at any time
- Would require a privacy policy and GDPR compliance if opened to the public

## Other ideas

- **PWA support** — make the site installable on Android/iOS home screen for an app-like feel, without building a native app
- **Multi-currency support** — convert non-NOK accounts to a base currency for summary calculations
- **Shared access** — allow a partner to view/edit the same data (relevant for shared assets like real estate)
