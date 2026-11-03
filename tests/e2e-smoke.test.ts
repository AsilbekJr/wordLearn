import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from '../src/stores/session.store';
import { buildStudyQueue } from '../src/lib/queue';
import { localStore, getAllSentences } from '../src/lib/db';
import { defaultSettings } from '../src/lib/supabase';

describe('E2E Session Smoke Test (Phase 5)', () => {
  beforeEach(() => {
    useSessionStore.getState().resetSession();
    localStore.saveCards([]);
  });

  it('completes a full study session sequence with grading and undo', async () => {
    const sentences = await getAllSentences();
    expect(sentences.length).toBeGreaterThan(100);

    // 1. Build session queue
    const queue = buildStudyQueue(sentences, [], {
      settings: { ...defaultSettings, new_per_day: 5 },
      now: new Date()
    });
    expect(queue.length).toBe(5);

    // 2. Start session
    const store = useSessionStore.getState();
    store.initSession(queue);

    expect(useSessionStore.getState().currentIndex).toBe(0);
    expect(useSessionStore.getState().isRevealed).toBe(false);

    // 3. Reveal first card
    useSessionStore.getState().reveal();
    expect(useSessionStore.getState().isRevealed).toBe(true);

    // 4. Submit rating: 3 (Good)
    useSessionStore.getState().submitRating(3);

    // 5. Verify index advanced to 1 and review was logged
    expect(useSessionStore.getState().currentIndex).toBe(1);
    expect(useSessionStore.getState().isRevealed).toBe(false);

    const savedCards = localStore.getCards();
    expect(savedCards.length).toBe(1);
    expect(savedCards[0].reps).toBe(1);
    expect(savedCards[0].stability).toBeGreaterThan(0);

    const logs = localStore.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].rating).toBe(3);

    // 6. Test Undo action
    useSessionStore.getState().undoLast();
    expect(useSessionStore.getState().currentIndex).toBe(0);
    expect(useSessionStore.getState().isRevealed).toBe(true);
  });
});
