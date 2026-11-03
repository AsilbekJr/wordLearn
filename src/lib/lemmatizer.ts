import nlp from 'compromise';

export interface ExtractedVocab {
  lemma: string;
  pos: string; // 'noun' | 'verb' | 'adjective' | 'adverb' | 'other'
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'because', 'as', 'until', 'while',
  'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in',
  'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
  'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don',
  'should', 'now', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
  'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'mine',
  'yours', 'hers', 'ours', 'theirs', 'this', 'that', 'these', 'those', 'am',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did'
]);

/**
 * Extracts lemma-level vocabulary items from an English sentence.
 * Ignores stopwords, punctuation, numbers, and proper nouns (names/places).
 */
export function extractVocabFromSentence(sentence: string): ExtractedVocab[] {
  const doc = nlp(sentence);
  const results: ExtractedVocab[] = [];
  const seen = new Set<string>();

  // Extract verbs
  const verbs = doc.verbs();
  verbs.forEach((v) => {
    // skip proper nouns and auxiliaries
    if (v.has('#ProperNoun')) return;
    const json = v.json()[0];
    if (!json || !json.terms) return;
    for (const term of json.terms) {
      const root = (term.root || term.normal || '').toLowerCase().trim();
      if (root.length > 2 && !STOPWORDS.has(root) && !seen.has(root + ':verb')) {
        seen.add(root + ':verb');
        results.push({ lemma: root, pos: 'verb' });
      }
    }
  });

  // Extract nouns
  const nouns = doc.nouns();
  nouns.forEach((n) => {
    // Exclude proper nouns (names of people, specific places) and pronouns
    if (n.has('#ProperNoun') || n.has('#Pronoun')) return;
    const json = n.json()[0];
    if (!json || !json.terms) return;
    for (const term of json.terms) {
      const root = (term.root || term.normal || '').toLowerCase().trim();
      if (root.length > 2 && !STOPWORDS.has(root) && !seen.has(root + ':noun')) {
        seen.add(root + ':noun');
        results.push({ lemma: root, pos: 'noun' });
      }
    }
  });

  // Extract adjectives
  const adjectives = doc.adjectives();
  adjectives.forEach((adj) => {
    if (adj.has('#ProperNoun')) return;
    const json = adj.json()[0];
    if (!json || !json.terms) return;
    for (const term of json.terms) {
      const root = (term.root || term.normal || '').toLowerCase().trim();
      if (root.length > 2 && !STOPWORDS.has(root) && !seen.has(root + ':adjective')) {
        seen.add(root + ':adjective');
        results.push({ lemma: root, pos: 'adjective' });
      }
    }
  });

  // Extract adverbs
  const adverbs = doc.adverbs();
  adverbs.forEach((adv) => {
    const json = adv.json()[0];
    if (!json || !json.terms) return;
    for (const term of json.terms) {
      const root = (term.root || term.normal || '').toLowerCase().trim();
      if (root.length > 2 && !STOPWORDS.has(root) && !seen.has(root + ':adverb')) {
        seen.add(root + ':adverb');
        results.push({ lemma: root, pos: 'adverb' });
      }
    }
  });

  return results;
}
