import { categories } from './categories';
import { scriptDefinitions } from './scripts';
import type { Category, CategoryId, Classification, Script, ScriptStatus } from './types';

/**
 * All .ps1 files below /scripts, loaded as plain text at build time.
 * Key: "/scripts/<category>/<Name>.ps1", value: file content.
 */
const sourceFiles = import.meta.glob<string>('/scripts/**/*.ps1', {
  query: '?raw',
  import: 'default',
  eager: true,
});

interface SourceFile {
  path: string;
  source: string;
}

const sourcesByName = new Map<string, SourceFile>();
for (const [path, content] of Object.entries(sourceFiles)) {
  const fileName = path.split('/').pop() ?? path;
  const name = fileName.replace(/\.ps1$/i, '').toLowerCase();
  sourcesByName.set(name, {
    path: path.replace(/^\//, ''),
    // Normalise line endings and make sure the file ends with one newline.
    source: content.replace(/\r\n?/g, '\n').replace(/\s+$/, '') + '\n',
  });
}

export function toSlug(name: string): string {
  return name.toLowerCase();
}

/** Every script with its source code, in the order of src/data/scripts.ts. */
export const scripts: Script[] = scriptDefinitions.map((definition) => {
  const file = sourcesByName.get(definition.name.toLowerCase());

  if (!file) {
    console.error(
      `[PS-Scripts] No source file for "${definition.name}". Expected scripts/${definition.category}/${definition.name}.ps1`,
    );
  }

  const source = file?.source ?? '';
  return {
    ...definition,
    slug: toSlug(definition.name),
    fileName: `${definition.name}.ps1`,
    filePath: file?.path ?? `scripts/${definition.category}/${definition.name}.ps1`,
    source,
    lineCount: source ? source.replace(/\n$/, '').split('\n').length : 0,
  };
});

if (import.meta.env.DEV) {
  const known = new Set(scripts.map((script) => script.slug));
  for (const [name, file] of sourcesByName) {
    if (!known.has(name)) {
      console.warn(`[PS-Scripts] ${file.path} has no entry in src/data/scripts.ts and is not shown.`);
    }
  }
}

const scriptsBySlug = new Map(scripts.map((script) => [script.slug, script]));
const categoriesById = new Map(categories.map((category) => [category.id, category]));

export { categories };

export function getScript(slug: string): Script | undefined {
  return scriptsBySlug.get(slug.toLowerCase());
}

export function getCategory(id: string): Category | undefined {
  return categoriesById.get(id as CategoryId);
}

export function isCategoryId(value: string | null | undefined): value is CategoryId {
  return !!value && categoriesById.has(value as CategoryId);
}

export function getScriptsInCategory(id: CategoryId): Script[] {
  return scripts.filter((script) => script.category === id);
}

/** Most recently added implemented scripts, newest first. */
export function getRecentScripts(limit = 5): Script[] {
  return scripts
    .filter((script) => script.status === 'implemented')
    .sort((a, b) => b.added.localeCompare(a.added))
    .slice(0, limit);
}

/** Previous and next script in library order. */
export function getAdjacentScripts(script: Script): { previous?: Script; next?: Script } {
  const index = scripts.findIndex((item) => item.slug === script.slug);
  return {
    previous: index > 0 ? scripts[index - 1] : undefined,
    next: index >= 0 && index < scripts.length - 1 ? scripts[index + 1] : undefined,
  };
}

export const classificationInfo: Record<Classification, { label: string; description: string }> = {
  'read-only': {
    label: 'Read-Only',
    description: 'Only reads information. Does not modify the system.',
  },
  'system-changes': {
    label: 'System-Changes',
    description: 'Performs actions that change the system, such as writing files or changing settings.',
  },
};

export const statusInfo: Record<ScriptStatus, { label: string; description: string }> = {
  implemented: {
    label: 'Implemented',
    description: 'Finished and ready to use.',
  },
  placeholder: {
    label: 'Placeholder',
    description: 'Planned. The source is a scaffold and does not do anything yet.',
  },
};

export const libraryStats = {
  total: scripts.length,
  categories: categories.length,
  implemented: scripts.filter((script) => script.status === 'implemented').length,
  placeholder: scripts.filter((script) => script.status === 'placeholder').length,
  readOnly: scripts.filter((script) => script.classification === 'read-only').length,
  systemChanges: scripts.filter((script) => script.classification === 'system-changes').length,
};
