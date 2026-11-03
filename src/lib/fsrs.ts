import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating as FsrsRating,
  Card as FsrsCard
} from 'ts-fsrs';
import { UserCard, CardMode } from './db';

export { FsrsRating as Rating };

export interface ScheduleResult {
  updatedCard: UserCard;
  rating: number;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  isLeech: boolean;
}

export function createNewUserCard(
  userId: string,
  sentenceId: string,
  mode: CardMode,
  now = new Date()
): UserCard {
  const empty = createEmptyCard(now);
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${userId}-${sentenceId}-${mode}`,
    user_id: userId,
    sentence_id: sentenceId,
    mode,
    state: empty.state,
    due: empty.due.toISOString(),
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsed_days: empty.elapsed_days,
    scheduled_days: empty.scheduled_days,
    reps: empty.reps,
    lapses: empty.lapses,
    last_review: null,
    suspended: false,
    leech: false
  };
}

export function scheduleReview(
  card: UserCard,
  rating: 1 | 2 | 3 | 4,
  desiredRetention = 0.9,
  reviewTime = new Date()
): ScheduleResult {
  const params = generatorParameters({
    request_retention: desiredRetention,
    enable_fuzz: true,
    enable_short_term: true
  });
  const f = fsrs(params);

  // Convert UserCard to FsrsCard
  const fsrsCard: FsrsCard = {
    due: new Date(card.due),
    stability: card.stability || 0,
    difficulty: card.difficulty || 0,
    elapsed_days: card.elapsed_days || 0,
    scheduled_days: card.scheduled_days || 0,
    reps: card.reps || 0,
    lapses: card.lapses || 0,
    state: card.state || 0,
    last_review: card.last_review ? new Date(card.last_review) : undefined,
    learning_steps: (card as any).learning_steps || 0
  };

  const repeatMap = f.repeat(fsrsCard, reviewTime);
  const nextItem = (repeatMap as any)[rating];
  const nextFsrs = nextItem.card;

  const newLapses = rating === 1 ? (card.lapses || 0) + 1 : (card.lapses || 0);
  const isLeech = newLapses >= 8;

  const updatedCard: UserCard = {
    ...card,
    state: nextFsrs.state,
    due: nextFsrs.due.toISOString(),
    stability: nextFsrs.stability,
    difficulty: nextFsrs.difficulty,
    elapsed_days: nextFsrs.elapsed_days,
    scheduled_days: nextFsrs.scheduled_days,
    reps: (card.reps || 0) + 1,
    lapses: newLapses,
    last_review: reviewTime.toISOString(),
    leech: isLeech,
    suspended: isLeech ? true : card.suspended
  };

  return {
    updatedCard,
    rating,
    due: updatedCard.due,
    stability: updatedCard.stability || 0,
    difficulty: updatedCard.difficulty || 0,
    elapsed_days: updatedCard.elapsed_days || 0,
    scheduled_days: updatedCard.scheduled_days || 0,
    isLeech
  };
}
