import { LogoutIcon } from './Icons.jsx'

export default function Sidebar({ activeNav, onNavChange, onLogout }) {
 function Logo() {
  return (
    <div className="flex items-center">
      <svg
        width="210"
        height="65"
        viewBox="0 0 345 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Soft cream outer background */}
        <ellipse
          cx="70"
          cy="50"
          rx="63"
          ry="47"
          fill="#F7F3E6"
        />

        {/* Blue left side */}
        <path
          d="
            M70 13
            C45 12 25 28 25 51
            C25 76 42 91 69 91
            C78 91 83 88 84 84
            L84 32
            C82 21 77 15 70 13
            Z
          "
          fill="#9DD8E7"
        />

        {/* Yellow right side */}
        <path
          d="
            M84 32
            C89 20 99 14 113 15
            C132 16 144 31 143 50
            C143 75 126 91 102 91
            C94 91 88 89 84 84
            Z
          "
          fill="#F3DE91"
        />

        {/* Stem */}
        <path
          d="
            M84 51
            C83 39 82 28 78 22
            C75 18 72 16 69 14
          "
          fill="none"
          stroke="#73A95B"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Leaf */}
        <path
          d="
            M77 22
            C69 21 62 15 61 9
            C70 8 78 12 82 18
            C82 20 80 22 77 22
            Z
          "
          fill="#75B45F"
        />

        {/* Peach dots */}
        <circle
          cx="88"
          cy="10"
          r="5"
          fill="#F2B17A"
        />

        <circle
          cx="84"
          cy="17"
          r="2.2"
          fill="#F2B17A"
        />

        {/* LIRA */}
        <text
          x="118"
          y="65"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="50"
          fontWeight="600"
          letterSpacing="-2.6"
          fill="#4C6949"
        >
          LIRA
        </text>
      </svg>
    </div>
  )
}

  return (
    <aside className="sidebar">
      <Logo />

      <div className="crumb-pill">
        Admin Dashboard
      </div>

      <button
        className={`nav-item ${
          activeNav === 'dashboard' ? 'active' : ''
        }`}
        onClick={() => onNavChange('dashboard')}
      >
        Dashboard
      </button>

      <button
        className={`nav-item ${
          activeNav === 'teachers' ? 'active' : ''
        }`}
        onClick={() => onNavChange('teachers')}
      >
        Teachers
      </button>

      <div className="sidebar-spacer" />

      <button
        className="logout-btn"
        onClick={onLogout}
      >
        <LogoutIcon />
        <span>Logout</span>
      </button>
    </aside>
  )
}