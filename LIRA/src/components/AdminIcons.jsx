// Icons used only by the admin teacher dashboard.
export function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  )
}

export function PencilIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
    </svg>
  )
}

export function MinusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" {...props}>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  )
}

export function ChevronDownIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  )
}

export function LogoutIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="9 14 4 9 9 4"></polyline>
      <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
    </svg>
  )
}

export function HeartIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 21s-6.7-4.35-9.3-8.2C1 10.2 1.6 6.9 4.3 5.3c2.2-1.3 4.9-.6 6.3 1.4l1.4 2 1.4-2c1.4-2 4.1-2.7 6.3-1.4 2.7 1.6 3.3 4.9 1.6 7.5C18.7 16.65 12 21 12 21z" />
    </svg>
  )
}

export function DotIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

export function LiraLogo(props) {
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <linearGradient id="sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B9E4EE" /><stop offset="100%" stopColor="#8FCFE0" />
        </linearGradient>
        <linearGradient id="butter" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F3E7B0" /><stop offset="100%" stopColor="#E9D384" />
        </linearGradient>
        <linearGradient id="leaf" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#9FC488" /><stop offset="100%" stopColor="#7FAE6C" />
        </linearGradient>
      </defs>
      <path d="M100,150 C70,150 40,137 27,107 C15,80 18,52 33,35 C44,22 64,20 78,30 C92,40 99,60 100,82 Z" fill="url(#sky)" />
      <path d="M100,150 C130,150 160,137 173,107 C185,80 182,52 167,35 C156,22 136,20 122,30 C108,40 101,60 100,82 Z" fill="url(#butter)" />
      <path d="M100,82 C98,105 98,128 100,150" fill="none" stroke="#7FAE6C" strokeWidth="3" strokeLinecap="round" />
      <path d="M102,45 C90,43 81,34 79,21 C93,21 105,27 110,39 C112,44 108,48 102,45 Z" fill="url(#leaf)" />
    </svg>
  )
}
