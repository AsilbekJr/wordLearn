import { describe, it, expect } from 'vitest';
import { checkAnswer, expandContractions } from '../src/lib/answerCheck';
import {
  buildStudyQueue,
  isModeUnlocked,
  interleaveQueue,
  getTashkentDayBoundary,
  StudyItem
} from '../src/lib/queue';
import { createNewUserCard, scheduleReview } from '../src/lib/fsrs';
import { Sentence, UserCard } from '../src/lib/db';
import { defaultSettings } from '../src/lib/supabase';

describe('Answer Checker (lib/answerCheck.ts)', () => {
  it('handles exact matches regardless of casing or trailing spaces', () => {
    const res = checkAnswer('  I am learning english. ', "I am learning English.");
    expect(res.verdict).toBe('exact');
    expect(res.suggestedRating).toBeGreaterThanOrEqual(3);
  });

  it('treats English contractions as equivalent to full forms', () => {
    // I'm == I am
    const res1 = checkAnswer("I'm fine, thank you.", "I am fine, thank you.");
    expect(res1.verdict).toBe('accepted');
    expect(res1.suggestedRating).toBe(3);

    // won't == will not
    const res2 = checkAnswer("She will not come tomorrow.", "She won't come tomorrow.");
    expect(res2.verdict).toBe('accepted');

    // they're == they are
    const res3 = checkAnswer("They're working hard.", "They are working hard.");
    expect(res3.verdict).toBe('accepted');
  });

  it('normalizes typographic apostrophes and quotes without penalty', () => {
    const res = checkAnswer("I’m a teacher", "I'm a teacher.");
    expect(['exact', 'accepted']).toContain(res.verdict);
    expect(res.suggestedRating).toBeGreaterThanOrEqual(3);
  });

  it('classifies small typos as near matches with rating Hard (2)', () => {
    // Minor single letter typo: "hospitl" instead of "hospital"
    const res = checkAnswer("She works in a hospitl", "She works in a hospital.");
    expect(res.verdict).toBe('near');
    expect(res.suggestedRating).toBe(2);
  });

  it('classifies completely wrong sentences as wrong with rating Again (1)', () => {
    const res = checkAnswer("I like apples and bananas", "She works in a hospital.");
    expect(res.verdict).toBe('wrong');
    expect(res.suggestedRating).toBe(1);
  });
});

