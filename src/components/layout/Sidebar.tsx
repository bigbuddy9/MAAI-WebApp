'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { href: '/tracker', label: 'Tracker', icon: 'tracker' },
  { href: '/goals', label: 'Goals', icon: 'goals' },
  { href: '/stats', label: 'Stats', icon: 'stats' },
  { href: '/reports', label: 'Reports', icon: 'reports' },
  { href: '/profile', label: 'Profile', icon: 'profile' },
];

function NavIcon({ name, color }: { name: string; color: string }) {
  switch (name) {
    case 'tracker':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17L4 12" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'goals':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2.5} />
          <circle cx="12" cy="12" r="5" stroke={color} strokeWidth={2.5} />
          <circle cx="12" cy="12" r="1.5" fill={color} />
        </svg>
      );
    case 'stats':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <line x1="18" y1="20" x2="18" y2="10" stroke={color} strokeWidth={3} strokeLinecap="round" />
          <line x1="12" y1="20" x2="12" y2="4" stroke={color} strokeWidth={3} strokeLinecap="round" />
          <line x1="6" y1="20" x2="6" y2="14" stroke={color} strokeWidth={3} strokeLinecap="round" />
        </svg>
      );
    case 'reports':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6C5.44772 2 5 2.44772 5 3V21C5 21.5523 5.44772 22 6 22H18C18.5523 22 19 21.5523 19 21V7L14 2Z" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 2V7H19" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'profile':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="7" r="4" stroke={color} strokeWidth={2.5} />
        </svg>
      );
    default:
      return null;
  }
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoRow}>
          <Image
            src="/logo-icon.png"
            alt="MyAccountableAI"
            width={32}
            height={32}
            className={styles.logoIcon}
          />
          <Image
            src="/logo-wordmark.png"
            alt="MyAccountableAI"
            width={120}
            height={24}
            className={styles.logoWordmark}
          />
        </div>
      </div>
      <nav className={styles.nav}>
        {NAV_ITEMS.map(item => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              <span className={styles.navIcon}>
                <NavIcon name={item.icon} color={isActive ? '#00FFFF' : '#6B6B6B'} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
