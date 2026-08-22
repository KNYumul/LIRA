import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import TeacherRow from '../components/TeacherRow.jsx'
import EditTeacherModal from '../components/EditTeacherModal.jsx'
import { SearchIcon } from '../components/Icons.jsx'
import './AdminPage.css'

export default function AdminPage() {
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('teachers')
  const [teachers, setTeachers] = useState([])
  const [search, setSearch] = useState('')
  const [editingTeacher, setEditingTeacher] = useState(null)

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return teachers
    return teachers.filter(t =>
      t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)
    )
  }, [teachers, search])

  function handleSave(id, updates) {
    setTeachers(current => current.map(teacher =>
      teacher.id === id ? { ...teacher, ...updates } : teacher
    ))
    setEditingTeacher(null)
  }

  function handleDelete(id) {
    setTeachers(current => current.filter(teacher => teacher.id !== id))
  }

  function handleLogout() {
    localStorage.removeItem('liraSession')
    navigate('/admin/login')
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeNav={activeNav}
        onNavChange={setActiveNav}
        onLogout={handleLogout}
      />
      <main className="app-main">
        <h1 className="page-title">Manage Teachers</h1>
        <p className="page-sub">Add, edit, or deactivate teacher accounts across your school</p>

        <div className="search-wrap">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search teachers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="table-head">
          <span>Teacher</span>
          <span>DepEd Email</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        <div className="rows">
          {filteredTeachers.length === 0 ? (
            <div className="empty-state">No teachers found.</div>
          ) : (
            filteredTeachers.map(teacher => (
              <TeacherRow
                key={teacher.id}
                teacher={teacher}
                onEdit={setEditingTeacher}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {editingTeacher && (
          <EditTeacherModal
            teacher={editingTeacher}
            onCancel={() => setEditingTeacher(null)}
            onSave={handleSave}
          />
        )}
      </main>
    </div>
  )
}
