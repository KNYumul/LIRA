let memorySession = null;

function getStorage(name) {
  try {
    return window[name];
  } catch {
    return null;
  }
}

function readStorage(storage) {
  if (!storage) return null;
  try {
    return storage.getItem("liraSession");
  } catch {
    return null;
  }
}

function writeStorage(storage, value) {
  if (!storage) return false;
  try {
    storage.setItem("liraSession", value);
    return true;
  } catch {
    return false;
  }
}

function removeStorage(storage) {
  if (!storage) return;
  try {
    storage.removeItem("liraSession");
  } catch {
    // Storage can be disabled by a browser's privacy settings.
  }
}

export function saveSession(session) {
  const value = JSON.stringify(session);
  if (writeStorage(getStorage("localStorage"), value)) return;
  if (writeStorage(getStorage("sessionStorage"), value)) return;
  memorySession = value;
}

export function getSession() {
  const value = readStorage(getStorage("localStorage"))
    || readStorage(getStorage("sessionStorage"))
    || memorySession;

  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function clearSession() {
  removeStorage(getStorage("localStorage"));
  removeStorage(getStorage("sessionStorage"));
  memorySession = null;
}
