import React from "react";
import PolicyLayout from "./PolicyLayout.jsx";

const SECTIONS = [
  {
    id: "collect",
    title: "What We Collect",
    content: (
      <p>
        For teachers: name, DepEd email, and school/section information. For
        learners: last name and birthdate (from the masterlist your teacher
        uploads), and reading activity such as audio captured during
        flashcard and story sessions, accuracy scores, and quiz answers.
      </p>
    ),
  },
  {
    id: "use",
    title: "How We Use It",
    content: (
      <p>
        Reading activity is analyzed to measure fluency and accuracy, and to
        generate the risk scores and heatmaps shown on the teacher dashboard.
        We do not use learner data for advertising, and we do not sell
        learner data to third parties.
      </p>
    ),
  },
  {
    id: "see",
    title: "Who Can See It",
    content: (
      <p>
        A learner's reading data is visible only to their own teacher and
        authorized school administrators — never to other students, and
        never to other teachers outside the section.
      </p>
    ),
  },
  {
    id: "storage",
    title: "Storage & Retention",
    content: (
      <p>
        Data is retained for as long as the learner is enrolled in an active
        section, plus one school year for continuity of records, after which
        it can be deleted on request from the school.
      </p>
    ),
  },
  {
    id: "rights",
    title: "Parent & Teacher Rights",
    content: (
      <p>
        Parents and guardians may request a copy of, correction to, or
        deletion of their child's data at any time through the learner's
        teacher or school administrator.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <p>
        Privacy questions or data requests can be sent to
        privacy@lira-reading.ph.
      </p>
    ),
  },
];

export default function PrivacyPolicy() {
  return (
    <PolicyLayout
      badge="Last Updated July 2026"
      title="Privacy Policy"
      subtitle="Learners are children, so we treat their data with extra care. This page explains what we collect, why, and who can see it."
      sections={SECTIONS}
    />
  );
}
