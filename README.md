# Advanced Transport Phenomena · Lecture Studio

An annotation-first lecture workspace built from the supplied `Notes_ATP_01_TransportEquations.pdf`.

## Included

- KISS focus mode: the lecture opens cleanly with only essential annotation controls; optional panels and advanced tools appear from **More**.
- Full source-grounded reading for all 50 pages of the supplied lecture PDF, with section/subsection contents navigation, page search, references, and practice prompts.
- Highlight, pen, arrow, text-note, comment, shape, eraser, undo, and redo tools.
- Freeform derivation board and linked notes.
- Browser-local autosave with JSON package export/import.
- PDF-ready study-summary export through the browser print dialog.
- No-backend sharing through portable hash links that classmates can import.

## GitHub Pages

This is a static client-only build. Push the `lecture-studio` folder to a GitHub repository, enable **Settings → Pages → GitHub Actions**, and the included workflow publishes `dist/client` on every push to `main`.

Personal annotations remain in the browser that created them. Sharing a workspace sends the selected study data in the URL, so use a JSON package instead when the annotation set becomes large.

## Current scope

The reader displays every page of `Notes_ATP_01_TransportEquations.pdf` (50 pages) as a navigable, searchable lecture. Contents entries jump to the corresponding source page, and the active lecture page is preserved in the URL-free local session. The original page image remains the visual source of truth while the extracted text layer powers search and optional “Open searchable text” details.

Annotations are page-aware: highlight, pen, arrow, text, comment, shape, eraser, undo, and redo can be used on any source page. Board work, notes, comments, bookmarks, and annotations can be saved locally, exported/imported as JSON, selectively shared through a portable hash link, or included in the browser’s PDF-ready print export. The static export includes the complete 50-page source reader and needs no backend.

## Local preview

```bash
npm install
npm run dev
```
