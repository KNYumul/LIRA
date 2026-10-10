import { useMemo, useState } from 'react'
import AdminTeacherRow from '../../components/AdminTeacherRow.jsx'
import AdminEditTeacherModal from '../../components/AdminEditTeacherModal.jsx'
import { SearchIcon } from '../../components/AdminIcons.jsx'
import { Trash2, Undo2 } from 'lucide-react'

export default function AdminTeachersPage({ teachers, archivedTeachers, onLoadArchived, onRestore, onPermanentDelete, onDelete, onSaveEdit }) {
  const [search, setSearch] = useState('')
  const [editingTeacher, setEditingTeacher] = useState(null)
  const [showArchived, setShowArchived] = useState(false)

  async function toggleArchived() {
    if (!showArchived) await onLoadArchived()
    setShowArchived(value => !value)
  }

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

      <button type="button" role="switch" aria-checked={showArchived} onClick={toggleArchived} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 0, background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>
        <span>Archived teachers</span><span style={{ position: 'relative', display: 'inline-flex', width: '44px', height: '24px', borderRadius: '999px', background: showArchived ? '#4C6949' : '#9CA3AF' }}><span style={{ position: 'absolute', top: '4px', left: showArchived ? '24px' : '4px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left .2s' }} /></span>
      </button>

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
        {showArchived ? archivedTeachers.filter(t => !search.trim() || t.name.toLowerCase().includes(search.trim().toLowerCase()) || t.email.toLowerCase().includes(search.trim().toLowerCase())).map(teacher => (
          <div className="row" key={teacher.id}>
            <span className="cell">{teacher.name}</span><span className="cell email">{teacher.email}</span><span className="cell sections">{teacher.sections?.join(', ') || 'No Section'}</span><span className="cell">Archived</span>
            <div className="actions"><button className="icon-btn edit" title="Restore" aria-label="Restore teacher" style={{ color: '#fff', background: '#3D995A' }} onClick={() => onRestore(teacher.id)}><Undo2 size={16} /></button><button className="icon-btn delete" title="Delete permanently" aria-label="Permanently delete teacher" style={{ color: '#fff', background: '#C0504D' }} onClick={() => onPermanentDelete(teacher.id)}><Trash2 size={16} /></button></div>
          </div>
        )) : filteredTeachers.length === 0 ? (
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
