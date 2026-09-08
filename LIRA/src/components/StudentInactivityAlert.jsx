import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSession } from '../utils/session';
import { liraAlert } from '../utils/alerts';
import { setInactivityPaused } from '../utils/inactivityPause';

const IDLE_MS = 3 * 60 * 1000;
const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll', 'lira:student-activity'];

export default function StudentInactivityAlert() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isLearningPage = ['/category', '/story-mode', '/flashcards'].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
    if (!isLearningPage || getSession()?.role !== 'student') return;

    let lastActivity = Date.now();
    let timer;
    let popup = null;
    let disposed = false;

    function recordActivity() {
      if (!popup) lastActivity = Date.now();
    }

    function checkInactivity() {
      window.clearTimeout(timer);
      if (disposed || popup || getSession()?.role !== 'student') return;
      const remaining = IDLE_MS - (Date.now() - lastActivity);
      if (remaining > 0) {
        timer = window.setTimeout(checkInactivity, remaining);
        return;
      }
      // Wait until this tab is visible and any existing alert has finished.
      if (document.hidden || liraAlert.isVisible()) {
        timer = window.setTimeout(checkInactivity, 1000);
        return;
      }
      setInactivityPaused(true);
      void liraAlert.fire({
        icon: 'info',
        title: 'Are you still there?',
        text: 'You have been inactive for 3 minutes. Ready to keep learning?',
        confirmButtonText: 'Continue learning',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: (element) => { popup = element; },
      }).then(() => {
        popup = null;
        if (disposed) return;
        setInactivityPaused(false);
        lastActivity = Date.now();
        timer = window.setTimeout(checkInactivity, IDLE_MS);
      });
    }

    activityEvents.forEach((event) => window.addEventListener(event, recordActivity, { capture: true, passive: true }));
    document.addEventListener('visibilitychange', checkInactivity);
    timer = window.setTimeout(checkInactivity, IDLE_MS);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      activityEvents.forEach((event) => window.removeEventListener(event, recordActivity, true));
      document.removeEventListener('visibilitychange', checkInactivity);
      if (popup && liraAlert.getPopup() === popup) liraAlert.close();
      setInactivityPaused(false);
    };
  }, [pathname]);

  return null;
}
