import React from "react";
import { Link } from "react-router-dom";
import PolicyLayout from "./PolicyLayout.jsx";

const SECTIONS = [
  {
    id: "accounts",
    title: "Accounts",
    content: (
      <>
        <p>
          Teacher accounts are created with a valid DepEd email address and
          are intended for use by the registered educator only. Student
          accounts are provisioned by a teacher through a class masterlist
          upload and are not intended to be created directly by learners.
        </p>
        <p>
          You're responsible for keeping your login credentials confidential
          and for any activity that happens under your account.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use",
    content: (
      <>
        <p>
          LIRA is built for early literacy screening and instructional
          support in Grade 3 classrooms. Please use it only for that purpose.
          You agree not to:
        </p>
        <ul>
          <li>
            Upload content that is harmful, obscene, or inappropriate for
            young learners
          </li>
          <li>
            Attempt to access another teacher's section or another learner's
            data without authorization
          </li>
          <li>
            Use the platform to collect or process data unrelated to reading
            assessment
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "content-stories",
    title: "Content & Stories",
    content: (
      <p>
        Stories and flashcards you upload or generate remain associated with
        your section and are used only to deliver reading activities to your
        learners. AI-generated stories are created based on the theme and
        difficulty you select, and should be reviewed by the teacher before
        assigning.
      </p>
    ),
  },
  {
    id: "learner-data",
    title: "Learner Data",
    content: (
      <p>
        Reading recordings, accuracy scores, and risk levels are used solely
        to support literacy screening and are visible only to the learner's
        teacher. See our <Link to="/privacy-policy">Privacy Policy</Link> for full details
        on how learner data is handled.
      </p>
    ),
  },
  {
    id: "availability",
    title: "Availability",
    content: (
      <p>
        We aim to keep LIRA available during school hours but cannot
        guarantee uninterrupted access. Scheduled maintenance will be
        communicated to schools in advance where possible.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to These Terms",
    content: (
      <p>
        We may update these terms from time to time as the platform grows.
        Continued use of LIRA after changes are posted means you accept the
        updated terms.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <p>
        Questions about these terms can be sent to{" "}
        <strong>hello@lira-reading.ph</strong>.
      </p>
    ),
  },
];

export default function TermsOfUse() {
  return (
    <PolicyLayout
      badge="Last Updated July 2026"
      title="Terms of Use"
      subtitle="Please read these terms carefully before using LIRA. They explain what you can expect from us, and what we ask of teachers, schools, and learners in return."
      sections={SECTIONS}
    />
  );
}
