import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, type Messaging } from 'firebase/messaging';
import { notificationsApi } from '@/shared/api/notifications';

function firebaseConfigFromEnv() {
  const apiKey = (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined)?.trim();
  const projectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined)?.trim();
  const messagingSenderId = (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined)?.trim();
  const appId = (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined)?.trim();
  const authDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined)?.trim();
  if (!apiKey || !projectId || !messagingSenderId || !appId) return null;
  return {
    apiKey,
    authDomain: authDomain || `${projectId}.firebaseapp.com`,
    projectId,
    messagingSenderId,
    appId,
  };
}

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

export function isClientFirebaseConfigured() {
  return Boolean(firebaseConfigFromEnv() && (import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined)?.trim());
}

async function getFirebaseMessaging(): Promise<Messaging | null> {
  const cfg = firebaseConfigFromEnv();
  if (!cfg) return null;
  if (!(await isSupported())) return null;
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(cfg);
  }
  if (!messaging) messaging = getMessaging(app);
  return messaging;
}

/**
 * Request browser notification permission, get FCM token, register with API.
 * Safe no-op when Firebase env is missing.
 */
export async function enablePushNotifications(): Promise<{ ok: boolean; reason?: string }> {
  if (!isClientFirebaseConfigured()) {
    return { ok: false, reason: 'Firebase is not configured (set VITE_FIREBASE_* in client/.env).' };
  }
  if (typeof Notification === 'undefined') {
    return { ok: false, reason: 'This browser does not support notifications.' };
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'Notification permission was denied.' };
  }
  const msg = await getFirebaseMessaging();
  if (!msg) return { ok: false, reason: 'Messaging not supported.' };

  const vapidKey = (import.meta.env.VITE_FIREBASE_VAPID_KEY as string).trim();
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const token = await getToken(msg, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) return { ok: false, reason: 'Could not get FCM token.' };
  await notificationsApi.registerFcmToken(token);
  try {
    localStorage.setItem('pw_fcm_token', token);
  } catch {
    /* ignore */
  }
  return { ok: true };
}

export async function syncPushTokenIfPossible() {
  if (!isClientFirebaseConfigured()) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    await enablePushNotifications();
  } catch {
    /* quiet — push is optional */
  }
}
