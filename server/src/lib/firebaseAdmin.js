import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

let messaging = null;
let initAttempted = false;

function loadServiceAccount() {
  if (process.env.FIREBASE_PUSH_ENABLED?.trim().toLowerCase() === 'false') {
    return null;
  }
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    try {
      return JSON.parse(json);
    } catch {
      console.warn('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
      return null;
    }
  }
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')?.trim();
  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }
  return null;
}

export function getFirebaseMessaging() {
  if (initAttempted) return messaging;
  initAttempted = true;
  const sa = loadServiceAccount();
  if (!sa) {
    messaging = null;
    return null;
  }
  try {
    if (!getApps().length) {
      initializeApp({ credential: cert(sa) });
    }
    messaging = getMessaging();
  } catch (err) {
    console.warn('Firebase Admin init failed:', err?.message || err);
    messaging = null;
  }
  return messaging;
}

export function isFirebaseConfigured() {
  return Boolean(getFirebaseMessaging());
}
