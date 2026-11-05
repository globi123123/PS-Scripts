import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { siteConfig } from '../config';
import { Link, paths, useLocation, type Route } from '../router';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import styles from './Layout.module.css';

const DESKTOP_QUERY = '(min-width: 1024px)';

export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { path } = useLocation();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const closeMenu = useCallback((restoreFocus = false) => {
    setMenuOpen(false);
    if (restoreFocus) menuButtonRef.current?.focus();
  }, []);

  // Close the mobile menu on navigation and when the window gets wide.
  useEffect(() => closeMenu(), [path, closeMenu]);
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => query.matches && closeMenu();
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [closeMenu]);

  // While the menu is open: Escape closes it, the page behind does not scroll.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && closeMenu(true);
    document.addEventListener('keydown', onKeyDown);
    document.documentElement.classList.add('menu-open');
    sidebarRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.documentElement.classList.remove('menu-open');
    };
  }, [menuOpen, closeMenu]);

  return (
    <div className={styles.app}>
      <button type="button" className={styles.skipLink} onClick={() => mainRef.current?.focus()}>
        Skip to content
      </button>

      <Header
        route={route}
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((open) => !open)}
        menuButtonRef={menuButtonRef}
      />

      <div className={styles.shell}>
        <aside id="sidebar" ref={sidebarRef} className={`${styles.sidebar} ${menuOpen ? styles.open : ''}`}>
          <Sidebar route={route} />
        </aside>
        <div
          className={`${styles.overlay} ${menuOpen ? styles.overlayVisible : ''}`}
          onClick={() => closeMenu()}
          aria-hidden="true"
        />

        <main id="main" ref={mainRef} tabIndex={-1} className={styles.main} inert={menuOpen || undefined}>
          {children}
          <footer className={styles.footer}>
            <p>
              {siteConfig.name} · {siteConfig.tagline}. Scripts are provided as they are. Read a script before you
              run it, especially when it is marked System-Changes.
            </p>
            <p className={styles.footerLinks}>
              <Link to={paths.guide()}>Guide</Link>
              <a href={siteConfig.repositoryUrl} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
