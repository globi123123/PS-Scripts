/** All routes of the app, as a typed union. */
export type Route =
  | { name: 'overview' }
  | { name: 'scripts' }
  | { name: 'script'; slug: string }
  | { name: 'category'; id: string }
  | { name: 'guide' }
  | { name: 'not-found' };

export function matchRoute(path: string): Route {
  if (path === '/') return { name: 'overview' };
  if (path === '/scripts') return { name: 'scripts' };
  if (path === '/guide') return { name: 'guide' };

  const script = /^\/scripts\/([^/]+)$/.exec(path);
  if (script) return { name: 'script', slug: script[1] };

  const category = /^\/category\/([^/]+)$/.exec(path);
  if (category) return { name: 'category', id: category[1] };

  return { name: 'not-found' };
}

function withQuery(path: string, params?: Record<string, string | undefined>): string {
  if (!params) return path;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const value = query.toString();
  return value ? `${path}?${value}` : path;
}

/** Builders for app paths. Use these instead of writing paths by hand. */
export const paths = {
  overview: () => '/',
  scripts: (params?: { q?: string; category?: string; type?: string; status?: string }) => withQuery('/scripts', params),
  script: (slug: string) => `/scripts/${slug}`,
  category: (id: string) => `/category/${id}`,
  guide: () => '/guide',
};
