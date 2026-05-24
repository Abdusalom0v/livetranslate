const KEY   = 'livetranslate_sessions';
const LIMIT = 20;

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

function persist(sessions) {
  try {
    localStorage.setItem(KEY, JSON.stringify(sessions));
  } catch { /* quota exceeded — silently ignore */ }
}

export function loadSessions() {
  return load();
}

export function saveSession(session) {
  const sessions = [session, ...load()].slice(0, LIMIT);
  persist(sessions);
}

export function deleteSession(id) {
  persist(load().filter(s => s.id !== id));
}

export function clearSessions() {
  localStorage.removeItem(KEY);
}
