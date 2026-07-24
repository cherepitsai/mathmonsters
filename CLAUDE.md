## Stack
- Framework: Plain HTML/CSS/JavaScript (no build step, no framework)
- Runtime: Static files served to Safari on iPad (or any browser) — no Node runtime needed at run time
- Database: None
- Queue: None
- Email: None
- Testing: Plain JS unit tests (no framework) run via Node, for pure logic functions (question generation, distractor generation)
- Persistence: localStorage (single JSON blob, schemaVersion-tagged, via storage.js) for player profiles/settings/stats; manual export/import JSON backup; PWA manifest + apple-mobile-web-app-capable meta tags for iOS Add to Home Screen.

## Commands
- Dev: open index.html directly in a browser, or `npx serve .` for a local dev server
- Tests: `node tests/run.js` (or equivalent simple test runner — no test framework dependency required)
- Typecheck: none (plain JS, no TypeScript)
- Lint: none configured
- DB migrate: n/a (no database)

## Folder structure
- App: `index.html`, `style.css`, `script.js`, `game-logic.js`, `profiles.js`, `storage.js`, `navigation.js`, `monster.js`, `manifest.webmanifest`, `icon-180.png`, `icon-512.png`, `icon-source.svg`
- Tests: `tests/` (plain JS test files, e.g. `tests/question-generation.test.js`)

## Architecture rules
- No backend, no server, no API calls. This is a pure client-side, single-page game.
- localStorage is used to persist player profiles, their per-operation/number settings, and per-fact attempt/correct stats (see profiles.js / storage.js) — nothing else needs persistence. All reads/writes go through storage.js's try/catch wrappers; if localStorage is unavailable the app degrades to an in-memory-only session with a warning banner. No other persistence mechanism (cookies, IndexedDB, server-side storage) should be introduced.
- Keep game logic (question/answer generation, path/position state) separate from DOM rendering code where practical, so logic can be unit tested without a browser/DOM.
- Character and path visuals are intentionally minimal placeholders (red circle, plain grid) — do not add art, animations, or configurability beyond what's requested.

## Don't do
- Don't introduce a frontend framework (React, Vue, etc.), bundler, or build step — plain HTML/CSS/JS only, since this is a small single-screen game.
- Don't add a backend, database, or network requests.
- Don't add any persistence mechanism beyond the single localStorage blob used for profiles/settings/stats (no cookies, no IndexedDB, no server calls), and don't bypass storage.js's try/catch wrapper when reading or writing it.
- Don't over-engineer the character or path rendering beyond the current placeholder (red circle, horizontal cell grid).

## Multi-tenant
- No

## Timezone
- N/A (no server, no timestamps stored)
