export function getSavedPortalPage(key, allowedPages, fallback = "dashboard") {
  try {
    const savedPage = window.sessionStorage.getItem(key);
    return allowedPages.includes(savedPage) ? savedPage : fallback;
  } catch {
    return fallback;
  }
}

export function savePortalPage(key, page) {
  try {
    window.sessionStorage.setItem(key, page);
  } catch {
    // Storage can be disabled by a browser's privacy settings.
  }
}

export function clearSavedPortalPage(key) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Storage can be disabled by a browser's privacy settings.
  }
}
