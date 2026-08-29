import { useMemo, useState } from 'react'
import AdminTeacherRow from '../../components/AdminTeacherRow.jsx'
import AdminEditTeacherModal from '../../components/AdminEditTeacherModal.jsx'
import { SearchIcon } from '../../components/AdminIcons.jsx'

export default function AdminTeachersPage({ teachers, onDelete, onSaveEdit }) {
  const [search, setSearch] = useState('')
  const [editingTeacher, setEditingTeacher] = useState(null)

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return teachers
    return teachers.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      (t.sections || []).some(section => section.toLowerCase().includes(q))
    )
  }, [teachers, search])

  async function handleSave(id, updates) {
    if (await onSaveEdit(id, updates)) setEditingTeacher(null)
  }

  return (
    <>
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
        <span>Managed Sections</span>
        <span>Status</span>
        <span>Actions</span>
      </div>

      <div className="rows">
        {filteredTeachers.length === 0 ? (
          <div className="empty-state">No teachers found.</div>
        ) : (
          filteredTeachers.map(teacher => (
            <AdminTeacherRow
              key={teacher.id}
              teacher={teacher}
              onEdit={setEditingTeacher}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {editingTeacher && (
        <AdminEditTeacherModal
          teacher={editingTeacher}
          onCancel={() => setEditingTeacher(null)}
          onSave={handleSave}
        />
      )}
    </>
  )
}
