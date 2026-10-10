import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearSession } from '../utils/session'
import {
  clearSavedPortalPage,
  getSavedPortalPage,
  savePortalPage
} from '../utils/portalPage'

import AdminSidebar from '../components/AdminSidebar.jsx'
import AdminDashboard from './AdminPages/AdminDashboard.jsx'
import AdminTeachersPage from './AdminPages/AdminTeachersPage.jsx'
import AdminSurveyResults from './AdminPages/AdminResultSurvey.jsx'
import { liraAlert, showError } from '../utils/alerts.js'

const API_URL = import.meta.env.VITE_API_URL || ''

function toDashboardTeacher(teacher) {
  return {
    ...teacher,
    name: `${teacher.firstName} ${teacher.lastName}`.trim(),
    status: teacher.active ? 'Active' : 'Inactive'
  }
}

function escapeAlertHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export default function AdminTeacherDashboard() {
  const navigate = useNavigate()

  const [teachers, setTeachers] = useState([])
  const [archivedTeachers, setArchivedTeachers] = useState([])
  const [loadError, setLoadError] = useState('')

  // ADDED "survey" HERE
  const [activeNav, setActiveNav] = useState(() =>
    getSavedPortalPage(
      'liraAdminPortalPage',
      ['dashboard', 'teachers', 'survey']
    )
  )

  useEffect(() => {
    savePortalPage('liraAdminPortalPage', activeNav)
  }, [activeNav])

  useEffect(() => {
    let cancelled = false

    async function loadTeachers() {
      try {
        const response = await fetch(`${API_URL}/api/teachers`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.message || 'Could not load teacher accounts.'
          )
        }

        if (!cancelled) {
          setTeachers(data.map(toDashboardTeacher))
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error.message || 'Could not load teacher accounts.'
          )
        }
      }
    }

    loadTeachers()

    return () => {
      cancelled = true
    }
  }, [])

  async function loadArchivedTeachers() {
    const response = await fetch(`${API_URL}/api/teachers?archived=true`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Could not load archived teacher accounts.')
    setArchivedTeachers(data.map(toDashboardTeacher))
  }

  async function restoreTeacher(id) {
    try {
      const response = await fetch(`${API_URL}/api/teachers/${id}/restore`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not restore teacher account.')
      const teacher = toDashboardTeacher(data.teacher)
      setArchivedTeachers(prev => prev.filter(item => item.id !== id))
      setTeachers(prev => [teacher, ...prev])
    } catch (error) { await showError(error.message) }
  }

  async function permanentlyDeleteTeacher(id) {
    const result = await liraAlert.fire({ icon: 'warning', title: 'Permanently delete teacher?', text: 'This cannot be undone.', showCancelButton: true, confirmButtonText: 'Delete permanently' })
    if (!result.isConfirmed) return
    try {
      const response = await fetch(`${API_URL}/api/teachers/${id}/permanent`, { method: 'DELETE' })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'Could not permanently delete teacher account.')
      setArchivedTeachers(prev => prev.filter(item => item.id !== id))
    } catch (error) { await showError(error.message) }
  }

  async function handleDelete(id) {
    const teacher = teachers.find(t => t.id === id)
    if (!teacher) return

    const managedSections = teacher.sections || []
    let replacementTeacherId = null

    let result
    if (managedSections.length) {
      const replacementOptions = Object.fromEntries(
        teachers
          .filter(candidate => candidate.id !== id && candidate.status === 'Active')
          .map(candidate => [candidate.id, candidate.name])
      )

      result = await liraAlert.fire({
        icon: 'warning',
        title: 'Remove teacher and managed sections?',
        html: `${escapeAlertHtml(teacher.name)} manages ${managedSections.length === 1 ? 'this section' : 'these sections'}: <strong>${managedSections.map(escapeAlertHtml).join(', ')}</strong>. Select another active teacher to transfer ${managedSections.length === 1 ? 'it' : 'them'}, or leave this blank to delete ${managedSections.length === 1 ? 'the section' : 'the sections'}.`,
        input: 'select',
        inputOptions: replacementOptions,
        inputPlaceholder: 'Delete managed section(s)',
        showCancelButton: true,
        confirmButtonText: 'Remove teacher',
        cancelButtonText: 'Cancel'
      })
      replacementTeacherId = result.value || null
    } else {
      result = await liraAlert.fire({
        icon: 'warning',
        title: 'Remove teacher?',
        text: `${teacher.name} will be removed from the teacher list.`,
        showCancelButton: true,
        confirmButtonText: 'Remove',
        cancelButtonText: 'Cancel'
      })
    }

    if (!result.isConfirmed) return

    try {
      const response = await fetch(
        `${API_URL}/api/teachers/${id}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ replacementTeacherId })
        }
      )

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({}))

        throw new Error(
          data.message || 'Could not delete teacher account.'
        )
      }

      setTeachers(prev =>
        prev.filter(t => t.id !== id)
      )

      await liraAlert.fire({
        icon: 'success',
        title: 'Teacher removed',
        text: replacementTeacherId
          ? 'The managed section(s) were transferred to the selected teacher.'
          : managedSections.length
            ? 'The managed section(s) were removed.'
            : undefined,
        timer: 1600,
        showConfirmButton: false
      })
    } catch (error) {
      await showError(error.message)
    }
  }

  async function handleSaveEdit(id, updates) {
    const existingTeacher = teachers.find(
      teacher => teacher.id === id
    )

    const nameParts = updates.name
      .trim()
      .split(/\s+/)

    const firstName = nameParts.shift()

    const lastName =
      nameParts.join(' ') || existingTeacher.lastName

    try {
      const response = await fetch(
        `${API_URL}/api/teachers/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            firstName,
            lastName,
            email: updates.email,
            active: updates.status === 'Active'
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Could not update teacher account.'
        )
      }

      const updatedTeacher =
        toDashboardTeacher(data.teacher)

      setTeachers(prev =>
        prev.map(teacher =>
          teacher.id === id
            ? updatedTeacher
            : teacher
        )
      )

      await liraAlert.fire({
        icon: 'success',
        title: 'Teacher information updated',
        text:
          'The teacher account changes were saved successfully.',
        timer: 1800,
        showConfirmButton: false
      })

      return true
    } catch (error) {
      await showError(error.message)
      return false
    }
  }

  async function handleLogout() {
    const result = await liraAlert.fire({
      icon: 'question',
      title: 'Log out?',
      text: 'Are you sure you want to log out?',
      showCancelButton: true,
      confirmButtonText: 'Log out',
      cancelButtonText: 'Stay logged in'
    })

    if (result.isConfirmed) {
      clearSavedPortalPage('liraAdminPortalPage')
      clearSession()
      navigate('/')
    }
  }

  return (
    <div className="app">
      <AdminSidebar
        activeNav={activeNav}
        onNavChange={setActiveNav}
        onLogout={handleLogout}
      />

      <main className="main">
        {activeNav === 'dashboard' && (
          <AdminDashboard
            teachers={teachers}
            loadError={loadError}
          />
        )}

        {activeNav === 'teachers' && (
          <AdminTeachersPage
            teachers={teachers}
            archivedTeachers={archivedTeachers}
            onLoadArchived={loadArchivedTeachers}
            onRestore={restoreTeacher}
            onPermanentDelete={permanentlyDeleteTeacher}
            onDelete={handleDelete}
            onSaveEdit={handleSaveEdit}
          />
        )}

        {activeNav === 'survey' && (
          <AdminSurveyResults />
        )}
      </main>
    </div>
  )
}
