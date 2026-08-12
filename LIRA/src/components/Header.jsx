import "./Header.css";
import { Link } from "react-router-dom";

const logo = "/UI_Designs/LOGO/lira_logo_primary.svg";
const foxIcon = "/UI_Designs/ANIMALS/F_Fox.png";

function Header() {
  return (
    <header className="lira-header">
      <div className="lira-header__inner">
        <Link className="lira-header__brand" to="/" aria-label="LIRA home">
          <img src={logo} alt="LIRA" className="lira-header__logo" />
          <span className="lira-header__brand-text">
            <strong>LIRA</strong>
            <small>Literacy Intelligence and Reading Assessment</small>
          </span>
        </Link>

        <div className="lira-header__right">
          <nav className="lira-header__links" aria-label="Primary navigation">
            <Link to="/#about">About</Link>
            <Link to="/#how-it-works">How It Works</Link>
            <Link to="/#features">Features</Link>
          </nav>
          <div className="lira-header__actions">
            <img src={foxIcon} alt="" className="lira-header__icon" />
            <Link className="lira-header__login" to="/login">Login</Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
