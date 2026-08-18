import { useNavigate } from "react-router-dom";
import "./WelcomePage.css";

// These are served straight from /public/UI_Designs, so plain string
// paths are used instead of imports — no bundling needed for these.
const foxMascot = "/UI_Designs/ANIMALS/mascot_fox.svg";
const owlMascot = "/UI_Designs/ANIMALS/mascot_owl.svg";
const bearIcon = "/UI_Designs/ANIMALS/A_Bear.png";
const frogIcon = "/UI_Designs/ANIMALS/G_Frog.png";
const deerIcon = "/UI_Designs/ANIMALS/J_Deer.png";

const bgHero = "/UI_Designs/BACKGROUND/backdrop_landing_hero.svg";
const bgMeadow = "/UI_Designs/BACKGROUND/backdrop_butter_sage_meadow.svg";
const bgSunrise = "/UI_Designs/BACKGROUND/backdrop_coral_peach_sunrise.svg";

export default function WelcomePage() {
  const navigate = useNavigate();

  const scrollToFlow = () => {
    document
      .querySelector("#how-it-works")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="lira-page" id="top">
      {/* ---------- HERO ---------- */}
      <section
        className="lira-hero"
        style={{ backgroundImage: `url(${bgHero})` }}
      >
        <div className="lira-hero__glow" aria-hidden="true" />

        <div className="lira-section-inner lira-hero__inner">
          <img
            src={foxMascot}
            alt=""
            className="lira-hero__mascot lira-hero__mascot--left"
          />
          <img
            src={owlMascot}
            alt=""
            className="lira-hero__mascot lira-hero__mascot--right"
          />

          <div className="lira-hero__content">
            <span className="badge">
              AI-assisted Early Literacy Screening
            </span>

            <h1 className="lira-hero__title">
              Meet <span className="lira-hero__brandword">LIRA</span> - your
              Grade 3 Learning Companion
            </h1>

            <p className="lira-hero__desc">
              LIRA listens as learners read aloud, flags early literacy risk
              in real time, and gives teachers a clear picture of every
              child's reading journey — gently, playfully, and in English or
              Filipino.
            </p>

            <div className="lira-hero__ctas">
              <button
                className="btn btn--pill btn--coral btn--lg"
                onClick={() => navigate("/login")}
              >
                Get Started
              </button>
              <button
                className="btn btn--pill btn--outline btn--lg"
                onClick={scrollToFlow}
              >
                See How it works ↓
              </button>
            </div>
          </div>
        </div>

        <div className="lira-hero__ground" aria-hidden="true">
          <span className="tree tree--1" />
          <span className="tree tree--2" />
          <span className="tree tree--3" />
          <span className="tree tree--4" />
        </div>
      </section>

      {/* ---------- WHAT IS LIRA ---------- */}
      <section
        className="lira-about"
        id="about"
        style={{ backgroundImage: `url(${bgMeadow})` }}
      >
        <div className="lira-section-inner">
          <span className="badge badge--center">What is LIRA</span>

          <h2 className="lira-about__title">
            A gentle AI companion for
            <br />
            early literacy screening
          </h2>

          <p className="lira-about__desc">
            LIRA is a multimodal artificial intelligence framework built for
            Grade 3 classrooms — it pairs speech recognition with
            reading-comprehension assessment so teachers can catch reading
            difficulties early, without adding to their workload.
          </p>

          <div className="feature-cards">
            <article className="feature-card">
              <img src={bearIcon} alt="" className="feature-card__icon" />
              <h3>Listens as they read.</h3>
              <p>
                LIRA tracks pronunciation, pace, and accuracy in real time as
                a learner reads a story or flashcard aloud — no manual
                scoring required.
              </p>
            </article>

            <article className="feature-card">
              <img src={frogIcon} alt="" className="feature-card__icon" />
              <h3>Flags risks early.</h3>
              <p>
                Reading patterns are quietly scored and grouped into safe,
                watch, and at-risk categories, so intervention can start
                before a child falls behind.
              </p>
            </article>

            <article className="feature-card">
              <img src={deerIcon} alt="" className="feature-card__icon" />
              <h3>Speaks their language.</h3>
              <p>
                Every story, flashcard, and prompt is available in English
                and Filipino, so assessment always happens in a language the
                learner is comfortable in.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ---------- THE FLOW ---------- */}
      <section
        className="lira-flow"
        id="how-it-works"
        style={{ backgroundImage: `url(${bgSunrise})` }}
      >
        <div className="lira-section-inner">
          <span className="badge badge--center">The Flow</span>

          <h2 className="lira-flow__title">
            From story time to screening
            <br />
            results, in four steps
          </h2>

          <p className="lira-flow__desc">
            LIRA fits into a normal reading period — no extra testing day, no
            extra paperwork.
          </p>

          <ol className="lira-steps">
            <li className="lira-step">
              <span className="lira-step__number">1</span>
              <h3>Assign a story</h3>
              <p>
                A teacher picks a story or flashcard set from the library, or
                generates one with AI.
              </p>
            </li>
            <li className="lira-step">
              <span className="lira-step__number">2</span>
              <h3>Learner reads aloud</h3>
              <p>
                The student taps the mic and reads at their own pace, on
                their own device.
              </p>
            </li>
            <li className="lira-step">
              <span className="lira-step__number">3</span>
              <h3>LIRA listens &amp; tracks</h3>
              <p>
                Speech is analyzed in real time for accuracy, fluency, and
                comprehension.
              </p>
            </li>
            <li className="lira-step">
              <span className="lira-step__number">4</span>
              <h3>Dashboard updates</h3>
              <p>
                Risk scores and heatmaps appear instantly for the teacher to
                review.
              </p>
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}