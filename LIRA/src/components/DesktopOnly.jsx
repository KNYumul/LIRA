import { Link } from "react-router-dom";
import { Monitor } from "lucide-react";
import "./DesktopOnly.css";

export default function DesktopOnly({ children }) {
  const isMobile = typeof navigator !== "undefined" && navigator.userAgentData?.mobile === true;

  if (!isMobile) return children;

  return (
    <main className="desktop-only">
      <section className="desktop-only__card" aria-labelledby="desktop-only-title">
        <Monitor size={48} className="desktop-only__icon" aria-hidden="true" />
        <h1 id="desktop-only-title">Only available on desktop</h1>
        <p>Please open this dashboard on a laptop or desktop computer.</p>
        <Link to="/" className="desktop-only__link">Back to home</Link>
      </section>
    </main>
  );
}
