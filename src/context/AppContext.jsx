import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import {
  getSprint, createSprint, addTodo, toggleTodo,
  deleteTodo, updateSprintName, updateTodoText,
  deleteSprint as deleteSprintFn,
  addRecurringTodo as addRecurringTodoFn,
  removeRecurringGroup as removeRecurringGroupFn,
  reorderTodos as reorderTodosFn,
} from '../lib/todos';
import {
  addLocation    as addLocationFn,
  removeLocation as removeLocationFn,
  setDayPhoto    as setDayPhotoFn,
} from '../lib/travelLog';
import { fetchSprintWeather } from '../lib/weather';

const AppContext = createContext(null);

const SESSION_KEY = 'jetjot_user';
const THEME_KEY  = 'jetjot_theme';

function applyTheme(dark) {
  if (dark) document.documentElement.classList.add('dark');
  else       document.documentElement.classList.remove('dark');
}

function generateSprintId(startDate, endDate) {
  return `${format(new Date(startDate), 'yyyyMMdd')}_${format(new Date(endDate), 'yyyyMMdd')}`;
}

export function AppProvider({ children }) {
  const [user, setUser]           = useState(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch { return null; }
  });
  const [sprint, setSprint]       = useState(null);
  const [weather, setWeather]     = useState({}); // date → { emoji, max, min }
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  // undo toast: null | { groupId, dayCount }
  const [undoToast, setUndoToast] = useState(null);
  const undoTimerRef              = useRef(null);
  const [darkMode, setDarkMode]   = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply theme on mount + change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { applyTheme(darkMode); }, [darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      applyTheme(next);
      return next;
    });
  }, []);

  /* ── auth ─────────────────────────────────────────── */
  const login = useCallback((username, isAdmin = false) => {
    const u = { username, isAdmin };
    setUser(u);
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setSprint(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  /* ── sprint ───────────────────────────────────────── */
  const loadOrCreateSprint = useCallback(async (startDate, endDate, name) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const sprintId = generateSprintId(startDate, endDate);
      let s = await getSprint(user.username, sprintId);
      if (!s) {
        s = await createSprint(user.username, sprintId, name, startDate, endDate);
      }
      setSprint(s);
      // Fetch weather in background — don't block
      fetchSprintWeather(s.startDate, s.endDate)
        .then(setWeather)
        .catch(() => {});
      return s;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const renameSprint = useCallback(async (name) => {
    if (!sprint || !user) return;
    setSprint(prev => ({ ...prev, name }));
    await updateSprintName(user.username, sprint.id, name);
  }, [sprint, user]);

  /* ── todos ────────────────────────────────────────── */
  const handleAddTodo = useCallback(async (date, text, priority, time) => {
    if (!sprint || !user) return;
    const newTodo = await addTodo(user.username, sprint.id, date, text, priority, time);
    setSprint(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [date]: [...(prev.days[date] || []), newTodo],
      },
    }));
  }, [sprint, user]);

  const handleAddRecurringTodo = useCallback(async (date, text, priority, time) => {
    if (!sprint || !user) return;
    const { groupId, todosByDate } = await addRecurringTodoFn(user.username, sprint.id, text, priority, time);
    setSprint(prev => {
      const newDays = { ...prev.days };
      Object.keys(todosByDate).forEach(d => {
        newDays[d] = [...(newDays[d] || []), todosByDate[d]];
      });
      return { ...prev, days: newDays };
    });
    // Show undo toast for 6 seconds
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoToast({ groupId, dayCount: Object.keys(todosByDate).length });
    undoTimerRef.current = setTimeout(() => setUndoToast(null), 6000);
  }, [sprint, user]);

  const handleUndoRecurring = useCallback(async () => {
    if (!undoToast || !sprint || !user) return;
    const { groupId } = undoToast;
    setUndoToast(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    // Remove from local state immediately
    setSprint(prev => {
      const newDays = {};
      Object.keys(prev.days).forEach(date => {
        newDays[date] = prev.days[date].filter(t => t.recurringGroupId !== groupId);
      });
      return { ...prev, days: newDays };
    });
    await removeRecurringGroupFn(user.username, sprint.id, groupId);
  }, [undoToast, sprint, user]);

  const handleToggleTodo = useCallback(async (date, todoId) => {
    if (!sprint || !user) return;
    // Optimistic update
    setSprint(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [date]: prev.days[date].map(t =>
          t.id === todoId ? { ...t, completed: !t.completed } : t
        ),
      },
    }));
    try {
      await toggleTodo(user.username, sprint.id, date, todoId);
    } catch {
      // revert on error by refetching — simple approach
    }
  }, [sprint, user]);

  const handleDeleteTodo = useCallback(async (date, todoId) => {
    if (!sprint || !user) return;
    setSprint(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [date]: prev.days[date].filter(t => t.id !== todoId),
      },
    }));
    await deleteTodo(user.username, sprint.id, date, todoId);
  }, [sprint, user]);

  const handleEditTodo = useCallback(async (date, todoId, text) => {
    if (!sprint || !user) return;
    setSprint(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [date]: prev.days[date].map(t =>
          t.id === todoId ? { ...t, text } : t
        ),
      },
    }));
    await updateTodoText(user.username, sprint.id, date, todoId, text);
  }, [sprint, user]);

  const handleDeleteSprint = useCallback(async (sprintId) => {
    if (!user) return;
    await deleteSprintFn(user.username, sprintId);
  }, [user]);

  const handleReorderTodos = useCallback(async (date, orderedTodos) => {
    if (!sprint || !user) return;
    // Optimistic: update local state immediately
    setSprint(prev => ({
      ...prev,
      days: { ...prev.days, [date]: orderedTodos },
    }));
    await reorderTodosFn(user.username, sprint.id, date, orderedTodos);
  }, [sprint, user]);

  /* ── subtasks ─────────────────────────────────────── */
  // Subtasks are stored as todo.subtasks = [{ id, text, completed }]
  // We mutate the todos array for the day and call reorderTodos (reuses the same Firestore write).

  const handleAddSubtask = useCallback(async (date, todoId, text) => {
    if (!sprint || !user) return;
    const { v4: uuidv4 } = await import('uuid');
    setSprint(prev => {
      const days = prev.days;
      const todos = (days[date] || []).map(t => {
        if (t.id !== todoId) return t;
        return { ...t, subtasks: [...(t.subtasks || []), { id: uuidv4(), text, completed: false }] };
      });
      reorderTodosFn(user.username, prev.id, date, todos).catch(() => {});
      return { ...prev, days: { ...days, [date]: todos } };
    });
  }, [sprint, user]);

  const handleToggleSubtask = useCallback(async (date, todoId, subtaskId) => {
    if (!sprint || !user) return;
    setSprint(prev => {
      const days = prev.days;
      const todos = (days[date] || []).map(t => {
        if (t.id !== todoId) return t;
        return {
          ...t,
          subtasks: (t.subtasks || []).map(s =>
            s.id === subtaskId ? { ...s, completed: !s.completed } : s
          ),
        };
      });
      reorderTodosFn(user.username, prev.id, date, todos).catch(() => {});
      return { ...prev, days: { ...days, [date]: todos } };
    });
  }, [sprint, user]);

  const handleDeleteSubtask = useCallback(async (date, todoId, subtaskId) => {
    if (!sprint || !user) return;
    setSprint(prev => {
      const days = prev.days;
      const todos = (days[date] || []).map(t => {
        if (t.id !== todoId) return t;
        return { ...t, subtasks: (t.subtasks || []).filter(s => s.id !== subtaskId) };
      });
      reorderTodosFn(user.username, prev.id, date, todos).catch(() => {});
      return { ...prev, days: { ...days, [date]: todos } };
    });
  }, [sprint, user]);

  const handleReorderSubtasks = useCallback(async (date, todoId, orderedSubtasks) => {
    if (!sprint || !user) return;
    setSprint(prev => {
      const days = prev.days;
      const todos = (days[date] || []).map(t => {
        if (t.id !== todoId) return t;
        return { ...t, subtasks: orderedSubtasks };
      });
      reorderTodosFn(user.username, prev.id, date, todos).catch(() => {});
      return { ...prev, days: { ...days, [date]: todos } };
    });
  }, [sprint, user]);

  /* ── browser notifications ────────────────────────── */
  // Schedule a browser notification for a todo at its set time on
  // the matching date. Clears previous timers on sprint change.
  const notifTimers = useRef([]);

  const scheduleNotifications = useCallback((sprintData) => {
    // Clear old timers
    notifTimers.current.forEach(clearTimeout);
    notifTimers.current = [];
    if (Notification?.permission !== 'granted') return;
    const now = Date.now();
    Object.entries(sprintData.days || {}).forEach(([date, todos]) => {
      (todos || []).forEach(todo => {
        if (!todo.time || todo.completed) return;
        const [h, m] = todo.time.split(':').map(Number);
        const fireAt = new Date(`${date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`).getTime();
        const delay = fireAt - now;
        if (delay < 0) return; // past
        const id = setTimeout(() => {
          new Notification('JetJot reminder ⚡', {
            body: todo.text,
            icon: '/icon.svg',
          });
        }, delay);
        notifTimers.current.push(id);
      });
    });
  }, []);

  const requestNotifications = useCallback(async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === 'granted' && sprint) scheduleNotifications(sprint);
  }, [sprint, scheduleNotifications]);

  // Re-schedule whenever sprint changes
  useEffect(() => {
    if (sprint) scheduleNotifications(sprint);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprint?.id]);

  /* ── travel log ───────────────────────────────────── */
  const handleAddLocation = useCallback(async (date, lat, lng, name) => {
    if (!sprint || !user) return;
    const updatedLog = await addLocationFn(user.username, sprint.id, date, lat, lng, name);
    setSprint(prev => ({ ...prev, travelLog: updatedLog }));
  }, [sprint, user]);

  const handleRemoveLocation = useCallback(async (date, locationId) => {
    if (!sprint || !user) return;
    const updatedLog = await removeLocationFn(user.username, sprint.id, date, locationId);
    setSprint(prev => ({ ...prev, travelLog: updatedLog }));
  }, [sprint, user]);

  const handleSetDayPhoto = useCallback(async (date, base64OrNull) => {
    if (!sprint || !user) return;
    const updatedLog = await setDayPhotoFn(user.username, sprint.id, date, base64OrNull);
    setSprint(prev => ({ ...prev, travelLog: updatedLog }));
  }, [sprint, user]);

  const value = { 
    user, login, logout,
    sprint, setSprint, loadOrCreateSprint, renameSprint,
    loading, error,
    darkMode, toggleDarkMode,
    undoToast, undoRecurring: handleUndoRecurring, dismissUndoToast: () => setUndoToast(null),
    addTodo:          handleAddTodo,
    addRecurringTodo: handleAddRecurringTodo,
    toggleTodo:       handleToggleTodo,
    deleteTodo:       handleDeleteTodo,
    editTodo:         handleEditTodo,
    deleteSprint:     handleDeleteSprint,
    reorderTodos:     handleReorderTodos,
    // subtasks
    addSubtask:       handleAddSubtask,
    toggleSubtask:    handleToggleSubtask,
    deleteSubtask:    handleDeleteSubtask,
    reorderSubtasks:  handleReorderSubtasks,
    // weather
    weather,
    // notifications
    requestNotifications,
    // travel log
    addLocation:    handleAddLocation,
    removeLocation: handleRemoveLocation,
    setDayPhoto:    handleSetDayPhoto,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
