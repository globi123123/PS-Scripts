import { CategoryIcon, ClassificationBadge, StatusBadge } from '../components/Badges';
import { buttonClass, CopyButton, DownloadButton } from '../components/Button';
import { CodeBlock } from '../components/CodeBlock';
import { GitHubIcon, Icon } from '../components/Icon';
import { Breadcrumbs, Callout, OnThisPage, Section, type TocItem } from '../components/PageParts';
import { siteConfig } from '../config';
import { classificationInfo, getAdjacentScripts, getCategory, getScript } from '../data/library';
import type { Script } from '../data/types';
import { formatDate, formatSize, formatVersions } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { Link, paths } from '../router';
import { NotFoundPage } from './NotFoundPage';
import styles from './ScriptPage.module.css';

const toc: TocItem[] = [
  { id: 'about', label: 'About' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'parameters', label: 'Parameters' },
  { id: 'examples', label: 'Usage examples' },
  { id: 'source', label: 'Source code' },
];

const versionName = (version: string) => (version.startsWith('5') ? `Windows PowerShell ${version}` : `PowerShell ${version}`);

export function ScriptPage({ slug }: { slug: string }) {
  const script = getScript(slug);
  useDocumentTitle(script?.name ?? 'Script not found');

  if (!script) {
    return (
      <NotFoundPage title="Script not found">
        There is no script called “{slug}” in the library. Search the library or browse the categories instead.
      </NotFoundPage>
    );
  }

  return <ScriptDetail script={script} />;
}

