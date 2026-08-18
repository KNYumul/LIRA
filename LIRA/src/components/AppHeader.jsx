import React from "react";
import { useNavigate } from "react-router-dom";
import "./AppHeader.css";

const logo = "/UI_Designs/LOGO/lira_logo_primary.svg";
const navFoxIcon = "/UI_Designs/ANIMALS/F_Fox.png";

/**
 * Shared nav bar used across WelcomePage and Dashboard.
 *
 * links: array of either
 *   { label, href }              -> renders as an <a> (anchor scroll, e.g. WelcomePage)
 *   { label, onClick, active }   -> renders as a <button> (in-app nav, e.g. Dashboard)
 * actionLabel: text for the right-side pill button (e.g. "Login" / "Logout")
 * onAction: click handler for that button. Defaults to navigating to /category.
 */
export default function AppHeader({ links = [], actionLabel = "Login", onAction }) {
  const navigate = useNavigate();

  const handleAction = () => {
    if (onAction) onAction();
    else navigate("/category");
  };

  return (
    <header className="lira-nav">
      <div className="lira-nav__inner">
        <div className="lira-nav__brand" onClick={() => navigate("/")}>
          <img src={logo} alt="LIRA logo" className="lira-nav__logo" />
          <div className="lira-nav__brandtext">
            <span className="lira-nav__name">LIRA</span>
            <span className="lira-nav__tagline">
              LITERACY INTELLIGENCE AND READING ASSESSMENT
            </span>
          </div>
        </div>

        <div className="lira-nav__right">
          <nav className="lira-nav__links">
            {links.map((link) =>
              link.href ? (
                <a key={link.label} href={link.href}>
                  {link.label}
                </a>
              ) : (
                <button
                  key={link.label}
                  className={`lira-nav__linkbtn ${
                    link.active ? "lira-nav__linkbtn--active" : ""
                  }`}
                  onClick={link.onClick}
                >
                  {link.label}
                </button>
              )
            )}
          </nav>

          <div className="lira-nav__actions">
            <img src={navFoxIcon} alt="" className="lira-nav__icon" />
            <button className="btn btn--pill btn--coral" onClick={handleAction}>
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}