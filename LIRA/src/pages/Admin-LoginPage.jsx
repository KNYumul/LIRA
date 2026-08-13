import { useState } from "react";
import "./Admin-LoginPage.css";

const mascot = "/UI_Designs/ANIMALS/K_Squirrel.png";

function AdminLoginPage() {
  const [credentials, setCredentials] = useState({ email: "", password: "" });

  function updateField(event) {
    const { name, value } = event.target;
    setCredentials((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
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
        </form>
      </section>
    </main>
  );
}

export default AdminLoginPage;
