# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Durable design decisions

- Visual source: selected annotation-first reading workspace direction with warm ivory paper, serif editorial typography, moss green structure, and restrained burnt-orange annotation accents.
- Product promise: each lesson is a source-grounded lecture plus a persistent personal study layer. Users can highlight, draw, add text notes, pin comments, use a freeform board, bookmark, search, and practice.
- Collaboration: session data is exportable/importable as JSON, printable through a PDF-ready export, and shareable with an explicit "allow imports" permission.
- No-backend deployment: the course workspace is designed to run from GitHub Pages. Local autosave uses browser storage, while selected notes, board content, comments, and ink marks can travel through a portable hash share link or JSON package. Live multi-user sync remains intentionally outside the static build.
- KISS default: start in a focused lecture view with only essential annotation controls visible. Contents, discussion, Board & notes, and advanced drawing tools are opt-in through the single More menu so the reading surface stays calm until the learner asks for more.
- First-session source: `Notes_ATP_01_TransportEquations.pdf`, rendered as a complete 50-page reader from the opening overview through boundary conditions. The source page image is the fidelity layer; extracted page text is used for search and optional details. Page-aware annotation state is local-first and portable for GitHub Pages deployment.
