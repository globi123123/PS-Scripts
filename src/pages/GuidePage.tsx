import { ClassificationBadge, StatusBadge } from '../components/Badges';
import { CodeBlock } from '../components/CodeBlock';
import { Breadcrumbs, PageHeader, Section } from '../components/PageParts';
import { classificationInfo, libraryStats, statusInfo } from '../data/library';
import { pluralize } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { Link, paths } from '../router';
import styles from './GuidePage.module.css';

const steps = [
  {
    title: 'Download the script',
    text: 'Use “Download .ps1” on the script page. Or copy the code and save it as a .ps1 file with the same name as the script.',
  },
  {
    title: 'Unblock the file',
    text: 'Windows marks downloaded files as coming from the internet. Remove the mark after you have read the script.',
    code: 'Unblock-File -Path .\\Get-PendingReboot.ps1',
  },
  {
    title: 'Allow scripts for this session',
    text: 'The default execution policy on Windows clients blocks all scripts. This command only affects the current PowerShell window and is reset when you close it.',
    code: 'Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned',
  },
  {
    title: 'Run the script',
    text: 'Run it from the folder where you saved it. Every script has comment-based help with all parameters and examples.',
    code: '.\\Get-PendingReboot.ps1\nGet-Help .\\Get-PendingReboot.ps1 -Full',
  },
  {
    title: 'Use an elevated session when needed',
    text: 'If the requirements of a script say “Administrator rights: Required”, start PowerShell with “Run as administrator”.',
  },
];

export function GuidePage() {
  useDocumentTitle('Guide');

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[{ label: 'Overview', to: paths.overview() }, { label: 'Guide' }]} />
      <PageHeader
        title="Guide"
        description="How to run the scripts safely, and what the labels in the library mean."
      />

      <Section id="running" title="Running a script">
        <ol className={styles.steps}>
          {steps.map((step, index) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.stepNumber} aria-hidden="true">
                {index + 1}
              </span>
              <div className={styles.stepBody}>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.text}>{step.text}</p>
                {step.code && <CodeBlock code={step.code} copyable label={step.title} />}
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="classification" title="Read-Only and System-Changes">
        <p className={styles.text}>
          Every script in the library has exactly one of these two labels. The label is shown on every card, in the
          sidebar and on the script page, and you can filter by it.
        </p>
        <dl className={styles.definitions}>
          <div>
            <dt>
              <ClassificationBadge classification="read-only" />
            </dt>
            <dd>
              {classificationInfo['read-only'].description} The script queries WMI/CIM, the registry, event logs or the
              network configuration and returns objects. Safe to run on production systems for diagnostics.{' '}
              <Link to={paths.scripts({ type: 'read-only' })}>{pluralize(libraryStats.readOnly, 'script')}</Link>
            </dd>
          </div>
          <div>
            <dt>
              <ClassificationBadge classification="system-changes" />
            </dt>
            <dd>
              {classificationInfo['system-changes'].description} A script gets this label as soon as it can change
              anything, even if it is only a file. The script page lists exactly what is changed. Where possible the
              script supports -WhatIf and -Confirm.{' '}
              <Link to={paths.scripts({ type: 'system-changes' })}>{pluralize(libraryStats.systemChanges, 'script')}</Link>
            </dd>
          </div>
        </dl>
      </Section>

      <Section id="status" title="Implemented and placeholder scripts">
        <dl className={styles.definitions}>
          <div>
            <dt>
              <span className={styles.implemented}>{statusInfo.implemented.label}</span>
            </dt>
            <dd>{statusInfo.implemented.description} The script is complete and documented.</dd>
          </div>
          <div>
            <dt>
              <StatusBadge status="placeholder" />
            </dt>
            <dd>
              The script is planned. Its page already shows the intended parameters and behaviour, and the .ps1 file is a
              scaffold that stops with an error when it is run. Placeholders have dashed borders and are not listed
              under “Recently added”.{' '}
              <Link to={paths.scripts({ status: 'placeholder' })}>{pluralize(libraryStats.placeholder, 'placeholder')}</Link>
            </dd>
          </div>
        </dl>
      </Section>

      <Section id="versions" title="PowerShell versions">
        <p className={styles.text}>
          <strong>5.1</strong> is Windows PowerShell, which is built into Windows 10 and Windows 11.{' '}
          <strong>7.x</strong> is PowerShell 7 (pwsh), which is installed separately. Scripts marked “5.1 · 7.x” run in
          both. To check which version you are using:
        </p>
        <CodeBlock code="$PSVersionTable.PSVersion" copyable label="Check the PowerShell version" />
      </Section>

      <Section id="downloads" title="About the downloaded files">
        <p className={styles.text}>
          Downloaded .ps1 files are saved as UTF-8 with byte order mark and Windows line endings. This way Windows
          PowerShell 5.1 reads special characters such as umlauts correctly. Copying with “Copy script” puts the plain
          source on the clipboard.
        </p>
      </Section>
    </div>
  );
}
