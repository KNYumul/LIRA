import React from "react";
import "../components/Header.css";
import { Link } from "react-router-dom";

import foxIcon from "../assets/icons/cat.svg";
const defaultLogo = "/UI_Designs/LOGO/lira_logo_horizontal.svg";

function Header({ logoSrc, links, actionLabel, onAction }) {
  return (
    <header className="lira-header">
      <div className="lira-header__inner">
        <Link className="lira-header__brand" to="/" aria-label="LIRA home">
          <img 
            src={logoSrc || defaultLogo} 
            alt="LIRA" 
            className="lira-header__logo" 
          />
          <span className="lira-header__brand-text">
            <small>Literacy Intelligence and Reading Assessment</small>
          </span>
        </Link>

        <div className="lira-header__right">
          <nav className="lira-header__links" aria-label="Primary navigation">
            {links ? (
              links.map((link, idx) => (
                <Link
                  key={idx}
                  to={link.to || "#"}
                  onClick={link.onClick}
                  className={link.active ? "active" : ""}
                >
                  {link.label}
                </Link>
              ))
            ) : (
              <>
                <Link to="/#about">About</Link>
                <Link to="/#how-it-works">How It Works</Link>
              </>
            )}
          </nav>

          <div className="lira-header__actions">
            <img src={foxIcon} alt="" className="lira-header__icon" />
            {onAction ? (
              <button className="lira-header__login" onClick={onAction}>
                {actionLabel || "Logout"}
              </button>
            ) : (
              <Link className="lira-header__login" to="/login">
                {actionLabel || "Login"}
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;