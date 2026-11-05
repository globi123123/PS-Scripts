/**
 * A small, dependency-free PowerShell tokenizer used for syntax highlighting.
 *
 * It is not a full parser. It recognises the constructs that matter for
 * readability (comments, strings with interpolation, variables, cmdlets,
 * parameters, operators, types, numbers, keywords and members) and is
 * lossless: joining all token values gives back the original source.
 */

export type TokenType =
  | 'text'
  | 'comment'
  | 'doc'
  | 'keyword'
  | 'string'
  | 'escape'
  | 'variable'
  | 'constant'
  | 'cmdlet'
  | 'parameter'
  | 'operator'
  | 'type'
  | 'number'
  | 'member'
  | 'method'
  | 'property'
  | 'punctuation';

export interface Token {
  type: TokenType;
  value: string;
}

const KEYWORDS = new Set([
  'begin', 'break', 'catch', 'class', 'continue', 'data', 'do', 'dynamicparam', 'else', 'elseif',
  'end', 'enum', 'exit', 'filter', 'finally', 'for', 'foreach', 'function', 'hidden', 'if', 'in',
  'param', 'process', 'return', 'static', 'switch', 'throw', 'trap', 'try', 'until', 'using', 'while',
]);

const COMPARISON_OPERATORS = [
  'eq', 'ne', 'gt', 'ge', 'lt', 'le', 'like', 'notlike', 'match', 'notmatch', 'contains',
  'notcontains', 'in', 'notin', 'replace', 'split',
];

const OPERATORS = new Set([
  ...COMPARISON_OPERATORS,
  ...COMPARISON_OPERATORS.map((op) => `c${op}`),
  ...COMPARISON_OPERATORS.map((op) => `i${op}`),
  'join', 'is', 'isnot', 'as', 'and', 'or', 'not', 'xor', 'band', 'bor', 'bxor', 'bnot', 'shl', 'shr', 'f',
]);

const CONSTANTS = new Set(['$true', '$false', '$null']);

const SCOPES = 'global|local|script|private|using|env|variable|function|alias';

const RE_VARIABLE = new RegExp(`\\$(?:\\{[^}\\n]*\\}|(?:${SCOPES}):[A-Za-z_][\\w]*|[A-Za-z_\\d][\\w]*|[?$^])`, 'iy');
const RE_SPLAT = /@[A-Za-z_][\w]*/y;
const RE_NUMBER = /(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)(?:kb|mb|gb|tb|pb)?(?![\w])/iy;
const RE_DASH_WORD = /-[A-Za-z][\w]*/y;
const RE_WORD = /[A-Za-z_][\w]*(?:-[A-Za-z_][\w]*)*/y;
const RE_TYPE = /\[([A-Za-z_][\w.]*)/y;
const RE_SCRIPT_PATH = /\.{1,2}[\\/][\w.\\/-]*/y;
const RE_HERE_STRING_START = /@(["'])[ \t]*\r?\n/y;
const RE_OPERATOR = /(?:2>&1|[+\-*/%]?=(?!=)|\.\.|[|&!<>+*/%-])/y;
const RE_DOC_TAG = /^([ \t]*)(\.[A-Z][A-Z]+)\b/gm;
const RE_TODO = /\b(TODO|FIXME|NOTE)\b:?/g;

function sticky(re: RegExp, source: string, index: number): string | null {
  re.lastIndex = index;
  const match = re.exec(source);
  return match ? match[0] : null;
}

/** Index after the closing parenthesis of a `$(` subexpression starting at `start`. */
function findSubexpressionEnd(source: string, start: number): number {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return i + 1;
    } else if (ch === "'" || ch === '"') {
      const close = source.indexOf(ch, i + 1);
      if (close === -1) return source.length;
      i = close;
    }
  }
  return source.length;
}

/** Index after the closing quote of a double-quoted string starting at `start`. */
function findDoubleQuotedEnd(source: string, start: number): number {
  let i = start + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '`') {
      i += 2;
    } else if (ch === '$' && source[i + 1] === '(') {
      i = findSubexpressionEnd(source, i + 1);
    } else if (ch === '"') {
      if (source[i + 1] === '"') i += 2;
      else return i + 1;
    } else {
      i++;
    }
  }
  return source.length;
}

