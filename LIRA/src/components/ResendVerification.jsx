import { useEffect, useState } from "react";
import { Mail, Send } from "lucide-react";
import "./ResendVerification.css";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function ResendVerification({ initialEmail = "" }) {
  const [email, setEmail] = useState(initialEmail);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!remaining) return;
    const timer = setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  async function resend() {
    if (busy || remaining) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/api/teachers/resend-verification`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setMessage(data.message || "Could not resend the verification email.");
      if (response.ok || response.status === 429 || response.status === 503) setRemaining(data.retryAfterSeconds || 60);
    } catch {
      setMessage("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="verification-resend">
      <label className="verification-resend__label">DepEd email address
        <span className="verification-resend__field"><Mail size={19} aria-hidden="true" />
        <input aria-label="Email for verification" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="teacher@deped.gov.ph" />
        </span>
      </label>
      <button className="verification-resend__button" type="button" onClick={resend} disabled={busy || remaining > 0 || !email.trim()}>
        <Send size={18} aria-hidden="true" />
        {busy ? "Sending…" : remaining ? `Resend in ${remaining}s` : "Resend verification email"}
      </button>
      <p className="verification-resend__hint">Check your spam folder, too. Still need help? Contact IT support.</p>
      <p className="verification-resend__status" role="status">{message}</p>
    </div>
  );
}
