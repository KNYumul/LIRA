import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { endSession, getSession } from '../utils/session';
import { liraAlert } from '../utils/alerts';
import { setInactivityPaused } from '../utils/inactivityPause';

const IDLE_MS = 3 * 60 * 1000;
const WARNING_GRACE_MS = 5 * 60 * 1000;
const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll', 'lira:student-activity'];

export default function StudentInactivityAlert() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const isLearningPage = ['/category', '/story-mode', '/flashcards'].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
    const role = getSession()?.role;
    const isProtectedPage = (role === 'admin' && pathname === '/admin')
      || (role === 'teacher' && pathname === '/teacher')
      || (role === 'student' && isLearningPage);
    if (!isProtectedPage) return;

    let lastActivity = Date.now();
    let timer;
    let logoutTimer;
    let popup = null;
    let disposed = false;
    let warningActive = false;

    function recordActivity() {
      if (!warningActive) lastActivity = Date.now();
    }

    function logout() {
      if (disposed) return;
      disposed = true;
      window.clearTimeout(timer);
      window.clearTimeout(logoutTimer);
      if (popup && liraAlert.getPopup() === popup) liraAlert.close();
      setInactivityPaused(false);
      endSession();
      navigate(role === 'admin' ? '/admin/login' : role === 'teacher' ? '/login?portal=teacher' : '/login', { replace: true });
    }

    function continueSession() {
      warningActive = false;
      popup = null;
      window.clearTimeout(logoutTimer);
      setInactivityPaused(false);
      lastActivity = Date.now();
      timer = window.setTimeout(checkInactivity, IDLE_MS);
    }

    function showWarning() {
      warningActive = true;
      if (role === 'student') setInactivityPaused(true);
      logoutTimer = window.setTimeout(logout, WARNING_GRACE_MS);
      void liraAlert.fire({
        icon: 'info',
        title: 'Are you still there?',
        text: `You have been inactive for 3 minutes. Continue to stay signed in; otherwise, you will be logged out in 5 minutes.`,
        confirmButtonText: role === 'student' ? 'Continue learning' : 'Continue session',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: (element) => { popup = element; },
      }).then((result) => {
        if (disposed) return;
        if (result.isConfirmed) continueSession();
      });
    }

    function checkInactivity() {
      window.clearTimeout(timer);
      if (disposed || warningActive || getSession()?.role !== role) return;
      const remaining = IDLE_MS - (Date.now() - lastActivity);
      if (remaining > 0) {
        timer = window.setTimeout(checkInactivity, remaining);
        return;
      }
      if (role === 'admin') {
        logout();
        return;
      }
      // Wait until this tab is visible and any existing alert has finished.
      if (document.hidden || liraAlert.isVisible()) {
        timer = window.setTimeout(checkInactivity, 1000);
        return;
      }
      showWarning();
    }

    activityEvents.forEach((event) => window.addEventListener(event, recordActivity, { capture: true, passive: true }));
    document.addEventListener('visibilitychange', checkInactivity);
    timer = window.setTimeout(checkInactivity, IDLE_MS);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      window.clearTimeout(logoutTimer);
      activityEvents.forEach((event) => window.removeEventListener(event, recordActivity, true));
      document.removeEventListener('visibilitychange', checkInactivity);
      if (popup && liraAlert.getPopup() === popup) liraAlert.close();
      setInactivityPaused(false);
    };
  }, [navigate, pathname]);

  return null;
}
