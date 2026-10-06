const crypto = require("crypto");
const Teacher = require("../models/Teacher");
const { hashPassword } = require("./password");
const { normalizeEmail, digest, deliverEmail } = require("./emailVerification");

const accepted = { status: 200, message: "A password reset link has been sent." };
const invalid = { status: 400, message: "This password reset link is invalid, expired, or already used. Please request a new link." };

async function requestReset(email, deliver = deliverEmail, now = new Date()) {
  email = normalizeEmail(email);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: 400, message: "Enter a valid email address." };
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = digest(token);
  const teacher = await Teacher.findOneAndUpdate({ email, active: true,
    $or: [{ resetLastSentAt: { $exists: false } }, { resetLastSentAt: { $lte: new Date(+now - 60000) } }],
  }, { $set: { resetTokenHash: tokenHash, resetExpiresAt: new Date(+now + 1800000), resetLastSentAt: now } });
  if (!teacher) {
    const existing = await Teacher.findOne({ email }).select("active");
    if (!existing) return { status: 404, message: "Account does not exist." };
    if (!existing.active) return { status: 403, message: "Your account is inactive. Please contact IT support." };
    return { status: 429, message: "Please wait 60 seconds before requesting another reset email." };
  }
  try {
    const url = new URL("/reset-password", process.env.CLIENT_URL || "http://localhost:5173");
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("HTTPS_CLIENT_URL_REQUIRED");
    // Fragments are not sent to the web server or included in HTTP referrers.
    url.hash = new URLSearchParams({ token }).toString();
    const link = url.toString();
    await deliver({ from: process.env.SMTP_FROM, to: email, subject: "Reset your LIRA password",
      text: `Change your password: ${link}\n\nThis link expires in 30 minutes and can only be used once. If you did not request this, ignore this email.`,
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

          <!-- PASSWORD RESET LABEL -->
          <div style="
            display:inline-block;
            padding:9px 22px;
            margin-bottom:22px;
            background:#e6efda;
            border-radius:30px;
            color:#477558;
            font-size:13px;
            font-weight:600;
          ">
            Password Reset
          </div>


          <!-- TITLE -->
          <h1 style="
            margin:0 0 16px;
            color:#333333;
            font-size:32px;
            line-height:40px;
            font-weight:700;
          ">
            Reset your password
          </h1>


          <!-- DESCRIPTION -->
          <p style="
            max-width:490px;
            margin:0 auto 30px;
            color:#747474;
            font-size:15px;
            line-height:24px;
          ">
            We received a request to reset your LIRA account password.
            Click the button below to create a new password.
          </p>


          <!-- CHANGE PASSWORD BUTTON -->
          <div style="
            margin:0 0 32px;
          ">
            <a
              href="${link}"
              style="
                display:inline-block;
                background:#e58d87;
                color:#ffffff;
                padding:16px 32px;
                border-radius:12px;
                text-decoration:none;
                font-size:15px;
                font-weight:700;
              "
            >
              Change password &nbsp;→
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
            <strong>30 minutes</strong>
            and can only be used once.
          </div>


          <!-- FALLBACK LINK BOX -->
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
              If the button does not work, copy and paste this link
              into your browser:
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
            If you did not request a password reset,
            you can safely ignore this email.
          </p>

        </div>


        <!-- GREEN FOOTER INSIDE CARD -->
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
    });
  } catch {
    await Teacher.updateOne({ _id: teacher._id, resetTokenHash: tokenHash }, { $unset: { resetTokenHash: 1, resetExpiresAt: 1 } });
    console.error("Password reset email delivery failed. Check SMTP and CLIENT_URL configuration.");
    return { status: 503, message: "We could not send the reset email. Please try again in 60 seconds." };
  }
  return accepted;
}

async function resetPassword(token, password, now = new Date()) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return invalid;
  if (typeof password !== "string" || !/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,50}$/.test(password)) {
    return { status: 400, message: "Password must be 8-50 characters with an uppercase letter, a number, and a special character." };
  }
  const filter = { resetTokenHash: digest(token), resetExpiresAt: { $gt: now }, active: true };
  if (!await Teacher.exists(filter)) return invalid;
  const passwordHash = await hashPassword(password);
  const teacher = await Teacher.findOneAndUpdate(filter, {
    $set: { passwordHash }, $unset: { resetTokenHash: 1, resetExpiresAt: 1 },
  });
  return teacher ? { status: 200, message: "Password updated. You can now log in with your new password." } : invalid;
}

module.exports = { requestReset, resetPassword };
