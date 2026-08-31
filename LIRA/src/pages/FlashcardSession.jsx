import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import "./FlashcardSession.css";
import { getSession } from "../utils/session";

const API_URL = "http://localhost:5000";
const bgSession = "/UI_Designs/BACKGROUND/backdrop_flashcards.svg";
const LABELS = { easy: "Easy", medium: "Medium", hard: "Hard" };

export default function FlashcardSession() {
  const { difficulty } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lang = searchParams.get("lang") === "FIL" ? "FIL" : "ENG";
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const current = cards[index];
  const label = LABELS[difficulty] || "Easy";
  const languageLabel = lang === "FIL" ? "Filipino" : "English";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError("");
      try {
        const learnerId = getSession()?.user?.id;
        const response = await fetch(`${API_URL}/api/flashcards?category=${encodeURIComponent(difficulty)}&lang=${lang}`, { headers: { "X-Learner-Id": learnerId || "" } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Could not load flashcards.");
        if (!cancelled) { setCards(data); setIndex(0); }
      } catch (loadError) { if (!cancelled) setError(loadError.message || "Could not load flashcards."); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [difficulty, lang]);

  return <div className="fs-page" style={{ backgroundImage: `url(${bgSession})` }}>
    <header className="fs-header"><button className="fs-back" onClick={() => navigate(`/flashcards?lang=${lang}`)} aria-label="Back">←</button><h1 className="fs-title">{label} · {languageLabel}</h1></header>
    <main className="fs-main">
      {loading && <div className="fs-message">Loading your teacher's flashcards...</div>}
      {!loading && error && <div className="fs-message fs-message--error">{error}</div>}
      {!loading && !error && !current && <div className="fs-message">Your teacher has not added any {label.toLowerCase()} {lang} flashcards yet.</div>}
      {!loading && !error && current && <div className="fs-card-stack">
        <div className="fs-card-shadow" aria-hidden="true" />
        <div className="fs-card">
          <div className="fs-card__top"><span className="fs-card__number">{index + 1}</span><span className="fs-card__total">/{cards.length}</span></div>
          <p className="fs-sentence"><span className="fs-sentence__rest">{current.content}</span></p>
          <button className="fs-mic" onClick={() => console.log("Mic tapped — no listening logic wired up yet.")} aria-label="Start listening">🎤</button>
          <span className="fs-mic__status">Tap the microphone to read aloud</span>
          <div className="fs-navigation"><button type="button" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>Previous</button><button type="button" disabled={index === cards.length - 1} onClick={() => setIndex((value) => value + 1)}>Next</button></div>
        </div>
      </div>}
    </main>
  </div>;
}
