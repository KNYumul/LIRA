import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";
import { saveSession } from "../utils/session";

const fox = "/UI_Designs/ANIMALS/mascot_fox.svg";
const owl = "/UI_Designs/ANIMALS/mascot_owl.svg";

async function readApiResponse(response) {
  const responseText = await response.text();
  try {
    return { data: JSON.parse(responseText) };
  } catch {
    return {
      error:
        "The server returned HTML instead of an API response. Ensure the backend has the /api/teachers/login route and has been restarted.",
    };
  }
}

function LoginPage() {
  const navigate = useNavigate();
  const [portal, setPortal] = useState("student");
  const [teacherMode, setTeacherMode] = useState("login");
  const [error, setError] = useState("");

  // Student state
  const [studentLastName, setStudentLastName] = useState("");
  const [birthdate, setBirthdate] = useState("");

  // Teacher state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isStudent = portal === "student";
  const isSignUp = teacherMode === "signup";

  const todayString = new Date().toISOString().split("T")[0];
  const depedEmailRegex = /^[a-zA-Z._%+-]+@deped\.gov\.ph$/i;

  // Real-time invalid domain detection once user inputs '@'
  const isEmailDomainInvalid = email.includes("@") && !depedEmailRegex.test(email);

  // Live password checklist rules
  const passwordRules = {
    length: password.length >= 8 && password.length <= 50,
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };

  // Name formatter: letters, spaces, hyphens only (no numbers), max 50 chars, auto-capitalize words
  const formatNameInput = (value) => {
    const lettersOnly = value.replace(/[^a-zA-Z\s\-']/g, "");
    const truncated = lettersOnly.slice(0, 50);
    return truncated.replace(/\b[a-z]/g, (char) => char.toUpperCase());
  };

  const handleStudentLastNameChange = (e) => {
    setStudentLastName(formatNameInput(e.target.value));
  };

  const handleBirthdateChange = (e) => {
    const selectedDate = e.target.value;
    if (selectedDate && selectedDate > todayString) {
      return;
    }
    setBirthdate(selectedDate);
  };

  const handleFirstNameChange = (e) => {
    setFirstName(formatNameInput(e.target.value));
  };

  const handleLastNameChange = (e) => {
    setLastName(formatNameInput(e.target.value));
  };

  // Email handler: block numbers and limit to 75 characters
  const handleEmailChange = (e) => {
    const lettersAndSymbolsOnly = e.target.value.replace(/[0-9]/g, "");
    if (lettersAndSymbolsOnly.length <= 75) {
      setEmail(lettersAndSymbolsOnly);
    }
  };

  // Password handler: hard-cap at 50 characters
  const handlePasswordChange = (e) => {
    const val = e.target.value;
    if (val.length <= 50) {
      setPassword(val);
    }
  };

  async function submitForm(event) {
    event.preventDefault();
    setError("");

    // ================= STUDENT LOGIN =================
    if (isStudent) {
      const trimmedLastName = studentLastName.trim();

      if (!trimmedLastName || !birthdate) {
        const warning = {
          status: 400,
          type: "VALIDATION_WARNING",
          message: "All fields are required.",
          fields: {
            lastName: !trimmedLastName ? "Missing" : "Provided",
            birthdate: !birthdate ? "Missing" : "Provided",
          },
        };
        console.warn("JSON Warning (Student Login):", JSON.stringify(warning, null, 2));
        setError("All fields are required.");
        return;
      }

      if (trimmedLastName.length > 50) {
        const warning = {
          status: 400,
          type: "VALIDATION_WARNING",
          message: "Last Name cannot exceed 50 characters.",
        };
        console.warn("JSON Warning (Student Last Name Length):", JSON.stringify(warning, null, 2));
        setError("Last Name cannot exceed 50 characters.");
        return;
      }

      if (birthdate > todayString) {
        const warning = {
          status: 400,
          type: "VALIDATION_WARNING",
          message: "Future dates are not allowed.",
          providedDate: birthdate,
        };
        console.warn("JSON Warning (Future Date):", JSON.stringify(warning, null, 2));
        setError("Birthdate cannot be a future date.");
        return;
      }

      try {
        const response = await fetch("http://localhost:5000/api/learners/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lastName: trimmedLastName,
            birthdate,
          }),
        });

        const { data, error: responseError } = await readApiResponse(response);

        if (responseError) {
          setError(responseError);
          return;
        }

        if (!response.ok) {
          setError(data.message || "Student login failed.");
          return;
        }

        console.log(
          "JSON Reminder (Student Login Success):",
          JSON.stringify(
            {
              status: 200,
              success: true,
              message: "Student login successful",
              user: data.learner,
            },
            null,
            2
          )
        );

        navigate("/category");
      } catch (error) {
        console.error("Login error:", error);
        setError("Unable to connect to the server.");
      }
    } else {
      // ================= TEACHER PORTAL (LOGIN & SIGNUP) =================
      const userEmail = email.trim();
      const userPassword = password;
      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();

      if (!userEmail || !userPassword || (isSignUp && (!trimmedFirstName || !trimmedLastName))) {
        const warning = {
          status: 400,
          type: "VALIDATION_WARNING",
          message: "All fields are required.",
          fields: {
            ...(isSignUp && {
              firstName: !trimmedFirstName ? "Missing" : "Provided",
              lastName: !trimmedLastName ? "Missing" : "Provided",
            }),
            email: !userEmail ? "Missing" : "Provided",
            password: !userPassword ? "Missing" : "Provided",
          },
        };
        console.warn("JSON Warning (Teacher Portal):", JSON.stringify(warning, null, 2));
        setError("All fields are required.");
        return;
      }

      if (isSignUp) {
        if (trimmedFirstName.length > 50 || trimmedLastName.length > 50) {
          const warning = {
            status: 400,
            type: "VALIDATION_WARNING",
            message: "Names must not exceed 50 characters.",
          };
          console.warn("JSON Warning (Name Length):", JSON.stringify(warning, null, 2));
          setError("Names cannot exceed 50 characters.");
          return;
        }
      }

      if (userEmail.length > 75) {
        const warning = {
          status: 400,
          type: "VALIDATION_WARNING",
          message: "DepEd Email exceeds 75 characters.",
        };
        console.warn("JSON Warning (Email Length):", JSON.stringify(warning, null, 2));
        setError("DepEd Email cannot exceed 75 characters.");
        return;
      }

      if (!depedEmailRegex.test(userEmail)) {
        const warning = {
          status: 400,
          type: "VALIDATION_WARNING",
          message: "Invalid domain. Only @deped.gov.ph emails are allowed.",
          attemptedEmail: userEmail,
        };
        console.warn("JSON Warning (Invalid Domain):", JSON.stringify(warning, null, 2));
        setError("Only official @deped.gov.ph email addresses are accepted.");
        return;
      }

      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,50}$/;
      if (!passwordRegex.test(userPassword)) {
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

      const endpoint = isSignUp ? "/signup" : "/login";
      const payload = { email: userEmail, password: userPassword };

      if (isSignUp) {
        payload.firstName = trimmedFirstName;
        payload.lastName = trimmedLastName;
      }

      try {
        const response = await fetch(`http://localhost:5000/api/teachers${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const { data, error: responseError } = await readApiResponse(response);

        if (responseError) {
          setError(responseError);
          return;
        }

        if (!response.ok) {
          setError(data.message || (isSignUp ? "Signup failed." : "Teacher login failed."));
          return;
        }

        console.log(
          `JSON Reminder (Teacher ${isSignUp ? "Signup" : "Login"} Success):`,
          JSON.stringify(
            {
              status: response.status,
              success: true,
              message: isSignUp ? "Teacher registered successfully" : "Teacher login successful",
              user: data.teacher,
            },
            null,
            2
          )
        );

        saveSession({ role: "teacher", user: data.teacher });
        navigate("/teacher");
      } catch (error) {
        console.error("Teacher portal error:", error);
        setError("Unable to connect to the server.");
      }
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="login-choice" aria-labelledby="login-choice-title">
          <h1 id="login-choice-title">Ready to get started?</h1>
          <p>
            Teachers log in with their DepEd account. Students are added by their teacher and log
            in with just a name and birthdate.
          </p>
          <div className="login-choice__actions">
            <button
              className={!isStudent ? "is-active" : ""}
              type="button"
              onClick={() => {
                setError("");
                setPortal("teacher");
              }}
            >
              I’m a Teacher ↓
            </button>
            <button
              className={isStudent ? "is-active" : ""}
              type="button"
              onClick={() => {
                setError("");
                setPortal("student");
              }}
            >
              I’m a Student ↓
            </button>
          </div>
        </div>

        <form
          className={`portal-card ${isStudent ? "portal-card--student" : "portal-card--teacher"}`}
          onSubmit={submitForm}
          noValidate
        >
          <div className="portal-card__heading">
            <img src={isStudent ? fox : owl} alt="" />
            <div>
              <h2>{isStudent ? "Student Portal" : "Teacher Portal"}</h2>
              <p>{isStudent ? "For Grade 3 Learners" : "For DepEd Facilitators"}</p>
            </div>
          </div>

          {isStudent ? (
            <>
              <div className="student-bunting" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="portal-fields portal-fields--two">
                <label>
                  <span className="field-label">
                    Type your Last Name <em style={{ color: "#d9534f" }}>*</em>
                  </span>
                  <input
                    name="lastName"
                    value={studentLastName}
                    onChange={handleStudentLastNameChange}
                    maxLength={50}
                    autoComplete="family-name"
                    required
                  />
                </label>
                <label>
                  <span className="field-label">
                    Type your Birthdate <em style={{ color: "#d9534f" }}>*</em>
                  </span>
                  <input
                    name="birthdate"
                    type="date"
                    value={birthdate}
                    onChange={handleBirthdateChange}
                    max={todayString}
                    onKeyDown={(e) => {
                      if (!/[0-9]/.test(e.key) && !["Backspace", "Tab", "Delete", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    required
                  />
                </label>
              </div>
              <button className="portal-submit" type="submit">
                Log in
              </button>
            </>
          ) : (
            <>
              <div className="teacher-tabs" role="tablist" aria-label="Teacher account actions">
                <button
                  className={!isSignUp ? "is-active" : ""}
                  type="button"
                  onClick={() => {
                    setError("");
                    setTeacherMode("login");
                  }}
                >
                  Log in
                </button>
                <button
                  className={isSignUp ? "is-active" : ""}
                  type="button"
                  onClick={() => {
                    setError("");
                    setTeacherMode("signup");
                  }}
                >
                  Sign up
                </button>
              </div>
              <div className="portal-fields portal-fields--teacher">
                {isSignUp && (
                  <label>
                    <span className="field-label">
                      First Name <em style={{ color: "#d9534f" }}>*</em>
                    </span>
                    <input
                      name="firstName"
                      value={firstName}
                      onChange={handleFirstNameChange}
                      maxLength={50}
                      autoComplete="given-name"
                      required
                    />
                  </label>
                )}
                {isSignUp && (
                  <label>
                    <span className="field-label">
                      Last Name <em style={{ color: "#d9534f" }}>*</em>
                    </span>
                    <input
                      name="lastName"
                      value={lastName}
                      onChange={handleLastNameChange}
                      maxLength={50}
                      autoComplete="family-name"
                      required
                    />
                  </label>
                )}
                <label>
                  <span className="field-label">
                    DepEd Email <em style={{ color: "#d9534f" }}>*</em>
                  </span>
                  <input
                    name="email"
                    type="text"
                    value={email}
                    onChange={handleEmailChange}
                    maxLength={75}
                    autoComplete="email"
                    style={
                      isEmailDomainInvalid
                        ? {
                            borderColor: "#d9534f",
                            boxShadow: "0 0 0 2px rgba(217, 83, 79, 0.2)",
                          }
                        : {}
                    }
                    placeholder="user@deped.gov.ph"
                    required
                  />
                  {isEmailDomainInvalid && (
                    <span style={{ color: "#d9534f", fontSize: "0.65rem", marginTop: "3px", display: "block" }}>
                      Must end with @deped.gov.ph
                    </span>
                  )}
                </label>
                <label>
                  <span className="field-label">
                    Password <em style={{ color: "#d9534f" }}>*</em>
                  </span>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={handlePasswordChange}
                      maxLength={50}
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                      style={{ width: "100%", paddingRight: "40px" }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      style={{
                        position: "absolute",
                        right: "10px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "4px",
                        color: "#6b6b6b",
                      }}
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
                  {isSignUp && password.length > 0 && (
                    <div style={{ marginTop: "6px", fontSize: "0.62rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px" }}>
                      <span style={{ color: passwordRules.length ? "#2e7d32" : "#d9534f" }}>
                        {passwordRules.length ? "✓" : "✗"} 8-50 characters
                      </span>
                      <span style={{ color: passwordRules.hasUpper ? "#2e7d32" : "#d9534f" }}>
                        {passwordRules.hasUpper ? "✓" : "✗"} 1 uppercase letter
                      </span>
                      <span style={{ color: passwordRules.hasNumber ? "#2e7d32" : "#d9534f" }}>
                        {passwordRules.hasNumber ? "✓" : "✗"} 1 number
                      </span>
                      <span style={{ color: passwordRules.hasSpecial ? "#2e7d32" : "#d9534f" }}>
                        {passwordRules.hasSpecial ? "✓" : "✗"} 1 special char
                      </span>
                    </div>
                  )}
                </label>
              </div>
              <button className="portal-submit" type="submit">
                {isSignUp ? "Sign up" : "Log in"}
              </button>
              <div className="portal-divider">
                <span>OR</span>
              </div>
              <button className="google-button" type="button">
                <b aria-hidden="true">●</b> Connect through Gmail / Google Workspace
              </button>
            </>
          )}
          {error && (
            <p role="alert" style={{ color: "#d9534f", textAlign: "center", marginTop: "14px" }}>
              {error}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}

export default LoginPage;