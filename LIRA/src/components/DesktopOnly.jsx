import { useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { Monitor } from "lucide-react";
import "./DesktopOnly.css";

const desktopQuery = "(min-width: 1024px)";

function subscribe(onChange) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(desktopQuery).matches;
}

export default function DesktopOnly({ children }) {
  const isDesktop = useSyncExternalStore(subscribe, getSnapshot, () => false);

  if (isDesktop) return children;

  return (
    <main className="desktop-only">
      <section className="desktop-only__card" aria-labelledby="desktop-only-title">
        <Monitor size={48} className="desktop-only__icon" aria-hidden="true" />
        <h1 id="desktop-only-title">Only available on desktop</h1>
        <p>Please open this dashboard on a laptop or desktop computer with a wider browser window.</p>
        <Link to="/" className="desktop-only__link">Back to home</Link>
      </section>
    </main>
  );
}
