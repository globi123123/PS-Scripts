import { classificationInfo, getCategory, statusInfo } from '../data/library';
import type { CategoryId, Classification, ScriptStatus } from '../data/types';
import { Icon, type IconName } from './Icon';
import styles from './Badges.module.css';

const categoryIcons: Record<CategoryId, IconName> = {
  'windows-updates': 'refresh',
  drivers: 'chip',
  vpn: 'shield',
  system: 'monitor',
};

export function CategoryIcon({ id, size = 16 }: { id: CategoryId; size?: number }) {
  return <Icon name={categoryIcons[id]} size={size} />;
}

interface ClassificationBadgeProps {
  classification: Classification;
  size?: 'sm' | 'md';
}

/** Read-Only (eye, green) or System-Changes (pencil, amber). Never colour only. */
export function ClassificationBadge({ classification, size = 'md' }: ClassificationBadgeProps) {
  const info = classificationInfo[classification];
  return (
    <span
      className={`${styles.badge} ${styles[size]} ${classification === 'read-only' ? styles.readOnly : styles.systemChanges}`}
      title={info.description}
    >
      <Icon name={classification === 'read-only' ? 'eye' : 'pencil'} size={size === 'sm' ? 12 : 13} strokeWidth={2} />
      {info.label}
    </span>
  );
}

export function StatusBadge({ status, size = 'md' }: { status: ScriptStatus; size?: 'sm' | 'md' }) {
  if (status === 'implemented') return null;
  return (
    <span className={`${styles.badge} ${styles[size]} ${styles.placeholder}`} title={statusInfo.placeholder.description}>
      <Icon name="circle-dashed" size={size === 'sm' ? 12 : 13} strokeWidth={2} />
      {statusInfo.placeholder.label}
    </span>
  );
}

export function CategoryTag({ id, size = 'md' }: { id: CategoryId; size?: 'sm' | 'md' }) {
  const category = getCategory(id);
  return (
    <span className={`${styles.badge} ${styles[size]} ${styles.neutral}`}>
      <CategoryIcon id={id} size={size === 'sm' ? 12 : 13} />
      {category?.name ?? id}
    </span>
  );
}

/** Small coloured dot used in the sidebar. Hollow for placeholders. */
export function ClassificationDot({ classification, hollow = false }: { classification: Classification; hollow?: boolean }) {
  return (
    <span
      className={`${styles.dot} ${classification === 'read-only' ? styles.dotReadOnly : styles.dotSystemChanges} ${hollow ? styles.dotHollow : ''}`}
      aria-hidden="true"
    />
  );
}
