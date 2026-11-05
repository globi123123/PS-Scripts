import { Fragment, useMemo } from 'react';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Wraps the parts of `text` that match one of the search terms in <mark>. */
export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const parts = useMemo(() => {
    const usable = terms.filter((term) => term.length > 0).sort((a, b) => b.length - a.length);
    if (usable.length === 0) return [text];
    const pattern = new RegExp(`(${usable.map(escapeRegExp).join('|')})`, 'gi');
    return text.split(pattern);
  }, [text, terms]);

  if (parts.length === 1) return <>{text}</>;

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? <mark key={index}>{part}</mark> : <Fragment key={index}>{part}</Fragment>,
      )}
    </>
  );
}
