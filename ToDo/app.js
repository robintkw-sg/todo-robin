const STORAGE_KEY = 'todo-items';
const THEME_KEY = 'theme';
const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };

let tasks = [];
let editingId = null;
let currentFilter = 'all';
let currentCategory = '';
let searchQuery = '';

function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeButton(savedTheme);
}

function updateThemeButton(theme) {
    const btn = document.getElementById('theme-toggle');
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    updateThemeButton(newTheme);
}

function loadTasks() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            tasks = [];
        } else {
            const parsed = JSON.parse(stored);
            // Validate that parsed data is an array of valid task objects
            if (!Array.isArray(parsed)) {
                console.warn('Invalid task data format');
                tasks = [];
            } else {
                tasks = parsed.filter(task =>
                    task &&
                    typeof task === 'object' &&
                    typeof task.id === 'number' &&
                    typeof task.text === 'string' &&
                    typeof task.done === 'boolean' &&
                    ['High', 'Medium', 'Low'].includes(task.priority)
                );
            }
        }
    } catch (error) {
        console.error('Failed to load tasks:', error);
        tasks = [];
    }
    renderTasks();
}

function getDaysUntilDue(dueDate) {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diff = due - today;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getUrgencyClass(dueDate) {
    if (!dueDate) return '';
    const daysLeft = getDaysUntilDue(dueDate);
    if (daysLeft < 0) return 'overdue';
    if (daysLeft === 0) return 'due-today';
    if (daysLeft <= 3) return 'due-soon';
    return 'due-later';
}

function formatDueDate(dueDate) {
    if (!dueDate) return '';
    const daysLeft = getDaysUntilDue(dueDate);
    if (daysLeft < 0) return `Overdue ${Math.abs(daysLeft)}d`;
    if (daysLeft === 0) return 'Due today';
    if (daysLeft === 1) return 'Due tomorrow';
    if (daysLeft <= 3) return `${daysLeft}d left`;
    return daysLeft + 'd';
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.error('localStorage quota exceeded');
            alert('Storage limit reached. Some tasks may not be saved.');
        } else {
            console.error('Failed to save tasks:', error);
        }
    }
}

function renderTasks() {
    const taskList = document.getElementById('task-list');
    const counterEl = document.getElementById('task-counter');
    taskList.innerHTML = '';

    const remaining = tasks.filter(t => !t.done).length;
    const total = tasks.length;
    if (total === 0) {
        counterEl.textContent = '';
    } else {
        counterEl.textContent = `${remaining} of ${total} remaining`;
    }

    const sortedTasks = [...tasks].sort((a, b) => {
        const priorityA = PRIORITY_RANK[a.priority || 'Medium'] || 1;
        const priorityB = PRIORITY_RANK[b.priority || 'Medium'] || 1;
        return priorityA - priorityB;
    });

    let filteredTasks = sortedTasks;

    if (currentFilter === 'outstanding') {
        filteredTasks = filteredTasks.filter(t => !t.done);
    } else if (currentFilter === 'completed') {
        filteredTasks = filteredTasks.filter(t => t.done);
    }

    if (currentCategory) {
        filteredTasks = filteredTasks.filter(t => t.category === currentCategory);
    }

    if (searchQuery) {
        filteredTasks = filteredTasks.filter(t => t.text.toLowerCase().includes(searchQuery));
    }

    if (filteredTasks.length === 0) {
        const emptyMsg = tasks.length === 0
            ? 'No tasks yet. Add one to get started!'
            : 'No matching tasks';
        taskList.innerHTML = `<div class="empty-state">${emptyMsg}</div>`;
        return;
    }

    filteredTasks.forEach(task => {
        const priority = task.priority || 'Medium';
        const category = task.category || '';
        const dueDate = task.dueDate || '';
        const li = document.createElement('li');
        li.className = `task-item ${task.done ? 'completed' : ''}`;
        li.dataset.taskId = task.id;

        let categoryBadgeHtml = '';
        if (category) {
            const categoryEmojis = {
                'Work': '💼',
                'Personal': '👤',
                'Shopping': '🛒',
                'Health': '💪',
                'Other': '📌'
            };
            const emoji = categoryEmojis[category] || '';
            categoryBadgeHtml = `<span class="category-badge ${category.toLowerCase()}">${emoji} ${category}</span>`;
        }

        let dueDateHtml = '';
        if (dueDate) {
            const urgencyClass = getUrgencyClass(dueDate);
            const dueDateText = formatDueDate(dueDate);
            dueDateHtml = `<span class="due-date-display ${urgencyClass}" title="${dueDate}">${dueDateText}</span>`;
        }

        let taskContent;
        if (editingId === task.id) {
            taskContent = `
                <input
                    type="checkbox"
                    class="task-checkbox"
                    ${task.done ? 'checked' : ''}
                >
                <span class="priority-badge priority-${priority.toLowerCase()}">${priority}</span>
                ${categoryBadgeHtml}
                ${dueDateHtml}
                <input
                    type="text"
                    class="edit-input"
                    value="${escapeHtml(task.text)}"
                    autofocus
                >
                <button class="delete-btn icon-btn" title="Delete task">×</button>
            `;
        } else {
            taskContent = `
                <input
                    type="checkbox"
                    class="task-checkbox"
                    ${task.done ? 'checked' : ''}
                >
                <span class="priority-badge priority-${priority.toLowerCase()}">${priority}</span>
                ${categoryBadgeHtml}
                ${dueDateHtml}
                <span class="task-text">${escapeHtml(task.text)}</span>
                <button class="delete-btn icon-btn" title="Delete task">×</button>
            `;
        }

        li.innerHTML = taskContent;
        taskList.appendChild(li);
    });

    if (editingId !== null) {
        const editInput = document.querySelector('.edit-input');
        if (editInput) {
            editInput.focus();
            editInput.select();
        }
    }
}

