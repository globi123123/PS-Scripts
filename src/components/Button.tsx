import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { copyToClipboard } from '../lib/clipboard';
import { downloadScript } from '../lib/download';
import { Icon } from './Icon';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md';

export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', extra = ''): string {
  return [styles.button, styles[variant], styles[size], extra].filter(Boolean).join(' ');
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

export function Button({ variant, size, icon, className, children, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...props}>
      {icon}
      {children}
    </button>
  );
}

type CopyState = 'idle' | 'copied' | 'failed';

interface CopyButtonProps {
  text: string;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show only the icon (label is still used for screen readers). */
  iconOnly?: boolean;
  className?: string;
}

export function CopyButton({ text, label = 'Copy', variant = 'secondary', size = 'md', iconOnly = false, className }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleClick = async () => {
    const copied = await copyToClipboard(text);
    setState(copied ? 'copied' : 'failed');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2000);
  };

  const currentLabel = state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label;

  return (
    <button
      type="button"
      className={buttonClass(variant, size, `${iconOnly ? styles.iconOnly : ''} ${className ?? ''}`)}
      onClick={handleClick}
      aria-label={iconOnly ? currentLabel : undefined}
      title={iconOnly ? currentLabel : undefined}
      data-state={state}
    >
      <Icon name={state === 'copied' ? 'check' : 'copy'} size={size === 'sm' ? 14 : 15} />
      {!iconOnly && <span>{currentLabel}</span>}
      <span className="visually-hidden" aria-live="polite">
        {state === 'copied' ? 'Copied to clipboard' : state === 'failed' ? 'Copy failed' : ''}
      </span>
    </button>
  );
}

interface DownloadButtonProps {
  fileName: string;
  source: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  label?: string;
}

export function DownloadButton({ fileName, source, variant = 'primary', size = 'md', label = 'Download .ps1' }: DownloadButtonProps) {
  return (
    <button
      type="button"
      className={buttonClass(variant, size)}
      onClick={() => downloadScript(fileName, source)}
      title={`Download ${fileName}`}
    >
      <Icon name="download" size={size === 'sm' ? 14 : 15} />
      <span>{label}</span>
    </button>
  );
}
