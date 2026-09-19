import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import "./FlashcardSession.css";

import CompletionScreen from "../components/CompletionScreen";
import FlashcardReader from "../components/FlashcardReader";
import { getSession } from "../utils/session";

const API_URL = import.meta.env.VITE_API_URL || "";

const bgSession =
  "/UI_Designs/BACKGROUND/backdrop_flashcards.svg";

const LABELS = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export default function FlashcardSession() {
  const { difficulty } = useParams();

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const lang =
    searchParams.get("lang") === "FIL"
      ? "FIL"
      : "ENG";

  const [cards, setCards] = useState([]);

  const [index, setIndex] = useState(0);

  const [finished, setFinished] = useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const current = cards[index];

  const label =
    LABELS[difficulty] || "Easy";

  const languageLabel =
    lang === "FIL"
      ? "Filipino"
      : "English";


  /* ========================================
     LOAD FLASHCARDS
  ======================================== */

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      setError("");

      setFinished(false);

      try {
        const learnerId =
          getSession()?.user?.id;

        const response = await fetch(
          `${API_URL}/api/flashcards?category=${encodeURIComponent(
            difficulty
          )}&lang=${lang}`,
          {
            headers: {
              "X-Learner-Id":
                learnerId || "",
            },
          }
        );

        const data = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Could not load flashcards."
          );
        }

        if (!cancelled) {
          setCards(data);

          setIndex(0);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError.message ||
              "Could not load flashcards."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [difficulty, lang]);


  /* ========================================
     COMPLETION SCREEN
  ======================================== */

  if (finished) {
    return (
      <CompletionScreen
        onBack={() =>
          navigate(
            `/flashcards?lang=${lang}`
          )
        }
        backLabel="Back to Flashcards"
      />
    );
  }


  /* ========================================
     PAGE
  ======================================== */

  return (
    <div
      className="fs-page"
      style={{
        backgroundImage: `url(${bgSession})`,
      }}
    >

      {/* =====================================
          HEADER
      ===================================== */}

      <header className="fs-header">

        <button
          className="fs-back"
          onClick={() =>
            navigate(
              `/flashcards?lang=${lang}`
            )
          }
          aria-label="Back"
        >
          ←
        </button>

        <h1 className="fs-title">
          {label} · {languageLabel}
        </h1>

      </header>


      {/* =====================================
          MAIN
      ===================================== */}

      <main className="fs-main">

        {/* LOADING */}

        {loading && (
          <div className="fs-message">
            Loading your teacher&apos;s
            flashcards...
          </div>
        )}


        {/* ERROR */}

        {!loading && error && (
          <div className="fs-message fs-message--error">
            {error}
          </div>
        )}


        {/* NO FLASHCARDS */}

        {!loading &&
          !error &&
          !current && (
            <div className="fs-message">
              Your teacher has not added any{" "}
              {label.toLowerCase()} {lang}{" "}
              flashcards yet.
            </div>
          )}


        {/* ===================================
            FLASHCARD
        =================================== */}

        {!loading &&
          !error &&
          current && (
            <div className="fs-card-stack">

              {/* CARD BEHIND */}

              <div
                className="fs-card-shadow"
                aria-hidden="true"
              />


              {/* MAIN CARD */}

              <div
                className={`fs-card fs-card--${difficulty}`}
              >

                {/* ============================
                    CUTE MOVING DECORATIONS
                ============================ */}

                <div
                  className="fs-card-decorations"
                  aria-hidden="true"
                >

                  {/* STARS */}

                  <span className="fs-deco fs-deco--star1">
                    ★
                  </span>

                  <span className="fs-deco fs-deco--star2">
                    ✦
                  </span>


                  {/* SPARKLES */}

                  <span className="fs-deco fs-deco--sparkle">
                    ✧
                  </span>

                  <span className="fs-deco fs-deco--sparkle2">
                    ✦
                  </span>


                  {/* BUBBLES */}

                  <span className="fs-deco fs-deco--bubble1" />

                  <span className="fs-deco fs-deco--bubble2" />

                  <span className="fs-deco fs-deco--bubble3" />

                  <span className="fs-deco fs-deco--bubble4" />


                  {/* HEART */}

                  <span className="fs-deco fs-deco--heart">
                    ♥
                  </span>


                  {/* FLOWER */}

                  <span className="fs-deco fs-deco--flower">
                    ✿
                  </span>

                </div>


                {/* ============================
                    CARD NUMBER
                ============================ */}

                <div className="fs-card__top">

                  <span className="fs-card__number">
                    {index + 1}
                  </span>

                </div>


                {/* ============================
                    FLASHCARD READER
                ============================ */}

                <FlashcardReader
                  key={`${difficulty}-${lang}-${index}-${
                    current._id ||
                    current.id ||
                    current.content
                  }`}
                  text={current.content}
                  language={lang}
                />


                {/* ============================
                    NAVIGATION
                ============================ */}

                <div className="fs-navigation">

                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() =>
                      setIndex(
                        (value) =>
                          value - 1
                      )
                    }
                  >
                    Previous
                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      index ===
                      cards.length - 1
                        ? setFinished(true)
                        : setIndex(
                            (value) =>
                              value + 1
                          )
                    }
                  >
                    {index ===
                    cards.length - 1
                      ? "Finish"
                      : "Next"}
                  </button>

                </div>

              </div>

            </div>
          )}

      </main>

    </div>
  );
}