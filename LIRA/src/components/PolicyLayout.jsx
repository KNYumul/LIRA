import { useEffect, useState } from "react";
// import { Link, useLocation } from "react-router-dom";
import "./PolicyLayout.css";

const BACKDROP = "/UI_Designs/BACKGROUND/backdrop_full_palette_swirl.svg";

// const PAGE_LINKS = [
//   { to: "/privacy-policy", label: "Privacy Policy" },
//   { to: "/terms-of-use", label: "Terms of Use" },
// ];

export default function PolicyLayout({ badge, title, subtitle, sections }) {
  const [activeId, setActiveId] = useState(sections[0]?.id);
  // const location = useLocation();

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="lira-page" style={{ backgroundImage: `url(${BACKDROP})` }}>
      <main className="lira-main">
        <div className="lira-hero">
          <div className="lira-badge-row">
            <span className="lira-badge">{badge}</span>
            {/* <nav className="lira-page-links" aria-label="Policy pages">
              {PAGE_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={location.pathname === link.to ? "is-current" : ""}
                >
                  {link.label}
                </Link>
              ))}
            </nav> */}
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
              {sections.map((section, index) => (
                <li
                  key={section.id}
                  className={activeId === section.id ? "is-active" : ""}
                >
                  <button onClick={() => scrollToSection(section.id)}>
                    {index + 1}. {section.title}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="lira-content">
            {sections.map((section, index) => (
              <section id={section.id} key={section.id} className="lira-section">
                <div className="lira-section__badge">{index + 1}</div>
                <div className="lira-section__body">
                  <h2>{section.title}</h2>
                  {section.content}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
