import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Admin-LoginPage.css";

const mascot = "/UI_Designs/ANIMALS/K_Squirrel.png";

function AdminLoginPage() {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function updateField(event) {
    const { name, value } = event.target;
    setCredentials((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost:5000/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Admin login failed.");
        return;
      }

      localStorage.setItem("liraSession", JSON.stringify({ role: "admin", user: data.admin }));
      navigate("/admin");
    } catch (error) {
      console.error("Admin login error:", error);
      setError("Unable to connect to the server.");
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-hero" aria-labelledby="admin-login-title">
        <form className="admin-login-card" onSubmit={handleSubmit}>
          <img className="admin-login-mascot" src={mascot} alt="" />
          <h1 id="admin-login-title">Admin Login</h1>
          <p>For authorized school personnel or<br />division IT administrators only.</p>

          <label htmlFor="admin-email">DepEd Email <span aria-hidden="true">*</span></label>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="email"
            value={credentials.email}
            onChange={updateField}
            required
          />

          <label htmlFor="admin-password">Password <span aria-hidden="true">*</span></label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={credentials.password}
            onChange={updateField}
            required
          />

          <button type="submit">Log in</button>
          {error && <p role="alert">{error}</p>}
        </form>
      </section>
    </main>
  );
}

export default AdminLoginPage;
