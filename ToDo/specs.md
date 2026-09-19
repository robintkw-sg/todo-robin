# To-Do App Specifications

## Overview
A simple, lightweight to-do application that runs in the browser with persistent local storage, priority management, dark mode, and filtering capabilities.

## Core Features

### Task Management
- **Add tasks**: Text input with optional priority selection (High, Medium, Low)
- **Complete tasks**: Click checkbox or task text to toggle completion status
- **Delete tasks**: Click the × icon on any task
- **Edit tasks**: Double-click task text to edit inline; press Enter to save, Escape to cancel
- **Persistent storage**: All tasks saved to browser localStorage, persist across sessions

### Display & Organization
- **Task counter**: Shows "X of Y remaining" above the list (counts only incomplete tasks)
- **Priority sorting**: Tasks automatically sorted by priority (High → Medium → Low)
- **Priority badges**: Color-coded badges (red for High, yellow for Medium, green for Low)

### Filtering & Search
- **Filter tabs**: Three buttons to view All tasks, Outstanding (incomplete) tasks, or Completed tasks
- **Search**: Real-time keyword search filters tasks by task text
- **Combined filtering**: Search and filter tabs work together

### Utilities
- **Clear Completed**: Button to remove all completed tasks at once
- **Dark mode**: Toggle between light and dark themes; preference saved to localStorage

## Technical Details

### Technology Stack
- Plain HTML5 / CSS3 / JavaScript (no frameworks)
- localStorage API for data persistence
- CSS custom properties (variables) for theming

### Data Structure
Each task is stored as an object:
```
{
  id: timestamp,
  text: string,
  done: boolean,
  priority: "High" | "Medium" | "Low"
}
```

### Files
- `index.html` — page structure
- `style.css` — styling and theme variables
- `app.js` — task logic, filtering, event handlers
- `specs.md` — this file

## UI/UX
- Centered card layout (max 500px width)
- Responsive design works on mobile
- Icons used for compact buttons (+ for add, × for delete, ✓ for clear/done, etc.)
- Tooltips on icon buttons for clarity
- Smooth transitions and hover states
- Theme toggle button (☀️/🌙) in header
