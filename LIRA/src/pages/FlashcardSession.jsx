import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./FlashcardSession.css";

const bgSession = "/UI_Designs/BACKGROUND/backdrop_flashcards.svg";

// Placeholder content per difficulty — swap in real sets whenever they're
// ready. Each card's `read` portion is the part already highlighted as
// "spoken" (shown in blue/bold); `rest` is the remaining text.
const SETS = {
  easy: [
    { read: "Pip is a little orange cat. He", rest: "loves to sleep in the warm sun." },
  ],
  medium: [
    { read: "", rest: "The curious fox explored the quiet forest at dawn." },
  ],
  hard: [
    { read: "", rest: "The scientist carefully recorded her observations in a notebook." },
  ],
};

const LABELS = { easy: "Easy", medium: "Medium", hard: "Hard" };

export default function FlashcardSession() {
  const { difficulty } = useParams();
  const navigate = useNavigate();

  // Which card in the set is showing. Advancing between cards, scoring,
  // and actually listening to speech are not implemented yet — this is
  // just the static shell, ready for that logic to be added later.
  const [index] = useState(0);

  const set = SETS[difficulty] || SETS.easy;
  const total = set.length;
  const current = set[index];
  const label = LABELS[difficulty] || "Easy";

  const handleMicClick = () => {
    // TODO: wire up real mic / speech-recognition logic here.
    console.log("Mic tapped — no listening logic wired up yet.");
  };

  return (
    <div className="fs-page" style={{ backgroundImage: `url(${bgSession})` }}>
      <header className="fs-header">
        <button
          className="fs-back"
          onClick={() => navigate("/flashcards")}
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="fs-title">{label}</h1>
      </header>

      <main className="fs-main">
        <div className="fs-card-stack">
          <div className="fs-card-shadow" aria-hidden="true" />
          <div className="fs-card">
            <div className="fs-card__top">
              <span className="fs-card__number">{index + 1}</span>
              <span className="fs-card__total">/{total}</span>
            </div>

            <p className="fs-sentence">
              {current.read && (
                <span className="fs-sentence__read">{current.read} </span>
              )}
              <span className="fs-sentence__rest">{current.rest}</span>
            </p>

            <button
              className="fs-mic"
              onClick={handleMicClick}
              aria-label="Start listening"
            >
              🎤
            </button>
            <span className="fs-mic__status">Listening...</span>
          </div>
        </div>
      </main>
    </div>
  );
}