/** Index after the closing quote of a single-quoted string starting at `start`. */
function findSingleQuotedEnd(source: string, start: number): number {
  let i = start + 1;
  while (i < source.length) {
    if (source[i] === "'") {
      if (source[i + 1] === "'") i += 2;
      else return i + 1;
    } else {
      i++;
    }
  }
  return source.length;
}

class TokenList {
  readonly tokens: Token[] = [];

  push(type: TokenType, value: string): void {
    if (!value) return;
    const last = this.tokens[this.tokens.length - 1];
    if (last && last.type === type && (type === 'text' || type === 'string' || type === 'comment')) {
      last.value += value;
    } else {
      this.tokens.push({ type, value });
    }
  }

  pushAll(tokens: Token[]): void {
    for (const token of tokens) this.push(token.type, token.value);
  }

  /** Last token that is not whitespace. */
  lastSignificant(): Token | undefined {
    for (let i = this.tokens.length - 1; i >= 0; i--) {
      const token = this.tokens[i];
      if (token.type !== 'text' || token.value.trim()) return token;
    }
    return undefined;
  }

  last(): Token | undefined {
    return this.tokens[this.tokens.length - 1];
  }
}

/** Splits a comment into comment text, help keywords (.SYNOPSIS) and TODO markers. */
function pushComment(list: TokenList, value: string, block: boolean): void {
  const pattern = block ? RE_DOC_TAG : RE_TODO;
  pattern.lastIndex = 0;
  let index = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) {
    const prefix = block ? match[1] : '';
    const tag = block ? match[2] : match[0];
    const tagStart = match.index + prefix.length;
    list.push('comment', value.slice(index, tagStart));
    list.push('doc', tag);
    index = tagStart + tag.length;
  }
  list.push('comment', value.slice(index));
}

/** Highlights variables, subexpressions and escapes inside an expandable string. */
function pushExpandableString(list: TokenList, value: string): void {
  let buffer = '';
  const flush = () => {
    list.push('string', buffer);
    buffer = '';
  };

  let i = 0;
  while (i < value.length) {
    const ch = value[i];

    if (ch === '`' && i + 1 < value.length && value[i + 1] !== '\n') {
      flush();
      list.push('escape', value.slice(i, i + 2));
      i += 2;
      continue;
    }

    if (ch === '$') {
      if (value[i + 1] === '(') {
        const end = findSubexpressionEnd(value, i + 1);
        const inner = value.slice(i + 2, end - 1);
        flush();
        list.push('punctuation', '$(');
        list.pushAll(tokenize(inner));
        if (value[end - 1] === ')') list.push('punctuation', ')');
        i = end;
        continue;
      }

      const variable = sticky(RE_VARIABLE, value, i);
      if (variable) {
        flush();
        list.push(CONSTANTS.has(variable.toLowerCase()) ? 'constant' : 'variable', variable);
        i += variable.length;
        continue;
      }
    }

    buffer += ch;
    i++;
  }
  flush();
}

function isWordBoundary(ch: string | undefined): boolean {
  return ch === undefined || /[\s;(){}|,=]/.test(ch);
}