function ScriptDetail({ script }: { script: Script }) {
  const category = getCategory(script.category);
  const { previous, next } = getAdjacentScripts(script);
  const placeholder = script.status === 'placeholder';
  const githubUrl = `${siteConfig.repositoryUrl}/blob/${siteConfig.defaultBranch}/${script.filePath}`;

  return (
    <div className={styles.layout}>
      <article className={styles.article}>
        <Breadcrumbs
          items={[
            { label: 'Overview', to: paths.overview() },
            { label: category?.name ?? script.category, to: paths.category(script.category) },
            { label: script.name },
          ]}
        />

        <header className={styles.header}>
          <div className={styles.badges}>
            <ClassificationBadge classification={script.classification} />
            <StatusBadge status={script.status} />
            <Link to={paths.category(script.category)} className={styles.categoryLink}>
              <CategoryIcon id={script.category} size={13} />
              {category?.name}
            </Link>
          </div>

          <h1 className={styles.title}>{script.name}</h1>
          <p className={styles.summary}>{script.summary}</p>

          <div className={styles.actions}>
            <DownloadButton fileName={script.fileName} source={script.source} />
            <CopyButton text={script.source} label="Copy script" />
            <a href={githubUrl} className={buttonClass('ghost')} target="_blank" rel="noreferrer">
              <GitHubIcon size={15} />
              View on GitHub
            </a>
          </div>

          <dl className={styles.facts}>
            <div>
              <dt>PowerShell</dt>
              <dd>{formatVersions(script.powershell)}</dd>
            </div>
            <div>
              <dt>Administrator</dt>
              <dd>{script.requirements.admin ? 'Required' : 'Not required'}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>
                {script.lineCount} lines · {formatSize(script.source)}
              </dd>
            </div>
            <div>
              <dt>Added</dt>
              <dd>
                <time dateTime={script.added}>{formatDate(script.added)}</time>
              </dd>
            </div>
          </dl>
        </header>

        {(placeholder || script.classification === 'system-changes') && (
          <div className={styles.notices}>
            {placeholder && (
              <Callout tone="neutral" icon="circle-dashed" title="Placeholder: not implemented yet">
                <p>
                  This script is planned. The source below is a scaffold that documents the intended parameters and
                  behaviour. It stops with an error when you run it.
                </p>
              </Callout>
            )}
            {script.classification === 'system-changes' && (
              <Callout tone="caution" icon="pencil" title="This script makes changes to the system">
                <ul>
                  {script.changes.map((change) => (
                    <li key={change}>{change}</li>
                  ))}
                </ul>
              </Callout>
            )}
          </div>
        )}

        <Section id="about" title="About">
          <div className={styles.prose}>
            {script.description.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Section>

        <Section id="requirements" title="Requirements & permissions">
          <dl className={styles.requirements}>
            <div>
              <dt>Classification</dt>
              <dd className={styles.classification}>
                <ClassificationBadge classification={script.classification} size="sm" />
                <span>{classificationInfo[script.classification].description}</span>
              </dd>
            </div>
            <div>
              <dt>PowerShell</dt>
              <dd>{script.powershell.map(versionName).join(', ')}</dd>
            </div>
            <div>
              <dt>Operating system</dt>
              <dd>{script.requirements.os}</dd>
            </div>
            <div>
              <dt>Administrator rights</dt>
              <dd className={styles.admin}>
                <Icon name={script.requirements.admin ? 'alert' : 'user'} size={15} />
                {script.requirements.admin ? 'Required, run in an elevated session' : 'Not required'}
              </dd>
            </div>
            <div>
              <dt>Modules</dt>
              <dd>
                {script.requirements.modules?.length ? (
                  <span className={styles.modules}>
                    {script.requirements.modules.map((module) => (
                      <code key={module}>{module}</code>
                    ))}
                  </span>
                ) : (
                  'Only built-in cmdlets and Windows APIs'
                )}
              </dd>
            </div>
            <div>
              <dt>Permissions</dt>
              <dd>
                <ul className={styles.permissions}>
                  {script.requirements.permissions.map((permission) => (
                    <li key={permission}>{permission}</li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </Section>

        <Section id="parameters" title="Parameters">
          {script.parameters.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Parameter</th>
                    <th scope="col">Type</th>
                    <th scope="col">Default</th>
                    <th scope="col">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {script.parameters.map((parameter) => (
                    <tr key={parameter.name}>
                      <td data-label="Parameter">
                        <code className={styles.paramName}>-{parameter.name}</code>
                        {parameter.required && <span className={styles.required}>Required</span>}
                      </td>
                      <td data-label="Type">
                        <code className={styles.paramType}>{parameter.type}</code>
                      </td>
                      <td data-label="Default">
                        {parameter.default ? <code className={styles.paramType}>{parameter.default}</code> : <span className={styles.none}>–</span>}
                      </td>
                      <td data-label="Description">{parameter.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.muted}>This script has no parameters.</p>
          )}
        </Section>

        <Section id="examples" title="Usage examples">
          <div className={styles.examples}>
            {script.examples.map((example) => (
              <div key={example.title} className={styles.example}>
                <h3 className={styles.exampleTitle}>{example.title}</h3>
                {example.description && <p className={styles.exampleText}>{example.description}</p>}
                <CodeBlock code={example.code} copyable label={example.title} />
              </div>
            ))}
          </div>
        </Section>

        <Section id="source" title="Source code">
          {script.source ? (
            <CodeBlock
              code={script.source}
              fileName={script.fileName}
              meta={`${script.lineCount} lines · ${formatSize(script.source)}`}
              lineNumbers
              actions={
                <>
                  <CopyButton text={script.source} size="sm" variant="ghost" />
                  <DownloadButton fileName={script.fileName} source={script.source} size="sm" variant="secondary" label="Download" />
                </>
              }
            />
          ) : (
            <Callout tone="caution" icon="alert" title="Source file missing">
              <p>
                Expected the file <code>{script.filePath}</code> in the repository.
              </p>
            </Callout>
          )}
        </Section>

        <nav className={styles.pager} aria-label="More scripts">
          {previous ? (
            <Link to={paths.script(previous.slug)} className={styles.pagerLink}>
              <span className={styles.pagerLabel}>
                <Icon name="chevron-left" size={14} />
                Previous
              </span>
              <span className={styles.pagerName}>{previous.name}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={paths.script(next.slug)} className={`${styles.pagerLink} ${styles.pagerNext}`}>
              <span className={styles.pagerLabel}>
                Next
                <Icon name="chevron-right" size={14} />
              </span>
              <span className={styles.pagerName}>{next.name}</span>
            </Link>
          )}
        </nav>
      </article>

      <aside className={styles.rail}>
        <div className={styles.railInner}>
          <OnThisPage items={toc} />
        </div>
      </aside>
    </div>
  );
}
