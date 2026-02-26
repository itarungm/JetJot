import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { eachDayOfInterval, format } from 'date-fns';
import { db } from '../firebase';

/* ─── helpers ─────────────────────────────────────────── */

function sprintDocRef(username, sprintId) {
  return doc(db, 'sprints', `${username}__${sprintId}`);
}

function buildBlankDays(startDate, endDate) {
  const days = eachDayOfInterval({
    start: new Date(startDate),
    end:   new Date(endDate),
  });
  return Object.fromEntries(days.map(d => [format(d, 'yyyy-MM-dd'), []]));
}

/* ─── sprint ops ───────────────────────────────────────── */

export async function getSprint(username, sprintId) {
  const snap = await getDoc(sprintDocRef(username, sprintId));
  return snap.exists() ? { id: sprintId, ...snap.data() } : null;
}

export async function createSprint(username, sprintId, name, startDate, endDate) {
  const data = {
    username,          // ← needed for querying all user's sprints
    name,
    startDate,
    endDate,
    days: buildBlankDays(startDate, endDate),
    travelLog: {},     // travel log: date → { locations: [], photo: null }
    createdAt: new Date().toISOString(),
  };
  await setDoc(sprintDocRef(username, sprintId), data);
  return { id: sprintId, ...data };
}

export async function updateSprintName(username, sprintId, name) {
  await updateDoc(sprintDocRef(username, sprintId), { name });
}

export async function deleteSprint(username, sprintId) {
  await deleteDoc(sprintDocRef(username, sprintId));
}

/** Fetch all sprints belonging to a user, newest first. */
export async function getUserSprints(username) {
  const q = query(
    collection(db, 'sprints'),
    where('username', '==', username),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => {
      const id = d.id.replace(`${username}__`, '');
      return { id, ...d.data() };
    })
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)); // newest first, client-side
}

/* ─── todo ops ─────────────────────────────────────────── */

export async function addTodo(username, sprintId, date, text, priority = 'medium', time = null) {
  const ref  = sprintDocRef(username, sprintId);
  const snap = await getDoc(ref);
  const days = snap.data().days;
  const newTodo = {
    id: uuidv4(),
    text,
    priority,
    time,
    recurring: false,
    completed: false,
    subtasks: [],
    createdAt: new Date().toISOString(),
  };
  const updatedList = [...(days[date] || []), newTodo];
  await updateDoc(ref, { [`days.${date}`]: updatedList });
  return newTodo;
}

/** Add a recurring todo to ALL days in the sprint. Returns { groupId, todosByDate } */
export async function addRecurringTodo(username, sprintId, text, priority = 'medium', time = null) {
  const ref     = sprintDocRef(username, sprintId);
  const snap    = await getDoc(ref);
  const days    = snap.data().days;
  const groupId = uuidv4(); // shared ID for all instances — used for undo
  const updates = {};
  const todosByDate = {};
  Object.keys(days).forEach(date => {
    const t = {
      id: uuidv4(),
      text, priority, time,
      recurring: true,
      recurringGroupId: groupId,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    todosByDate[date] = t;
    updates[`days.${date}`] = [...(days[date] || []), t];
  });
  await updateDoc(ref, updates);
  return { groupId, todosByDate };
}

/** Remove every instance of a recurring group from all days. */
export async function removeRecurringGroup(username, sprintId, groupId) {
  const ref  = sprintDocRef(username, sprintId);
  const snap = await getDoc(ref);
  const days = snap.data().days;
  const updates = {};
  Object.keys(days).forEach(date => {
    updates[`days.${date}`] = days[date].filter(t => t.recurringGroupId !== groupId);
  });
  await updateDoc(ref, updates);
}

export async function toggleTodo(username, sprintId, date, todoId) {
  const ref  = sprintDocRef(username, sprintId);
  const snap = await getDoc(ref);
  const todos = snap.data().days[date].map(t =>
    t.id === todoId ? { ...t, completed: !t.completed } : t
  );
  await updateDoc(ref, { [`days.${date}`]: todos });
  return todos;
}

export async function deleteTodo(username, sprintId, date, todoId) {
  const ref  = sprintDocRef(username, sprintId);
  const snap = await getDoc(ref);
  const todos = snap.data().days[date].filter(t => t.id !== todoId);
  await updateDoc(ref, { [`days.${date}`]: todos });
  return todos;
}

export async function updateTodoText(username, sprintId, date, todoId, text) {
  const ref  = sprintDocRef(username, sprintId);
  const snap = await getDoc(ref);
  const todos = snap.data().days[date].map(t =>
    t.id === todoId ? { ...t, text } : t
  );
  await updateDoc(ref, { [`days.${date}`]: todos });
  return todos;
}

/** Persist a fully reordered todo list for a single day (also used for subtask mutations). */
export async function reorderTodos(username, sprintId, date, orderedTodos) {
  const ref = sprintDocRef(username, sprintId);
  await updateDoc(ref, { [`days.${date}`]: orderedTodos });
}
