import { useEffect, useId, useRef } from 'react';
import { Icon } from './Icon';
import styles from './SearchField.module.css';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: 'md' | 'lg';
  label?: string;
  /** Focus the field when "/" is pressed anywhere on the page. */
  shortcut?: boolean;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Search scripts',
  size = 'md',
  label = 'Search scripts',
  shortcut = true,
}: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    if (!shortcut) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcut]);

  return (
    <div className={`${styles.field} ${styles[size]}`}>
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <Icon name="search" size={size === 'lg' ? 18 : 16} className={styles.icon} />
      <input
        ref={inputRef}
        id={id}
        type="search"
        className={styles.input}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            if (value) onChange('');
            else inputRef.current?.blur();
          }
        }}
      />
      {value ? (
        <button
          type="button"
          className={styles.clear}
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
        >
          <Icon name="close" size={14} />
        </button>
      ) : (
        shortcut && (
          <kbd className={styles.kbd} aria-hidden="true">
            /
          </kbd>
        )
      )}
    </div>
  );
}
