import "./Footer.css";
import { Link } from "react-router-dom";

const logo = "/UI_Designs/LOGO/lira_logo_primary.svg";

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="lira-footer">
      <div className="lira-footer__container">

        {/* LEFT SIDE */}
        <div className="lira-footer__left">
          <div className="lira-footer__intro">

            {/* LOGO */}
            <Link
              to="/"
              className="lira-footer__logo-link"
              aria-label="LIRA home"
            >
              <div className="lira-footer__logo-crop">
                <img
                  className="lira-footer__logo"
                  src={logo}
                  alt="LIRA"
                />
              </div>
            </Link>

            {/* DESCRIPTION */}
            <p className="lira-footer__description">
              <strong>LIRA</strong> is a multimodal AI framework for early
              literacy risk screening and reading comprehension assessment
              among Grade 3 learners — built for DepEd classrooms.
            </p>
          </div>

          {/* DIVIDER */}
          <div className="lira-footer__divider" />

          {/* COPYRIGHT */}
          <div className="lira-footer__legal">
            <span>
              &copy; {year} LIRA – Literacy Intelligence and Reading Assessment.
              All rights reserved.
            </span>

            <span>
              ♥ Made with love for the Filipino Students.
            </span>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="lira-footer__right">

          {/* ABOUT */}
          <nav
            className="lira-footer__column"
            aria-label="About links"
          >
            <h2>About</h2>

            <Link to="/#about">
              About LIRA
            </Link>

            <Link to="/#how-it-works">
              How It Works
            </Link>

            <Link to="/#flow">
              The Flow
            </Link>

            <Link to="/login">
              Login
            </Link>
          </nav>

          {/* RESOURCES */}
          <nav
            className="lira-footer__column"
            aria-label="Resource links"
          >
            <h2>Resources</h2>

            <Link to="/help-center">
              Help Center
            </Link>

            <a
              href="https://ebeis.deped.gov.ph/beis/reports_info/masterlist"
              target="_blank"
              rel="noopener noreferrer"
            >
              For DepEd Schools
            </a>

            <Link to="/privacy-policy">
              Privacy Policy
            </Link>

            <Link to="/terms-of-use">
              Terms of Use
            </Link>
          </nav>

          {/* CONTACT */}
          <address className="lira-footer__column lira-footer__contact">
            <h2>Contact</h2>

            <a href="mailto:support.lira3@gmail.com">
              support.lira3@gmail.com
            </a>

            <span>
              Department of Education
            </span>

            <span>
              Navotas Elementary School - Central, Philippines
            </span>

            <Link
              className="lira-footer__portal"
              to="/admin/login"
            >
              Admin Portal
            </Link>
          </address>

        </div>
      </div>
    </footer>
  );
}

export default Footer;