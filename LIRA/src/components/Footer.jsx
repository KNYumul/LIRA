import "./Footer.css";
import { Link } from "react-router-dom";

const logo = "/UI_Designs/LOGO/lira_logo_primary.svg";

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="lira-footer">
      <div className="lira-footer__grid">
        <div className="lira-footer__intro">
          <Link to="/" aria-label="LIRA home">
            <img className="lira-footer__logo" src={logo} alt="LIRA" />
          </Link>
          <p>
            <strong>LIRA</strong> is a multimodal AI framework for early literacy
            risk screening and reading comprehension assessment among Grade 3
            learners — built for DepEd classrooms.
          </p>
        </div>

        <nav className="lira-footer__column" aria-label="About links">
          <h2>About</h2>
          <Link to="/#about">About LIRA</Link>
          <Link to="/#how-it-works">How It Works</Link>
          <Link to="/#how-it-works">The Flow</Link>
          <Link to="/login">Login</Link>
        </nav>

        <nav className="lira-footer__column" aria-label="Resource links">
          <h2>Resources</h2>
          <Link to="/help-center">Help Center</Link>
          <a href="#schools">For DepEd Schools</a>
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Use</a>
        </nav>

        <address className="lira-footer__column lira-footer__contact">
          <h2>Contact</h2>
          <a href="mailto:hello@lira-reading.ph">hello@lira-reading.ph</a>
          <span>Department of Education</span>
          <span>Pasig City, Philippines</span>
          <Link className="lira-footer__portal" to="/admin/login"><strong>Admin Portal</strong></Link>
        </address>
      </div>

      <div className="lira-footer__legal">
        <span>&copy; {year} LIRA – Literacy Intelligence and Reading Assessment. All rights reserved.</span>
        <span>♥ Made with love for the Filipino Students.</span>
      </div>
    </footer>
  );
}

export default Footer;
