import { describe, it, expect } from 'vitest';
import {
  ProductionEvaluationSchema,
  DeepCardSchema,
  TransformDrillSchema,
  RoleplayTurnSchema,
  GrammarExplanationSchema
} from '../supabase/functions/_shared/schemas';
import {
  FIXTURE_PRODUCTION_EVALUATION,
  FIXTURE_DEEP_CARD,
  FIXTURE_TRANSFORM_DRILL,
  FIXTURE_ROLEPLAY_TURN,
  FIXTURE_GRAMMAR_EXPLANATION,
  evaluateProductionSentence
} from '../src/lib/ai';

describe('Zod AI Schemas & Recorded Fixtures (Phase 4)', () => {
  it('validates production evaluation fixture successfully', () => {
    const parsed = ProductionEvaluationSchema.safeParse(FIXTURE_PRODUCTION_EVALUATION);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.naturalness).toBeGreaterThanOrEqual(1);
      expect(parsed.data.naturalness).toBeLessThanOrEqual(5);
      expect(parsed.data.passed).toBe(true);
    }
  });

  it('validates deep card linguistic schema and morpheme structure', () => {
    const parsed = DeepCardSchema.safeParse(FIXTURE_DEEP_CARD);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.morphemes.length).toBeGreaterThan(0);
      expect(parsed.data.examples.length).toBe(3);
    }
  });

  it('validates transform drills schema', () => {
    const parsed = TransformDrillSchema.safeParse(FIXTURE_TRANSFORM_DRILL);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.drills.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('validates roleplay conversation turn schema', () => {
    const parsed = RoleplayTurnSchema.safeParse(FIXTURE_ROLEPLAY_TURN);
    expect(parsed.success).toBe(true);
  });

  it('validates grammar explanation schema', () => {
    const parsed = GrammarExplanationSchema.safeParse(FIXTURE_GRAMMAR_EXPLANATION);
    expect(parsed.success).toBe(true);
  });

  it('handles production evaluation service with proper Zod parsing and error reporting', async () => {
    const res = await evaluateProductionSentence({
      targets: ['have been working'],
      situation: 'Job interview',
      learnerText: 'I have been working as a software engineer for three years.',
      channel: 'typed'
    });

    expect(res.passed).toBe(true);
    expect(res.usedTargets.length).toBe(1);
    expect(res.naturalness).toBeGreaterThanOrEqual(3);
  });

  it('rejects invalid schema structures gracefully', () => {
    const invalidObj = {
      usedTargets: [],
      grammarOk: 'not-a-boolean', // invalid type
      naturalness: 10 // out of bounds (1-5)
    };

    const parsed = ProductionEvaluationSchema.safeParse(invalidObj);
    expect(parsed.success).toBe(false);
  });
});
