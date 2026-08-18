import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./FlashcardDifficulty.css";

const koalaIcon = "/UI_Designs/ANIMALS/B_Koala.png";
const turtleIcon = "/UI_Designs/ANIMALS/L_Turtle.png";
const dinoIcon = "/UI_Designs/ANIMALS/E_Dinosaur.png";
const bgFlashcards = "/UI_Designs/BACKGROUND/backdrop_flashcards.svg";

const DIFFICULTIES = [
  {
    key: "easy",
    label: "Easy",
    icon: koalaIcon,
    accent: "blue",
    description:
      "Short, familiar sight words to build reading confidence — perfect for warming up.",
  },
  {
    key: "medium",
    label: "Medium",
    icon: turtleIcon,
    accent: "coral",
    description:
      "Short, familiar sight words to build reading confidence — perfect for warming up.",
  },
  {
    key: "hard",
    label: "Hard",
    icon: dinoIcon,
    accent: "green",
    description:
      "Short, familiar sight words to build reading confidence — perfect for warming up.",
  },
];

export default function FlashcardDifficulty() {
  const navigate = useNavigate();
  const [lang, setLang] = useState("ENG");

  return (
    <div
      className="fc-page"
      style={{ backgroundImage: `url(${bgFlashcards})` }}
    >
      <header className="fc-header">
        <button
          className="fc-back"
          onClick={() => navigate("/category")}
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="fc-title">Flashcards</h1>

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
      </header>

      <main className="fc-main">
        <div className="fc-cards">
          {DIFFICULTIES.map((d) => (
            <div key={d.key} className={`fc-card fc-card--${d.accent}`}>
              <img src={d.icon} alt="" className="fc-card__icon" />
              <h2>{d.label}</h2>
              <p>{d.description}</p>
              <button
                className="fc-card__start"
                onClick={() => navigate(`/flashcards/${d.key}`)}
              >
                Start <span aria-hidden="true">→</span>
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}