import { useMemo, useState } from 'react'
import './AdminResultSurvey.css'

// TEMPORARY SAMPLE DATA
// Replace this later with student survey data from your backend/API.
const SAMPLE_STUDENTS = [
  {
    id: 1,
    name: 'Juan Dela Cruz',
    section: 'Saturn',
    answers: [5, 2, 4, 1, 5, 2, 5, 2, 5, 2]
  },
  {
    id: 2,
    name: 'Maria Santos',
    section: 'Earth',
    answers: [5, 1, 5, 2, 5, 1, 4, 2, 5, 1]
  },
  {
    id: 3,
    name: 'Angela Reyes',
    section: 'Rose',
    answers: [4, 2, 5, 1, 4, 2, 5, 1, 4, 2]
  },
  {
    id: 4,
    name: 'Joshua Garcia',
    section: 'Uranus',
    answers: [5, 2, 4, 2, 5, 2, 4, 2, 5, 2]
  },
  {
    id: 5,
    name: 'Sofia Mendoza',
    section: 'Crayfish',
    answers: [4, 1, 5, 1, 5, 1, 5, 1, 5, 1]
  },
  {
    id: 6,
    name: 'Nathan Cruz',
    section: 'Aguinaldo',
    answers: [5, 2, 5, 2, 4, 2, 5, 2, 4, 2]
  },
  {
    id: 7,
    name: 'Andrea Flores',
    section: 'Saturn',
    answers: [4, 2, 4, 1, 5, 2, 4, 1, 5, 2]
  },
  {
    id: 8,
    name: 'Miguel Ramos',
    section: 'Earth',
    answers: [5, 1, 5, 1, 5, 1, 5, 2, 5, 1]
  }
]

function getAverage(answers) {
  if (!answers || answers.length === 0) {
    return 0
  }

  const total = answers.reduce((sum, answer) => sum + answer, 0)

  return total / answers.length
}

function StarRating({ value }) {
  return (
    <div
      className="survey-stars"
      aria-label={`${value.toFixed(1)} out of 5`}
    >
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          className={
            star <= Math.round(value)
              ? 'star filled'
              : 'star'
          }
        >
          ★
        </span>
      ))}
    </div>
  )
}

export default function AdminSurveyResults() {
  const [search, setSearch] = useState('')

  const students = useMemo(() => {
    return SAMPLE_STUDENTS.map(student => ({
      ...student,
      average: getAverage(student.answers)
    }))
  }, [])

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    if (!keyword) {
      return students
    }

    return students.filter(student => {
      return (
        student.name.toLowerCase().includes(keyword) ||
        student.section.toLowerCase().includes(keyword)
      )
    })
  }, [students, search])

  const overallAverage = useMemo(() => {
    if (students.length === 0) {
      return 0
    }

    const total = students.reduce(
      (sum, student) => sum + student.average,
      0
    )

    return total / students.length
  }, [students])

  function handleViewResults(student) {
    console.log('Selected student:', student)
  }

  return (
    <div className="survey-results-page">
      <div className="survey-results-container">

        {/* HEADER */}
        <div className="survey-page-header">
          <div>
            <h1>Survey Results</h1>

            <p>
              View students who completed the LIRA satisfaction survey.
            </p>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="survey-summary-grid">

          <div className="survey-summary-card">
            <div className="summary-icon blue">
              ✓
            </div>

            <div>
              <span className="summary-label">
                Total Responses
              </span>

              <h2>{students.length}</h2>

              <p>
                Students completed the survey
              </p>
            </div>
          </div>

          <div className="survey-summary-card">
            <div className="summary-icon yellow">
              ★
            </div>

            <div>
              <span className="summary-label">
                Overall Average
              </span>

              <h2>
                {overallAverage.toFixed(1)} / 5
              </h2>

              <StarRating value={overallAverage} />
            </div>
          </div>

        </div>

        {/* STUDENT RESULTS */}
        <section className="survey-results-card">

          <div className="survey-card-top">
            <div>
              <h2>Student Responses</h2>

              <p>
                Students who submitted the satisfaction survey.
              </p>
            </div>

            <div className="survey-search-box">
              <span className="search-icon">
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* TABLE */}
          <div className="survey-table-wrapper">
            <table className="survey-table">

              <thead>
                <tr>
                  <th>Student</th>
                  <th>Section</th>
                  <th>Status</th>
                  <th>Average Rating</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(student => (
                    <tr key={student.id}>

                      {/* STUDENT */}
                      <td>
                        <div className="student-info">
                          <div className="student-avatar">
                            {student.name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <span className="student-name">
                            {student.name}
                          </span>
                        </div>
                      </td>

                      {/* SECTION */}
                      <td>
                        <span className="student-section">
                          {student.section}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td>
                        <span className="survey-status completed">
                          Completed
                        </span>
                      </td>

                      {/* AVERAGE */}
                      <td>
                        <div className="student-rating">
                          <span className="rating-number">
                            {student.average.toFixed(1)}
                          </span>

                          <StarRating
                            value={student.average}
                          />
                        </div>
                      </td>

                      {/* ACTION */}
                      <td>
                        <button
                          type="button"
                          className="view-survey-btn"
                          onClick={() =>
                            handleViewResults(student)
                          }
                        >
                          View Results
                        </button>
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">
                      <div className="survey-empty">
                        No students found.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>

            </table>
          </div>

        </section>
      </div>
    </div>
  )
}