function addTask() {
    const input = document.getElementById('task-input');
    const priorityInput = document.getElementById('priority-input');
    const categoryInput = document.getElementById('category-input');
    const duedateInput = document.getElementById('duedate-input');
    const text = input.value.trim();

    if (!text) return;

    const priority = priorityInput.value;
    // Validate priority is one of allowed values
    if (!['High', 'Medium', 'Low'].includes(priority)) {
        console.error('Invalid priority value:', priority);
        return;
    }

    const newTask = {
        id: Date.now(),
        text: text,
        done: false,
        priority: priority,
        category: categoryInput.value || '',
        dueDate: duedateInput.value || ''
    };

    tasks.push(newTask);
    saveTasks();
    renderTasks();
    input.value = '';
    priorityInput.value = 'Medium';
    categoryInput.value = '';
    duedateInput.value = '';
    input.focus();
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.done = !task.done;
        saveTasks();
        renderTasks();
    }
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
}

function clearCompleted() {
    tasks = tasks.filter(t => !t.done);
    saveTasks();
    renderTasks();
}

function startEdit(id) {
    editingId = id;
    renderTasks();
}

function saveEdit(id) {
    const editInput = document.querySelector('.edit-input');
    if (editInput) {
        const newText = editInput.value.trim();
        const task = tasks.find(t => t.id === id);
        if (task && newText) {
            task.text = newText;
            saveTasks();
        }
    }
    editingId = null;
    renderTasks();
}

function cancelEdit() {
    editingId = null;
    renderTasks();
}

function handleEditKeydown(e, id) {
    if (e.key === 'Enter') {
        saveEdit(id);
    } else if (e.key === 'Escape') {
        cancelEdit();
    }
}

function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('outstanding');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('outstanding');
    renderTasks();
}

function setCategory(category) {
    currentCategory = category;
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    renderTasks();
}

function showHelpModal() {
    const modal = document.getElementById('help-modal');
    modal.classList.remove('hidden');
}

function hideHelpModal() {
    const modal = document.getElementById('help-modal');
    modal.classList.add('hidden');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getTaskIdFromElement(el) {
    const li = el.closest('li[data-task-id]');
    if (!li) return null;
    const id = parseInt(li.dataset.taskId, 10);
    return isNaN(id) ? null : id;
}

function handleTaskListClick(e) {
    const taskId = getTaskIdFromElement(e.target);
    if (!taskId) return;

    if (e.target.classList.contains('task-checkbox')) {
        toggleTask(taskId);
    } else if (e.target.classList.contains('delete-btn')) {
        deleteTask(taskId);
    } else if (e.target.classList.contains('task-text')) {
        if (e.type === 'dblclick') {
            startEdit(taskId);
        } else {
            toggleTask(taskId);
        }
    }
}

function handleEditInput(e) {
    if (!editingId) return;

    const taskId = getTaskIdFromElement(e.target);
    if (!taskId || taskId !== editingId) return;

    if (e.key === 'Enter') {
        saveEdit(editingId);
    } else if (e.key === 'Escape') {
        cancelEdit();
    }
}

function handleEditBlur(e) {
    if (!editingId) return;

    const taskId = getTaskIdFromElement(e.target);
    if (!taskId || taskId !== editingId) return;

    saveEdit(editingId);
}

// Event listeners
document.getElementById('add-btn').addEventListener('click', addTask);
document.getElementById('task-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
document.getElementById('help-btn').addEventListener('click', showHelpModal);
document.getElementById('modal-close').addEventListener('click', hideHelpModal);
document.getElementById('help-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('help-modal')) {
        hideHelpModal();
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('help-modal');
        if (!modal.classList.contains('hidden')) {
            hideHelpModal();
        }
    }
});
document.getElementById('clear-completed-btn').addEventListener('click', clearCompleted);
document.getElementById('search-input').addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderTasks();
});
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.getAttribute('data-filter'));
    });
});
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        setCategory(btn.getAttribute('data-category'));
    });
});

// Event delegation for task list actions
const taskList = document.getElementById('task-list');
taskList.addEventListener('click', handleTaskListClick);
taskList.addEventListener('dblclick', handleTaskListClick);
taskList.addEventListener('keydown', handleEditInput);
taskList.addEventListener('blur', handleEditBlur, true);

loadTheme();
loadTasks();
