self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const data = e.notification.data || {};
  if (e.action === "aceptar" && data.domicilioId) {
    clients.openWindow("/repartidor?aceptar=" + data.domicilioId);
  } else if (e.action === "rechazar" && data.domicilioId) {
    clients.openWindow("/repartidor?rechazar=" + data.domicilioId);
  } else {
    clients.openWindow("/repartidor");
  }
});

self.addEventListener("push", (e) => {
  let data = { title: "DomiU", body: "", domicilioId: null };
  try { data = e.data?.json() || data; } catch {}
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/icon.png",
    badge: "/icon.png",
    tag: "domi-alarma",
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    data: { domicilioId: data.domicilioId },
    actions: [
      { action: "aceptar", title: "Aceptar" },
      { action: "rechazar", title: "Rechazar" },
    ],
  });
});
