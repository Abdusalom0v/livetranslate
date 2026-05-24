export const BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Wraps fetch with the ngrok browser-warning bypass header so free-tier
// ngrok tunnels don't return the interstitial page instead of JSON.
export function apiFetch(path, body, signal) {
  return fetch(`${BASE_URL}${path}`, {
    method:  'POST',
    headers: {
      'Content-Type':               'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify(body),
    signal,
  });
}
