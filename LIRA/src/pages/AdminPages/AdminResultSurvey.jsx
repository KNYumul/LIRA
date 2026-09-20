import { useEffect, useMemo, useState } from 'react'
import { getSession } from '../../utils/session'
import { SURVEY_QUESTIONS } from '../../utils/surveyQuestions'
import './AdminResultSurvey.css'

const API_URL = import.meta.env.VITE_API_URL || ''
const RATING_LABELS = ['Strongly Disagree', 'Disagree', 'Not Sure', 'Agree', 'Strongly Agree']

export default function AdminSurveyResults() {
  const [search, setSearch] = useState('')
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`${API_URL}/api/surveys`, {
          headers: { Authorization: `Bearer ${getSession()?.token || ''}` },
          signal: controller.signal,
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Could not load survey results.')
        setStudents(data)
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message || 'Could not load survey results.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [refresh])

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return students.filter(student => student.name.toLowerCase().includes(keyword) || student.section.toLowerCase().includes(keyword))
  }, [students, search])
  const overallScore = students.length ? students.reduce((sum, student) => sum + student.score, 0) / students.length : null
  const ready = !loading && !error

  return (
    <div className="survey-results-page">
      <div className="survey-results-container">
        <div className="survey-page-header">
          <div><h1>Survey Results</h1><p>Student System Usability Scale (SUS) responses for LIRA.</p></div>
          <button type="button" className="view-survey-btn" disabled={loading} onClick={() => { setSelected(null); setRefresh(value => value + 1) }}>Refresh</button>
        </div>
        <div className="survey-summary-grid">
          <div className="survey-summary-card"><div><span className="summary-label">Total Responses</span><h2>{ready ? students.length : '?'}</h2><p>Students completed the survey</p></div></div>
          <div className="survey-summary-card"><div><span className="summary-label">Overall SUS Score</span><h2>{ready && overallScore !== null ? `${overallScore.toFixed(1)} / 100` : '?'}</h2><p>Scores account for positive and negative questions.</p></div></div>
        </div>
        <section className="survey-results-card">
          <div className="survey-card-top">
            <div><h2>Student Responses</h2><p>View each student's answers and SUS score.</p></div>
            <div className="survey-search-box"><input type="search" aria-label="Search students or sections" placeholder="Search students or sections..." value={search} onChange={event => setSearch(event.target.value)} /></div>
          </div>
          {loading ? <p className="survey-empty" role="status">Loading survey results...</p> : error ? <p className="survey-empty" role="alert">{error}</p> : (
            <div className="survey-table-wrapper">
              <table className="survey-table">
                <thead><tr><th>Student</th><th>Section</th><th>Submitted</th><th>SUS Score</th><th>Action</th></tr></thead>
                <tbody>
                  {filteredStudents.map(student => (
                    <tr key={student.id}>
                      <td><div className="student-info"><div className="student-avatar">{student.name.charAt(0).toUpperCase()}</div><span className="student-name">{student.name}</span></div></td>
                      <td><span className="student-section">{student.section}</span></td>
                      <td>{new Date(student.submittedAt).toLocaleString()}</td>
                      <td><span className="rating-number">{student.score.toFixed(1)} / 100</span></td>
                      <td><button type="button" className="view-survey-btn" onClick={() => setSelected(student)} aria-expanded={selected?.id === student.id} aria-controls="survey-answer-details">View Results</button></td>
                    </tr>
                  ))}
                  {!filteredStudents.length && <tr><td colSpan="5"><div className="survey-empty">{students.length ? 'No students found.' : 'No survey responses yet.'}</div></td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {ready && selected && (
          <section id="survey-answer-details" className="survey-results-card" aria-label={`Survey answers for ${selected.name}`}>
            <div className="survey-card-top"><div><h2>{selected.name} ? {selected.section}</h2><p>SUS score: {selected.score.toFixed(1)} / 100</p></div><button className="view-survey-btn" type="button" onClick={() => setSelected(null)}>Close Results</button></div>
            <div className="survey-table-wrapper"><table className="survey-table">
              <thead><tr><th>Question</th><th>Answer</th></tr></thead>
              <tbody>{SURVEY_QUESTIONS.map((question, index) => <tr key={question}><td>{index + 1}. {question}</td><td>{selected.answers[index]} / 5 ? {RATING_LABELS[selected.answers[index] - 1]}</td></tr>)}</tbody>
            </table></div>
          </section>
        )}
      </div>
    </div>
  )
}
