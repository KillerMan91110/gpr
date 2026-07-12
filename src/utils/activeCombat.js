const STORAGE_KEY = 'activeCombat';

export function getActiveCombat() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveCombat(zoneId, session, enemyLevels) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ zoneId, session, enemyLevels }));
}

export function clearActiveCombat() {
  localStorage.removeItem(STORAGE_KEY);
}

export function isCombatInProgress(activeCombat) {
  return !!activeCombat && activeCombat.session?.session?.status === 'IN_PROGRESS';
}
