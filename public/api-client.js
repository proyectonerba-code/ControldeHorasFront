/* API de JJM Clock desplegada en Render. */
(function () {
  const host = window.location.hostname;

  // El Pages hostname usa un sitio distinto al de la API y puede perder la
  // cookie SameSite=Lax al autenticar. Fuerza el dominio canónico de producción
  // antes de que cualquier pantalla intente crear sesión o cargar el panel.
  if (host === 'controldehorasfront.pages.dev') {
    const destino = new URL(window.location.href);
    destino.protocol = 'https:';
    destino.host = 'asistencia.gruponerba.com';
    window.location.replace(destino.toString());
    return;
  }

  const esLocal = host === 'localhost' || host === '127.0.0.1';
  const apiBase = String(window.JJM_API_BASE || (esLocal ? 'http://localhost:3000' : 'https://asistencia-api.gruponerba.com'))
    .replace(/\/+$/, '');

  function apiUrl(path) {
    return new URL(String(path || ''), apiBase + '/').toString();
  }

  window.JJMApi = { base: apiBase, url: apiUrl };

  const fetchOriginal = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const options = { ...(init || {}) };
    const rawUrl = typeof input === 'string'
      ? input
      : (input instanceof URL ? input.toString() : (input && input.url));
    const esRutaApi = typeof rawUrl === 'string' && rawUrl.startsWith('/api/');
    const esUrlApi = typeof rawUrl === 'string' && rawUrl.startsWith(apiBase + '/api/');

    if (esRutaApi) input = apiUrl(rawUrl);
    if (esRutaApi || esUrlApi) options.credentials = 'include';
    return fetchOriginal(input, options);
  };
})();
