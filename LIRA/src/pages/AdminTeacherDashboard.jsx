import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearSession } from '../utils/session'
import { clearSavedPortalPage, getSavedPortalPage, savePortalPage } from '../utils/portalPage'
import AdminSidebar from '../components/AdminSidebar.jsx'
import AdminDashboard from './AdminPages/AdminDashboard.jsx'
import AdminTeachersPage from './AdminPages/AdminTeachersPage.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function toDashboardTeacher(teacher) {
  return {
    ...teacher,
    name: `${teacher.firstName} ${teacher.lastName}`.trim(),
    status: teacher.active ? 'Active' : 'Inactive'
  }
}

export default function AdminTeacherDashboard() {
  const navigate = useNavigate()
  const [teachers, setTeachers] = useState([])
  const [loadError, setLoadError] = useState('')
  const [activeNav, setActiveNav] = useState(() => getSavedPortalPage(
    'liraAdminPortalPage',
    ['dashboard', 'teachers']
  ))

  useEffect(() => {
    savePortalPage('liraAdminPortalPage', activeNav)
  }, [activeNav])

  useEffect(() => {
    let cancelled = false

    async function loadTeachers() {
      try {
        const response = await fetch(`${API_URL}/api/teachers`)
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Could not load teacher accounts.')
        if (!cancelled) setTeachers(data.map(toDashboardTeacher))
      } catch (error) {
        if (!cancelled) setLoadError(error.message || 'Could not load teacher accounts.')
      }
    }

    loadTeachers()
    return () => { cancelled = true }
  }, [])

  function handleDelete(id) {
    const teacher = teachers.find(t => t.id === id)
    const ok = window.confirm(`Remove ${teacher.name} from the teacher list?`)
    if (ok) {
      fetch(`${API_URL}/api/teachers/${id}`, { method: 'DELETE' })
        .then(async response => {
          if (!response.ok) {
            const data = await response.json().catch(() => ({}))
            throw new Error(data.message || 'Could not delete teacher account.')
          }
          setTeachers(prev => prev.filter(t => t.id !== id))
        })
        .catch(error => window.alert(error.message))
    }
  }

  async function handleSaveEdit(id, updates) {
    const existingTeacher = teachers.find(teacher => teacher.id === id)
    const nameParts = updates.name.trim().split(/\s+/)
    const firstName = nameParts.shift()
    const lastName = nameParts.join(' ') || existingTeacher.lastName

    try {
      const response = await fetch(`${API_URL}/api/teachers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email: updates.email,
          active: updates.status === 'Active'
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not update teacher account.')
      const updatedTeacher = toDashboardTeacher(data.teacher)
      setTeachers(prev => prev.map(teacher => teacher.id === id ? updatedTeacher : teacher))
      return true
    } catch (error) {
      window.alert(error.message)
      return false
    }
  }

  function handleLogout() {
    const ok = window.confirm('Are you sure you want to log out?')
    if (ok) {
      clearSavedPortalPage('liraAdminPortalPage')
      clearSession()
      navigate('/')
    }
  }

  return (
    <div className="app">
      <AdminSidebar activeNav={activeNav} onNavChange={setActiveNav} onLogout={handleLogout} />

      <main className="main">
        {activeNav === 'dashboard' ? (
          <AdminDashboard teachers={teachers} loadError={loadError} />
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
