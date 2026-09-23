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
  background:#f7f1e6;
  font-family:Arial,Helvetica,sans-serif;
  color:#3f3f3f;
">

  <div style="
    width:100%;
    padding:40px 16px;
    box-sizing:border-box;
  ">

    <div style="
      max-width:650px;
      margin:0 auto;
    ">

      <!-- LIRA HEADER -->
      <div style="
        text-align:center;
        padding:0 20px 25px;
      ">

        <div style="
          display:inline-block;
          vertical-align:middle;
          width:54px;
          height:54px;
          border-radius:50%;
          background:#bfe5ee;
          overflow:hidden;
          margin-bottom:10px;
        ">
          <div style="
            width:50%;
            height:100%;
            background:#bfe5ee;
            float:left;
          "></div>

          <div style="
            width:50%;
            height:100%;
            background:#f1dc92;
            float:left;
          "></div>
        </div>

        <div style="
          font-size:30px;
          line-height:34px;
          font-weight:700;
          color:#3f7d56;
          letter-spacing:1px;
        ">
          LIRA
        </div>

        <div style="
          margin-top:4px;
          font-size:10px;
          line-height:15px;
          font-weight:600;
          letter-spacing:1.2px;
          color:#7a7a7a;
        ">
          LITERACY INTELLIGENCE AND READING ASSESSMENT
        </div>

      </div>


      <!-- MAIN EMAIL CARD -->
      <div style="
        background:#fffdf8;
        border:1px solid #eee5d8;
        border-radius:24px;
        overflow:hidden;
        box-shadow:0 8px 25px rgba(80,70,60,0.08);
      ">

        <!-- TOP DECORATION -->
        <div style="
          height:8px;
          background:#e58d87;
        "></div>


        <!-- CONTENT -->
        <div style="
          padding:48px 45px 40px;
          text-align:center;
        ">

          <!-- SMALL LABEL -->
          <div style="
            display:inline-block;
            padding:8px 24px;
            margin-bottom:20px;
            border-radius:30px;
            background:#e8f0dc;
            color:#3f7651;
            font-size:15px;
            font-weight:600;
          ">
            Password Reset
          </div>


          <!-- TITLE -->
          <h1 style="
            margin:0 0 16px;
            color:#333333;
            font-size:34px;
            line-height:42px;
            font-weight:700;
          ">
            Reset your password
          </h1>


          <!-- DESCRIPTION -->
          <p style="
            max-width:500px;
            margin:0 auto 30px;
            color:#777777;
            font-size:16px;
            line-height:26px;
          ">
            We received a request to reset your LIRA account password.
            Click the button below to create a new password.
          </p>


          <!-- BUTTON -->
          <div style="margin:0 0 30px;">
            <a
              href="${link}"
              style="
                display:inline-block;
                background:#e58d87;
                color:#ffffff;
                padding:16px 34px;
                border-radius:14px;
                text-decoration:none;
                font-size:16px;
                font-weight:700;
                box-shadow:0 5px 12px rgba(229,141,135,0.25);
              "
            >
              Change password &nbsp;→
            </a>
          </div>


          <!-- EXPIRATION NOTICE -->
          <div style="
            max-width:500px;
            margin:0 auto 24px;
            padding:16px 20px;
            border-radius:14px;
            background:#e8f2e9;
            color:#477258;
            font-size:14px;
            line-height:22px;
          ">
            <strong>⏱ This link expires in 30 minutes</strong>
            and can only be used once.
          </div>


          <!-- FALLBACK LINK -->
          <div style="
            max-width:500px;
            margin:0 auto;
            padding:20px;
            border-radius:14px;
            background:#f7f1e6;
            text-align:left;
          ">

            <p style="
              margin:0 0 10px;
              color:#666666;
              font-size:13px;
              line-height:20px;
            ">
              If the button does not work, copy and paste this link
              into your browser:
            </p>

            <a
              href="${link}"
              style="
                color:#3f7d56;
                font-size:13px;
                line-height:20px;
                word-break:break-all;
              "
            >
              ${link}
            </a>

          </div>


          <!-- DIVIDER -->
          <div style="
            height:1px;
            background:#e5ddd2;
            margin:35px 0 25px;
          "></div>


          <!-- SECURITY MESSAGE -->
          <p style="
            margin:0;
            color:#888888;
            font-size:13px;
            line-height:21px;
          ">
            ✉ &nbsp;
            If you did not request a password reset,
            you can safely ignore this email.
          </p>

        </div>


        <!-- BOTTOM DECORATION -->
        <div style="
          background:#dce9c8;
          padding:20px;
          text-align:center;
        ">

          <div style="
            color:#4e7959;
            font-size:15px;
            font-weight:700;
          ">
            Better Readers, Brighter Tomorrows
          </div>

          <div style="
            margin-top:5px;
            color:#78937c;
            font-size:11px;
          ">
            LIRA — Literacy Intelligence and Reading Assessment
          </div>

        </div>

      </div>


      <!-- EMAIL FOOTER -->
      <div style="
        text-align:center;
        padding:22px 20px 0;
        color:#999999;
        font-size:11px;
        line-height:18px;
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
