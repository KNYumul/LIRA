import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./FlashcardDifficulty.css";
import { getSession } from "../utils/session";

const API_URL = import.meta.env.VITE_API_URL || "";
const bgFlashcards = "/UI_Designs/BACKGROUND/backdrop_flashcards.svg";
const DIFFICULTIES = [
  { key: "easy", label: "Easy", icon: "/UI_Designs/ANIMALS/B_Koala.png", accent: "blue", description: "Short, familiar words and sentences to build reading confidence." },
  { key: "medium", label: "Medium", icon: "/UI_Designs/ANIMALS/L_Turtle.png", accent: "coral", description: "Longer phrases and sentences for growing readers." },
  { key: "hard", label: "Hard", icon: "/UI_Designs/ANIMALS/E_Dinosaur.png", accent: "green", description: "More challenging vocabulary and detailed sentences." },
];

export default function FlashcardDifficulty() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [lang, setLang] = useState(() => searchParams.get("lang") === "FIL" ? "FIL" : "ENG");
  const selectLanguage = (language) => {
    setLang(language);
    setSearchParams({ lang: language }, { replace: true });
  };
  const [counts, setCounts] = useState({ easy: 0, medium: 0, hard: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError("");
      try {
        const learnerId = getSession()?.user?.id;
        const response = await fetch(`${API_URL}/api/flashcards?lang=${lang}`, { headers: { "X-Learner-Id": learnerId || "" } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Could not load flashcards.");
        if (!cancelled) setCounts(data.reduce((result, card) => ({ ...result, [card.category]: result[card.category] + 1 }), { easy: 0, medium: 0, hard: 0 }));
      } catch (loadError) { if (!cancelled) setError(loadError.message || "Could not load flashcards."); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [lang]);

  return <div className="fc-page" style={{ backgroundImage: `url(${bgFlashcards})` }}>
    <header className="fc-header">
      <button className="fc-back" onClick={() => navigate(`/category?lang=${lang}`)} aria-label="Back">←</button>
      <h1 className="fc-title">Flashcards</h1>
      <div className="lang-toggle" role="group" aria-label="Language">{["ENG", "FIL"].map((value) =>
        <button key={value} className={`lang-toggle__option ${lang === value ? "lang-toggle__option--active" : ""}`} onClick={() => selectLanguage(value)}>{value}</button>
      )}</div>
    </header>
    <main className="fc-main">
      {error && <p className="fc-library-message">{error}</p>}
      <div className="fc-cards">{DIFFICULTIES.map((difficulty) =>
        <div key={difficulty.key} className={`fc-card fc-card--${difficulty.accent}`}>
          <img src={difficulty.icon} alt="" className="fc-card__icon" /><h2>{difficulty.label}</h2><p>{difficulty.description}</p>
          <p className="fc-card__count">{loading ? "Loading..." : `${counts[difficulty.key]} card${counts[difficulty.key] === 1 ? "" : "s"}`}</p>
          <button className="fc-card__start" disabled={loading || counts[difficulty.key] === 0} onClick={() => navigate(`/flashcards/${difficulty.key}?lang=${lang}`)}>Start <span aria-hidden="true">→</span></button>
        </div>
      )}</div>
    </main>
  </div>;
}
