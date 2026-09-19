import { useState } from "react";
import "./FaqSection.css";

import bunnyIcon from "../assets/icons/bunny.jpg";
import owlIcon from "../assets/icons/owl.svg";
import catIcon from "../assets/icons/cat.svg";
import foxIcon from "../assets/icons/fox.jpg";

const CATEGORIES = [
  {
    id: "for-students",
    icon: catIcon,
    alt: "Cat icon",
    title: "For Students",
    subtitle: "Reading and Flashcards",
  },
  {
    id: "for-teachers",
    icon: bunnyIcon,
    alt: "Bunny icon",
    title: "For Teachers",
    subtitle: "Class Setup and Reports",
  },
  {
    id: "troubleshooting",
    icon: owlIcon,
    alt: "Owl icon",
    title: "Troubleshooting",
    subtitle: "Mic and Login Issues",
  },
  {
    id: "support",
    icon: foxIcon,
    alt: "Fox icon",
    title: "Support",
    subtitle: "Help and Contact",
  },
];

const FAQS = [
  {
    id: "create-teacher-account",
    question: "How do I create a teacher account?",
    answer:
      'Go to the Login page and select "Sign up as a Teacher." Enter your school email address, create a password, and verify your account through the confirmation link sent to your inbox.',
  },
  {
    id: "student-accounts",
    question: "How do students get their accounts?",
    answer:
      "Student accounts aren't self-registered. A teacher uploads a class masterlist (CSV), and LIRA creates an account for each learner using their last name and birthdate as login details.",
  },
  {
    id: "filipino-availability",
    question: "Is LIRA available in Filipino?",
    answer:
      "Yes. LIRA supports both English and Filipino reading activities. Students can choose between English and Filipino when using Flashcards and Stories Mode.",
  },
  {
    id: "forgot-password",
    question: "What should I do if I forget my password?",
    answer:
      'Select "Forgot Password" on the Login page and enter the email address connected to your account. Follow the instructions sent to your email to create a new password.',
  },
  {
    id: "change-password",
    question: "How do I change my password?",
    answer:
      "Teachers can change their password from their Profile settings. The new password must meet the required password rules, including at least one uppercase letter, one number, and one special character.",
  },
  {
    id: "upload-masterlist",
    question: "How do I add students to my class?",
    answer:
      "Teachers can add students by uploading a class masterlist in CSV format from the Dashboard. Make sure the required student information is complete and properly formatted before uploading.",
  },
  {
    id: "student-login",
    question: "How do students log in to LIRA?",
    answer:
      "Students can log in using the account details created for them after their teacher uploads the class masterlist. They should enter their required login information on the student login page.",
  },
  {
    id: "reading-assessment",
    question: "How do students take a reading assessment?",
    answer:
      "After logging in, students can open their assigned reading assessment and follow the instructions shown on the screen. They may be asked to read words or passages aloud using their device microphone.",
  },
  {
    id: "microphone-not-working",
    question: "What should I do if the microphone is not working?",
    answer:
      "Check that microphone permission is enabled for LIRA in your browser. You can also check your device microphone settings, refresh the page, and try the activity again.",
  },
  {
    id: "microphone-permission",
    question: "Why does LIRA need microphone permission?",
    answer:
      "LIRA uses microphone access during reading activities that require students to read aloud. Microphone access should be enabled when it is needed for an assessment or reading activity.",
  },
  {
    id: "flashcards-stories",
    question: "How do Flashcards and Stories Mode work?",
    answer:
      "Students can use Flashcards Mode to practice reading and recognizing words by selecting a difficulty level, while Stories Mode allows them to practice reading through passages. In both modes, students can freely choose between English and Filipino and switch languages whenever they want.",
  },
  {
    id: "switch-language-anytime",
    question: "Can I switch languages anytime while practicing?",
    answer:
      "No. Students choose either English or Filipino before starting Flashcards or Stories Mode. To change the language, they need to exit the current activity and select a different language before starting again.",
  },
  {
    id: "flashcards-stories-purpose",
    question: "What are Flashcards Mode and Stories Mode for?",
    answer:
      "Flashcards Mode helps students practice reading and recognizing words based on their selected difficulty level, while Stories Mode helps students practice reading through short stories and passages. Students can choose either English or Filipino before starting.",
  },
  {
    id: "view-results",
    question: "Where can teachers view student results?",
    answer:
      "Teachers can view learner results and reading performance from the teacher Dashboard. Select the appropriate class or learner to see the available assessment information.",
  },
  {
    id: "update-profile",
    question: "Can I update my teacher profile?",
    answer:
      "Yes. Teachers can update their profile information from the Profile section, including their name, title, password, and other available account information.",
  },
  {
    id: "browser-refresh",
    question: "What should I do if a page is not loading properly?",
    answer:
      "Try refreshing the page and checking your internet connection. If the problem continues, close and reopen the browser or try logging in again.",
  },
  {
    id: "support",
    question: "How can I contact LIRA support?",
    answer:
      'If you still need help, use the "Email Support" button at the bottom of this page to contact the LIRA support team.',
  },
];

