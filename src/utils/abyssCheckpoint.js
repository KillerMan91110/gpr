const STORAGE_KEY = 'abyssCheckpoint';

export function getAbyssCheckpoint() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAbyssCheckpoint(checkpoint) {
  if (checkpoint) localStorage.setItem(STORAGE_KEY, JSON.stringify(checkpoint));
  else localStorage.removeItem(STORAGE_KEY);
}
