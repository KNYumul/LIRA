import { useMemo, useState } from 'react'
import TeacherRow from '../components/TeacherRow.jsx'
import EditTeacherModal from '../components/EditTeacherModal.jsx'
import { SearchIcon } from '../components/Icons.jsx'

export default function TeachersPage({ teachers, onDelete, onSaveEdit }) {
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
    onSaveEdit(id, updates)
    setEditingTeacher(null)
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
        <span>Learner</span>
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
              onDelete={onDelete}
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
    </>
  )
}
