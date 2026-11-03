import nlp from 'compromise';
import { normalizeGap } from './normalize';

export interface ClozeItem {
  original: string;
  blank: string;
  clozeSentence: string;
  hint: string;
  acceptedAlternatives: string[];
}

/**
 * Replaces the first occurrence of a target substring with a placeholder.
 */
function replaceBlank(sentence: string, target: string): string {
  const idx = sentence.toLowerCase().indexOf(target.toLowerCase());
  if (idx === -1) return sentence;
  return sentence.slice(0, idx) + '[...]' + sentence.slice(idx + target.length);
}

/**
 * Extracts the grammar-critical blank from a sentence and its grammar tag.
 */
export function generateCloze(sentence: string, grammarTag: string): ClozeItem {
  const norm = normalizeGap(sentence);
  const tagLower = grammarTag.toLowerCase();

  let blank = '';
  let hint = grammarTag;
  const accepted: string[] = [];

  // 1. Conditionals (0-tur, 1-tur, 2-tur, 3-tur shart, wish, unless)
  if (tagLower.includes('3-tur') || tagLower.includes('third conditional')) {
    const match = norm.match(/\b(would have \w+|could have \w+|had \w+ed|had been|hadn't \w+)\b/i);
    if (match) blank = match[0];
  } else if (tagLower.includes('2-tur') || tagLower.includes('second conditional')) {
    const match = norm.match(/\b(would \w+|could \w+|if i were|were you|didn't \w+)\b/i);
    if (match) blank = match[0];
  } else if (tagLower.includes('1-tur') || tagLower.includes('first conditional') || tagLower.includes('unless')) {
    const match = norm.match(/\b(unless|if \w+ (?:don't|doesn't|\w+s?)|will \w+|won't \w+)\b/i);
    if (match) blank = match[0];
  } else if (tagLower.includes('0-tur') || tagLower.includes('zero conditional')) {
    const match = norm.match(/\b(if|when|melts|heats|boils|freezes)\b/i);
    if (match) blank = match[0];
  }

  // 2. Present Perfect Continuous / Present Perfect
  if (!blank && tagLower.includes('present perfect continuous')) {
    const match = norm.match(/\b(have been \w+ing|has been \w+ing|haven't been \w+ing|hasn't been \w+ing)\b/i);
    if (match) blank = match[0];
  }

  if (!blank && (tagLower.includes('present perfect') || tagLower.includes('hozirgi tugallangan'))) {
    const match = norm.match(/\b(have \w+|has \w+|haven't \w+|hasn't \w+|have been|has been|already|just|yet|since|for|never|ever)\b/i);
    if (match) blank = match[0];
  }

  // 3. Past Continuous vs Past Simple
  if (!blank && (tagLower.includes('past continuous') || tagLower.includes('o’tgan davomli'))) {
    const match = norm.match(/\b(was \w+ing|were \w+ing|wasn't \w+ing|weren't \w+ing|while|when)\b/i);
    if (match) blank = match[0];
  }

  // 4. Past Perfect
  if (!blank && tagLower.includes('past perfect')) {
    const match = norm.match(/\b(had \w+|hadn't \w+|had been)\b/i);
    if (match) blank = match[0];
  }

  // 5. Future: going to / will
  if (!blank && (tagLower.includes('going to') || tagLower.includes('kelasi zamon, reja'))) {
    const match = norm.match(/\b(am going to \w+|is going to \w+|are going to \w+|'m going to \w+|'s going to \w+|'re going to \w+)\b/i);
    if (match) blank = match[0];
  }

  if (!blank && (tagLower.includes('will') || tagLower.includes('kelasi zamon'))) {
    const match = norm.match(/\b(will \w+|won't \w+|will be \w+|'ll \w+)\b/i);
    if (match) blank = match[0];
  }

  // 6. Modals
  if (!blank && (tagLower.includes('modal') || tagLower.includes('must') || tagLower.includes('have to') || tagLower.includes('should') || tagLower.includes('can'))) {
    const match = norm.match(/\b(mustn't|must|have to|has to|had to|don't have to|doesn't have to|shouldn't|should|ought to|could|can't|can|might|may)\b/i);
    if (match) blank = match[0];
  }

  // 7. Passive Voice
  if (!blank && tagLower.includes('passive')) {
    const match = norm.match(/\b(was \w+ed|were \w+ed|is \w+ed|are \w+ed|been \w+ed|being \w+ed|was built|is made|was written|are sold|were invited)\b/i);
    if (match) blank = match[0];
  }

  // 8. Comparatives / Superlatives
  if (!blank && (tagLower.includes('comparative') || tagLower.includes('superlative') || tagLower.includes('qiyosiy') || tagLower.includes('orttirma'))) {
    const match = norm.match(/\b(more \w+ than|\w+er than|the most \w+|the best|the worst|as \w+ as|better than|worse than)\b/i);
    if (match) blank = match[0];
  }

  // 9. Phrasal Verbs
  if (!blank && (tagLower.includes('phrasal') || tagLower.includes('ibora'))) {
    const match = norm.match(/\b(\w+ (?:up|off|on|out|down|in|after|away|forward to|over))\b/i);
    if (match) blank = match[0];
  }

  // 10. Question tags / So'roq
  if (!blank && (tagLower.includes('so’roq') || tagLower.includes('savol'))) {
    const match = norm.match(/\b(don't you|aren't they|isn't it|did you|have you|were you|are you|is he|does she)\b/i);
    if (match) blank = match[0];
  }

  // 11. Fallback using NLP (verbs / auxiliaries)
  if (!blank) {
    const doc = nlp(norm);
    const verbs = doc.verbs().out('array');
    if (verbs && verbs.length > 0) {
      // Pick first verb or auxiliary
      blank = verbs[0];
    }
  }

  // 12. Ultra-safe guarantee: if still no blank, select second token (avoiding single punctuation)
  if (!blank) {
    const tokens = norm.split(/\s+/).filter((t) => t.length > 2);
    blank = tokens[1] || tokens[0] || 'is';
  }

  // Add alternative contraction forms if applicable
  accepted.push(blank);
  if (blank.includes("'m")) accepted.push(blank.replace("'m", ' am'));
  if (blank.includes("am ")) accepted.push(blank.replace("am ", "'m "));
  if (blank.includes("'re")) accepted.push(blank.replace("'re", ' are'));
  if (blank.includes("are ")) accepted.push(blank.replace("are ", "'re "));
  if (blank.includes("won't")) accepted.push(blank.replace("won't", 'will not'));
  if (blank.includes("will not")) accepted.push(blank.replace("will not", "won't"));
  if (blank.includes("don't")) accepted.push(blank.replace("don't", 'do not'));
  if (blank.includes("do not")) accepted.push(blank.replace("do not", "don't"));

  const clozeSentence = replaceBlank(norm, blank);

  return {
    original: norm,
    blank,
    clozeSentence,
    hint,
    acceptedAlternatives: Array.from(new Set(accepted))
  };
}
