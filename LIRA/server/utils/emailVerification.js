const crypto = require("crypto");
const Teacher = require("../models/Teacher");

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const COOLDOWN = 60 * 1000;
const normalizeEmail = (email) => typeof email === "string" ? email.trim().toLowerCase() : "";
const depedEmailAllowed = (email) => /^[a-z0-9._%+-]+@deped\.gov\.ph$/.test(email) && email.length <= 254;
const digest = (token) => crypto.createHash("sha256").update(token).digest("hex");
const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

function verificationMessage(email, token) {
  const origin = new URL(process.env.CLIENT_URL || "http://localhost:5173");
  if (process.env.NODE_ENV === "production" && origin.protocol !== "https:") throw new Error("HTTPS_CLIENT_URL_REQUIRED");
  const url = new URL("/verify-email", origin);
  url.searchParams.set("token", token);
  const link = url.toString();
  const safeLink = escapeHtml(link);
  return {
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Verify your email for LIRA",
    text: `Welcome to LIRA!\n\nClick this link to verify your email and activate your account:\n${link}\n\nThis link expires in 24 hours and can only be used once. If you did not sign up, ignore this email. For help, contact your school IT support.`,
html: `
<div style="
  margin:0;
  padding:0;
  background:#f8f1e7;
  font-family:Arial, Helvetica, sans-serif;
  color:#3f3f3f;
">

  <!-- OUTER WRAPPER -->
  <div style="
    width:100%;
    padding:40px 16px;
    box-sizing:border-box;
  ">

    <div style="
      max-width:650px;
      margin:0 auto;
    ">

      <!-- MAIN CARD -->
      <div style="
        background:#fffdf9;
        border:1px solid #eee5da;
        border-radius:22px;
        overflow:hidden;
        box-shadow:0 8px 25px rgba(80,70,60,0.06);
      ">

        <!-- CORAL TOP BORDER -->
        <div style="
          height:7px;
          background:#e58d87;
        "></div>


        <!-- MAIN CONTENT -->
        <div style="
          padding:48px 45px 38px;
          text-align:center;
        ">

          <!-- WELCOME LABEL -->
          <div style="
            display:inline-block;
            padding:9px 24px;
            margin-bottom:22px;
            background:#e6efda;
            border-radius:30px;
            color:#477558;
            font-size:13px;
            font-weight:600;
          ">
            Welcome!
          </div>


          <!-- TITLE -->
          <h1 style="
            margin:0 0 16px;
            color:#333333;
            font-size:32px;
            line-height:40px;
            font-weight:700;
          ">
            Welcome to
            <span style="color:#3f7d56;">LIRA!</span>
          </h1>


          <!-- DESCRIPTION -->
          <p style="
            max-width:490px;
            margin:0 auto 30px;
            color:#747474;
            font-size:15px;
            line-height:24px;
          ">
            Verify your email to activate your teacher account.
          </p>


          <!-- VERIFY BUTTON -->
          <div style="
            margin:0 0 32px;
          ">
            <a
              href="${link}"
              style="
                display:inline-block;
                background:#e58d87;
                color:#ffffff;
                padding:16px 34px;
                border-radius:12px;
                text-decoration:none;
                font-size:15px;
                font-weight:700;
              "
            >
              Verify my email &nbsp;→
            </a>
          </div>


          <!-- EXPIRATION NOTICE -->
          <div style="
            max-width:500px;
            margin:0 auto 22px;
            padding:16px 20px;
            box-sizing:border-box;
            background:#e6f1e9;
            border-radius:13px;
            color:#477558;
            font-size:13px;
            line-height:21px;
          ">
            This link expires in
            <strong>24 hours</strong>
            and can only be used once.
          </div>


          <!-- FALLBACK LINK -->
          <div style="
            max-width:500px;
            margin:0 auto;
            padding:20px;
            box-sizing:border-box;
            background:#f7f0e5;
            border-radius:13px;
            text-align:left;
          ">

            <p style="
              margin:0 0 10px;
              color:#777777;
              font-size:12px;
              line-height:19px;
            ">
              If the button does not work, click or copy and paste
              this link into your browser:
            </p>

            <a
              href="${link}"
              style="
                color:#477558;
                font-size:12px;
                line-height:19px;
                word-break:break-all;
                overflow-wrap:anywhere;
              "
            >
              ${link}
            </a>

          </div>


          <!-- DIVIDER -->
          <div style="
            height:1px;
            margin:34px 0 25px;
            background:#ddd4c8;
          "></div>


          <!-- SECURITY MESSAGE -->
          <p style="
            margin:0;
            color:#8a8a8a;
            font-size:12px;
            line-height:20px;
          ">
            If you did not sign up, you can safely ignore this email.
            <br>
            For help, contact your school IT support.
          </p>

        </div>


        <!-- GREEN FOOTER -->
        <div style="
          padding:24px 20px;
          background:#dceac9;
          text-align:center;
        ">

          <div style="
            margin-bottom:6px;
            color:#4f795c;
            font-size:14px;
            font-weight:700;
          ">
            Better Readers, Brighter Tomorrows
          </div>

          <div style="
            color:#78907d;
            font-size:10px;
            line-height:16px;
          ">
            LIRA — Literacy Intelligence and Reading Assessment
          </div>

        </div>

      </div>


      <!-- OUTSIDE FOOTER -->
      <div style="
        padding:22px 20px 0;
        text-align:center;
        color:#999999;
        font-size:10px;
        line-height:17px;
      ">
        This is an automated email from LIRA.<br>
        Please do not reply to this message.
      </div>

    </div>

  </div>

</div>
`,  
};
}

