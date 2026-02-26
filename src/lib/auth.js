import { doc, getDoc, setDoc } from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import { db } from '../firebase';
import { checkRateLimit, resetRateLimit } from './rateLimiter';

/** Rejects after `ms` milliseconds — used to detect hung Firebase calls */
function withTimeout(promise, ms = 10000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(
        'Cannot reach the database. Please check your Firebase setup in the .env file and make sure Firestore is enabled.'
      ));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Login if user exists (verify password) or create new user.
 * Returns { username, isNew }
 * Throws on wrong password, rate limit exceeded, or Firebase error.
 */
export async function loginOrCreate(username, password) {
  const key = username.trim().toLowerCase();

  // ── Rate limit check (throws immediately if exceeded) ──
  checkRateLimit(key);

  const userRef = doc(db, 'users', key);

  let snap;
  try {
    snap = await withTimeout(getDoc(userRef));
  } catch (err) {
    if (
      err.message.includes('offline') ||
      err.message.includes('client is offline') ||
      err.message.includes('UNAVAILABLE') ||
      err.message.includes('Cannot reach')
    ) {
      throw new Error(
        'Firebase is offline or not configured. Fill in your real credentials in the .env file and restart the dev server.'
      );
    }
    throw err;
  }

  if (snap.exists()) {
    // ── Existing user: verify password ──
    const { passwordHash, isAdmin = false, disabled = false } = snap.data();
    if (disabled) throw new Error('Your account has been disabled. Please contact the administrator.');
    const valid = await bcrypt.compare(password, passwordHash);
    if (!valid) {
      throw new Error(
        'This username is already taken and the password is incorrect. ' +
        'If this is your account, check your password and try again.'
      );
    }
    resetRateLimit(key);
    return { username: key, isNew: false, isAdmin };
  }

  // ── New user: create account ──
  const passwordHash = await bcrypt.hash(password, 8);
  await withTimeout(setDoc(userRef, {
    passwordHash,
    isAdmin: false,
    disabled: false,
    createdAt: new Date().toISOString(),
  }));
  resetRateLimit(key);
  return { username: key, isNew: true, isAdmin: false };
}
