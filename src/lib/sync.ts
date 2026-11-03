import { supabase } from './supabase';
import { localStore, UserCard, ReviewLog } from './db';

export interface SyncResult {
  success: boolean;
  cardsSynced: number;
  logsSynced: number;
  errorsSynced: number;
  attemptsSynced: number;
  error?: string;
}

/**
 * Pushes local progress to Supabase database for the logged-in user.
 */
export async function pushLocalToCloud(userId: string): Promise<SyncResult> {
  try {
    const localCards = localStore.getCards();
    const localLogs = localStore.getLogs();
    const localErrors = localStore.getErrorLog();
    const localAttempts = localStore.getProductionAttempts();

    // 1. Sync User Cards (Upsert)
    let cardsSynced = 0;
    if (localCards.length > 0) {
      const cardsToUpsert = localCards.map((c) => ({
        id: c.id,
        user_id: userId,
        sentence_id: c.sentence_id,
        mode: c.mode,
        state: c.state,
        due: c.due,
        stability: c.stability ?? null,
        difficulty: c.difficulty ?? null,
        elapsed_days: c.elapsed_days ?? 0,
        scheduled_days: c.scheduled_days ?? 0,
        reps: c.reps,
        lapses: c.lapses,
        last_review: c.last_review ?? null,
        suspended: c.suspended,
        leech: c.leech
      }));

      // Upsert in batches of 100
      for (let i = 0; i < cardsToUpsert.length; i += 100) {
        const batch = cardsToUpsert.slice(i, i + 100);
        const { error } = await supabase.from('user_cards').upsert(batch, {
          onConflict: 'user_id, sentence_id, mode'
        });
        if (error) {
          console.warn('Upsert cards batch error:', error);
          throw error;
        }
      }
      cardsSynced = cardsToUpsert.length;
    }

    // 2. Sync Error Logs (Insert missing)
    let errorsSynced = 0;
    if (localErrors.length > 0) {
      const errorsToInsert = localErrors.map((e) => ({
        user_id: userId,
        sentence_id: e.sentence_id ?? null,
        grammar_tag: e.grammar_tag,
        wrong: e.wrong,
        correct: e.correct,
        error_type: e.error_type,
        created_at: e.created_at
      }));

      for (let i = 0; i < errorsToInsert.length; i += 100) {
        const batch = errorsToInsert.slice(i, i + 100);
        const { error } = await supabase.from('error_log').insert(batch);
        if (error) console.warn('Insert error_log batch warning:', error);
      }
      errorsSynced = errorsToInsert.length;
    }

    // 3. Sync Production Attempts
    let attemptsSynced = 0;
    if (localAttempts.length > 0) {
      const attemptsToInsert = localAttempts.map((a) => ({
        id: a.id,
        user_id: userId,
        sentence_id: a.sentence_id ?? null,
        vocab_id: a.vocab_id ?? null,
        channel: a.channel,
        learner_text: a.learner_text,
        ai_verdict: a.ai_verdict,
        created_at: a.created_at
      }));

      for (let i = 0; i < attemptsToInsert.length; i += 100) {
        const batch = attemptsToInsert.slice(i, i + 100);
        const { error } = await supabase.from('production_attempts').upsert(batch);
        if (error) console.warn('Upsert production_attempts warning:', error);
      }
      attemptsSynced = attemptsToInsert.length;
    }

    // 4. Sync Settings
    const localSettings = localStore.getSettings();
    await supabase.from('user_settings').upsert({
      user_id: userId,
      desired_retention: localSettings.desired_retention,
      new_per_day: localSettings.new_per_day,
      max_reviews_per_day: localSettings.max_reviews_per_day,
      day_rollover_hour: localSettings.day_rollover_hour,
      timezone: localSettings.timezone,
      tts_voice: localSettings.tts_voice,
      theme: localSettings.theme
    });

    return {
      success: true,
      cardsSynced,
      logsSynced: localLogs.length,
      errorsSynced,
      attemptsSynced
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      cardsSynced: 0,
      logsSynced: 0,
      errorsSynced: 0,
      attemptsSynced: 0,
      error: message
    };
  }
}

/**
 * Pulls cloud cards and reviews from Supabase down to localStore.
 */
export async function pullCloudToLocal(userId: string): Promise<{ success: boolean; cardsCount: number; error?: string }> {
  try {
    const { data: cloudCards, error: cardsError } = await supabase
      .from('user_cards')
      .select('*')
      .eq('user_id', userId);

    if (cardsError) throw cardsError;

    if (cloudCards && cloudCards.length > 0) {
      const localCards = localStore.getCards();
      const localCardMap = new Map(localCards.map((c) => [c.id, c]));

      // Merge cloud cards with local cards
      for (const cc of cloudCards) {
        const mapped: UserCard = {
          id: cc.id,
          user_id: cc.user_id,
          sentence_id: cc.sentence_id,
          mode: cc.mode,
          state: cc.state,
          due: cc.due,
          stability: cc.stability,
          difficulty: cc.difficulty,
          elapsed_days: cc.elapsed_days,
          scheduled_days: cc.scheduled_days,
          reps: cc.reps,
          lapses: cc.lapses,
          last_review: cc.last_review,
          suspended: cc.suspended,
          leech: cc.leech
        };
        localCardMap.set(mapped.id, mapped);
      }

      localStore.saveCards(Array.from(localCardMap.values()));
      return { success: true, cardsCount: cloudCards.length };
    }

    return { success: true, cardsCount: 0 };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, cardsCount: 0, error: message };
  }
}

/**
 * Submits a review atomically via Supabase RPC `submit_card_review` if online.
 * Safe fallback if offline or unauthenticated.
 */
export async function submitCloudCardReview(
  updatedCard: UserCard,
  log: ReviewLog
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase.rpc('submit_card_review', {
      p_card_id: updatedCard.id,
      p_rating: log.rating,
      p_state: updatedCard.state,
      p_due: updatedCard.due,
      p_stability: updatedCard.stability ?? 0,
      p_difficulty: updatedCard.difficulty ?? 0,
      p_elapsed_days: updatedCard.elapsed_days ?? 0,
      p_scheduled_days: updatedCard.scheduled_days ?? 0,
      p_duration_ms: log.duration_ms ?? 0,
      p_answer_text: log.answer_text ?? '',
      p_auto_score: log.auto_score ?? 1.0
    });

    if (error) {
      console.warn('submit_card_review RPC error (using local state):', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Cloud review submission failed (continuing offline):', msg);
    return { success: false, error: msg };
  }
}
