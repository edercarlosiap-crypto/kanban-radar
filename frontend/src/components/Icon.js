import React from 'react';

const paths = {
  chart: 'M4 18h16M7 14v4M12 10v8M17 6v12',
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  sales: 'M4 18h16M7 14l3-3 3 2 5-5',
  target: 'M12 3v3m0 12v3m9-9h-3M6 12H3m15.364 6.364-2.121-2.121M7.757 7.757 5.636 5.636m12.728 0-2.121 2.121M7.757 16.243l-2.121 2.121M12 8a4 4 0 100 8 4 4 0 000-8z',
  money: 'M4 7h16v10H4zM10 12h4',
  box: 'M4 8l8-4 8 4-8 4-8-4zm0 0v8l8 4 8-4V8',
  users: 'M16 19v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M16 8a3 3 0 11-6 0 3 3 0 016 0M22 19v-1a4 4 0 00-3-3.87M16 3.13a3 3 0 010 5.75',
  map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6zM9 4v14M15 6v14',
  city: 'M4 20V9l6-3v14M10 20h10V4l-5 2-5-2',
  briefcase: 'M9 7V5a3 3 0 013-3h0a3 3 0 013 3v2M3 9h18v10H3z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  settings: 'M12 8a4 4 0 100 8 4 4 0 000-8zm8.94 4a7.95 7.95 0 00-.17-1.63l2.06-1.6-2-3.46-2.49 1a8.08 8.08 0 00-2.82-1.64L15.1 2h-6.2l-.44 2.67A8.08 8.08 0 005.64 6.3l-2.49-1-2 3.46 2.06 1.6A8 8 0 003 12c0 .56.06 1.11.17 1.63l-2.06 1.6 2 3.46 2.49-1a8.08 8.08 0 002.82 1.64L8.9 22h6.2l.44-2.67a8.08 8.08 0 002.82-1.64l2.49 1 2-3.46-2.06-1.6c.11-.52.17-1.07.17-1.63z',
  lock: 'M6 10V8a6 6 0 1112 0v2M5 10h14v10H5z',
  folder: 'M3 6h6l2 2h10v10H3z',
  activity: 'M3 12h4l2-4 4 8 3-6h5',
  analytics: 'M4 19h16M6 16l3-4 3 2 5-7M6 10v6M12 12v4M18 8v8',
  logout: 'M10 17l5-5-5-5M15 12H3M12 3h7v18h-7',
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4l10-10-4-4L4 16v4zM13 7l4 4',
  trash: 'M4 7h16M9 7V4h6v3M8 11v7M12 11v7M16 11v7'
};

export default function Icon({ name, size = 16, className = '' }) {
  const d = paths[name] || paths.list;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d.split(/(?=M)/).map((segment, idx) => (
        <path key={idx} d={segment.trim()} />
      ))}
    </svg>
  );
}
