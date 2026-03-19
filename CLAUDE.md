# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (Vite + HMR) on port 3000
pnpm build        # Build client (Vite) + server (esbuild) → dist/
pnpm check        # TypeScript type-check (no emit)
pnpm start        # Run production server from dist/
pnpm format       # Prettier
```

There are no tests to run (vitest is installed but no test files exist yet).

## Architecture

This is a **fully client-side SQLite editor**. The Express server (`server/index.ts`) only serves static files — all database logic runs in the browser via **sql.js (SQLite compiled to WebAssembly)**.

### Data flow

```
File System Access API / <input type="file">
        ↓
sqliteEngine.ts          ← single source of truth for all DB ops
        ↓
hooks (useDatabase, useVirtualTable, useSqlQuery)
        ↓
pages/Home.tsx           ← orchestrates all state
        ↓
components (DataTable, SqlEditor, ResultPanel, ...)
```

### Key files

- **`client/src/lib/sqliteEngine.ts`** — All SQLite operations. Manages a `Map<id, {db, fileName, fileHandle}>` for multi-tab support. The active DB is a module-level singleton (`activeDbId`). Auto-save writes back to the original file via `FileSystemFileHandle.createWritable()`.

- **`client/src/hooks/useDatabase.ts`** — React state wrapper for multiple open DB tabs. Opening a DB calls `sqliteEngine.openDatabase()` then reads the table list.

- **`client/src/hooks/useVirtualTable.ts`** — Loads table data (paginated, 1000 rows), handles cell updates and row deletes with optimistic UI updates and auto-save.

- **`client/src/hooks/useSqlQuery.ts`** — Executes arbitrary SQL. For SELECT queries, also runs a parallel `SELECT rowid AS "___r___", ...` to obtain rowids, enabling edit/delete on query results.

- **`client/src/components/DataTable.tsx`** — Virtualised table (`@tanstack/react-virtual`). Handles row selection (click / shift-click), keyboard shortcuts (Backspace → delete confirmation), inline cell editing (double-click), and column resizing. Used by both the Data tab and `ResultPanel`.

- **`client/src/components/SqlEditor.tsx`** — CodeMirror 6 editor. Accepts `initialValue`/`onChange` so content is owned by `Home.tsx` and survives tab switching. History popover reads/writes `localStorage`.

- **`client/src/lib/localStorage.ts`** — Persists query history (`{query, savedAt}[]`) and the last SQL editor content.

### Important patterns

**Multi-DB**: `sqliteEngine` functions always operate on `activeDbId`. Before calling engine functions, ensure the correct DB is active via `setActiveDatabase(id)` or trust that `useDatabase.switchDatabase` already did so.

**rowid tracking**: Every table query fetches `rowid` alongside data. `DataTable` receives a `rowids` prop parallel to `values`. Edit/delete operations use `rowid` (not array index) as the stable row identifier.

**Auto-save**: After any write operation, `sqliteEngine.saveDatabase()` writes back to the original file if a `FileSystemFileHandle` is available. If not (Firefox/Safari fallback), a toast prompts the user to Export manually.

**Dark mode**: Follows system `prefers-color-scheme`. An inline script in `index.html` sets the `.dark` class before React hydrates to prevent flash. Manual override is stored in `localStorage` under `theme` + `theme-manual`.

**CodeMirror setup**: `@codemirror/basic-setup` is intentionally NOT used (it causes duplicate `@codemirror/state` instances). The equivalent extensions are composed manually in `SqlEditor.tsx`.

**Tab content persistence**: The SQL editor `<TabsContent>` unmounts on tab switch (Radix default). SQL content is lifted to `Home.tsx` state and passed as `initialValue` to `SqlEditor`, which re-creates the CodeMirror instance from it on remount.
