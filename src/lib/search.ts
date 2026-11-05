import { categories, classificationInfo, isCategoryId, scripts } from '../data/library';
import type { CategoryId, Classification, Script, ScriptStatus } from '../data/types';

export interface ScriptFilters {
  query: string;
  category: CategoryId | 'all';
  classification: Classification | 'all';
  status: ScriptStatus | 'all';
}

export const emptyFilters: ScriptFilters = { query: '', category: 'all', classification: 'all', status: 'all' };

interface SearchField {
  text: string;
  weight: number;
}

interface IndexEntry {
  script: Script;
  /** Name without hyphens, so "pendingreboot" or "pending-reboot" finds Get-PendingReboot. */
  compactName: string;
  fields: SearchField[];
}

/** "Get-VPNStatus" -> "get vpn status" */
function splitName(name: string): string {
  return name
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/-/g, ' ')
    .toLowerCase();
}

const compact = (value: string) => value.toLowerCase().replace(/[^a-z\d]/g, '');

const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

const index: IndexEntry[] = scripts.map((script) => ({
  script,
  compactName: compact(script.name),
  fields: [
    { text: script.name.toLowerCase(), weight: 10 },
    { text: splitName(script.name), weight: 9 },
    { text: script.keywords.join(' | ').toLowerCase(), weight: 6 },
    { text: `${categoryNames.get(script.category) ?? ''} ${script.category}`.toLowerCase(), weight: 5 },
    { text: script.summary.toLowerCase(), weight: 4 },
    {
      text: `${classificationInfo[script.classification].label} ${script.classification.replace('-', ' ')} ${script.status}`.toLowerCase(),
      weight: 3,
    },
    { text: script.description.join(' ').toLowerCase(), weight: 1 },
  ],
}));

/** Splits a search query into lower-case terms. */
export function getSearchTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

/** 0 = no match. Every term has to match at least one field. */
function bestWeight(entry: IndexEntry, term: string): number {
  let best = 0;
  for (const field of entry.fields) {
    if (field.weight > best && field.text.includes(term)) best = field.weight;
  }
  const compactTerm = compact(term);
  if (best < 8 && compactTerm && entry.compactName.includes(compactTerm)) best = 8;
  return best;
}

function score(entry: IndexEntry, terms: string[]): number {
  let total = 0;

  for (const term of terms) {
    let best = bestWeight(entry, term);
    // Simple plural folding: "reboots" also finds "reboot".
    if (term.length > 3 && term.endsWith('s')) {
      best = Math.max(best, bestWeight(entry, term.slice(0, -1)) - 1);
    }
    if (best <= 0) return 0;
    total += best;
  }

  // Prefer scripts whose name matches the whole query.
  const whole = compact(terms.join(''));
  if (entry.compactName === whole) total += 100;
  else if (entry.compactName.replace(/^(get|test|export|set|new)/, '').startsWith(whole)) total += 20;

  return total;
}

function matchesFilters(script: Script, filters: ScriptFilters): boolean {
  return (
    (filters.category === 'all' || script.category === filters.category) &&
    (filters.classification === 'all' || script.classification === filters.classification) &&
    (filters.status === 'all' || script.status === filters.status)
  );
}

/**
 * Returns the scripts that match the filters. With a search query the
 * results are sorted by relevance, otherwise they keep the library order.
 */
export function searchScripts(filters: ScriptFilters): Script[] {
  const terms = getSearchTerms(filters.query);
  const results: { script: Script; score: number }[] = [];

  for (const entry of index) {
    if (!matchesFilters(entry.script, filters)) continue;
    const value = terms.length > 0 ? score(entry, terms) : 1;
    if (value > 0) results.push({ script: entry.script, score: value });
  }

  if (terms.length > 0) results.sort((a, b) => b.score - a.score);
  return results.map((result) => result.script);
}

type FacetKey = 'category' | 'classification' | 'status';

/**
 * Number of results per option of one filter, taking the query and all
 * other filters into account. Used for the counts next to the filter chips.
 */
export function getFacetCounts(filters: ScriptFilters, key: FacetKey): Record<string, number> {
  const results = searchScripts({ ...filters, [key]: 'all' });
  const counts: Record<string, number> = { all: results.length };
  for (const script of results) {
    const value = script[key];
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

/** Reads the filters from URL query parameters (q, category, type, status). */
export function filtersFromParams(params: URLSearchParams): ScriptFilters {
  const category = params.get('category');
  const type = params.get('type');
  const status = params.get('status');

  return {
    query: params.get('q') ?? '',
    category: isCategoryId(category) ? category : 'all',
    classification: type === 'read-only' || type === 'system-changes' ? type : 'all',
    status: status === 'implemented' || status === 'placeholder' ? status : 'all',
  };
}
