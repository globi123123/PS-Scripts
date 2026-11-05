import { Breadcrumbs, PageHeader } from '../components/PageParts';
import { ScriptBrowser } from '../components/ScriptBrowser';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { paths } from '../router';
import styles from './Page.module.css';

export function ScriptsPage() {
  useDocumentTitle('All scripts');

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[{ label: 'Overview', to: paths.overview() }, { label: 'All scripts' }]} />
      <PageHeader
        title="All scripts"
        description="Search and filter the complete library. The current search and filters are part of the URL, so a filtered view can be bookmarked or shared."
      />
      <ScriptBrowser />
    </div>
  );
}
