import { useState } from 'react';
import './FaqSection.css';

import bunnyIcon from '../assets/icons/bunny.jpg';
import owlIcon from '../assets/icons/owl.svg';
import catIcon from '../assets/icons/cat.svg';
import foxIcon from '../assets/icons/fox.jpg';

// Category cards shown under the search bar
const CATEGORIES = [
  {
    id: 'getting-started',
    icon: bunnyIcon,
    alt: 'Bunny icon',
    title: 'Getting Started',
    subtitle: 'Accounts and Setup',
  },
  {
    id: 'for-teachers',
    icon: owlIcon,
    alt: 'Owl icon',
    title: 'For Teachers',
    subtitle: 'Dashboard and Roster',
  },
  {
    id: 'for-students',
    icon: catIcon,
    alt: 'Cat icon',
    title: 'For Students',
    subtitle: 'reading and Flashcards',
  },
  {
    id: 'troubleshooting',
    icon: foxIcon,
    alt: 'Fox icon',
    title: 'Troubleshooting',
    subtitle: 'Mic and Login Issues',
  },
];

// FAQ accordion items
const FAQS = [
  {
    id: 'create-teacher-account',
    question: 'How do I create a teacher account?',
    answer:
      'Go to the Login page and select "Sign up as a Teacher." Enter your school email address, create a password, and verify your account through the confirmation link sent to your inbox.',
  },
  {
    id: 'student-accounts',
    question: 'How do students get their accounts?',
    answer:
      "Student accounts aren't self-registered. A teacher uploads a class masterlist (CSV or Excel), and LIRA creates an account for each learner using their last name and birthdate as login details.",
  },
  {
    id: 'filipino-availability',
    question: 'Is LIRA available in Filipino?',
    answer:
      'Yes. LIRA supports both English and Filipino reading passages and assessments. Teachers can switch the language setting from the Dashboard at any time.',
  },
];

function FaqSection() {
  const [searchValue, setSearchValue] = useState('');
  // Index 1 ("student-accounts") starts open to match the reference design
  const [openIndex, setOpenIndex] = useState(1);

  const toggleFaq = (index) => {
    setOpenIndex((prev) => (prev === index ? -1 : index));
  };

  return (
    <section className="faq-section" id="help-center">
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
            onChange={(e) => setSearchValue(e.target.value)}
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

        <div className="faq-categories">
          {CATEGORIES.map((cat) => (
            <button key={cat.id} className="faq-category-card" type="button">
              <span className="faq-category-icon-wrap">
                <img src={cat.icon} alt={cat.alt} className="faq-category-icon" />
              </span>
              <span className="faq-category-title">{cat.title}</span>
              <span className="faq-category-subtitle">{cat.subtitle}</span>
            </button>
          ))}
        </div>

        <div className="faq-accordion">
          {FAQS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={item.id}
                className={`faq-accordion-item ${isOpen ? 'is-open' : ''}`}
              >
                <button
                  type="button"
                  className="faq-accordion-question"
                  onClick={() => toggleFaq(index)}
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
          })}
        </div>

        <div className="faq-cta">
          <h2 className="faq-cta-heading">Still need help?</h2>
          <p className="faq-cta-subheading">
            Our support team typically responds within one school day.
          </p>
          <button className="faq-cta-button" type="button">
            Email Support
          </button>
        </div>
      </div>
    </section>
  );
}

export default FaqSection;
