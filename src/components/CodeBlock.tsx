import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { tokenizeLines } from '../lib/powershell';
import { CopyButton } from './Button';
import { Icon } from './Icon';
import styles from './CodeBlock.module.css';

interface CodeBlockProps {
  code: string;
  /** Shows a header bar with the file name, meta text and actions. */
  fileName?: string;
  meta?: string;
  actions?: ReactNode;
  lineNumbers?: boolean;
  /** Floating copy button for blocks without a header. */
  copyable?: boolean;
  /** Accessible name of the scrollable code region. */
  label?: string;
}

/** Syntax-highlighted PowerShell code. */
export function CodeBlock({ code, fileName, meta, actions, lineNumbers = false, copyable = false, label }: CodeBlockProps) {
  const lines = useMemo(() => tokenizeLines(code), [code]);
  const gutter = { '--gutter': `${String(lines.length).length}ch` } as CSSProperties;

  return (
    <figure className={styles.block}>
      {fileName && (
        <figcaption className={styles.header}>
          <span className={styles.file}>
            <Icon name="file" size={15} />
            <span className={styles.fileName}>{fileName}</span>
            {meta && <span className={styles.meta}>{meta}</span>}
          </span>
          {actions && <span className={styles.actions}>{actions}</span>}
        </figcaption>
      )}

      <div className={styles.body}>
        {copyable && !fileName && (
          <CopyButton text={code} iconOnly size="sm" variant="ghost" label="Copy code" className={styles.floatingCopy} />
        )}
        <pre
          className={`${styles.pre} ${lineNumbers ? styles.numbered : ''} ${copyable && !fileName ? styles.withCopy : ''}`}
          style={lineNumbers ? gutter : undefined}
          tabIndex={0}
          aria-label={label ?? (fileName ? `Source code of ${fileName}` : 'PowerShell code')}
        >
          <code>
            {lines.map((tokens, lineIndex) => (
              <span className={styles.line} key={lineIndex}>
                {tokens.map((token, tokenIndex) =>
                  token.type === 'text' ? (
                    token.value
                  ) : (
                    <span className={styles[token.type]} key={tokenIndex}>
                      {token.value}
                    </span>
                  ),
                )}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </figure>
  );
}
