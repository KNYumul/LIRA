import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ResendVerification from "../components/ResendVerification";
import "./LoginPage.css";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function VerifyEmailPage() {
  const token = useRef(new URLSearchParams(window.location.search).get("token"));
  const started = useRef(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(true);

  async function verify() {
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/api/teachers/verify-email`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.current }),
        referrerPolicy: "no-referrer",
      });
      setResult(await response.json());
    } catch {
      setResult({ code: "NETWORK_ERROR", message: "Unable to reach the server. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    window.history.replaceState({}, document.title, window.location.pathname);
    void verify();
  }, []);

  const done = result?.code === "VERIFIED" || result?.code === "LINK_USED";
  return (
    <main className="login-page" style={{ minHeight: "65vh", padding: "48px 20px" }}>
      <section style={{ maxWidth: "520px", margin: "auto", background: "white", borderRadius: "20px", padding: "32px", boxShadow: "0 8px 32px #0001" }}>
        <h1>{busy ? "Verifying your email…" : result?.code === "VERIFIED" ? "Email verified!" : "Email verification"}</h1>
        <p role="status">{busy ? "Please wait while LIRA verifies your link." : result?.message}</p>
        {!busy && <Link className="portal-submit" to="/login?portal=teacher">Log in</Link>}
        {!busy && (result?.code === "NETWORK_ERROR" || !result?.code) && <button type="button" onClick={verify}>Try again</button>}
        {!busy && !done && result?.code !== "ACCOUNT_INACTIVE" && <ResendVerification />}
      </section>
    </main>
  );
}
