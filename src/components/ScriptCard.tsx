import type { ReactNode } from 'react';
import { getCategory } from '../data/library';
import type { Script } from '../data/types';
import { formatVersions } from '../lib/format';
import { Link, paths } from '../router';
import { CategoryIcon, ClassificationBadge, StatusBadge } from './Badges';
import { Highlight } from './Highlight';
import { Icon } from './Icon';
import styles from './ScriptCard.module.css';

interface ScriptCardProps {
  script: Script;
  /** Search terms to highlight in the name and summary. */
  terms?: string[];
  /** Hide the category line, e.g. on a category page. */
  hideCategory?: boolean;
}

export function ScriptCard({ script, terms = [], hideCategory = false }: ScriptCardProps) {
  const category = getCategory(script.category);
  const placeholder = script.status === 'placeholder';

  return (
    <Link to={paths.script(script.slug)} className={`${styles.card} ${placeholder ? styles.placeholder : ''}`}>
      <div className={styles.top}>
        {hideCategory ? (
          <span className={styles.category}>PowerShell {formatVersions(script.powershell)}</span>
        ) : (
          <span className={styles.category}>
            <CategoryIcon id={script.category} size={14} />
            {category?.name}
          </span>
        )}
        <span className={styles.badges}>
          <StatusBadge status={script.status} size="sm" />
          <ClassificationBadge classification={script.classification} size="sm" />
        </span>
      </div>

      <h3 className={styles.name}>
        <Highlight text={script.name} terms={terms} />
      </h3>
      <p className={styles.summary}>
        <Highlight text={script.summary} terms={terms} />
      </p>

      <div className={styles.footer}>
        {!hideCategory && <span>PowerShell {formatVersions(script.powershell)}</span>}
        <span>{script.requirements.admin ? 'Requires admin' : 'No admin required'}</span>
        <Icon name="arrow-right" size={14} className={styles.arrow} />
      </div>
    </Link>
  );
}

export function ScriptGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}
