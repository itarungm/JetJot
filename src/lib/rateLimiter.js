/**
 * Client-side rate limiter using localStorage.
 * Two layers:
 *  - Per-username: max 5 attempts per 15 minutes
 *  - Global (browser): max 15 attempts per 10 minutes
 */

const PER_USER_MAX      = 5;
const PER_USER_WINDOW   = 15 * 60 * 1000; // 15 min

const GLOBAL_MAX        = 15;
const GLOBAL_WINDOW     = 10 * 60 * 1000; // 10 min

const GLOBAL_KEY        = 'jetjot_rl_global';

function userKey(username) {
  return `jetjot_rl_${username}`;
}

function getRecord(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setRecord(key, record) {
  localStorage.setItem(key, JSON.stringify(record));
}

function checkAndIncrement(key, max, windowMs) {
  const now = Date.now();
  let rec = getRecord(key);

  if (!rec || now - rec.windowStart >= windowMs) {
    // Start fresh window
    rec = { attempts: 0, windowStart: now };
  }

  if (rec.attempts >= max) {
    const remaining = Math.ceil((rec.windowStart + windowMs - now) / 60000);
    throw new Error(
      `Too many attempts. Please wait ${remaining} minute${remaining !== 1 ? 's' : ''} before trying again.`
    );
  }

  rec.attempts += 1;
  setRecord(key, rec);
}

/** Call this BEFORE every login attempt. Throws if rate limit exceeded. */
export function checkRateLimit(username) {
  // Global check first
  checkAndIncrement(GLOBAL_KEY, GLOBAL_MAX, GLOBAL_WINDOW);
  // Per-user check
  checkAndIncrement(userKey(username), PER_USER_MAX, PER_USER_WINDOW);
}

/** Call this on SUCCESSFUL login to reset per-user counter. */
export function resetRateLimit(username) {
  localStorage.removeItem(userKey(username));
}

/** Returns { attempts, remaining, resetsAt } for a username — for display purposes. */
export function getRateLimitStatus(username) {
  const now = Date.now();
  const rec = getRecord(userKey(username));
  if (!rec || now - rec.windowStart >= PER_USER_WINDOW) {
    return { attempts: 0, remaining: PER_USER_MAX, resetsAt: null };
  }
  return {
    attempts:  rec.attempts,
    remaining: Math.max(0, PER_USER_MAX - rec.attempts),
    resetsAt:  new Date(rec.windowStart + PER_USER_WINDOW),
  };
}
