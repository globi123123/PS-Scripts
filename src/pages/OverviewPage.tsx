import { useMemo } from 'react';
import { CategoryIcon, CategoryTag, ClassificationBadge } from '../components/Badges';
import { Icon } from '../components/Icon';
import { EmptyState, Section } from '../components/PageParts';
import { ScriptCard, ScriptGrid } from '../components/ScriptCard';
import { SearchField } from '../components/SearchField';
import { categories, getRecentScripts, getScriptsInCategory, libraryStats } from '../data/library';
import { formatDate, pluralize } from '../lib/format';
import { emptyFilters, getSearchTerms, searchScripts } from '../lib/search';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { Link, paths, useSearchParams } from '../router';
import styles from './OverviewPage.module.css';

/** Example searches shown below the search field. */
const suggestions = ['reboot', 'driver', 'vpn', 'event log', 'export'];

export function OverviewPage() {
  useDocumentTitle();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';

  const results = useMemo(() => (query.trim() ? searchScripts({ ...emptyFilters, query }) : []), [query]);
  const terms = useMemo(() => getSearchTerms(query), [query]);
  const recent = getRecentScripts(5);

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="overview-title">
        <p className={styles.eyebrow}>
          <span className={styles.eyebrowDot} aria-hidden="true" />
          {pluralize(libraryStats.total, 'script')} · {libraryStats.categories} categories
        </p>
        <h1 id="overview-title" className={styles.title}>
          PowerShell Script Library
        </h1>
        <p className={styles.lead}>
          A personal collection of PowerShell scripts for everyday Windows administration: Windows Updates, drivers, VPN
          and system diagnostics. Every script is documented, clearly marked as Read-Only or System-Changes and ready
          to copy or download.
        </p>

        <div className={styles.search}>
          <SearchField
            size="lg"
            value={query}
            onChange={(value) => setParams({ q: value })}
            placeholder="Search scripts and keywords"
          />
          <p className={styles.suggestions}>
            <span>Try</span>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className={styles.suggestion}
                aria-pressed={query.trim().toLowerCase() === suggestion}
                onClick={() => setParams({ q: suggestion })}
              >
                {suggestion}
              </button>
            ))}
          </p>
        </div>

        <ul className={styles.stats} aria-label="Library statistics">
          <li>
            <Link to={paths.scripts()} className={styles.stat}>
              <span className={styles.statValue}>{libraryStats.total}</span>
              <span className={styles.statLabel}>Scripts in total</span>
            </Link>
          </li>
          <li>
            <Link to={paths.scripts({ status: 'implemented' })} className={styles.stat}>
              <span className={styles.statValue}>{libraryStats.implemented}</span>
              <span className={styles.statLabel}>
                Implemented · {libraryStats.placeholder} planned
              </span>
            </Link>
          </li>
          <li>
            <Link to={paths.scripts({ type: 'read-only' })} className={styles.stat}>
              <span className={styles.statValue}>{libraryStats.readOnly}</span>
              <span className={`${styles.statLabel} ${styles.readOnly}`}>
                <Icon name="eye" size={13} strokeWidth={2} />
                Read-Only
              </span>
            </Link>
          </li>
          <li>
            <Link to={paths.scripts({ type: 'system-changes' })} className={styles.stat}>
              <span className={styles.statValue}>{libraryStats.systemChanges}</span>
              <span className={`${styles.statLabel} ${styles.systemChanges}`}>
                <Icon name="pencil" size={13} strokeWidth={2} />
                System-Changes
              </span>
            </Link>
          </li>
        </ul>
      </section>

      {query.trim() ? (
        <Section
          id="results"
          title={`${pluralize(results.length, 'result')} for “${query.trim()}”`}
          action={
            <Link to={paths.scripts({ q: query })} className={styles.sectionLink}>
              Refine with filters
              <Icon name="arrow-right" size={14} />
            </Link>
          }
        >
          {results.length > 0 ? (
            <ScriptGrid>
              {results.map((script) => (
                <ScriptCard key={script.slug} script={script} terms={terms} />
              ))}
            </ScriptGrid>
          ) : (
            <EmptyState title="No scripts found">
              Nothing matches “{query.trim()}”. Try a cmdlet name or a keyword such as “reboot”, “driver” or “vpn”.
            </EmptyState>
          )}
        </Section>
      ) : (
        <>
          <Section
            id="categories"
            title="Categories"
            action={
              <Link to={paths.scripts()} className={styles.sectionLink}>
                Browse all scripts
                <Icon name="arrow-right" size={14} />
              </Link>
            }
          >
            <ul className={styles.categoryGrid}>
              {categories.map((category) => {
                const scripts = getScriptsInCategory(category.id);
                const planned = scripts.filter((script) => script.status === 'placeholder').length;
                return (
                  <li key={category.id}>
                    <Link to={paths.category(category.id)} className={styles.categoryCard}>
                      <span className={styles.categoryIcon}>
                        <CategoryIcon id={category.id} size={18} />
                      </span>
                      <span className={styles.categoryName}>{category.name}</span>
                      <span className={styles.categoryDescription}>{category.description}</span>
                      <span className={styles.categoryScripts}>
                        {scripts.map((script) => (
                          <span
                            key={script.slug}
                            className={script.status === 'placeholder' ? styles.plannedScript : undefined}
                          >
                            {script.name}
                          </span>
                        ))}
                      </span>
                      <span className={styles.categoryFooter}>
                        <span>
                          {pluralize(scripts.length, 'script')}
                          {planned > 0 && ` · ${planned} planned`}
                        </span>
                        <Icon name="arrow-right" size={15} className={styles.cardArrow} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section
            id="recent"
            title="Recently added"
            action={
              <Link to={paths.scripts({ status: 'implemented' })} className={styles.sectionLink}>
                All implemented
                <Icon name="arrow-right" size={14} />
              </Link>
            }
          >
            <ol className={styles.recent}>
              {recent.map((script) => (
                <li key={script.slug}>
                  <Link to={paths.script(script.slug)} className={styles.recentRow}>
                    <span className={styles.recentMain}>
                      <span className={styles.recentName}>{script.name}</span>
                      <span className={styles.recentSummary}>{script.summary}</span>
                    </span>
                    <span className={styles.recentMeta}>
                      <CategoryTag id={script.category} size="sm" />
                      <ClassificationBadge classification={script.classification} size="sm" />
                      <time dateTime={script.added} className={styles.recentDate}>
                        {formatDate(script.added)}
                      </time>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="classification" title="Read-Only or System-Changes?">
            <div className={styles.classGrid}>
              <Link to={paths.scripts({ type: 'read-only' })} className={styles.classCard}>
                <span className={`${styles.classIcon} ${styles.readOnlyIcon}`}>
                  <Icon name="eye" size={18} />
                </span>
                <span className={styles.classTitle}>Read-Only</span>
                <span className={styles.classText}>
                  Only reads information from WMI/CIM, the registry, event logs or the network configuration. Nothing
                  on the computer is changed, so these scripts are safe for diagnostics.
                </span>
                <span className={styles.classLink}>
                  Show {pluralize(libraryStats.readOnly, 'script')}
                  <Icon name="arrow-right" size={14} />
                </span>
              </Link>
              <Link to={paths.scripts({ type: 'system-changes' })} className={styles.classCard}>
                <span className={`${styles.classIcon} ${styles.systemChangesIcon}`}>
                  <Icon name="pencil" size={18} />
                </span>
                <span className={styles.classTitle}>System-Changes</span>
                <span className={styles.classText}>
                  Changes the system, for example by writing files, changing settings or restarting services. Every
                  script lists exactly what it changes. Run it with -WhatIf first when it is supported.
                </span>
                <span className={styles.classLink}>
                  Show {pluralize(libraryStats.systemChanges, 'script')}
                  <Icon name="arrow-right" size={14} />
                </span>
              </Link>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
