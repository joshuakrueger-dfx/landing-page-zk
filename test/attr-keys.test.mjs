import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const template = readFileSync(join(root, 'scripts/i18n/page.template'), 'utf8');
const generator = readFileSync(join(root, 'scripts/i18n/generate.py'), 'utf8');
const strings = JSON.parse(readFileSync(join(root, 'scripts/i18n/strings/en.json'), 'utf8'));

const ATTR_PLACEHOLDER_RE = /\b[\w:-]+\s*=\s*(["'])\{\{(\w+)\}\}\1/g;
const ATTR_KEYS_BLOCK_RE = /ATTR_KEYS\s*=\s*frozenset\(\s*\{([^}]*)\}\s*\)/;
const ATTR_KEYS_ENTRY_RE = /"(\w+)"/g;

// Set by generate.py after the ATTR_KEYS escape pass — not locale strings.
const GENERATOR_ATTR_KEYS = ['canonical_url', 'html_lang', 'locale_home', 'og_locale'];

function attributePlaceholders(source) {
  return new Set([...source.matchAll(ATTR_PLACEHOLDER_RE)].map((m) => m[2]));
}

function attrKeys(source) {
  const block = source.match(ATTR_KEYS_BLOCK_RE);
  if (!block) {
    throw new Error('ATTR_KEYS frozenset not found in generate.py');
  }
  return new Set([...block[1].matchAll(ATTR_KEYS_ENTRY_RE)].map((m) => m[1]));
}

const placeholders = attributePlaceholders(template);
const stringKeys = new Set(Object.keys(strings));
const stringAttrPlaceholders = new Set([...placeholders].filter((key) => stringKeys.has(key)));
const keys = attrKeys(generator);

describe('ATTR_KEYS', () => {
  test('lists every string-backed placeholder used in a template HTML attribute', () => {
    const missing = [...stringAttrPlaceholders].filter((key) => !keys.has(key)).sort();
    expect(
      missing,
      `string-backed attribute placeholders missing from ATTR_KEYS: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  test('extraction finds string-backed attribute placeholders including og_title and og_image_alt', () => {
    // Floor is today's intersection size. A regex that still catches og_title
    // and og_image_alt but misses the rest must not pass.
    expect(stringAttrPlaceholders.size).toBeGreaterThanOrEqual(12);
    expect(stringAttrPlaceholders.has('og_title')).toBe(true);
    expect(stringAttrPlaceholders.has('og_image_alt')).toBe(true);
  });

  test('generator-set attribute placeholders are not string keys', () => {
    for (const key of GENERATOR_ATTR_KEYS) {
      expect(placeholders.has(key), `${key} should appear as a template attribute`).toBe(true);
      expect(stringKeys.has(key), `${key} should not be a key in en.json`).toBe(false);
    }
  });
});
