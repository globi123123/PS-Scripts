import { CategoryIcon } from '../components/Badges';
import { Breadcrumbs, PageHeader } from '../components/PageParts';
import { ScriptBrowser } from '../components/ScriptBrowser';
import { categories, getCategory, getScriptsInCategory } from '../data/library';
import { pluralize } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { Link, paths } from '../router';
import { NotFoundPage } from './NotFoundPage';
import styles from './Page.module.css';

export function CategoryPage({ id }: { id: string }) {
  const category = getCategory(id);
  useDocumentTitle(category?.name ?? 'Category not found');

  if (!category) {
    return (
      <NotFoundPage title="Category not found">
        There is no category called “{id}”. Pick one of the categories in the sidebar.
      </NotFoundPage>
    );
  }

  const scripts = getScriptsInCategory(category.id);
  const implemented = scripts.filter((script) => script.status === 'implemented').length;
  const readOnly = scripts.filter((script) => script.classification === 'read-only').length;

  return (
    <div className={styles.page}>
      <Breadcrumbs
        items={[
          { label: 'Overview', to: paths.overview() },
          { label: 'Scripts', to: paths.scripts() },
          { label: category.name },
        ]}
      />
      <PageHeader
        eyebrow={
          <span className={styles.categoryEyebrow}>
            <CategoryIcon id={category.id} size={14} />
            Category
          </span>
        }
        title={category.name}
        description={category.description}
      >
        <p className={styles.headerMeta}>
          {pluralize(scripts.length, 'script')} · {implemented} implemented · {readOnly} Read-Only ·{' '}
          {scripts.length - readOnly} System-Changes
        </p>
      </PageHeader>

      <ScriptBrowser lockedCategory={category.id} />

      <nav aria-label="Other categories" className={styles.otherCategories}>
        <span className={styles.otherLabel}>Other categories</span>
        {categories
          .filter((other) => other.id !== category.id)
          .map((other) => (
            <Link key={other.id} to={paths.category(other.id)} className={styles.otherLink}>
              <CategoryIcon id={other.id} size={14} />
              {other.name}
            </Link>
          ))}
      </nav>
    </div>
  );
}
