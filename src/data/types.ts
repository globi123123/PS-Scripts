export type CategoryId = 'windows-updates' | 'drivers' | 'vpn' | 'system';

/**
 * Read-Only:      the script only reads information.
 * System-Changes: the script changes files, settings or services.
 */
export type Classification = 'read-only' | 'system-changes';

/**
 * implemented: the script is finished and can be used.
 * placeholder: the script is planned; its .ps1 file is only a scaffold.
 */
export type ScriptStatus = 'implemented' | 'placeholder';

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
}

export interface ScriptParameter {
  name: string;
  type: string;
  description: string;
  default?: string;
  required?: boolean;
}

export interface ScriptExample {
  title: string;
  code: string;
  description?: string;
}

export interface ScriptRequirements {
  /** Supported operating systems, e.g. "Windows 10, Windows 11". */
  os: string;
  /** Whether the script must run in an elevated session. */
  admin: boolean;
  /** PowerShell modules the script relies on. */
  modules?: string[];
  /** Additional permissions or prerequisites, one per line. */
  permissions: string[];
}

interface ScriptBase {
  /** Script name. Must match the .ps1 file name in /scripts. */
  name: string;
  category: CategoryId;
  status: ScriptStatus;
  /** One sentence, shown in lists and cards. */
  summary: string;
  /** Longer explanation, one string per paragraph. */
  description: string[];
  /** Extra search terms that do not appear in the name or summary. */
  keywords: string[];
  /** Supported PowerShell versions, e.g. ["5.1", "7.x"]. */
  powershell: string[];
  requirements: ScriptRequirements;
  parameters: ScriptParameter[];
  examples: ScriptExample[];
  /** Date the script was added to the library (YYYY-MM-DD). */
  added: string;
}

interface ReadOnlyScript extends ScriptBase {
  classification: 'read-only';
}

interface SystemChangesScript extends ScriptBase {
  classification: 'system-changes';
  /** What exactly the script changes. Required for System-Changes scripts. */
  changes: string[];
}

/** A script entry as it is written in src/data/scripts.ts. */
export type ScriptDefinition = ReadOnlyScript | SystemChangesScript;

/** A script entry enriched with its source code and derived values. */
export type Script = ScriptDefinition & {
  slug: string;
  fileName: string;
  /** Path of the .ps1 file inside the repository. */
  filePath: string;
  source: string;
  lineCount: number;
};
