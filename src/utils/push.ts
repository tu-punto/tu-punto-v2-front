const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

export const pushIsSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export const registerPushServiceWorker = async () => {
  if (!pushIsSupported()) {
    throw new Error("Este navegador no soporta notificaciones push");
  }

  const registration = await navigator.serviceWorker.register("/sw-push.js");
  return navigator.serviceWorker.ready.then(() => registration);
};

export const getExistingPushSubscription = async () => {
  if (!pushIsSupported()) return null;

  const registration = await registerPushServiceWorker();
  return registration.pushManager.getSubscription();
};

export const ensurePushSubscription = async (publicKey: string) => {
  if (!pushIsSupported()) {
    throw new Error("Este navegador no soporta notificaciones push");
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("No se concedio permiso para notificaciones");
  }

  const registration = await registerPushServiceWorker();
  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) {
    return existingSubscription.toJSON();
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  return subscription.toJSON();
};
