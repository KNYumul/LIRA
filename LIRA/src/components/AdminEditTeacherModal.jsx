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
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

  function handleClear() {
    setForm(EMPTY_FORM)
    setErrors({})
  }

  async function handleSave() {
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Name is required'
    if (!form.email.trim()) {
      nextErrors.email = 'DepEd email is required'
    } else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      nextErrors.email = 'Enter a valid email address'
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
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Edit Teacher</h2>
          <button className="clear-btn" onClick={handleClear}>clear</button>
        </div>

        <div className={`field ${errors.name ? 'error' : ''}`}>
          <label>Name <span className="req">*</span></label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Teacher name"
          />
          {errors.name && <div className="error-text">{errors.name}</div>}
        </div>

        <div className={`field ${errors.email ? 'error' : ''}`}>
          <label>DepEd Email <span className="req">*</span></label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="teacher@deped.gov.ph"
          />
          {errors.email && <div className="error-text">{errors.email}</div>}
        </div>

        <div className="field">
          <label>Status <span className="req">*</span></label>
          <div className="select-wrap">
            <select
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
            <ChevronDownIcon />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>Save Edit</button>
        </div>
      </div>
    </div>
  )
}
