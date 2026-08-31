import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import "./Category.css";
import { clearSession } from "../utils/session";

const penguinIcon = "/UI_Designs/ANIMALS/H_Penguin.png";
const catIcon = "/UI_Designs/ANIMALS/D_Cat.png";
const frogMascot = "/UI_Designs/ANIMALS/G_Frog.png";
const bgDashboard = "/UI_Designs/BACKGROUND/backdrop_coral_peach_sunrise.svg";

export default function Category() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [lang, setLang] = useState(() => searchParams.get("lang") === "FIL" ? "FIL" : "ENG");

  const selectLanguage = (language) => {
    setLang(language);
    setSearchParams({ lang: language }, { replace: true });
  };

  function handleLogout() {
    clearSession();
    navigate("/");
  }

  return (
    <div
      className="dash-page"
      style={{ backgroundImage: `url(${bgDashboard})` }}
    >
      <Header
        logoSrc="/UI_Designs/LOGO/lira_logo_horizontal.svg"
        links={[]}
        actionLabel="Logout"
        onAction={handleLogout}
      />

      <main className="dash-main">
        <div className="lang-toggle" role="group" aria-label="Language">
          <button
            className={`lang-toggle__option ${
              lang === "ENG" ? "lang-toggle__option--active" : ""
            }`}
            onClick={() => selectLanguage("ENG")}
          >
            ENG
          </button>
          <button
            className={`lang-toggle__option ${
              lang === "FIL" ? "lang-toggle__option--active" : ""
            }`}
            onClick={() => selectLanguage("FIL")}
          >
            FIL
          </button>
        </div>

        <div className="dash-cards">
          <button
            className="dash-card"
            onClick={() => navigate(`/flashcards?lang=${lang}`)}
          >
            <img src={penguinIcon} alt="Flashcards" className="dash-card__icon" />
            <h2>Flashcards</h2>
            <p>Practice sight words out loud</p>
          </button>

          <button
            className="dash-card"
            onClick={() => navigate(`/story-mode?lang=${lang}`)}
          >
            <img src={catIcon} alt="Story Mode" className="dash-card__icon" />
            <h2>Story Mode</h2>
            <p>Read stories and answer questions</p>
          </button>
        </div>
      </main>

      <img src={frogMascot} alt="" className="dash-frog" />
    </div>
  );
}
