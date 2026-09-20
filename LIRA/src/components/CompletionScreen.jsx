import { useState } from "react";
import "./CompletionScreen.css";

import { SURVEY_QUESTIONS } from "../utils/surveyQuestions";

export default function CompletionScreen({
  onBack,
  backLabel = "Back",
  onSubmit,
  children,
}) {
  // 10 questions, all unanswered at the beginning
  const [ratings, setRatings] = useState(
    Array(SURVEY_QUESTIONS.length).fill(0)
  );

  const [hoveredRating, setHoveredRating] = useState({
    questionIndex: null,
    rating: 0,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleBackToHome = () => {
    onBack?.();
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });
  };

  // Change the rating of one question
  const handleRating = (questionIndex, rating) => {
    if (submitted || submitting) return;

    setRatings((previousRatings) => {
      const updatedRatings = [...previousRatings];

      updatedRatings[questionIndex] = rating;

      return updatedRatings;
    });
  };

  // Check if all 10 questions have answers
  const allQuestionsAnswered = ratings.every(
    (rating) => rating >= 1 && rating <= 5
  );

  const answeredCount = ratings.filter(
    (rating) => rating > 0
  ).length;

  const handleSubmit = async () => {
    if (!allQuestionsAnswered || submitted || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      if (!onSubmit) throw new Error("Survey submission is unavailable. Please try again.");
      await onSubmit(ratings);
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error.message || "Could not save your survey. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="completion-page">
      {/* Decorative background squares */}
      {[
        "tl",
        "tr",
        "tr2",
        "ml",
        "mr",
        "bl",
        "br",
        "br2",
      ].map((position) => (
        <span
          key={position}
          className={
            "completion-decor-square " +
            `completion-decor-square--${position}`
          }
          aria-hidden="true"
        />
      ))}

      {/* Back button */}
      <button
        className="completion-back-button"
        aria-label={backLabel}
        title={backLabel}
        type="button"
        onClick={onBack}
      >
        <span aria-hidden="true">←</span>
      </button>

      <main className="completion-content">
        {/* =====================================================
            GREAT JOB AREA
        ====================================================== */}

        <section className="completion-celebration">
          <img
            className="completion-hero-image"
            src="/greatjob.png"
            alt="A fox, owl, bear and rabbit celebrating with party hats and confetti"
          />

          <h1 className="completion-title">
            Great job!
          </h1>

          <h2 className="completion-assessment-title">
            You finished the assessment!
          </h2>

          <p className="completion-subtitle">
            You crossed the finish line! Before you go,
            tell us what you think about using LIRA.
          </p>
        </section>

        {/* =====================================================
            SURVEY
        ====================================================== */}

        <section
          className="completion-survey-card"
          aria-labelledby="survey-title"
        >
          <div className="completion-survey-header">
            <div>
              <h2 id="survey-title">
                Satisfaction Survey
              </h2>

              <p>
                Tap the stars to choose your answer.
              </p>
            </div>

            <div className="completion-survey-progress">
              {answeredCount}/{SURVEY_QUESTIONS.length}
            </div>
          </div>

          {/* Rating guide */}
          <div className="completion-rating-guide">
            <span>
              <strong>1</strong>
              Strongly Disagree
            </span>

            <span>
              <strong>2</strong>
              Disagree
            </span>

            <span>
              <strong>3</strong>
              Not Sure
            </span>

            <span>
              <strong>4</strong>
              Agree
            </span>

            <span>
              <strong>5</strong>
              Strongly Agree
            </span>
          </div>

          {/* Questions */}
          <div className="completion-response-list">
            {SURVEY_QUESTIONS.map(
              (question, questionIndex) => {
                const selectedRating =
                  ratings[questionIndex];

                const hoverRating =
                  hoveredRating.questionIndex ===
                  questionIndex
                    ? hoveredRating.rating
                    : 0;

                const displayedRating =
                  hoverRating || selectedRating;

                return (
                  <div
                    className={`completion-response-row ${
                      selectedRating > 0
                        ? "completion-response-row--answered"
                        : ""
                    }`}
                    key={question}
                  >
                    {/* Question number */}
                    <div
                      className={`completion-question-number completion-question-number--${
                        (questionIndex % 5) + 1
                      }`}
                    >
                      {questionIndex + 1}
                    </div>

                    {/* Question */}
                    <p className="completion-question-text">
                      {question}
                    </p>

                    {/* Interactive stars */}
                    <div
                      className="completion-stars"
                      role="radiogroup"
                      aria-label={`Question ${
                        questionIndex + 1
                      } rating`}
                      onMouseLeave={() =>
                        setHoveredRating({
                          questionIndex: null,
                          rating: 0,
                        })
                      }
                    >
                      {[1, 2, 3, 4, 5].map(
                        (starValue) => (
                          <button
                            key={starValue}
                            type="button"
                            className={`completion-star ${
                              starValue <=
                              displayedRating
                                ? "completion-star--filled"
                                : ""
                            }`}
                            onClick={() =>
                              handleRating(
                                questionIndex,
                                starValue
                              )
                            }
                            onMouseEnter={() =>
                              !submitted &&
                              setHoveredRating({
                                questionIndex,
                                rating: starValue,
                              })
                            }
                            role="radio"
                            aria-checked={
                              selectedRating ===
                              starValue
                            }
                            aria-label={`${starValue} out of 5`}
                            disabled={submitted || submitting}
                          >
                            ★
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>

          {/* =================================================
              SUBMIT AREA
          ================================================== */}

          {submitError && <p role="alert">{submitError}</p>}
          {!submitted ? (
            <div className="completion-submit-area">
              {!allQuestionsAnswered && (
                <p className="completion-submit-hint">
                  Please answer all 10 questions
                  before submitting.
                </p>
              )}

              <button
                type="button"
                className="completion-submit-button"
                disabled={!allQuestionsAnswered || submitting}
                onClick={handleSubmit}
              >
                {submitting ? "Saving..." : "Submit Survey"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : (
            <div
              className="completion-success-message"
              role="status"
            >
              <span
                className="completion-success-icon"
                aria-hidden="true"
              >
                ✓
              </span>

              <div>
                <h3>Thank you!</h3>

                <p>
                  Your survey has been submitted.
                  Your feedback helps us make LIRA
                  even better!
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Existing status/error messages */}
        {children && (
          <div
            className="completion-status"
            role="status"
          >
            {children}
          </div>
        )}

        {/* Back to Home only appears after submission */}
        {submitted && (
          <button
            type="button"
            className="completion-home-button"
            onClick={handleBackToHome}
          >
            <span
              className="completion-home-icon"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                width="21"
                height="21"
                fill="none"
              >
                <path
                  d="M3 10.8L12 3l9 7.8"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M5.5 9.5V21h13V9.5"
                  fill="currentColor"
                />

                <path
                  d="M9.5 21v-6h5v6"
                  fill="#ffbd61"
                />
              </svg>
            </span>

            Back to Home
          </button>
        )}
      </main>
    </div>
  );
}
