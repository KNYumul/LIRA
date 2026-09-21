import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { liraAlert, showError } from "../utils/alerts";
import "./LoginPage.css";
import "./PasswordResetPage.css";

const API_URL = import.meta.env.VITE_API_URL || "";

function PasswordVisibilityIcon({ visible }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {visible ? <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </> : <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
        <circle cx="12" cy="12" r="3" />
      </>}
    </svg>
  );
}

export default function PasswordResetPage({ reset = false }) {
  const navigate = useNavigate();
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token") || "");
  const pending = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    setError("");
    if (reset && password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/${reset ? "reset-password" : "forgot-password"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reset ? { token, password } : { email }),
        referrerPolicy: "no-referrer",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to process your request.");
      if (reset) {
        navigate("/login?portal=teacher", { replace: true, state: { passwordReset: true } });
      } else await liraAlert.fire({ icon: "success", title: "Email sent", text: data.message, confirmButtonText: "OK" });
    } catch (failure) {
      const message = failure instanceof SyntaxError ? "Unable to reach the password reset service. Please try again." : failure.message || "Unable to reach the server.";
      if (reset) setError(message);
      else await showError(message, "Password reset unsuccessful");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const missingToken = reset && !/^[a-f0-9]{64}$/.test(token);
  return (
    <main className="login-page password-recovery">
      <section className="recovery-card" aria-labelledby="recovery-title">
        <div className="recovery-mascot" aria-hidden="true"><img src="/UI_Designs/ANIMALS/mascot_owl.svg" alt="" /></div>
        <p className="recovery-eyebrow">LIRA · TEACHER ACCOUNT</p>
        <h1 id="recovery-title">{reset ? "A fresh start" : "Forgot your password?"}</h1>
        <p className="recovery-description">{reset ? "Choose a new password to get back to your classroom." : "No worries! Enter your email below and we’ll help you get back to your classroom."}</p>
        {missingToken ? <p className="recovery-notice recovery-notice--error" role="alert">This reset link is missing or invalid. Please request a new one.</p> : (
          <form onSubmit={submit}>
            <div className="recovery-fields">
              {reset ? <>
                <p id="password-help">Use 8–50 characters, including an uppercase letter, a number, and a special character.</p>
                <div className="recovery-password-field">
                  <label className="field-label" htmlFor="new-password">New password</label>
                  <div className="recovery-password-input">
                    <input id="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" aria-describedby="password-help" minLength={8} maxLength={50} required value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} />
                    <button type="button" className="recovery-password-toggle" aria-label={showPassword ? "Hide new password" : "Show new password"} aria-controls="new-password" onClick={() => setShowPassword((visible) => !visible)}><PasswordVisibilityIcon visible={showPassword} /></button>
                  </div>
                </div>
                <div className="recovery-password-field">
                  <label className="field-label" htmlFor="confirm-password">Confirm new password</label>
                  <div className="recovery-password-input">
                    <input id="confirm-password" type={showConfirmation ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={50} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} />
                    <button type="button" className="recovery-password-toggle" aria-label={showConfirmation ? "Hide confirmed password" : "Show confirmed password"} aria-controls="confirm-password" onClick={() => setShowConfirmation((visible) => !visible)}><PasswordVisibilityIcon visible={showConfirmation} /></button>
                  </div>
                </div>
              </> : <label><span className="field-label">Email address</span><input type="email" placeholder="you@deped.gov.ph" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} /><span className="recovery-hint">Use the email linked to your teacher account.</span></label>}
            </div>
            <button className="recovery-submit" type="submit" disabled={busy} aria-busy={busy}>{busy ? "Please wait…" : reset ? "Change password" : "Send reset email"}<span aria-hidden="true">{busy ? "" : " →"}</span></button>
          </form>
        )}
        {error && <p className="recovery-notice recovery-notice--error" role="alert">{error}</p>}
        {reset && <p className="recovery-new-link"><Link to="/forgot-password">Request a new reset link</Link></p>}
        <div className="recovery-footer"><Link to="/login?portal=teacher"><span aria-hidden="true">← </span>Back to login</Link></div>
      </section>
    </main>
  );
}
