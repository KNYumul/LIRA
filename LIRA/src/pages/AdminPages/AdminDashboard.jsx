import { HeartIcon, DotIcon } from '../../components/AdminIcons.jsx'

const SCHOOL_YEAR = '2026–2027'

export default function AdminDashboard({ teachers, loadError }) {
  const totalTeachers = teachers.length
  const activeAccounts = teachers.filter(t => t.status === 'Active').length
  const sectionsCount = new Set(teachers.map(t => t.section).filter(Boolean)).size

  const recentlyAdded = [...teachers].sort((a, b) =>
    new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  )

  return (
    <>
      <h1 className="page-title">School Overview</h1>
      <p className="page-sub">School Year {SCHOOL_YEAR}</p>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-number">
            {totalTeachers} <HeartIcon className="stat-icon heart" />
          </div>
          <div className="stat-label">Total Teachers</div>
        </div>

        <div className="stat-card">
          <div className="stat-number">
            {activeAccounts} <DotIcon className="stat-icon dot-green" />
          </div>
          <div className="stat-label">Active Accounts</div>
        </div>

        <div className="stat-card">
          <div className="stat-number">
            {sectionsCount} <DotIcon className="stat-icon dot-green" />
          </div>
          <div className="stat-label">Sections</div>
        </div>
      </div>

      <div className="recent-card">
        <h2 className="recent-title">Recently Added Teachers</h2>

        <div className="recent-table-head">
          <span>Teacher</span>
          <span>Status</span>
        </div>

        <div className="recent-list">
          {loadError ? (
            <div className="empty-state">{loadError}</div>
          ) : recentlyAdded.length === 0 ? (
            <div className="empty-state">No teachers yet.</div>
          ) : (
            recentlyAdded.map(t => (
              <div className="recent-row" key={t.id}>
                <span className="recent-name">{t.name}</span>
                <span className={`status-pill ${t.status === 'Active' ? 'active' : 'inactive'}`}>
                  {t.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}