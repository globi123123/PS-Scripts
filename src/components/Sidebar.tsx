import { useEffect, useState, type ReactNode } from 'react';
import { siteConfig } from '../config';
import { categories, getScript, getScriptsInCategory, libraryStats } from '../data/library';
import type { CategoryId } from '../data/types';
import { Link, paths, useSearchParams, type Route } from '../router';
import { CategoryIcon, ClassificationDot } from './Badges';
import { GitHubIcon, Icon, type IconName } from './Icon';
import styles from './Sidebar.module.css';

interface NavItemProps {
  to: string;
  active: boolean;
  icon?: ReactNode;
  count?: number;
  children: ReactNode;
}

function NavItem({ to, active, icon, count, children }: NavItemProps) {
  return (
    <Link to={to} className={styles.item} aria-current={active ? 'page' : undefined}>
      {icon && <span className={styles.itemIcon}>{icon}</span>}
      <span className={styles.itemLabel}>{children}</span>
      {count !== undefined && <span className={styles.count}>{count}</span>}
    </Link>
  );
}

const icon = (name: IconName) => <Icon name={name} size={16} />;

/** The category that should be highlighted for the current route. */
function activeCategoryOf(route: Route): CategoryId | undefined {
  if (route.name === 'category') return route.id as CategoryId;
  if (route.name === 'script') return getScript(route.slug)?.category;
  return undefined;
}

export function Sidebar({ route }: { route: Route }) {
  const [params] = useSearchParams();
  const activeCategory = activeCategoryOf(route);
  const activeSlug = route.name === 'script' ? route.slug.toLowerCase() : undefined;

  const [expanded, setExpanded] = useState<Set<CategoryId>>(() => new Set(activeCategory ? [activeCategory] : []));

  // Open the group of the current category whenever it changes.
  useEffect(() => {
    if (!activeCategory) return;
    setExpanded((current) => (current.has(activeCategory) ? current : new Set(current).add(activeCategory)));
  }, [activeCategory]);

  const toggle = (id: CategoryId) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onScripts = route.name === 'scripts';
  const type = params.get('type');
  const status = params.get('status');

  return (
    <nav aria-label="Script library" className={styles.sidebar}>
      <ul className={styles.list}>
        <li>
          <NavItem to={paths.overview()} active={route.name === 'overview'} icon={icon('grid')}>
            Overview
          </NavItem>
        </li>
        <li>
          <NavItem
            to={paths.scripts()}
            active={onScripts && !type && !status && !params.get('category')}
            icon={icon('list')}
            count={libraryStats.total}
          >
            All scripts
          </NavItem>
        </li>
      </ul>

      <p className={styles.heading}>Categories</p>
      <ul className={styles.list}>
        {categories.map((category) => {
          const scripts = getScriptsInCategory(category.id);
          const isOpen = expanded.has(category.id);
          const groupId = `sidebar-group-${category.id}`;

          return (
            <li key={category.id}>
              <div className={styles.categoryRow}>
                <NavItem
                  to={paths.category(category.id)}
                  active={route.name === 'category' && activeCategory === category.id}
                  icon={<CategoryIcon id={category.id} />}
                  count={scripts.length}
                >
                  {category.name}
                </NavItem>
                <button
                  type="button"
                  className={styles.toggle}
                  onClick={() => toggle(category.id)}
                  aria-expanded={isOpen}
                  aria-controls={groupId}
                  aria-label={`${isOpen ? 'Hide' : 'Show'} scripts in ${category.name}`}
                >
                  <Icon name="chevron-down" size={14} className={isOpen ? styles.chevronOpen : styles.chevron} />
                </button>
              </div>

              <ul id={groupId} className={styles.scripts} hidden={!isOpen}>
                {scripts.map((script) => (
                  <li key={script.slug}>
                    <Link
                      to={paths.script(script.slug)}
                      className={`${styles.script} ${script.status === 'placeholder' ? styles.scriptPlaceholder : ''}`}
                      aria-current={activeSlug === script.slug ? 'page' : undefined}
                      title={script.status === 'placeholder' ? `${script.name} (placeholder)` : script.name}
                    >
                      <ClassificationDot classification={script.classification} hollow={script.status === 'placeholder'} />
                      <span className={styles.scriptName}>{script.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>

      <p className={styles.heading}>Classification</p>
      <ul className={styles.list}>
        <li>
          <NavItem
            to={paths.scripts({ type: 'read-only' })}
            active={onScripts && type === 'read-only'}
            icon={<ClassificationDot classification="read-only" />}
            count={libraryStats.readOnly}
          >
            Read-Only
          </NavItem>
        </li>
        <li>
          <NavItem
            to={paths.scripts({ type: 'system-changes' })}
            active={onScripts && type === 'system-changes'}
            icon={<ClassificationDot classification="system-changes" />}
            count={libraryStats.systemChanges}
          >
            System-Changes
          </NavItem>
        </li>
        <li>
          <NavItem
            to={paths.scripts({ status: 'placeholder' })}
            active={onScripts && status === 'placeholder'}
            icon={<Icon name="circle-dashed" size={13} strokeWidth={2} />}
            count={libraryStats.placeholder}
          >
            Placeholders
          </NavItem>
        </li>
      </ul>

      <p className={styles.heading}>Resources</p>
      <ul className={styles.list}>
        <li>
          <NavItem to={paths.guide()} active={route.name === 'guide'} icon={icon('book')}>
            Guide
          </NavItem>
        </li>
        <li>
          <a href={siteConfig.repositoryUrl} className={styles.item} target="_blank" rel="noreferrer">
            <span className={styles.itemIcon}>
              <GitHubIcon size={15} />
            </span>
            <span className={styles.itemLabel}>GitHub repository</span>
            <Icon name="external-link" size={13} className={styles.external} />
          </a>
        </li>
      </ul>
    </nav>
  );
}
