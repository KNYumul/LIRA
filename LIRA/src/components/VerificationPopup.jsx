import { useEffect, useRef } from "react";
import { MailCheck, ShieldCheck, X } from "lucide-react";
import ResendVerification from "./ResendVerification";
import "./VerificationPopup.css";

export default function VerificationPopup({ email, title = "Verify your email", message, canResend = true, onClose }) {
  const dialog = useRef(null);

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  return (
    <dialog ref={dialog} className="verification-popup" aria-labelledby="verification-popup-title" aria-describedby="verification-popup-description" onCancel={onClose} onClick={(event) => { if (event.target === dialog.current) onClose(); }}>
      <div className="verification-popup__content">
        <button className="verification-popup__close" type="button" aria-label="Close verification popup" onClick={onClose}><X size={20} aria-hidden="true" /></button>
        <div className="verification-popup__icon" aria-hidden="true"><MailCheck size={34} strokeWidth={1.6} /></div>
        <span className="verification-popup__eyebrow">YOUR LIRA ACCOUNT</span>
        <h2 id="verification-popup-title">{title}</h2>
        <p id="verification-popup-description">{message || "Check your inbox and spam folder. Use the latest verification link, or contact IT support for help."}</p>
        {canResend && <ResendVerification initialEmail={email} />}
        <div className="verification-popup__footer"><ShieldCheck size={16} aria-hidden="true" /><span>Account access begins after activation.</span></div>
      </div>
    </dialog>
  );
}
