import {
  collection, doc, getDoc, getDocs,
  updateDoc, deleteDoc, query, where,
} from 'firebase/firestore';
import { db } from '../firebase';

/** Fetch all user documents from the `users` collection. */
export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ username: d.id, ...d.data() }));
}

/**
 * Fetch all sprint docs and return a map of username → sprint count.
 * e.g. { 'tarun': 3, 'john': 1 }
 */
export async function getSprintCountsByUser() {
  const snap = await getDocs(collection(db, 'sprints'));
  const counts = {};
  snap.docs.forEach(d => {
    const u = d.data().username;
    if (u) counts[u] = (counts[u] || 0) + 1;
  });
  return counts;
}

/** Enable or disable a user account. */
export async function setUserDisabled(username, disabled) {
  await updateDoc(doc(db, 'users', username), { disabled });
}

/** Delete a user and ALL their sprints. */
export async function deleteUserAccount(username) {
  const q    = query(collection(db, 'sprints'), where('username', '==', username));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'users', username));
}

/** Read isAdmin flag for a single user. */
export async function getIsAdmin(username) {
  const snap = await getDoc(doc(db, 'users', username));
  return snap.exists() ? (snap.data().isAdmin ?? false) : false;
}
