# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

Open `index.html` in a browser:
- Double-click `index.html` to launch in default browser
- Or use `Start-Process "path\to\index.html"` in PowerShell
- The app runs entirely in the browser with no build step or server needed

## Project Structure

**Plain HTML/CSS/JavaScript** — no frameworks, no build tool, no dependencies.

- **`index.html`** — Page structure. Contains the task input row, priority dropdown, filter tabs, search input, and task list container.
- **`style.css`** — Styling and theming. CSS custom properties (variables) for light/dark mode colors. All layout is flexbox-based for responsive design.
- **`app.js`** — Application logic. Task CRUD, filtering, searching, editing, localStorage persistence, and theme management.
- **`specs.md`** — Feature specification and technical overview.

## Architecture

**State management**: Simple module-level variables in `app.js`:
- `tasks[]` — array of task objects `{id, text, done, priority}`
- `editingId` — ID of task currently being edited inline (null if none)
- `currentFilter` — "all" | "outstanding" | "completed"
- `searchQuery` — current search keyword

**Rendering**: `renderTasks()` is the single source of truth for UI updates. It:
1. Sorts by priority (High → Medium → Low)
2. Filters by `currentFilter` (all/outstanding/completed)
3. Filters by `searchQuery` (substring match, case-insensitive)
4. Renders the filtered/sorted list, or empty state if no matches
5. Updates task counter from the full (unfiltered) `tasks[]` array

**Persistence**: `saveTasks()` writes tasks to localStorage under key `'todo-items'`. `loadTasks()` reads from localStorage on app load. No backend API.

**Theming**: CSS custom properties defined on `:root` (light mode) and overridden under `[data-theme="dark"]`. `loadTheme()` reads user's theme choice from localStorage key `'theme'` on load.

## Key Implementation Patterns

- **Inline editing**: Double-click task text → `startEdit()` sets `editingId` → `renderTasks()` swaps `<span>` for `<input>` with autofocus → blur or Enter/Escape key triggers `saveEdit()`/`cancelEdit()`
- **Filtering + Search combined**: Both happen in `renderTasks()` as separate filter passes. Search is always case-insensitive, applied after status filter.
- **Icons + Tooltips**: Most buttons use Unicode/emoji icons (✓, ×, +, 📋, ◉) with `title` attribute for hover tooltips instead of text labels.

## Data Model Notes

- Task `id` is a `Date.now()` timestamp (unique enough for client-side)
- Missing `priority` field on older tasks defaults to `'Medium'` during render (backward compatible)
- `done` is a boolean; no deletion timestamp or soft-delete logic

## Testing the App

Manual testing checklist:
- **Add**: Type text, pick priority, click + button. Confirm counter updates, list re-sorts by priority.
- **Complete**: Click checkbox or task text. Confirm task grays out, counter updates.
- **Edit**: Double-click task text. Type new text, press Enter. Confirm saves and persists after reload.
- **Delete**: Click × icon. Confirm removed from list and localStorage.
- **Clear Completed**: Mark tasks done, click ✓ button. Confirm all completed tasks removed.
- **Filter**: Click filter tabs (📋 All, ◉ Outstanding, ✓ Done). Confirm list updates. Counter still shows all tasks.
- **Search**: Type in search box. Confirm list filters by keyword, works with active filter.
- **Dark Mode**: Click 🌙/☀️ toggle. Confirm all colors invert. Reload page. Confirm theme persists.
- **Persistence**: Add tasks, reload page. Confirm tasks still there. Close and reopen browser. Confirm data survives.
