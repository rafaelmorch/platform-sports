'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/feed', label: 'Feed' },
  { href: '/events', label: 'Eventos' },
  { href: '/activities', label: 'Atividades' },
  { href: '/profile', label: 'Perfil' },
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
        background: '#000',
        borderTop: '1px solid rgba(255,255,255,0.08)',
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
              color: active ? '#fff' : 'rgba(255,255,255,0.6)',
              fontFamily: 'Arial',
              fontSize: 14,
              fontWeight: active ? 700 : 500,
              padding: '10px 12px',
              borderRadius: 12,
              background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}