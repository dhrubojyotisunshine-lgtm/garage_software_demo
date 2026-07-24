// Resolve an uploaded asset path (e.g. "/uploads/settings/logo.png") to a URL the
// browser can actually load:
//   - Absolute URLs (http/https/data) → returned unchanged.
//   - Live (VITE_API_URL set) → prefix the server origin, so the image is fetched
//     from the API host and not the separately-hosted static client (fixes 404).
//   - Local dev (VITE_API_URL unset) → keep it relative, so Vite's /uploads proxy
//     serves it (avoids hardcoding a possibly-wrong localhost port).
export function assetUrl(path) {
  if (!path) return path;
  if (/^(https?:|data:)/i.test(path)) return path;
  const api = import.meta.env.VITE_API_URL;
  const base = api ? api.replace(/\/api\/?$/, '') : '';
  return base + (path.startsWith('/') ? path : '/' + path);
}

// Shipped fallback image (server/uploads/default_logo.png). Used wherever a logo
// or profile picture slot would otherwise be empty — i.e. neither the super admin
// nor the garage owner has uploaded anything.
export const DEFAULT_LOGO = '/uploads/default_logo.png';

// Resolve `path` if set, else the shipped default. Returns a browser-ready URL.
export function assetUrlOrDefault(path) {
  return assetUrl(path || DEFAULT_LOGO);
}
