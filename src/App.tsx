import { Fragment, useEffect } from 'react';
import { Layout } from './components/Layout';
import { CategoryPage } from './pages/CategoryPage';
import { GuidePage } from './pages/GuidePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OverviewPage } from './pages/OverviewPage';
import { ScriptPage } from './pages/ScriptPage';
import { ScriptsPage } from './pages/ScriptsPage';
import { matchRoute, useLocation, type Route } from './router';

function renderPage(route: Route) {
  switch (route.name) {
    case 'overview':
      return <OverviewPage />;
    case 'scripts':
      return <ScriptsPage />;
    case 'category':
      return <CategoryPage id={route.id} />;
    case 'script':
      return <ScriptPage slug={route.slug} />;
    case 'guide':
      return <GuidePage />;
    case 'not-found':
      return <NotFoundPage />;
  }
}

export function App() {
  const { path } = useLocation();
  const route = matchRoute(path);

  // Start every page at the top. Changing only the query (search, filters)
  // keeps the scroll position.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  return (
    <Layout route={route}>
      {/* The key resets page state (e.g. copy buttons) when the path changes. */}
      <Fragment key={path}>{renderPage(route)}</Fragment>
    </Layout>
  );
}
