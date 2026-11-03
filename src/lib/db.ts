import seedSentencesData from '../data/seed-sentences.json';
import { UserSettings, defaultSettings } from './supabase';

export interface Sentence {
  id: string;
  week: number;
  gap: string;
  gap_norm: string;
  tarjima: string;
  grammar_tag: string;
  source: 'seed' | 'user';
  audio_path?: string | null;
  vocab_items?: { lemma: string; pos: string }[];
}

export type CardMode =
  | 'recognition'
  | 'recall'
  | 'cloze'
  | 'dictation'
  | 'speaking'
  | 'transform'
  | 'production';

export interface UserCard {
  id: string;
  user_id: string;
  sentence_id: string;
  mode: CardMode;
  state: number; // 0 New, 1 Learning, 2 Review, 3 Relearning
  due: string;
  stability?: number;
  difficulty?: number;
  elapsed_days?: number;
  scheduled_days?: number;
  reps: number;
  lapses: number;
  last_review?: string | null;
  suspended: boolean;
  leech: boolean;
}

export interface ReviewLog {
  id?: number | string;
  user_id: string;
  card_id: string;
  rating: number; // 1-4
  state?: number;
  due?: string;
  stability?: number;
  difficulty?: number;
  elapsed_days?: number;
  scheduled_days?: number;
  reviewed_at: string;
  duration_ms?: number;
  answer_text?: string;
  auto_score?: number;
  mode: CardMode;
}

export interface ProductionAttempt {
  id: string;
  user_id: string;
  sentence_id?: string;
  vocab_id?: string;
  channel: 'typed' | 'spoken';
  learner_text: string;
  ai_verdict: {
    usedTargets?: { target: string; usedCorrectly: boolean; note?: string }[];
    grammarOk: boolean;
    naturalness: number;
    corrected: string;
    errors: { type: string; wrong: string; correct: string; explanationUz: string }[];
    betterVariant: string;
    passed: boolean;
  };
  created_at: string;
}

export interface ErrorLogItem {
  id: number | string;
  user_id: string;
  sentence_id?: string;
  grammar_tag: string;
  wrong: string;
  correct: string;
  error_type: string;
  created_at: string;
}

const STORAGE_KEYS = {
  USER_CARDS: 'linguist_user_cards_v1',
  REVIEW_LOGS: 'linguist_review_logs_v1',
  SETTINGS: 'linguist_settings_v1',
  PRODUCTION_ATTEMPTS: 'linguist_production_attempts_v1',
  ERROR_LOG: 'linguist_error_log_v1',
  USER_SENTENCES: 'linguist_user_sentences_v1'
};

// Local in-memory / localStorage storage helpers
class LocalStore {
  private mem = new Map<string, any>();

  private get<T>(key: string, defaultValue: T): T {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : defaultValue;
      }
      return this.mem.has(key) ? this.mem.get(key) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        this.mem.set(key, value);
      }
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  getCards(): UserCard[] {
    return this.get<UserCard[]>(STORAGE_KEYS.USER_CARDS, []);
  }

  saveCards(cards: UserCard[]): void {
    this.set(STORAGE_KEYS.USER_CARDS, cards);
  }

  getLogs(): ReviewLog[] {
    return this.get<ReviewLog[]>(STORAGE_KEYS.REVIEW_LOGS, []);
  }

  addLog(log: ReviewLog): void {
    const logs = this.getLogs();
    logs.push(log);
    this.set(STORAGE_KEYS.REVIEW_LOGS, logs);
  }

  getSettings(): UserSettings {
    return this.get<UserSettings>(STORAGE_KEYS.SETTINGS, defaultSettings);
  }

  saveSettings(settings: UserSettings): void {
    this.set(STORAGE_KEYS.SETTINGS, settings);
  }

  getProductionAttempts(): ProductionAttempt[] {
    return this.get<ProductionAttempt[]>(STORAGE_KEYS.PRODUCTION_ATTEMPTS, []);
  }

  addProductionAttempt(attempt: ProductionAttempt): void {
    const attempts = this.getProductionAttempts();
    attempts.unshift(attempt);
    this.set(STORAGE_KEYS.PRODUCTION_ATTEMPTS, attempts);
  }

  getErrorLog(): ErrorLogItem[] {
    return this.get<ErrorLogItem[]>(STORAGE_KEYS.ERROR_LOG, []);
  }

  addErrorLog(item: ErrorLogItem): void {
    const list = this.getErrorLog();
    list.unshift(item);
    this.set(STORAGE_KEYS.ERROR_LOG, list);
  }

  getUserSentences(): Sentence[] {
    return this.get<Sentence[]>(STORAGE_KEYS.USER_SENTENCES, []);
  }

  addUserSentence(s: Sentence): void {
    const list = this.getUserSentences();
    list.push(s);
    this.set(STORAGE_KEYS.USER_SENTENCES, list);
  }
}

