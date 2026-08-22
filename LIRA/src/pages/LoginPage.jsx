import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

const fox = "/UI_Designs/ANIMALS/mascot_fox.svg";
const owl = "/UI_Designs/ANIMALS/mascot_owl.svg";

function LoginPage() {
  const navigate = useNavigate();
  const [portal, setPortal] = useState("student");
  const [teacherMode, setTeacherMode] = useState("login");
  const [error, setError] = useState("");

  const isStudent = portal === "student";
  const isSignUp = teacherMode === "signup";


  async function submitForm(event) {
    event.preventDefault();
    setError("");

  const formData = new FormData(event.target);

  const lastName = formData.get("lastName");
  const birthdate = formData.get("birthdate");

  console.log("Lastname:", lastName);
  console.log("Birthdate:", birthdate);

    if (isStudent) {
    try {
      const response = await fetch("http://localhost:5000/api/learners/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          lastName,
          birthdate
        })
      });

      const data = await response.json();

      if (!response.ok) {
         setError(data.message);
        return;
      }

      // console.log("Logged in learner:", data.learner);
      // alert(`Welcome, ${data.learner.firstName}!`);
      navigate("/category");

    } catch (error) {
      console.error("Login error:", error);
       setError("Unable to connect to the server.");
     }
    } else {
      const endpoint = isSignUp ? "/signup" : "/login";
      const payload = {
        email: formData.get("email"),
        password: formData.get("password"),
      };

      if (isSignUp) {
        payload.firstName = formData.get("firstName");
        payload.lastName = formData.get("lastName");
      }

      try {
        const response = await fetch(`http://localhost:5000/api/teachers${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Teacher login failed.");
          return;
        }

        localStorage.setItem("liraSession", JSON.stringify({ role: "teacher", user: data.teacher }));
        navigate("/teacher");
      } catch (error) {
        console.error("Teacher login error:", error);
        setError("Unable to connect to the server.");
      }
   }
}

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="login-choice" aria-labelledby="login-choice-title">
          <h1 id="login-choice-title">Ready to get started?</h1>
          <p>Teachers log in with their DepEd account. Students are added by their teacher and log in with just a name and birthdate.</p>
          <div className="login-choice__actions">
            <button className={!isStudent ? "is-active" : ""} type="button" onClick={() => setPortal("teacher")}>I’m a Teacher ↓</button>
            <button className={isStudent ? "is-active" : ""} type="button" onClick={() => setPortal("student")}>I’m a Student ↓</button>
          </div>
        </div>

        <form className={`portal-card ${isStudent ? "portal-card--student" : "portal-card--teacher"}`} onSubmit={submitForm}>
          <div className="portal-card__heading">
            <img src={isStudent ? fox : owl} alt="" />
            <div>
              <h2>{isStudent ? "Student Portal" : "Teacher Portal"}</h2>
              <p>{isStudent ? "For Grade 3 Learners" : "For DepEd Facilitators"}</p>
            </div>
          </div>

          {isStudent ? (
            <>
              <div className="student-bunting" aria-hidden="true"><i /><i /><i /><i /><i /></div>
              <div className="portal-fields portal-fields--two">
                <label><span className="field-label">Type your Last Name <em>*</em></span><input name="lastName" required /></label>
                <label><span className="field-label">Type your Birthdate <em>*</em></span><input name="birthdate" type="date" required /></label>
              </div>
            <button className="portal-submit" type="submit">Log in</button>
            </>
          ) : (
            <>
              <div className="teacher-tabs" role="tablist" aria-label="Teacher account actions">
                <button className={!isSignUp ? "is-active" : ""} type="button" onClick={() => setTeacherMode("login")}>Log in</button>
                <button className={isSignUp ? "is-active" : ""} type="button" onClick={() => setTeacherMode("signup")}>Sign up</button>
              </div>
              <div className="portal-fields portal-fields--teacher">
                {isSignUp && <label><span className="field-label">First Name <em>*</em></span><input name="firstName" required /></label>}
                {isSignUp && <label><span className="field-label">Last Name <em>*</em></span><input name="lastName" required /></label>}
                <label><span className="field-label">DepEd Email <em>*</em></span><input name="email" type="email" autoComplete="email" required /></label>
                <label><span className="field-label">Password <em>*</em></span><input name="password" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} required /></label>
              </div>
              <button className="portal-submit" type="submit">{isSignUp ? "Sign up" : "Log in"}</button>
              <div className="portal-divider"><span>OR</span></div>
              <button className="google-button" type="button"><b aria-hidden="true">●</b> Connect thru Gmail / Google Workspace</button>
            </>
          )}
          {error && <p role="alert">{error}</p>}
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
