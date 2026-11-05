import type { RefObject } from 'react';
import { siteConfig } from '../config';
import { useTheme } from '../lib/theme';
import { Link, paths, type Route } from '../router';
import { GitHubIcon, Icon } from './Icon';
import styles from './Header.module.css';

export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={styles.mark}>
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path
        d="M9.5 11l5 5-5 5M17 21h6"
        fill="none"
        stroke="var(--on-accent)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className={styles.iconButton}
      onClick={toggleTheme}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
    </button>
  );
}

interface HeaderProps {
  route: Route;
  menuOpen: boolean;
  onMenuToggle: () => void;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
}

const navItems = [
  { label: 'Overview', to: paths.overview(), match: (route: Route) => route.name === 'overview' },
  {
    label: 'Scripts',
    to: paths.scripts(),
    match: (route: Route) => route.name === 'scripts' || route.name === 'script' || route.name === 'category',
  },
  { label: 'Guide', to: paths.guide(), match: (route: Route) => route.name === 'guide' },
];

export function Header({ route, menuOpen, onMenuToggle, menuButtonRef }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <button
          ref={menuButtonRef}
          type="button"
          className={`${styles.iconButton} ${styles.menuButton}`}
          onClick={onMenuToggle}
          aria-expanded={menuOpen}
          aria-controls="sidebar"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} size={18} />
        </button>

        <Link to={paths.overview()} className={styles.brand} aria-label={`${siteConfig.name} home`}>
          <LogoMark />
          <span className={styles.wordmark}>{siteConfig.name}</span>
        </Link>

        <nav aria-label="Main" className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={styles.navLink}
              aria-current={item.match(route) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <a
            href={siteConfig.repositoryUrl}
            className={styles.iconButton}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository (opens in a new tab)"
            title="GitHub repository"
          >
            <GitHubIcon size={17} />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
