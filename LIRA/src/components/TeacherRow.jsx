import { PencilIcon, MinusIcon, ChevronDownIcon } from './Icons.jsx'

export default function TeacherRow({ teacher, onEdit, onDelete }) {
  const statusClass = teacher.status === 'Active' ? 'active' : 'inactive'

  return (
    <div className="row">
      <span className="cell">{teacher.name}</span>
      <span className="cell email">{teacher.email}</span>
      <div className="cell">
        <span className={`status-pill ${statusClass}`}>{teacher.status}</span>
      </div>
      <div className="actions">
        <button className="icon-btn edit" title="Edit" onClick={() => onEdit(teacher)}>
          <PencilIcon />
        </button>
        <button className="icon-btn delete" title="Deactivate / Remove" onClick={() => onDelete(teacher.id)}>
          <MinusIcon />
        </button>
        <span className="row-caret"><ChevronDownIcon /></span>
      </div>
    </div>
  )
}
