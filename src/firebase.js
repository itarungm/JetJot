import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Warn in dev if placeholder creds are still in .env
if (import.meta.env.DEV) {
  const hasPlaceholders = Object.values(firebaseConfig).some(
    v => !v || v === 'placeholder' || v.includes('placeholder')
  );
  if (hasPlaceholders) {
    console.error(
      '%c⚠️ JetJot Firebase Setup Required\n' +
      'Your .env file still has placeholder values.\n' +
      '1. Go to console.firebase.google.com\n' +
      '2. Create a project → Add Web App → copy config\n' +
      '3. Paste real values into .env\n' +
      '4. Restart dev server (npm run dev)',
      'background:#fef3c7;color:#92400e;padding:8px;font-size:13px;border-radius:4px;'
    );
  }
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

