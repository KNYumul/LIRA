import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import LiraLogo from "../assets/lira_logo_horizontal.svg";
import Backdrop from "../assets/backdrop_full_palette_swirl.svg";
import "./PolicyLayout.css";

const PAGE_LINKS = [
  { to: "/", label: "Privacy Policy" },
  { to: "/terms-of-use", label: "Terms of Use" },
];

export default function PolicyLayout({ badge, title, subtitle, sections }) {
  const [activeId, setActiveId] = useState(sections[0]?.id);
  const location = useLocation();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="lira-page" style={{ backgroundImage: `url(${Backdrop})` }}>
      <header className="lira-header">
        <div className="lira-header__brand">
          <img src={LiraLogo} alt="LIRA" className="lira-header__logo" />
          <span className="lira-header__tagline">
            Literacy Intelligence and Reading Assessment
          </span>
        </div>

        <nav className="lira-header__nav">
          <a href="#about">About</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
        </nav>

        <div className="lira-header__actions">
          <span className="lira-header__avatar" aria-hidden="true">
            🦉
          </span>
          <button className="lira-header__login">Login</button>
        </div>
      </header>

      <main className="lira-main">
        <div className="lira-hero">
          <div className="lira-badge-row">
            <span className="lira-badge">{badge}</span>
            <nav className="lira-page-links">
              {PAGE_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={location.pathname === link.to ? "is-current" : ""}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <h1 className="lira-title">{title}</h1>

          <p className="lira-subtitle">{subtitle}</p>

          <div className="lira-dots" aria-hidden="true">
            <span className="lira-dot lira-dot--butter" />
            <span className="lira-dot lira-dot--peach" />
            <span className="lira-dot lira-dot--coral" />
            <span className="lira-dot lira-dot--sky" />
            <span className="lira-dot lira-dot--sage" />
          </div>
        </div>

        <div className="lira-layout">
          <aside className="lira-sidebar">
            <p className="lira-sidebar__label">On This Page</p>
            <ul className="lira-sidebar__list">
              {sections.map((s, i) => (
                <li key={s.id} className={activeId === s.id ? "is-active" : ""}>
                  <button onClick={() => scrollToSection(s.id)}>
                    {i + 1}. {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="lira-content">
            {sections.map((s, i) => (
              <section id={s.id} key={s.id} className="lira-section">
                <div className="lira-section__badge">{i + 1}</div>
                <div className="lira-section__body">
                  <h2>{s.title}</h2>
                  {s.content}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
