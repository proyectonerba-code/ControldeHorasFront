# JJM Clock Web

Interfaz estática de JJM Clock, separada de la API Node/Express.

## Desarrollo local

Sirve `public/` en `http://localhost:5500` y arranca `jjmclock-backend` en el puerto 3000. `api-client.js` detecta localhost y dirige las peticiones a `http://localhost:3000`.

## Publicación en Cloudflare Pages

- Framework preset: ninguno
- Directorio raíz del proyecto: repo raíz (`.`)
- Comando de compilación: `exit 0`
- Directorio de salida: `public`
- Dominio propuesto: `asistencia.gruponerba.com`
- API propuesta: `https://api.gruponerba.com`

Al cambiar esos dominios, actualiza `api-client.js` y configura en el backend `FRONTEND_ORIGINS` con el origen exacto. Las llamadas de API incluyen las cookies de sesión; no cambies a `credentials: 'omit'`.

Los previews `*.pages.dev` no están permitidos por defecto en CORS. Para staging, usa un subdominio propio y agrega ese origen explícitamente al backend.
