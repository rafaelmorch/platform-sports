'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/events', label: 'Events' },
  { href: '/memberships', label: 'Groups' },
  { href: '/activities', label: 'Group\nActivities' },
  { href: '/profile', label: 'Profile' },
];

function isActive(pathname: string, href: string) {
  if (href === '/feed') return pathname === '/feed' || pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export default function BottomNavbar() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: 64,
        background: '#ffffff',
        borderTop: '1px solid #e5e7eb', boxShadow: '0 -6px 20px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 50,
      }}
    >
      {tabs.map((t) => {
        const active = isActive(pathname || '', t.href);

        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              textDecoration: 'none',
              color: active ? '#1e3a8a' : '#6b7280',
              fontFamily: 'Arial',
              fontSize: 12,
              fontWeight: active ? 700 : 500,
              padding: '6px 8px',
              borderRadius: 12,
              background: active ? 'rgba(30,58,138,0.10)' : 'transparent',
              textAlign: 'center',
              whiteSpace: 'pre-line',
              lineHeight: '14px',
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}


