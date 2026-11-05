import { useMemo } from 'react';
import { categories, classificationInfo, statusInfo } from '../data/library';
import type { CategoryId } from '../data/types';
import { pluralize } from '../lib/format';
import { filtersFromParams, getFacetCounts, getSearchTerms, searchScripts } from '../lib/search';
import { useSearchParams } from '../router';
import { ClassificationDot } from './Badges';
import { Button } from './Button';
import { FilterGroup } from './FilterGroup';
import { Icon } from './Icon';
import { EmptyState } from './PageParts';
import { ScriptCard, ScriptGrid } from './ScriptCard';
import { SearchField } from './SearchField';
import styles from './ScriptBrowser.module.css';

interface ScriptBrowserProps {
  /** Restrict the browser to one category and hide the category filter. */
  lockedCategory?: CategoryId;
}

/**
 * Search field, filters and result grid. All state lives in the URL
 * (q, category, type, status), so results survive a reload and can be shared.
 */
export function ScriptBrowser({ lockedCategory }: ScriptBrowserProps) {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(() => {
    const fromUrl = filtersFromParams(params);
    return lockedCategory ? { ...fromUrl, category: lockedCategory } : fromUrl;
  }, [params, lockedCategory]);

  const results = useMemo(() => searchScripts(filters), [filters]);
  const terms = useMemo(() => getSearchTerms(filters.query), [filters.query]);
  const categoryCounts = useMemo(() => getFacetCounts(filters, 'category'), [filters]);
  const typeCounts = useMemo(() => getFacetCounts(filters, 'classification'), [filters]);
  const statusCounts = useMemo(() => getFacetCounts(filters, 'status'), [filters]);

  const hasFilters =
    filters.query !== '' ||
    filters.classification !== 'all' ||
    filters.status !== 'all' ||
    (!lockedCategory && filters.category !== 'all');

  const clearFilters = () => setParams({ q: null, category: null, type: null, status: null });

  return (
    <div className={styles.browser}>
      <SearchField
        value={filters.query}
        onChange={(value) => setParams({ q: value })}
        placeholder={lockedCategory ? 'Search in this category' : 'Search scripts and keywords'}
      />

      <div className={styles.filters}>
        {!lockedCategory && (
          <FilterGroup
            label="Category"
            value={filters.category}
            onChange={(value) => setParams({ category: value === 'all' ? null : value })}
            options={[
              { value: 'all', label: 'All', count: categoryCounts.all ?? 0 },
              ...categories.map((category) => ({
                value: category.id,
                label: category.name,
                count: categoryCounts[category.id] ?? 0,
              })),
            ]}
          />
        )}
        <FilterGroup
          label="Type"
          value={filters.classification}
          onChange={(value) => setParams({ type: value === 'all' ? null : value })}
          options={[
            { value: 'all', label: 'All', count: typeCounts.all ?? 0 },
            {
              value: 'read-only',
              label: classificationInfo['read-only'].label,
              count: typeCounts['read-only'] ?? 0,
              icon: <ClassificationDot classification="read-only" />,
            },
            {
              value: 'system-changes',
              label: classificationInfo['system-changes'].label,
              count: typeCounts['system-changes'] ?? 0,
              icon: <ClassificationDot classification="system-changes" />,
            },
          ]}
        />
        <FilterGroup
          label="Status"
          value={filters.status}
          onChange={(value) => setParams({ status: value === 'all' ? null : value })}
          options={[
            { value: 'all', label: 'All', count: statusCounts.all ?? 0 },
            { value: 'implemented', label: statusInfo.implemented.label, count: statusCounts.implemented ?? 0 },
            {
              value: 'placeholder',
              label: statusInfo.placeholder.label,
              count: statusCounts.placeholder ?? 0,
              icon: <Icon name="circle-dashed" size={12} strokeWidth={2} />,
            },
          ]}
        />
      </div>

      <div className={styles.resultsHeader}>
        <p className={styles.count} aria-live="polite">
          {pluralize(results.length, 'script')}
          {filters.query && (
            <>
              {' '}
              for <span className={styles.query}>“{filters.query}”</span>
            </>
          )}
        </p>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} icon={<Icon name="close" size={13} />}>
            Clear filters
          </Button>
        )}
      </div>

      {results.length > 0 ? (
        <ScriptGrid>
          {results.map((script) => (
            <ScriptCard key={script.slug} script={script} terms={terms} hideCategory={!!lockedCategory} />
          ))}
        </ScriptGrid>
      ) : (
        <EmptyState
          title="No scripts match your search"
          action={
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Clear search and filters
            </Button>
          }
        >
          Try a different term, for example a cmdlet name, “reboot” or “driver”, or remove a filter.
        </EmptyState>
      )}
    </div>
  );
}
