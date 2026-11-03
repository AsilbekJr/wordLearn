import { Sentence, UserCard, CardMode } from './db';
import { UserSettings } from './supabase';
import { v5 as uuidv5 } from 'uuid';

const LINGUIST_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

export function generateCardId(sentenceId: string, mode: string): string {
  return uuidv5(`${sentenceId}:${mode}`, LINGUIST_NAMESPACE);
}

export interface StudyItem {
  card: UserCard;
  sentence: Sentence;
  isNew: boolean;
  isOverdue: boolean;
}

export type NewCardOrder = 'week' | 'grammar_tag' | 'shuffled';

export interface QueueOptions {
  now?: Date;
  settings: UserSettings;
  order?: NewCardOrder;
}

/**
 * Computes whether a timestamp is before today's rollover boundary in Asia/Tashkent (default 04:00).
 */
export function getTashkentDayBoundary(now = new Date(), rolloverHour = 4): Date {
  // Convert current time to Asia/Tashkent representation
  const tashkentTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' });
  const localNow = new Date(tashkentTimeStr);

  const boundary = new Date(localNow);
  boundary.setHours(rolloverHour, 0, 0, 0);

  // If local time is before 04:00, today's cycle started yesterday at 04:00
  if (localNow.getTime() < boundary.getTime()) {
    boundary.setDate(boundary.getDate() - 1);
  }

  // Next rollover is exactly 24 hours later
  const nextRollover = new Date(boundary.getTime() + 24 * 60 * 60 * 1000);
  return nextRollover;
}

/**
 * Checks if a card mode is unlocked for a given sentence.
 * Progressive unlocking (§5):
 * - recognition + recall from day 1
 * - cloze after first successful recall (reps >= 1, rating >= 3 or stability >= 1)
 * - dictation/speaking after recall stability >= 3 days
 * - transform and production after cloze success (reps >= 1)
 */
export function isModeUnlocked(mode: CardMode, allSentenceCards: UserCard[]): boolean {
  if (mode === 'recognition' || mode === 'recall') {
    return true;
  }

  const recallCard = allSentenceCards.find((c) => c.mode === 'recall');
  const clozeCard = allSentenceCards.find((c) => c.mode === 'cloze');

  if (mode === 'cloze') {
    return Boolean(recallCard && recallCard.reps > 0 && (recallCard.stability || 0) >= 1);
  }

  if (mode === 'dictation' || mode === 'speaking') {
    return Boolean(recallCard && (recallCard.stability || 0) >= 3);
  }

  if (mode === 'transform' || mode === 'production') {
    return Boolean(clozeCard && clozeCard.reps > 0);
  }

  return false;
}

/**
 * Interleaving: rearranges queue so that no more than 3 consecutive items share the same grammar_tag.
 */
export function interleaveQueue(items: StudyItem[]): StudyItem[] {
  if (items.length <= 3) return items;

  const result: StudyItem[] = [];
  const pool = [...items];

  while (pool.length > 0) {
    let nextIdx = 0;

    // Check last 3 items in result
    if (result.length >= 3) {
      const tag1 = result[result.length - 1].sentence.grammar_tag;
      const tag2 = result[result.length - 2].sentence.grammar_tag;
      const tag3 = result[result.length - 3].sentence.grammar_tag;

      if (tag1 === tag2 && tag2 === tag3) {
        // Need an item with a different tag
        const alternateIdx = pool.findIndex((item) => item.sentence.grammar_tag !== tag1);
        if (alternateIdx !== -1) {
          nextIdx = alternateIdx;
        }
      }
    }

    result.push(pool.splice(nextIdx, 1)[0]);
  }

  return result;
}

/**
 * Builds the prioritized, interleaving, sibling-buried study queue for the session.
 */
export function buildStudyQueue(
  allSentences: Sentence[],
  existingCards: UserCard[],
  options: QueueOptions
): StudyItem[] {
  const now = options.now || new Date();
  const settings = options.settings;
  const sentenceMap = new Map(allSentences.map((s) => [s.id, s]));

  // 1. Separate due cards vs new cards
  const activeExistingCards = existingCards.filter((c) => !c.suspended && !c.leech);

  const dueReviews: StudyItem[] = [];
  const overdueReviews: StudyItem[] = [];

  for (const card of activeExistingCards) {
    const dueDate = new Date(card.due);
    if (dueDate.getTime() <= now.getTime()) {
      const sentence = sentenceMap.get(card.sentence_id);
      if (!sentence) continue;

      const isOverdue = now.getTime() - dueDate.getTime() > 24 * 60 * 60 * 1000;
      const item: StudyItem = {
        card,
        sentence,
        isNew: false,
        isOverdue
      };

      if (isOverdue) {
        overdueReviews.push(item);
      } else {
        dueReviews.push(item);
      }
    }
  }

  // Cap total reviews by max_reviews_per_day
  const allReviews = [...overdueReviews, ...dueReviews].slice(0, settings.max_reviews_per_day);

  // 2. Identify new cards needed to fill new_per_day quota
  const existingSentenceModes = new Set(existingCards.map((c) => `${c.sentence_id}:${c.mode}`));
  const candidateNewSentences = [...allSentences];

  // Apply new card ordering option (§5)
  if (options.order === 'grammar_tag') {
    candidateNewSentences.sort((a, b) => a.grammar_tag.localeCompare(b.grammar_tag));
  } else if (options.order === 'shuffled') {
    candidateNewSentences.sort(() => Math.random() - 0.5);
  } else {
    // Default by week then sentence id
    candidateNewSentences.sort((a, b) => a.week - b.week);
  }

  const newCards: StudyItem[] = [];
  for (const sentence of candidateNewSentences) {
    if (newCards.length >= settings.new_per_day) break;

    // Sibling-aware new card picking: pick first unlocked mode not yet created
    const candidateModes: CardMode[] = ['recognition', 'recall'];

    for (const mode of candidateModes) {
      const key = `${sentence.id}:${mode}`;
      if (!existingSentenceModes.has(key)) {
        const dummyCard: UserCard = {
          id: generateCardId(sentence.id, mode),
          user_id: settings.user_id,
          sentence_id: sentence.id,
          mode,
          state: 0,
          due: now.toISOString(),
          reps: 0,
          lapses: 0,
          suspended: false,
          leech: false
        };
        newCards.push({
          card: dummyCard,
          sentence,
          isNew: true,
          isOverdue: false
        });
        existingSentenceModes.add(key);
        // Break so only one mode per new sentence is scheduled in this session (sibling burying)
        break;
      }
    }
  }

  // 3. Combine in order: Overdue -> Due -> New
  const combined = [...allReviews, ...newCards];

  // 4. Sibling burying: never show two modes of the same sentence in the same session
  const buriedItems: StudyItem[] = [];
  const seenSentencesInSession = new Set<string>();

  for (const item of combined) {
    if (!seenSentencesInSession.has(item.sentence.id)) {
      seenSentencesInSession.add(item.sentence.id);
      buriedItems.push(item);
    }
  }

  // 5. Interleave: do not show more than 3 consecutive items with the same grammar_tag
  return interleaveQueue(buriedItems);
}
