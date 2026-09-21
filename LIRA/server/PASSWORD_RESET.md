Password reset uses the existing teacher accounts and SMTP configuration.

Required server `.env` settings: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`,
`SMTP_FROM`, and `CLIENT_URL` (the frontend origin). `SMTP_PORT` defaults to
587; set `SMTP_SECURE=true` for implicit TLS. Production requires an HTTPS
`CLIENT_URL`. Restart the backend after changes. No database migration is
required: reset fields are added to teacher documents when requested.

To check live delivery:

1. Open Login, choose Teacher, and click Forgot password.
2. Enter an existing active teacher account's email.
3. Open the email and click Change password within 30 minutes.
4. Enter matching passwords with 8–50 characters, an uppercase letter,
   a number, and a special character.
5. Confirm the redirect to teacher login and log in with the new password.
6. Confirm the old password and the already-used reset link no longer work.

Only token hashes are stored. Requesting another email after the 60-second
cooldown replaces the previous link. Request endpoints allow five attempts
per client before a five-minute cooldown. Unknown accounts display an
"Account does not exist" popup; successful delivery displays a reset-link-sent
popup. Inactive accounts, throttled requests, and delivery failures display
their respective error messages. SMTP failures produce a server log
without logging email addresses, credentials, or reset tokens.

Automated coverage: `npm.cmd test` from this server directory. Tests use a
temporary MongoDB instance and a captured mailbox; they do not send live email.
