import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Admin-LoginPage.css";
import { saveSession } from "../utils/session";
import { showError } from "../utils/alerts";
// Importing directly fixes broken image paths across bundlers
import mascot from "../assets/icons/Squirrel.png"; 

function AdminLoginPage() {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!error) return;
    const message = error;
    setError("");
    showError(message, "Admin login unsuccessful");
  }, [error]);

  const depedEmailRegex = /^[a-zA-Z._%+-]+@deped\.gov\.ph$/i;

  const isEmailDomainInvalid =
    credentials.email.includes("@") && !depedEmailRegex.test(credentials.email);

  function updateField(event) {
    const { name, value } = event.target;

    if (name === "email") {
      const lettersAndSymbolsOnly = value.replace(/[0-9]/g, "");
      if (lettersAndSymbolsOnly.length <= 75) {
        setCredentials((current) => ({ ...current, email: lettersAndSymbolsOnly }));
      }
      return;
    }

    if (name === "password") {
      if (value.length <= 50) {
        setCredentials((current) => ({ ...current, password: value }));
      }
      return;
    }

    setCredentials((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const email = credentials.email.trim();
    const password = credentials.password;

    if (!email || !password) {
      const warning = {
        status: 400,
        type: "VALIDATION_WARNING",
        message: "All fields are required.",
        fields: {
          email: !email ? "Missing" : "Provided",
          password: !password ? "Missing" : "Provided",
        },
      };
      console.warn("JSON Warning (Admin Login):", JSON.stringify(warning, null, 2));
      setError("All fields are required.");
      return;
    }

    if (email.length > 75) {
      const warning = {
        status: 400,
        type: "VALIDATION_WARNING",
        message: "DepEd Email exceeds 75 characters.",
      };
      console.warn("JSON Warning (Email Length):", JSON.stringify(warning, null, 2));
      setError("DepEd Email cannot exceed 75 characters.");
      return;
    }

    if (!depedEmailRegex.test(email)) {
      const warning = {
        status: 400,
        type: "VALIDATION_WARNING",
        message: "Invalid domain. Only @deped.gov.ph emails are allowed.",
        attemptedEmail: email,
      };
      console.warn("JSON Warning (Invalid Domain):", JSON.stringify(warning, null, 2));
      setError("Only official @deped.gov.ph email addresses are accepted.");
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,50}$/;
    if (!passwordRegex.test(password)) {
      const warning = {
        status: 400,
        type: "VALIDATION_WARNING",
        message: "Password does not meet complexity requirements.",
      };
      console.warn("JSON Warning (Weak Password):", JSON.stringify(warning, null, 2));
      setError(
        "Password must be 8-50 characters long and contain at least one uppercase letter, one number, and one special character."
      );
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Admin login failed.");
        return;
      }

      console.log(
        "JSON Reminder (Admin Login Success):",
        JSON.stringify(
          {
            status: response.status,
            success: true,
            message: "Admin login successful",
            user: data.admin,
          },
          null,
          2
        )
      );

      saveSession({ role: "admin", user: data.admin });
      navigate("/admin");
    } catch (error) {
      console.error("Admin login error:", error);
      setError("Unable to connect to the server.");
    }
  }

  // Google OAuth Login Action
  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:5000/api/auth/google?role=admin";
  };

  return (
    <main className="admin-login-page">
      <section className="admin-login-hero" aria-labelledby="admin-login-title">
        <form className="admin-login-card" onSubmit={handleSubmit} noValidate>
          <img className="admin-login-mascot" src={mascot} alt="Admin Squirrel Mascot" />
          <h1 id="admin-login-title">Admin Login</h1>
          <p>
            For authorized school personnel or
            <br />
            division IT administrators only.
          </p>

          <label htmlFor="admin-email">
            DepEd Email <span aria-hidden="true" style={{ color: "#d9534f" }}>*</span>
          </label>
          <input
            id="admin-email"
            name="email"
            type="text"
            autoComplete="email"
            maxLength={75}
            value={credentials.email}
            onChange={updateField}
            placeholder="user@deped.gov.ph"
            style={
              isEmailDomainInvalid
                ? {
                    borderColor: "#d9534f",
                    boxShadow: "0 0 0 2px rgba(217, 83, 79, 0.2)",
                  }
                : {}
            }
            required
          />
          {isEmailDomainInvalid && (
            <span
              style={{
                color: "#d9534f",
                fontSize: "0.62rem",
                marginTop: "-12px",
                marginBottom: "12px",
                display: "block",
              }}
            >
              Must end with @deped.gov.ph
            </span>
          )}

          <label htmlFor="admin-password">
            Password <span aria-hidden="true" style={{ color: "#d9534f" }}>*</span>
          </label>
          <div className="admin-password-wrapper">
            <input
              id="admin-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              maxLength={50}
              value={credentials.password}
              onChange={updateField}
              required
            />
            <button
              type="button"
              className="admin-toggle-password"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          <button type="submit" className="admin-submit-btn">
            Log in
          </button>

          {/* OR Divider */}
          <div className="admin-login-divider">
            <span>OR</span>
          </div>

          {/* Google SSO Button matching exact design */}
          <button
            type="button"
            className="admin-google-btn"
            onClick={handleGoogleLogin}
          >
            <span className="google-dot"></span>
            <span>Connect through Gmail / Google Workspace</span>
          </button>

        </form>
      </section>
    </main>
  );
}

export default AdminLoginPage;
