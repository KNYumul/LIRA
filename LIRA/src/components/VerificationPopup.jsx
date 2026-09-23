import { useEffect, useRef } from "react";
import { MailCheck, ShieldCheck, X } from "lucide-react";
import ResendVerification from "./ResendVerification";
import "./VerificationPopup.css";

export default function VerificationPopup({
  email,
  title = "Verify your email",
  message,
  canResend = true,
  onClose,
}) {
  const dialog = useRef(null);

  useEffect(() => {
    const element = dialog.current;

    if (element && !element.open) {
      element.showModal();
    }

    return () => {
      if (element?.open) {
        element.close();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="verification-popup"
      aria-labelledby="verification-popup-title"
      aria-describedby="verification-popup-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose?.();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) {
          onClose?.();
        }
      }}
    >
      <div className="verification-popup__content">

        {/* CLOSE BUTTON */}
        <button
          className="verification-popup__close"
          type="button"
          aria-label="Close verification popup"
          onClick={() => onClose?.()}
        >
          <X
            size={19}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>

        {/* ICON */}
        <div
          className="verification-popup__icon"
          aria-hidden="true"
        >
          <MailCheck
            size={35}
            strokeWidth={1.7}
          />
        </div>

        {/* HEADER */}
        <span className="verification-popup__eyebrow">
          LIRA · TEACHER ACCOUNT
        </span>

        <h2 id="verification-popup-title">
          {title}
        </h2>

        <p
          id="verification-popup-description"
          className="verification-popup__description"
        >
          {message ||
            "Check your email. Click the verification link to activate your account."}
        </p>

        {/* RESEND VERIFICATION */}
        {canResend && (
          <div className="verification-popup__resend">
            <ResendVerification
              initialEmail={email}
            />
          </div>
        )}

        {/* FOOTER */}
        <div className="verification-popup__footer">
          <ShieldCheck
            size={16}
            strokeWidth={1.7}
            aria-hidden="true"
          />

          <span>
            Account access begins after activation.
          </span>
        </div>

      </div>
    </dialog>
  );
}