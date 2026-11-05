import { useCallback, useMemo, useSyncExternalStore } from 'react';

/**
 * Minimal hash-based router.
 *
 * URLs look like  https://<user>.github.io/<repo>/#/scripts/get-pendingreboot
 * Everything after "#" is handled in the browser, so GitHub Pages only ever
 * serves index.html. Direct links and page reloads work without any server
 * configuration.
 */

const NAVIGATE_EVENT = 'ps-scripts:navigate';

export interface HashLocation {
  /** Path without query string, always starting with "/", e.g. "/scripts". */
  path: string;
  /** Raw query string without "?", e.g. "q=vpn&type=read-only". */
  search: string;
}

export function parseHash(hash: string): HashLocation {
  let value = hash.replace(/^#/, '');
  if (!value.startsWith('/')) value = `/${value}`;

  const queryStart = value.indexOf('?');
  let path = queryStart >= 0 ? value.slice(0, queryStart) : value;
  const search = queryStart >= 0 ? value.slice(queryStart + 1) : '';

  try {
    path = decodeURI(path);
  } catch {
    // Keep the raw path if it is not valid URI encoding.
  }
  if (path.length > 1) path = path.replace(/\/+$/, '');

  return { path, search };
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  window.addEventListener(NAVIGATE_EVENT, onChange);
  return () => {
    window.removeEventListener('hashchange', onChange);
    window.removeEventListener(NAVIGATE_EVENT, onChange);
  };
}

const getHash = () => window.location.hash;

/** Current location; re-renders when the hash changes. */
export function useLocation(): HashLocation {
  const hash = useSyncExternalStore(subscribe, getHash, () => '');
  return useMemo(() => parseHash(hash), [hash]);
}

/** Turns an app path ("/scripts") into an href ("#/scripts"). */
export function toHref(to: string): string {
  return `#${to}`;
}

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  if (options.replace) {
    window.history.replaceState(window.history.state, '', toHref(to));
    window.dispatchEvent(new Event(NAVIGATE_EVENT));
  } else {
    window.location.hash = to;
  }
}

export type ParamUpdate = Record<string, string | null | undefined>;

/**
 * Query parameters of the current route. Updating them replaces the current
 * history entry, so typing in a search field does not flood the history.
 */
export function useSearchParams(): [URLSearchParams, (update: ParamUpdate) => void] {
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);

  const setParams = useCallback((update: ParamUpdate) => {
    // Read the latest location at call time to avoid stale values.
    const current = parseHash(window.location.hash);
    const next = new URLSearchParams(current.search);
    for (const [key, value] of Object.entries(update)) {
      if (value === null || value === undefined || value === '') next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    navigate(query ? `${current.path}?${query}` : current.path, { replace: true });
  }, []);

  return [params, setParams];
}