function FaqSection() {
  const [searchValue, setSearchValue] = useState("");
  const [openFaqId, setOpenFaqId] = useState("student-accounts");

  const searchTerm = searchValue.trim().toLowerCase();

  const filteredFaqs = searchTerm
    ? FAQS.filter(
        (item) =>
          item.question.toLowerCase().includes(searchTerm) ||
          item.answer.toLowerCase().includes(searchTerm)
      )
    : FAQS.slice(0, 3);

  const toggleFaq = (id) => {
    setOpenFaqId((currentId) => (currentId === id ? null : id));
  };

  const handleSearch = (e) => {
    setSearchValue(e.target.value);
    setOpenFaqId(null);
  };

  return (
    <section className="faq-section">
      <div className="faq-container">
        <span className="faq-pill">Help Center</span>

        <h1 className="faq-heading">How can we help?</h1>

        <p className="faq-subheading">
          Search for a topic, or browse questions from teachers and
          <br />
          learners using LIRA.
        </p>

        <div className="faq-search-wrapper">
          <input
            type="text"
            className="faq-search-input"
            placeholder="Search for a topic..."
            value={searchValue}
            onChange={handleSearch}
            aria-label="Search help topics"
          />

          <svg
            className="faq-search-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
              stroke="currentColor"
              strokeWidth="2.2"
            />
            <line
              x1="21"
              y1="21"
              x2="16.65"
              y2="16.65"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {!searchTerm && (
          <div className="faq-categories">
            {CATEGORIES.map((cat) => (
              <div key={cat.id} className="faq-category-card">
                <span className="faq-category-icon-wrap">
                  <img
                    src={cat.icon}
                    alt={cat.alt}
                    className="faq-category-icon"
                  />
                </span>

                <span className="faq-category-title">{cat.title}</span>
                <span className="faq-category-subtitle">{cat.subtitle}</span>
              </div>
            ))}
          </div>
        )}

        <div className="faq-accordion">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((item) => {
              const isOpen = openFaqId === item.id;

              return (
                <div
                  key={item.id}
                  className={`faq-accordion-item ${isOpen ? "is-open" : ""}`}
                >
                  <button
                    type="button"
                    className="faq-accordion-question"
                    onClick={() => toggleFaq(item.id)}
                    aria-expanded={isOpen}
                  >
                    <span>{item.question}</span>

                    <svg
                      className="faq-chevron"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="faq-accordion-answer">
                      <p>{item.answer}</p>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="faq-no-results">
              <h3>No results found</h3>
              <p>
                We couldn't find anything for "{searchValue}". Try searching for
                another FAQ topic.
              </p>
            </div>
          )}
        </div>

        <div className="faq-cta">
          <h2 className="faq-cta-heading">Still need help?</h2>
          <p className="faq-cta-subheading">
            Our support team typically responds within one school day.
          </p>

          <a className="faq-cta-button" href="mailto:support.lira3@gmail.com">
            Email Support
          </a>
        </div>
      </div>
    </section>
  );
}

export default FaqSection;