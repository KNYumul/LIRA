import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearSession } from '../utils/session'
import AdminSidebar from '../components/AdminSidebar.jsx'
import AdminDashboard from './AdminPages/AdminDashboard.jsx'
import AdminTeachersPage from './AdminPages/AdminTeachersPage.jsx'

const INITIAL_TEACHERS = [
  { id: 1, name: 'Teacher 1', email: 'teacher1@deped.gov.ph', status: 'Active' },
  { id: 2, name: 'Teacher 2', email: 'teacher2@deped.gov.ph', status: 'Active' },
  { id: 3, name: 'Teacher 3', email: 'teacher3@deped.gov.ph', status: 'Active' },
  { id: 4, name: 'Teacher 4', email: 'teacher4@deped.gov.ph', status: 'Active' }
]

export default function AdminTeacherDashboard() {
  const navigate = useNavigate()
  const [teachers, setTeachers] = useState(INITIAL_TEACHERS)
  const [activeNav, setActiveNav] = useState('dashboard')

  function handleDelete(id) {
    const teacher = teachers.find(t => t.id === id)
    const ok = window.confirm(`Remove ${teacher.name} from the teacher list?`)
    if (ok) {
      setTeachers(prev => prev.filter(t => t.id !== id))
    }
  }

  function handleSaveEdit(id, updates) {
    setTeachers(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)))
  }

  function handleLogout() {
    const ok = window.confirm('Are you sure you want to log out?')
    if (ok) {
      clearSession()
      navigate('/')
    }
  }

  return (
    <div className="app">
      <AdminSidebar activeNav={activeNav} onNavChange={setActiveNav} onLogout={handleLogout} />

      <main className="main">
        {activeNav === 'dashboard' ? (
          <AdminDashboard teachers={teachers} />
        ) : (
          <AdminTeachersPage
            teachers={teachers}
            onDelete={handleDelete}
            onSaveEdit={handleSaveEdit}
          />
        )}
      </main>
    </div>
  )
}
