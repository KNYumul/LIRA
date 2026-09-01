import { useState, useEffect } from 'react'
import { ChevronDownIcon } from './AdminIcons.jsx'

const EMPTY_FORM = { name: '', email: '', status: 'active' }

export default function AdminEditTeacherModal({ teacher, onCancel, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (teacher) {
      setForm({
        name: teacher.name,
        email: teacher.email,
        status: teacher.status.toLowerCase()
      })
      setErrors({})
    }
  }, [teacher])

  if (!teacher) return null

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  function handleNameChange(value) {
    // Remove numbers from name
    const noNumbers = value.replace(/[0-9]/g, '')

    handleChange('name', noNumbers)
  }

  function handleEmailChange(value) {
    // Remove numbers from email
    const noNumbers = value.replace(/[0-9]/g, '')

    handleChange('email', noNumbers)
  }

  function handleClear() {
    setForm(EMPTY_FORM)
    setErrors({})
  }

  async function handleSave() {
    const nextErrors = {}

    // Name validation
    if (!form.name.trim()) {
      nextErrors.name = 'Name is required'
    } else if (form.name.length > 50) {
      nextErrors.name = 'Name must not exceed 50 characters'
    } else if (/[0-9]/.test(form.name)) {
      nextErrors.name = 'Name cannot contain numbers'
    }

    // Email validation
    if (!form.email.trim()) {
      nextErrors.email = 'DepEd email is required'
    } else if (form.email.length > 50) {
      nextErrors.email = 'Email must not exceed 50 characters'
    } else if (/[0-9]/.test(form.email)) {
      nextErrors.email = 'Email cannot contain numbers'
    } else if (!/^[^\s@]+@deped\.gov\.ph$/i.test(form.email.trim())) {
      nextErrors.email = 'Enter a valid DepEd email'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    await onSave(teacher.id, {
      name: form.name.trim(),
      email: form.email.trim(),
      status: form.status === 'active' ? 'Active' : 'Inactive'
    })
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Edit Teacher</h2>

          <button
            type="button"
            className="clear-btn"
            onClick={handleClear}
          >
            clear
          </button>
        </div>

        {/* NAME */}
        <div className={`field ${errors.name ? 'error' : ''}`}>
          <label>
            Name <span className="req">*</span>
          </label>

          <input
            type="text"
            value={form.name}
            maxLength={50}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Teacher name"
          />

          {errors.name && (
            <div className="error-text">
              {errors.name}
            </div>
          )}
        </div>

        {/* DEPED EMAIL */}
        <div className={`field ${errors.email ? 'error' : ''}`}>
          <label>
            DepEd Email <span className="req">*</span>
          </label>

          <input
            type="email"
            value={form.email}
            maxLength={50}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="teacher@deped.gov.ph"
          />

          {errors.email && (
            <div className="error-text">
              {errors.email}
            </div>
          )}
        </div>

        {/* STATUS */}
        <div className="field">
          <label>
            Status <span className="req">*</span>
          </label>

          <div className="select-wrap">
            <select
              value={form.status}
              onChange={(e) =>
                handleChange('status', e.target.value)
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <ChevronDownIcon />
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn-save"
            onClick={handleSave}
          >
            Save Edit
          </button>
        </div>
      </div>
    </div>
  )
}