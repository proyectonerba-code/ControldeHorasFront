(function () {
  function convertirClaveBase64URL(valor) {
    const base64 = valor.replace(/-/g, '+').replace(/_/g, '/');
    const completo = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const binario = atob(completo);
    const salida = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) salida[i] = binario.charCodeAt(i);
    return salida;
  }

  async function activar(scope) {
    if (!window.isSecureContext) throw new Error('Las notificaciones push requieren HTTPS o localhost.');
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      throw new Error('Este navegador no es compatible con notificaciones push.');
    }
    const prefijo = scope === 'superadmin' ? '/api/superadmin/notificaciones' : '/api/notificaciones';
    const configResponse = await fetch(`${prefijo}/config`, { credentials: 'same-origin' });
    const config = await configResponse.json();
    if (!configResponse.ok || !config.ok) throw new Error(config.error || 'Inicia sesión antes de activar los avisos.');
    if (!config.disponible || !config.clave_publica) throw new Error('El servidor aún no configuró las notificaciones push.');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Permite las notificaciones en la configuración del navegador.');
    const registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertirClaveBase64URL(config.clave_publica)
    });
    const saveResponse = await fetch(`${prefijo}/suscripcion`, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON() })
    });
    const saved = await saveResponse.json();
    if (!saveResponse.ok || !saved.ok) throw new Error(saved.error || 'No se pudo guardar el dispositivo.');
    return 'Avisos activados en este dispositivo.';
  }

  window.JJMNotificaciones = {
    disponible() { return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; },
    activar
  };
})();