export const localStore = new LocalStore();

/**
 * Fetch all sentences (seed + user-created).
 */
export async function getAllSentences(): Promise<Sentence[]> {
  const seed = (seedSentencesData as any[]) as Sentence[];
  const user = localStore.getUserSentences();
  return [...seed, ...user];
}

/**
 * Calculate the 5-level mastery for a sentence given its cards and attempts.
 */
export function calculateMasteryLevel(
  sentenceId: string,
  userCards: UserCard[],
  attempts: ProductionAttempt[]
): number {
  const recogCard = userCards.find((c) => c.sentence_id === sentenceId && c.mode === 'recognition');
  const recallCard = userCards.find((c) => c.sentence_id === sentenceId && c.mode === 'recall');
  const dictCard = userCards.find((c) => c.sentence_id === sentenceId && c.mode === 'dictation');

  // Level 1 (Tanish): recognition reviewed >= 1 time
  if (!recogCard || recogCard.reps === 0) return 0;
  if (!recallCard || (recallCard.stability || 0) < 7) return 1;

  // Level 2 (Eslash): recall stability >= 7 days
  if (!dictCard || (dictCard.stability || 0) < 7) return 2;

  // Level 3 (Eshitish): dictation stability >= 7 days
  const validAttempts = attempts.filter(
    (a) => a.sentence_id === sentenceId && a.ai_verdict?.passed
  );
  if (validAttempts.length < 3) return 3;

  // Level 4 (Ishlatish): >= 3 production attempts correct in different contexts
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentSpontaneous = validAttempts.some(
    (a) => new Date(a.created_at).getTime() >= thirtyDaysAgo
  );
  if (!recentSpontaneous) return 3;

  if ((recallCard.scheduled_days || 0) >= 21 || (recogCard.scheduled_days || 0) >= 21) {
    // Level 5 (Yodlandi / Erkin): interval reaches >= 21 days
    return 5;
  }

  return 4;
}

export interface SentenceReviewStats {
  totalReps: number;
  maxScheduledDays: number;
  isDue: boolean;
  isMastered: boolean;
  nextDue: Date | null;
  activeCardsCount: number;
}

/**
 * Calculates repetition count, interval, due state and mastery for a sentence.
 */
export function getSentenceReviewStats(sentenceId: string, userCards: UserCard[]): SentenceReviewStats {
  const cards = userCards.filter((c) => c.sentence_id === sentenceId && !c.suspended);
  const totalReps = cards.reduce((sum, c) => sum + (c.reps || 0), 0);
  const maxScheduledDays = cards.reduce(
    (max, c) => Math.max(max, c.scheduled_days || 0, Math.round(c.stability || 0)),
    0
  );
  const now = new Date();
  const isDue = cards.some((c) => new Date(c.due) <= now);

  let nextDue: Date | null = null;
  for (const c of cards) {
    const d = new Date(c.due);
    if (!nextDue || d < nextDue) {
      nextDue = d;
    }
  }

  // Interval >= 21 days signifies transition to "Yodlandi"
  const isMastered = maxScheduledDays >= 21;

  return {
    totalReps,
    maxScheduledDays,
    isDue,
    isMastered,
    nextDue,
    activeCardsCount: cards.length
  };
}
