(function () {
  const PREFIJO_LOCAL = 'jjm_push_vapid_';

  function convertirClaveBase64URL(valor) {
    const base64 = valor.replace(/-/g, '+').replace(/_/g, '/');
    const completo = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const binario = atob(completo);
    const salida = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) salida[i] = binario.charCodeAt(i);
    return salida;
  }

  function scopeActual() {
    return window.location.pathname.indexOf('superadmin') !== -1 ? 'superadmin' : 'usuario';
  }

  function leerClave(scope) {
    try { return localStorage.getItem(PREFIJO_LOCAL + scope) || ''; } catch { return ''; }
  }

  function guardarClave(scope, clave) {
    try { localStorage.setItem(PREFIJO_LOCAL + scope, clave); } catch { /* storage privado */ }
  }

  function prefijoAPI(scope) {
    return scope === 'superadmin' ? '/api/superadmin/notificaciones' : '/api/notificaciones';
  }

  function soportado() {
    return Boolean(window.isSecureContext && 'serviceWorker' in navigator
      && 'PushManager' in window && 'Notification' in window);
  }

  async function obtenerConfig(scope) {
    const res = await fetch(`${prefijoAPI(scope)}/config`, { credentials: 'include' });
    const config = await res.json();
    if (!res.ok || !config.ok) throw new Error(config.error || 'Inicia sesión antes de activar los avisos.');
    if (!config.disponible || !config.clave_publica) throw new Error('El servidor aún no configuró las notificaciones push.');
    return config;
  }

  async function suscribir(registration, clavePublica) {
    return registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertirClaveBase64URL(clavePublica)
    });
  }

  async function guardarSuscripcion(scope, subscription) {
    const res = await fetch(`${prefijoAPI(scope)}/suscripcion`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON() })
    });
    const guardado = await res.json();
    if (!res.ok || !guardado.ok) throw new Error(guardado.error || 'No se pudo guardar el dispositivo.');
  }

  async function activar(scopeParam) {
    const scope = scopeParam || scopeActual();
    if (!window.isSecureContext) throw new Error('Las notificaciones push requieren HTTPS o localhost.');
    if (!soportado()) throw new Error('Este navegador no es compatible con notificaciones push.');
    const config = await obtenerConfig(scope);
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') throw new Error('Permite las notificaciones en la configuración del navegador (ícono de candado / Ajustes del sitio).');
    const registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    const claveLocal = leerClave(scope);
    // Si el servidor cambió de llaves (deploy), la suscripción vieja ya no sirve.
    if (subscription && (!claveLocal || claveLocal !== config.clave_publica)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    if (!subscription) subscription = await suscribir(registration, config.clave_publica);
    await guardarSuscripcion(scope, subscription);
    guardarClave(scope, config.clave_publica);
    return 'Avisos activados en este dispositivo. Recibirás notificaciones aunque cierres la página.';
  }

  // Se llama al cargar cada pantalla: repara suscripciones viejas sin pedir permiso
  // de nuevo (el permiso ya fue concedido) y devuelve el estado real del dispositivo.
  async function estado(scopeParam) {
    const scope = scopeParam || scopeActual();
    const base = { soportado: soportado(), permiso: soportado() ? Notification.permission : 'no-soportado', suscrito: false };
    if (!base.soportado || base.permiso !== 'granted') return base;
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      let subscription = await registration?.pushManager.getSubscription();
      base.suscrito = Boolean(subscription);
      if (!subscription) return base;
      const config = await obtenerConfig(scope);
      if (leerClave(scope) !== config.clave_publica) {
        await subscription.unsubscribe();
        subscription = await suscribir(registration, config.clave_publica);
        await guardarSuscripcion(scope, subscription);
        guardarClave(scope, config.clave_publica);
        base.suscrito = true;
      }
    } catch { /* Sin sesión o sin conexión: se reporta lo que se pudo saber. */ }
    return base;
  }

  async function desactivar(scopeParam) {
    const scope = scopeParam || scopeActual();
    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
    await fetch(`${prefijoAPI(scope)}/suscripcion`, { method: 'DELETE', credentials: 'include' });
    try { localStorage.removeItem(PREFIJO_LOCAL + scope); } catch { /* noop */ }
    return 'Avisos desactivados en este dispositivo.';
  }

  window.JJMNotificaciones = {
    disponible: soportado,
    activar,
    estado,
    desactivar
  };
})();