/** Splits PowerShell source code into highlight tokens. */
export function tokenize(source: string): Token[] {
  const list = new TokenList();
  const length = source.length;
  let i = 0;

  while (i < length) {
    const ch = source[i];
    const next = source[i + 1];

    // Block comment <# ... #>
    if (ch === '<' && next === '#') {
      const close = source.indexOf('#>', i + 2);
      const end = close === -1 ? length : close + 2;
      pushComment(list, source.slice(i, end), true);
      i = end;
      continue;
    }

    // Line comment
    if (ch === '#' && isWordBoundary(source[i - 1])) {
      const newline = source.indexOf('\n', i);
      const end = newline === -1 ? length : newline;
      pushComment(list, source.slice(i, end), false);
      i = end;
      continue;
    }

    // Here-strings @" ... "@ and @' ... '@
    if (ch === '@' && (next === '"' || next === "'")) {
      const start = sticky(RE_HERE_STRING_START, source, i);
      if (start) {
        const quote = next;
        const close = source.indexOf(`\n${quote}@`, i + start.length - 1);
        const end = close === -1 ? length : close + 3;
        const value = source.slice(i, end);
        if (quote === '"') pushExpandableString(list, value);
        else list.push('string', value);
        i = end;
        continue;
      }
    }

    // Strings
    if (ch === '"') {
      const end = findDoubleQuotedEnd(source, i);
      pushExpandableString(list, source.slice(i, end));
      i = end;
      continue;
    }
    if (ch === "'") {
      const end = findSingleQuotedEnd(source, i);
      list.push('string', source.slice(i, end));
      i = end;
      continue;
    }

    // Variables and subexpressions
    if (ch === '$') {
      if (next === '(') {
        list.push('punctuation', '$(');
        i += 2;
        continue;
      }
      const variable = sticky(RE_VARIABLE, source, i);
      if (variable) {
        list.push(CONSTANTS.has(variable.toLowerCase()) ? 'constant' : 'variable', variable);
        i += variable.length;
        continue;
      }
    }

    // @( ), @{ } and splatting
    if (ch === '@') {
      if (next === '(' || next === '{') {
        list.push('punctuation', ch + next);
        i += 2;
        continue;
      }
      const splat = sticky(RE_SPLAT, source, i);
      if (splat) {
        list.push('variable', splat);
        i += splat.length;
        continue;
      }
    }

    // Type literals and attributes: [string], [CmdletBinding()], [System.Net.Dns]
    if (ch === '[') {
      const isIndex = /[\w)\]}]/.test(source[i - 1] ?? '');
      if (!isIndex) {
        RE_TYPE.lastIndex = i;
        const match = RE_TYPE.exec(source);
        if (match) {
          list.push('punctuation', '[');
          list.push('type', match[1]);
          i += match[0].length;
          continue;
        }
      }
      list.push('punctuation', '[');
      i++;
      continue;
    }

    // Numbers
    if (/\d/.test(ch)) {
      const number = sticky(RE_NUMBER, source, i);
      if (number) {
        list.push('number', number);
        i += number.length;
        continue;
      }
    }

    // Parameters (-Name) and operators (-eq)
    if (ch === '-' && /[A-Za-z]/.test(next ?? '')) {
      const word = sticky(RE_DASH_WORD, source, i);
      if (word) {
        list.push(OPERATORS.has(word.slice(1).toLowerCase()) ? 'operator' : 'parameter', word);
        i += word.length;
        continue;
      }
    }

    // Script paths: .\Get-Something.ps1
    if (ch === '.' && (next === '\\' || next === '/' || (next === '.' && /[\\/]/.test(source[i + 2] ?? '')))) {
      const path = sticky(RE_SCRIPT_PATH, source, i);
      if (path) {
        list.push('cmdlet', path);
        i += path.length;
        continue;
      }
    }

    // Words: cmdlets, keywords, members, hashtable keys
    if (/[A-Za-z_]/.test(ch)) {
      const word = sticky(RE_WORD, source, i) ?? ch;
      const end = i + word.length;
      const previous = list.last();
      const previousSignificant = list.lastSignificant();

      let type: TokenType = 'text';
      if (previous && previous.type === 'punctuation' && (previous.value === '.' || previous.value === '::')) {
        type = source[end] === '(' ? 'method' : 'member';
      } else if (/^[A-Za-z]+-[A-Za-z]\w*$/.test(word)) {
        type = 'cmdlet';
      } else if (/^[ \t]*=(?![=~])/.test(source.slice(end, end + 8)) && previousSignificant?.type !== 'parameter') {
        type = 'property';
      } else if (KEYWORDS.has(word.toLowerCase()) && previousSignificant?.type !== 'parameter') {
        type = 'keyword';
      }

      list.push(type, word);
      i = end;
      continue;
    }

    // Member access and static members
    if (ch === ':' && next === ':') {
      list.push('punctuation', '::');
      i += 2;
      continue;
    }
    if (ch === '.' && next !== '.') {
      list.push('punctuation', '.');
      i++;
      continue;
    }

    // Operators
    const operator = sticky(RE_OPERATOR, source, i);
    if (operator) {
      list.push('operator', operator);
      i += operator.length;
      continue;
    }

    // Punctuation, line continuation and everything else
    if ('(){},;`'.includes(ch) || ch === ']') {
      list.push('punctuation', ch);
    } else {
      list.push('text', ch);
    }
    i++;
  }

  return list.tokens;
}

/** Tokenizes the source and splits the tokens into lines. */
export function tokenizeLines(source: string): Token[][] {
  const lines: Token[][] = [[]];
  for (const token of tokenize(source.replace(/\r\n?/g, '\n').replace(/\n$/, ''))) {
    const parts = token.value.split('\n');
    parts.forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ type: token.type, value: part });
    });
  }
  return lines;
}
