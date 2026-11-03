import { normalizeGap, stripPunctuation } from './normalize';

export type CheckVerdict = 'exact' | 'accepted' | 'near' | 'wrong';

export interface DiffToken {
  type: 'equal' | 'missing' | 'extra';
  value: string;
}

export interface CheckResult {
  verdict: CheckVerdict;
  suggestedRating: 1 | 2 | 3 | 4;
  normalizedTarget: string;
  normalizedLearner: string;
  diff: DiffToken[];
  similarity: number;
}

// Common English contraction mappings in both directions
const CONTRACTIONS: [RegExp, string][] = [
  [/\bi'm\b/gi, 'i am'],
  [/\byou're\b/gi, 'you are'],
  [/\bwe're\b/gi, 'we are'],
  [/\bthey're\b/gi, 'they are'],
  [/\bhe's\b/gi, 'he is'],
  [/\bshe's\b/gi, 'she is'],
  [/\bit's\b/gi, 'it is'],
  [/\bthat's\b/gi, 'that is'],
  [/\bwhat's\b/gi, 'what is'],
  [/\bwhere's\b/gi, 'where is'],
  [/\bthere's\b/gi, 'there is'],
  [/\bwho's\b/gi, 'who is'],
  [/\bhow's\b/gi, 'how is'],
  [/\bcan't\b/gi, 'cannot'],
  [/\bwon't\b/gi, 'will not'],
  [/\bdon't\b/gi, 'do not'],
  [/\bdoesn't\b/gi, 'does not'],
  [/\bdidn't\b/gi, 'did not'],
  [/\bisn't\b/gi, 'is not'],
  [/\baren't\b/gi, 'are not'],
  [/\bwasn't\b/gi, 'was not'],
  [/\bweren't\b/gi, 'were not'],
  [/\bhasn't\b/gi, 'has not'],
  [/\bhaven't\b/gi, 'have not'],
  [/\bhadn't\b/gi, 'had not'],
  [/\bwouldn't\b/gi, 'would not'],
  [/\bshouldn't\b/gi, 'should not'],
  [/\bcouldn't\b/gi, 'could not'],
  [/\bi'll\b/gi, 'i will'],
  [/\byou'll\b/gi, 'you will'],
  [/\bhe'll\b/gi, 'he will'],
  [/\bshe'll\b/gi, 'she will'],
  [/\bwe'll\b/gi, 'we will'],
  [/\bthey'll\b/gi, 'they will'],
  [/\bi'd\b/gi, 'i would'],
  [/\byou'd\b/gi, 'you would'],
  [/\bhe'd\b/gi, 'he would'],
  [/\bshe'd\b/gi, 'she would'],
  [/\bwe'd\b/gi, 'we would'],
  [/\bthey'd\b/gi, 'they would'],
  [/\bi've\b/gi, 'i have'],
  [/\byou've\b/gi, 'you have'],
  [/\bwe've\b/gi, 'we have'],
  [/\bthey've\b/gi, 'they have'],
];

export function expandContractions(text: string): string {
  let expanded = normalizeGap(text).toLowerCase();
  for (const [pattern, replacement] of CONTRACTIONS) {
    expanded = expanded.replace(pattern, replacement);
  }
  return expanded;
}

export function computeLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[m][n];
}

export function buildTokenDiff(targetWords: string[], learnerWords: string[]): DiffToken[] {
  const diffs: DiffToken[] = [];
  let i = 0;
  let j = 0;

  while (i < targetWords.length || j < learnerWords.length) {
    if (i < targetWords.length && j < learnerWords.length && targetWords[i] === learnerWords[j]) {
      diffs.push({ type: 'equal', value: targetWords[i] });
      i++;
      j++;
    } else if (j >= learnerWords.length || (i < targetWords.length && !learnerWords.slice(j).includes(targetWords[i]))) {
      diffs.push({ type: 'missing', value: targetWords[i] });
      i++;
    } else {
      diffs.push({ type: 'extra', value: learnerWords[j] });
      j++;
    }
  }

  return diffs;
}

/**
 * Validates a learner's typed answer against the target English sentence.
 */
export function checkAnswer(learnerInput: string, targetSentence: string, durationMs = 0): CheckResult {
  const normLearner = stripPunctuation(learnerInput);
  const normTarget = stripPunctuation(targetSentence);

  const learnerWords = normLearner.split(/\s+/).filter(Boolean);
  const targetWords = normTarget.split(/\s+/).filter(Boolean);
  const diff = buildTokenDiff(targetWords, learnerWords);

  // 1. Exact match (case & punctuation normalized)
  if (normLearner === normTarget) {
    const isFast = durationMs > 0 && durationMs < 5000;
    return {
      verdict: 'exact',
      suggestedRating: isFast ? 4 : 3, // 4 = Easy, 3 = Good
      normalizedTarget: normTarget,
      normalizedLearner: normLearner,
      diff,
      similarity: 1.0
    };
  }

  // 2. Contraction match (expand BEFORE stripping punctuation so "I'm" -> "i am")
  const expandedLearner = stripPunctuation(expandContractions(learnerInput));
  const expandedTarget = stripPunctuation(expandContractions(targetSentence));

  if (expandedLearner === expandedTarget) {
    return {
      verdict: 'accepted',
      suggestedRating: 3, // Good
      normalizedTarget: normTarget,
      normalizedLearner: normLearner,
      diff,
      similarity: 0.98
    };
  }

  // 3. Near match (small typo tolerance via Levenshtein)
  const dist = computeLevenshtein(expandedLearner, expandedTarget);
  const maxLen = Math.max(expandedTarget.length, expandedLearner.length);
  const similarity = Math.max(0, 1 - dist / maxLen);

  // Near match: distance <= 2 for short, or similarity >= 0.88
  if (dist <= 2 || similarity >= 0.88) {
    return {
      verdict: 'near',
      suggestedRating: 2, // Hard
      normalizedTarget: normTarget,
      normalizedLearner: normLearner,
      diff,
      similarity
    };
  }

  // 4. Wrong answer
  return {
    verdict: 'wrong',
    suggestedRating: 1, // Again
    normalizedTarget: normTarget,
    normalizedLearner: normLearner,
    diff,
    similarity
  };
}
