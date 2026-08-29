import { HeartIcon, DotIcon } from '../../components/AdminIcons.jsx'

const SCHOOL_YEAR = '2026–2027'

export default function AdminDashboard({ teachers, loadError }) {
  const totalTeachers = teachers.length
  const activeAccounts = teachers.filter(t => t.status === 'Active').length
  const sectionsCount = new Set(teachers.flatMap(t => t.sections || []).filter(Boolean)).size

  const formatCreatedAt = (createdAt) => {
    if (!createdAt) return 'Date unavailable'
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit'
    }).format(new Date(createdAt))
  }

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
          <span>Sections</span>
          <span>Account Created</span>
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
                <span className="recent-sections">
                  {t.sections?.length
                    ? t.sections.join(', ')
                    : <span className="no-section-pill">No Section</span>}
                </span>
                <time className="recent-created" dateTime={t.createdAt}>{formatCreatedAt(t.createdAt)}</time>
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
