import { describe, it, expect } from 'vitest';
import { generateCloze } from '../src/lib/cloze';
import seedSentencesData from '../src/data/seed-sentences.json';
import { Sentence } from '../src/lib/db';

describe('Cloze Generation (Phase 3 Requirement)', () => {
  const sentences = (seedSentencesData as any[]) as Sentence[];

  it('generates non-empty blanks for specific grammar cases', () => {
    // 3-tur shart
    const res1 = generateCloze('If I had studied harder, I would have passed the exam.', '3-tur shart');
    expect(res1.blank.toLowerCase().includes('would have') || res1.blank.toLowerCase().includes('had studied')).toBe(true);
    expect(res1.clozeSentence).toContain('[...]');

    // Present Perfect Continuous
    const res2 = generateCloze('I have been working here for three years.', 'Present Perfect Continuous');
    expect(res2.blank.toLowerCase()).toContain('have been working');
    expect(res2.clozeSentence).toContain('[...]');

    // Passive
    const res3 = generateCloze('The house was built in 1990.', 'Passive, Past Simple');
    expect(res3.blank.toLowerCase()).toContain('was built');

    // Modals
    const res4 = generateCloze('You mustn\'t touch the wire.', 'Modal, taqiq');
    expect(res4.blank.toLowerCase()).toContain("mustn't");
  });

  it('covers EVERY single sentence and grammar tag in the seed dataset without empty or trivial blanks', () => {
    let failedCount = 0;
    const failedTags = new Set<string>();

    for (const s of sentences) {
      const cloze = generateCloze(s.gap, s.grammar_tag);
      if (!cloze.blank || cloze.blank.trim().length < 2 || !cloze.clozeSentence.includes('[...]')) {
        failedCount++;
        failedTags.add(s.grammar_tag);
      }
    }

    if (failedCount > 0) {
      console.warn(`Failed cloze tags (${failedTags.size}):`, Array.from(failedTags));
    }

    expect(failedCount).toBe(0);
  }, 20000);
});
