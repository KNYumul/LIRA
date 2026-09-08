export const INACTIVITY_PAUSE_EVENT = 'lira:inactivity-pause';

let paused = false;

export function isInactivityPaused() {
  return paused;
}

export function setInactivityPaused(value) {
  if (paused === value) return;
  paused = value;
  window.dispatchEvent(new Event(INACTIVITY_PAUSE_EVENT));
}
