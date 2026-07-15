/* eslint-disable no-undef */
/* Config placeholders replaced by Vite at build/dev time. */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

const firebaseConfig = {
  apiKey: '__VITE_FIREBASE_API_KEY__',
  authDomain: '__VITE_FIREBASE_AUTH_DOMAIN__',
  projectId: '__VITE_FIREBASE_PROJECT_ID__',
  messagingSenderId: '__VITE_FIREBASE_MESSAGING_SENDER_ID__',
  appId: '__VITE_FIREBASE_APP_ID__',
};

if (firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('__VITE_')) {
  firebase.initializeApp(firebaseConfig);
  firebase.messaging().onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'Programmers World';
    self.registration.showNotification(title, {
      body: payload.notification?.body || '',
      data: payload.data || {},
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification?.data?.linkUrl || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
    }),
  );
});
