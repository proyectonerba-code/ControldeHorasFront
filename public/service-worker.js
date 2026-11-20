/* JJMClock: muestra avisos push aun cuando la página no está abierta. */
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() || '' }; }
  const title = data.title || 'Aviso de JJMClock';
  const options = {
    body: data.body || 'Tienes una actualización de tu equipo.',
    icon: '/logo-jjm.jpg',
    badge: '/logo-jjm.jpg',
    tag: data.tag || 'jjmclock-aviso',
    renotify: false,
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  let destino = '/';
  try {
    const candidato = new URL(event.notification.data?.url || '/', self.location.origin);
    if (candidato.origin === self.location.origin) destino = candidato.href;
  } catch { /* Conserva la portada como destino seguro. */ }
  event.waitUntil((async () => {
    const ventanas = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const ventana of ventanas) {
      if (new URL(ventana.url).origin === self.location.origin) {
        await ventana.navigate(destino);
        return ventana.focus();
      }
    }
    return clients.openWindow(destino);
  })());
});