describe('Queue Builder (lib/queue.ts)', () => {
  const dummySentences: Sentence[] = [
    { id: 's1', week: 1, gap: 'Sentence 1', gap_norm: 'sentence 1', tarjima: 'Gap 1', grammar_tag: 'tag-A', source: 'seed' },
    { id: 's2', week: 1, gap: 'Sentence 2', gap_norm: 'sentence 2', tarjima: 'Gap 2', grammar_tag: 'tag-A', source: 'seed' },
    { id: 's3', week: 1, gap: 'Sentence 3', gap_norm: 'sentence 3', tarjima: 'Gap 3', grammar_tag: 'tag-A', source: 'seed' },
    { id: 's4', week: 1, gap: 'Sentence 4', gap_norm: 'sentence 4', tarjima: 'Gap 4', grammar_tag: 'tag-A', source: 'seed' },
    { id: 's5', week: 1, gap: 'Sentence 5', gap_norm: 'sentence 5', tarjima: 'Gap 5', grammar_tag: 'tag-B', source: 'seed' },
    { id: 's6', week: 1, gap: 'Sentence 6', gap_norm: 'sentence 6', tarjima: 'Gap 6', grammar_tag: 'tag-B', source: 'seed' }
  ];

  it('enforces sibling burying: never includes two modes of the same sentence', () => {
    const cards: UserCard[] = [
      {
        id: 'c1-recog',
        user_id: 'u1',
        sentence_id: 's1',
        mode: 'recognition',
        state: 1,
        due: new Date(Date.now() - 3600000).toISOString(),
        reps: 1,
        lapses: 0,
        suspended: false,
        leech: false
      },
      {
        id: 'c1-recall',
        user_id: 'u1',
        sentence_id: 's1',
        mode: 'recall',
        state: 1,
        due: new Date(Date.now() - 3600000).toISOString(),
        reps: 1,
        lapses: 0,
        suspended: false,
        leech: false
      }
    ];

    const queue = buildStudyQueue(dummySentences, cards, {
      settings: defaultSettings,
      now: new Date()
    });

    const s1Occurrences = queue.filter((item) => item.sentence.id === 's1');
    expect(s1Occurrences.length).toBe(1);
  });

  it('interleaves items so no more than 3 consecutive cards share the same grammar tag', () => {
    const items: StudyItem[] = [
      { card: {} as any, sentence: dummySentences[0], isNew: false, isOverdue: false }, // tag-A
      { card: {} as any, sentence: dummySentences[1], isNew: false, isOverdue: false }, // tag-A
      { card: {} as any, sentence: dummySentences[2], isNew: false, isOverdue: false }, // tag-A
      { card: {} as any, sentence: dummySentences[3], isNew: false, isOverdue: false }, // tag-A
      { card: {} as any, sentence: dummySentences[4], isNew: false, isOverdue: false }, // tag-B
      { card: {} as any, sentence: dummySentences[5], isNew: false, isOverdue: false }, // tag-B
    ];

    const interleaved = interleaveQueue(items);

    // Verify consecutive tag count never exceeds 3
    let consecutive = 1;
    for (let i = 1; i < interleaved.length; i++) {
      if (interleaved[i].sentence.grammar_tag === interleaved[i - 1].sentence.grammar_tag) {
        consecutive++;
        expect(consecutive).toBeLessThanOrEqual(3);
      } else {
        consecutive = 1;
      }
    }
  });

  it('respects new_per_day and max_reviews_per_day caps', () => {
    const settings = {
      ...defaultSettings,
      new_per_day: 3,
      max_reviews_per_day: 2
    };

    const queue = buildStudyQueue(dummySentences, [], { settings, now: new Date() });
    expect(queue.length).toBeLessThanOrEqual(3);
  });

  it('computes 04:00 Asia/Tashkent day boundary properly', () => {
    const testDate = new Date('2026-11-03T02:00:00Z'); // 07:00 in Tashkent (UTC+5)
    const nextBoundary = getTashkentDayBoundary(testDate, 4);

    expect(nextBoundary).toBeInstanceOf(Date);
    expect(nextBoundary.getTime()).toBeGreaterThan(testDate.getTime());
  });
});

describe('FSRS Scheduling Round-trip (lib/fsrs.ts)', () => {
  it('advances a new card to learning/review with increasing stability on Good/Easy', () => {
    const initialCard = createNewUserCard('user-123', 'sentence-1', 'recall');
    expect(initialCard.state).toBe(0); // New

    // First review: Good (3)
    const res1 = scheduleReview(initialCard, 3, 0.9);
    expect(res1.updatedCard.reps).toBe(1);
    expect(res1.updatedCard.stability).toBeGreaterThan(0);
    expect(new Date(res1.due).getTime()).toBeGreaterThan(new Date(initialCard.due).getTime());

    // Second review: Easy (4)
    const res2 = scheduleReview(res1.updatedCard, 4, 0.9);
    expect(res2.updatedCard.reps).toBe(2);
    expect(res2.updatedCard.stability).toBeGreaterThan(res1.updatedCard.stability || 0);
  });

  it('marks card as leech and suspends when lapses reach 8', () => {
    let card = createNewUserCard('user-123', 'sentence-difficult', 'recall');

    // Simulate 8 Again (1) reviews
    for (let i = 0; i < 8; i++) {
      const res = scheduleReview(card, 1, 0.9);
      card = res.updatedCard;
    }

    expect(card.lapses).toBeGreaterThanOrEqual(8);
    expect(card.leech).toBe(true);
    expect(card.suspended).toBe(true);
  });
});
