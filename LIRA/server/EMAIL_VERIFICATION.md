# Teacher email verification

Manual signup validates `@deped.gov.ph` on the backend, creates an unverified account, and sends a LIRA email. The email button opens `/verify-email?token=...`; that page submits the token to the API, removes it from the address bar, and offers login after verification. No OTP or code entry is used.

New accounts start with `active: false` and `activationPending: true`. Login requires `active: true`. Clicking the email link activates the account and records `emailVerified` and `emailVerifiedAt`. Alternatively, an admin can activate the account without email verification. Admin activation does not claim the mailbox was verified. Existing active records remain usable; no database-wide update or email blast runs automatically.

`activationPending` distinguishes new accounts awaiting activation from accounts disabled by an admin. Pending accounts can resend and use activation links. An admin status decision clears pending activation and invalidates outstanding links, so a disabled account cannot reactivate itself through email. Changing the email through the admin route resets the mailbox verification fields.

Google sign-in also respects account activation. New Google accounts start inactive and receive an activation email; no session is issued until the email link or an admin activates the account. Already-active accounts can use Google sign-in.

## Email setup

Install server dependencies with `npm install`. Copy the SMTP settings from `.env.example` to the ignored `server/.env`, alongside the existing database and OAuth settings. Set `CLIENT_URL` to the public frontend origin (HTTPS in production). Configure frontend hosting to serve the SPA at `/verify-email`.

Use a new sender credential. Revoke the exposed app password in the sender provider's security settings, generate its replacement, and store it only as `SMTP_PASS` in the server environment or deployment secret store. Editing a local environment file does not revoke the old credential. No provider credential has been rotated by this code change.

SMTP transport follows https://nodemailer.com/smtp: port 587 uses STARTTLS (`SMTP_SECURE=false`); port 465 uses TLS (`SMTP_SECURE=true`). TLS is required and certificate validation remains enabled. `SMTP_FROM` must be an address permitted by the sender provider. SMTP acceptance is not proof of inbox delivery; check spam folders and provider delivery logs for bounces.

## Limits and storage

- Tokens use 32 cryptographically random bytes; only SHA-256 digests are stored. Links expire after 24 hours and are consumed atomically.
- Resending replaces the previous token. Database-backed reservations enforce a 60-second cooldown and five sends per one-hour window per account, including failed delivery attempts.
- Signup and resend share an in-process limit of 20 requests per IP per hour. Multi-instance deployments should also apply a shared gateway rate limit. Configure proxy trust only for known infrastructure if needed.
- Delivery failures preserve the account, invalidate the failed token, and offer resend. SMTP error details and raw tokens are not logged.
- Expired tokens never authorize verification. The most recently consumed hash is retained to show an already-used message; other superseded links are reported as invalid.

## Validation

Run `npm test` in `server` for isolated MongoDB integration tests. The first run downloads a MongoDB test binary. Run `npm run build` in the frontend directory. After configuring a replacement sender credential, perform a real signup with an accessible DepEd inbox and verify delivery, activation, login, and resend. This final delivery check requires a configured sender and inbox access.
