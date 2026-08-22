import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import "./Category.css";

const penguinIcon = "/UI_Designs/ANIMALS/H_Penguin.png";
const catIcon = "/UI_Designs/ANIMALS/D_Cat.png";
const frogMascot = "/UI_Designs/ANIMALS/G_Frog.png";
const bgDashboard = "/UI_Designs/BACKGROUND/backdrop_coral_peach_sunrise.svg";

export default function Category() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("liraSession");
    navigate("/");
  }
  const [lang, setLang] = useState("ENG");

  return (
    <div
      className="dash-page"
      style={{ backgroundImage: `url(${bgDashboard})` }}
    >
      <AppHeader
        links={[
          {
            label: "Flashcards",
            active: true,
            onClick: () => navigate("/flashcards"),
          },
          {
            label: "Story Mode",
            onClick: () => navigate("/story-mode"),
          },
        ]}
        actionLabel="Logout"
        onAction={handleLogout}
      />

      <main className="dash-main">
        <div className="lang-toggle" role="group" aria-label="Language">
          <button
            className={`lang-toggle__option ${
              lang === "ENG" ? "lang-toggle__option--active" : ""
            }`}
            onClick={() => setLang("ENG")}
          >
            ENG
          </button>
          <button
            className={`lang-toggle__option ${
              lang === "FIL" ? "lang-toggle__option--active" : ""
            }`}
            onClick={() => setLang("FIL")}
          >
            FIL
          </button>
        </div>

        <div className="dash-cards">
          <button
            className="dash-card"
            onClick={() => navigate("/flashcards")}
          >
            <img src={penguinIcon} alt="" className="dash-card__icon" />
            <h2>Flashcards</h2>
            <p>Practice sight words out loud</p>
          </button>

          <button
            className="dash-card"
            onClick={() => navigate("/story-mode")}
          >
            <img src={catIcon} alt="" className="dash-card__icon" />
            <h2>Story Mode</h2>
            <p>Read stories and answer questions</p>
          </button>
        </div>
      </main>

      <img src={frogMascot} alt="" className="dash-frog" />
    </div>
  );
}
