# Advanced Transport Phenomena · Lecture Studio

An annotation-first lecture workspace built from the supplied `Notes_ATP_01_TransportEquations.pdf`.

## Included

- KISS focus mode: the lecture opens cleanly with only essential annotation controls; optional panels and advanced tools appear from **More**.
- Source-grounded section 2.1 lecture reading with contents, references, and practice prompts; the supplied 50-page PDF remains available as the source link.
- Highlight, pen, arrow, text-note, comment, shape, eraser, undo, and redo tools.
- Freeform derivation board and linked notes.
- Browser-local autosave with JSON package export/import.
- PDF-ready study-summary export through the browser print dialog.
- No-backend sharing through portable hash links that classmates can import.

## GitHub Pages

This is a static client-only build. Push the `lecture-studio` folder to a GitHub repository, enable **Settings → Pages → GitHub Actions**, and the included workflow publishes `dist/client` on every push to `main`.

Personal annotations remain in the browser that created them. Sharing a workspace sends the selected study data in the URL, so use a JSON package instead when the annotation set becomes large.

## Current scope

The authored interactive reader currently covers section 2.1, “Eulerian vs. Lagrangian formulations,” from the first-session PDF. The remaining source pages are linked as the original PDF but are not yet individually authored in the reader. PDF export is a print-ready study summary with the current lecture content, board, notes, comments, and ink preview; it is not yet a page-faithful annotated copy of every source page.

## Local preview

```bash
npm install
npm run dev
```
