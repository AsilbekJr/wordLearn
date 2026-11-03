import { create } from 'zustand';
import { StudyItem } from '../lib/queue';
import { UserCard, ReviewLog, localStore } from '../lib/db';
import { scheduleReview } from '../lib/fsrs';
import { submitCloudCardReview } from '../lib/sync';

interface PreviousAction {
  cardBefore: UserCard;
  cardIndex: number;
  item: StudyItem;
}

interface SessionState {
  queue: StudyItem[];
  currentIndex: number;
  isRevealed: boolean;
  draftAnswer: string;
  cardStartTime: number;
  history: PreviousAction[];
  lastGraduatedNotice: { sentence: string; interval: number } | null;

  // Actions
  initSession: (items: StudyItem[]) => void;
  reveal: () => void;
  setDraftAnswer: (answer: string) => void;
  submitRating: (rating: 1 | 2 | 3 | 4, desiredRetention?: number) => void;
  dismissGraduatedNotice: () => void;
  undoLast: () => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  queue: [],
  currentIndex: 0,
  isRevealed: false,
  draftAnswer: '',
  cardStartTime: Date.now(),
  history: [],
  lastGraduatedNotice: null,

  initSession: (items) => {
    set({
      queue: items,
      currentIndex: 0,
      isRevealed: false,
      draftAnswer: '',
      cardStartTime: Date.now(),
      history: [],
      lastGraduatedNotice: null
    });
  },

  reveal: () => {
    set({ isRevealed: true });
  },

  dismissGraduatedNotice: () => {
    set({ lastGraduatedNotice: null });
  },

  setDraftAnswer: (answer) => {
    set({ draftAnswer: answer });
  },

  submitRating: (rating, desiredRetention = 0.9) => {
    const { queue, currentIndex, cardStartTime, draftAnswer, history } = get();
    if (currentIndex >= queue.length) return;

    const currentItem = queue[currentIndex];
    const durationMs = Date.now() - cardStartTime;
    const cardBefore = { ...currentItem.card };

    // FSRS scheduling round-trip
    const { updatedCard } = scheduleReview(
      currentItem.card,
      rating,
      desiredRetention,
      new Date()
    );

    // Persist card
    const allCards = localStore.getCards();
    const existingIndex = allCards.findIndex((c) => c.id === updatedCard.id);
    if (existingIndex !== -1) {
      allCards[existingIndex] = updatedCard;
    } else {
      allCards.push(updatedCard);
    }
    localStore.saveCards(allCards);

    // Append review log
    const log: ReviewLog = {
      user_id: updatedCard.user_id,
      card_id: updatedCard.id,
      rating,
      state: updatedCard.state,
      due: updatedCard.due,
      stability: updatedCard.stability,
      difficulty: updatedCard.difficulty,
      elapsed_days: updatedCard.elapsed_days,
      scheduled_days: updatedCard.scheduled_days,
      reviewed_at: new Date().toISOString(),
      duration_ms: durationMs,
      answer_text: draftAnswer,
      mode: updatedCard.mode
    };
    localStore.addLog(log);

    // Asynchronously submit review to Supabase if authenticated (non-blocking)
    submitCloudCardReview(updatedCard, log).catch(() => {});

    // Track error if rating is Again
    if (rating === 1) {
      localStore.addErrorLog({
        id: Date.now(),
        user_id: updatedCard.user_id,
        sentence_id: currentItem.sentence.id,
        grammar_tag: currentItem.sentence.grammar_tag,
        wrong: draftAnswer || '(Hech narsa yozilmadi)',
        correct: currentItem.sentence.gap,
        error_type: currentItem.sentence.grammar_tag,
        created_at: new Date().toISOString()
      });
    }

    // Check if card reached interval >= 21 days (Yodlandi status)
    const isGraduated = (updatedCard.scheduled_days || 0) >= 21 && (cardBefore.scheduled_days || 0) < 21;

    set({
      currentIndex: currentIndex + 1,
      isRevealed: false,
      draftAnswer: '',
      cardStartTime: Date.now(),
      lastGraduatedNotice: isGraduated
        ? { sentence: currentItem.sentence.gap, interval: updatedCard.scheduled_days || 21 }
        : null,
      history: [
        ...history,
        {
          cardBefore,
          cardIndex: currentIndex,
          item: currentItem
        }
      ]
    });
  },

  undoLast: () => {
    const { history, currentIndex } = get();
    if (history.length === 0 || currentIndex === 0) return;

    const last = history[history.length - 1];
    const prevHistory = history.slice(0, -1);

    // Restore card before
    const allCards = localStore.getCards();
    const existingIndex = allCards.findIndex((c) => c.id === last.cardBefore.id);
    if (existingIndex !== -1) {
      allCards[existingIndex] = last.cardBefore;
      localStore.saveCards(allCards);
    }

    set({
      currentIndex: last.cardIndex,
      isRevealed: true,
      draftAnswer: '',
      cardStartTime: Date.now(),
      history: prevHistory
    });
  },

  resetSession: () => {
    set({
      queue: [],
      currentIndex: 0,
      isRevealed: false,
      draftAnswer: '',
      history: []
    });
  }
}));
