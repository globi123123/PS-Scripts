import { useEffect, useState, type ReactNode } from 'react';
import { Link } from '../router';
import { Icon, type IconName } from './Icon';
import styles from './PageParts.module.css';

/* Page header --------------------------------------------------------------- */

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, children }: PageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
      <h1 className={styles.title}>{title}</h1>
      {description && <p className={styles.description}>{description}</p>}
      {children}
    </header>
  );
}

/* Section ------------------------------------------------------------------- */

interface SectionProps {
  id?: string;
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export function Section({ id, title, action, children }: SectionProps) {
  return (
    <section id={id} className={styles.section} aria-labelledby={id ? `${id}-title` : undefined}>
      <div className={styles.sectionHeader}>
        <h2 id={id ? `${id}-title` : undefined} className={styles.sectionTitle}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/* Breadcrumbs --------------------------------------------------------------- */

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
      <ol>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {item.to && index < items.length - 1 ? (
              <Link to={item.to}>{item.label}</Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
            {index < items.length - 1 && <Icon name="chevron-right" size={13} className={styles.separator} />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* Callout ------------------------------------------------------------------- */

interface CalloutProps {
  tone: 'neutral' | 'caution';
  icon: IconName;
  title: ReactNode;
  children?: ReactNode;
}

export function Callout({ tone, icon, title, children }: CalloutProps) {
  return (
    <div className={`${styles.callout} ${styles[tone]}`}>
      <Icon name={icon} size={18} className={styles.calloutIcon} />
      <div className={styles.calloutBody}>
        <p className={styles.calloutTitle}>{title}</p>
        {children && <div className={styles.calloutText}>{children}</div>}
      </div>
    </div>
  );
}

/* Empty state --------------------------------------------------------------- */

interface EmptyStateProps {
  icon?: IconName;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon = 'search', title, children, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>
        <Icon name={icon} size={20} />
      </span>
      <p className={styles.emptyTitle}>{title}</p>
      {children && <p className={styles.emptyText}>{children}</p>}
      {action}
    </div>
  );
}

/* On this page -------------------------------------------------------------- */

export interface TocItem {
  id: string;
  label: string;
}

/** Table of contents with scroll spy. Uses buttons, because "#" belongs to the router. */
export function OnThisPage({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;

    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting);
        const first = items.find((item) => visible.get(item.id));
        if (first) setActive(first.id);
      },
      { rootMargin: '-72px 0px -55% 0px' },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [items]);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    setActive(id);
  };

  return (
    <nav aria-label="On this page" className={styles.toc}>
      <p className={styles.tocTitle}>On this page</p>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={styles.tocLink}
              aria-current={active === item.id ? 'true' : undefined}
              onClick={() => scrollTo(item.id)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={styles.tocTop}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <Icon name="arrow-up" size={13} />
        Back to top
      </button>
    </nav>
  );
}
