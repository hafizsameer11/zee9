import type { ReactNode } from 'react'

const s = (path: ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
)

export const Icons = {
  dashboard: s(<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>),
  games: s(<><rect x="2" y="6" width="20" height="12" rx="4" /><line x1="7" y1="12" x2="9" y2="12" /><line x1="8" y1="11" x2="8" y2="13" /><circle cx="16" cy="11" r="1" /><circle cx="18" cy="13.5" r="1" /></>),
  agents: s(<><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 5.5a3 3 0 010 5.5" /><path d="M18 14c2.2.6 4 2.6 4 5" /></>),
  referrals: s(<><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="M6 8.5v3a2 2 0 002 2h8a2 2 0 002-2v-3" /><line x1="12" y1="13.5" x2="12" y2="15.5" /></>),
  players: s(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>),
  deposit: s(<><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 21h16" /></>),
  withdraw: s(<><path d="M12 21V9" /><path d="M7 14l5-5 5 5" /><path d="M4 3h16" /></>),
  bonus: s(<><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L3.2 7.7l5.4-.8z" /></>),
  cashback: s(<><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M2 10h20" /><circle cx="8" cy="15" r="1.6" /></>),
  offers: s(<><path d="M20.6 12.6L12.6 20.6a2 2 0 01-2.8 0l-6.4-6.4a2 2 0 01-.6-1.4V4a1 1 0 011-1h8.8a2 2 0 011.4.6l6.6 6.6a2 2 0 010 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></>),
  wheel: s(<><circle cx="12" cy="12" r="9" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="5.6" y1="5.6" x2="18.4" y2="18.4" /><line x1="18.4" y1="5.6" x2="5.6" y2="18.4" /><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" /></>),
  settings: s(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z" /></>),
  search: s(<><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></>),
  bell: s(<><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></>),
  up: s(<><polyline points="6 15 12 9 18 15" /></>),
  down: s(<><polyline points="6 9 12 15 18 9" /></>),
  plus: s(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>),
  check: s(<><polyline points="20 6 9 17 4 12" /></>),
  x: s(<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>),
  edit: s(<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></>),
  wa: s(<><path d="M3 21l1.6-4.8A8 8 0 1120 12a8 8 0 01-12.2 6.8z" /><path d="M8.5 9c0 4 2.5 6.5 6.5 6.5" /></>),
  logout: s(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>),
  money: s(<><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>),
  users: s(<><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /></>),
}

export type IconKey = keyof typeof Icons
