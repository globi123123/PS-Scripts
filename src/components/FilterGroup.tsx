import { useId, type ReactNode } from 'react';
import styles from './FilterGroup.module.css';

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  icon?: ReactNode;
}

interface FilterGroupProps<T extends string> {
  label: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
}

/** A row of toggle chips where exactly one option is selected. */
export function FilterGroup<T extends string>({ label, value, options, onChange }: FilterGroupProps<T>) {
  const labelId = useId();

  return (
    <div className={styles.group} role="group" aria-labelledby={labelId}>
      <span id={labelId} className={styles.label}>
        {label}
      </span>
      <div className={styles.options}>
        {options.map((option) => {
          const selected = option.value === value;
          const empty = option.count === 0 && !selected;
          return (
            <button
              key={option.value}
              type="button"
              className={styles.chip}
              aria-pressed={selected}
              disabled={empty}
              onClick={() => onChange(option.value)}
            >
              {option.icon}
              <span>{option.label}</span>
              {option.count !== undefined && <span className={styles.count}>{option.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
