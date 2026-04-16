// Service Worker for Push Notifications

self.addEventListener("push", (event) => {
  let data = { title: "Nova venda!", body: "Você recebeu uma nova venda." };
  try {
    data = event.data.json();
  } catch (e) {
    // fallback to default
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [200, 100, 200],
      data: data.url || "/",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data || "/");
    })
  );
});

// Minimal fetch handler - no caching, just network
self.addEventListener("fetch", (event) => {
  // Let all requests pass through to network
  return;
});
