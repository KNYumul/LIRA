import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import "./Category.css";
import { clearSession } from "../utils/session";

const penguinIcon = "/UI_Designs/ANIMALS/H_Penguin.png";
const catIcon = "/UI_Designs/ANIMALS/D_Cat.png";
const frogMascot = "/UI_Designs/ANIMALS/G_Frog.png";
const bgDashboard =
  "/UI_Designs/BACKGROUND/backdrop_coral_peach_sunrise.svg";

export default function Category() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [lang, setLang] = useState(() =>
    searchParams.get("lang") === "FIL" ? "FIL" : "ENG"
  );

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
        {/* PAGE TITLE */}
        <div className="dash-heading">
          <span className="dash-heading__sparkle dash-heading__sparkle--one">
            ✦
          </span>

          <span className="dash-heading__sparkle dash-heading__sparkle--two">
            ★
          </span>

          <h1>What would you like to practice?</h1>

          <p>Choose an activity and let&apos;s start learning!</p>
        </div>

        {/* ACTIVITY CARDS */}
        <div className="dash-cards">
          {/* ================= FLASHCARDS ================= */}
          <button
            type="button"
            className="dash-card dash-card--flashcards"
            onClick={() => navigate(`/flashcards?lang=${lang}`)}
          >
            {/* Background decorations */}
            <span
              className="dash-card__shape dash-card__shape--one"
              aria-hidden="true"
            />

            <span
              className="dash-card__shape dash-card__shape--two"
              aria-hidden="true"
            />

            <span
              className="dash-card__star dash-card__star--one"
              aria-hidden="true"
            >
              ✦
            </span>

            <span
              className="dash-card__star dash-card__star--two"
              aria-hidden="true"
            >
              ★
            </span>

            {/* Penguin */}
            <div className="dash-card__icon-wrap">
              <span
                className="dash-card__mini-dot dash-card__mini-dot--one"
                aria-hidden="true"
              />

              <span
                className="dash-card__mini-dot dash-card__mini-dot--two"
                aria-hidden="true"
              />

              <img
                src={penguinIcon}
                alt=""
                className="dash-card__icon"
              />
            </div>

            {/* Text */}
            <div className="dash-card__content">
              <span className="dash-card__label">
                WORD PRACTICE
              </span>

              <h2>Flashcards</h2>

              <p>Practice sight words out loud</p>
            </div>

            {/* Bottom-right button */}
            <div className="dash-card__action">
              <span>Let&apos;s Practice</span>

              <span
                className="dash-card__arrow"
                aria-hidden="true"
              >
                →
              </span>
            </div>
          </button>

          {/* ================= STORY MODE ================= */}
          <button
            type="button"
            className="dash-card dash-card--story"
            onClick={() => navigate(`/story-mode?lang=${lang}`)}
          >
            {/* Background decorations */}
            <span
              className="dash-card__shape dash-card__shape--one"
              aria-hidden="true"
            />

            <span
              className="dash-card__shape dash-card__shape--two"
              aria-hidden="true"
            />

            <span
              className="dash-card__star dash-card__star--one"
              aria-hidden="true"
            >
              ✦
            </span>

            <span
              className="dash-card__star dash-card__star--two"
              aria-hidden="true"
            >
              ★
            </span>

            {/* Cat */}
            <div className="dash-card__icon-wrap">
              <span
                className="dash-card__mini-dot dash-card__mini-dot--one"
                aria-hidden="true"
              />

              <span
                className="dash-card__mini-dot dash-card__mini-dot--two"
                aria-hidden="true"
              />

              <img
                src={catIcon}
                alt=""
                className="dash-card__icon"
              />
            </div>

            {/* Text */}
            <div className="dash-card__content">
              <span className="dash-card__label">
                READ &amp; LEARN
              </span>

              <h2>Story Mode</h2>

              <p>Read stories and answer questions</p>
            </div>

            {/* Bottom-right button */}
            <div className="dash-card__action">
              <span>Start Reading</span>

              <span
                className="dash-card__arrow"
                aria-hidden="true"
              >
                →
              </span>
            </div>
          </button>
        </div>
      </main>

      {/* Frog */}
      <img
        src={frogMascot}
        alt=""
        className="dash-frog"
      />
    </div>
  );
}