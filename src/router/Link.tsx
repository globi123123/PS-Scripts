import type { AnchorHTMLAttributes } from 'react';
import { toHref } from './router';

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** App path, e.g. "/scripts" or paths.script(slug). */
  to: string;
}

/** A plain anchor with a hash href, so middle-click and "open in new tab" work. */
export function Link({ to, ...props }: LinkProps) {
  return <a href={toHref(to)} {...props} />;
}
