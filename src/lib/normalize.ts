/**
 * Normalizes an English sentence according to §3:
 * - Unicode NFKC
 * - convert ’ ‘ to '
 * - convert “ ” to "
 * - collapse whitespace
 * - trim
 */
export function normalizeGap(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFKC')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes Uzbek translation text:
 * Preserves Uzbek specific characters (oʻ, gʻ) while standardizing apostrophes and spacing.
 */
export function normalizeUzbek(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFKC')
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips punctuation and accents for fuzzy matching / Levenshtein
 */
export function stripPunctuation(text: string): string {
  return normalizeGap(text)
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