async function deliverEmail(message) {
  if (!["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"].every((key) => process.env[key])) throw new Error("SMTP_NOT_CONFIGURED");
  const transport = require("nodemailer").createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    requireTLS: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    disableFileAccess: true, disableUrlAccess: true,
  });
  const result = await transport.sendMail(message);
  if (!result.accepted?.length) throw new Error("EMAIL_REJECTED");
}

async function sendVerification(teacher, deliver = deliverEmail, now = new Date()) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = digest(token);
  // Atomic reservation prevents simultaneous resends from bypassing the limits.
  const reserved = await Teacher.findOneAndUpdate({
    _id: teacher._id, email: teacher.email, active: false, activationPending: true,
    $and: [
      { $or: [{ verificationLastSentAt: { $exists: false } }, { verificationLastSentAt: { $lte: new Date(+now - COOLDOWN) } }] },
      { $or: [{ verificationWindowStart: { $exists: false } }, { verificationWindowStart: { $lte: new Date(+now - HOUR) } }, { verificationSendCount: { $lt: 5 } }] },
    ],
  }, [{ $set: {
    verificationTokenHash: tokenHash,
    verificationExpiresAt: new Date(+now + DAY),
    verificationLastSentAt: now,
    verificationWindowStart: { $cond: [{ $gt: ["$verificationWindowStart", new Date(+now - HOUR)] }, "$verificationWindowStart", now] },
    verificationSendCount: { $cond: [{ $gt: ["$verificationWindowStart", new Date(+now - HOUR)] }, { $add: [{ $ifNull: ["$verificationSendCount", 0] }, 1] }, 1] },
  } }], { new: true, updatePipeline: true });
  if (!reserved) {
    const current = await Teacher.findById(teacher._id).select("+verificationLastSentAt +verificationWindowStart +verificationSendCount");
    const cooldownEnd = current?.verificationLastSentAt ? +current.verificationLastSentAt + COOLDOWN : +now;
    const windowEnd = current?.verificationSendCount >= 5 && current.verificationWindowStart ? +current.verificationWindowStart + HOUR : +now;
    const retryAfterSeconds = Math.max(1, Math.ceil((Math.max(cooldownEnd, windowEnd) - now) / 1000));
    return { status: 429, code: "VERIFICATION_LIMIT", retryAfterSeconds, message: "Please wait at least 60 seconds between requests. You can request up to 5 emails per hour." };
  }
  try {
    await deliver(verificationMessage(teacher.email, token));
    return { status: 200, message: "Check your email. Click the verification link to activate your account." };
  } catch {
    await Teacher.updateOne({ _id: teacher._id, verificationTokenHash: tokenHash }, { $unset: { verificationTokenHash: 1, verificationExpiresAt: 1 } });
    return { status: 503, code: "EMAIL_DELIVERY_FAILED", message: "Your account is saved, but we could not send the verification email. Please try resending in 60 seconds or contact IT support." };
  }
}

async function verifyEmail(token, now = new Date()) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return { status: 400, code: "INVALID_LINK", message: "This verification link is invalid. Please request a new email." };
  const tokenHash = digest(token);
  const teacher = await Teacher.findOneAndUpdate({ verificationTokenHash: tokenHash, verificationExpiresAt: { $gt: now }, activationPending: true, active: false }, {
    $set: { active: true, activationPending: false, emailVerified: true, emailVerifiedAt: now, verificationUsedTokenHash: tokenHash },
    $unset: { verificationTokenHash: 1, verificationExpiresAt: 1 },
  }, { new: true });
  if (teacher) return { status: 200, code: "VERIFIED", message: "Your email is verified. You can now log in to LIRA." };
  const existing = await Teacher.findOne({ $or: [{ verificationTokenHash: tokenHash }, { verificationUsedTokenHash: tokenHash }] }).select("+verificationExpiresAt +verificationUsedTokenHash");
  if (existing && !existing.active && !existing.activationPending) return { status: 403, code: "ACCOUNT_INACTIVE", message: "Your account is not active. Please contact IT support." };
  if (existing?.verificationUsedTokenHash === tokenHash) return { status: 409, code: "LINK_USED", message: "This link has already been used. Please log in if your email is verified, or request a new link." };
  if (existing?.verificationExpiresAt <= now) return { status: 410, code: "LINK_EXPIRED", message: "This verification link has expired. Please request a new email." };
  return { status: 400, code: "INVALID_LINK", message: "This link is invalid or was replaced. Please use the latest verification email." };
}

module.exports = { normalizeEmail, depedEmailAllowed, digest, verificationMessage, sendVerification, verifyEmail, deliverEmail };
