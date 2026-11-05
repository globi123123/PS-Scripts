import type { ReactNode } from 'react';
import { buttonClass } from '../components/Button';
import { Icon } from '../components/Icon';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { Link, paths } from '../router';
import styles from './Page.module.css';

interface NotFoundPageProps {
  title?: string;
  children?: ReactNode;
}

export function NotFoundPage({ title = 'Page not found', children }: NotFoundPageProps) {
  useDocumentTitle(title);

  return (
    <div className={styles.notFound}>
      <p className={styles.notFoundCode}>404</p>
      <h1 className={styles.notFoundTitle}>{title}</h1>
      <p className={styles.notFoundText}>
        {children ?? 'The page you are looking for does not exist or has been moved.'}
      </p>
      <div className={styles.notFoundActions}>
        <Link to={paths.overview()} className={buttonClass('primary')}>
          <Icon name="grid" size={15} />
          Go to overview
        </Link>
        <Link to={paths.scripts()} className={buttonClass('secondary')}>
          <Icon name="list" size={15} />
          All scripts
        </Link>
      </div>
    </div>
  );
}
