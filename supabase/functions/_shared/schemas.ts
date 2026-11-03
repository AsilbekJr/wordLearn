import { z } from 'zod';

export const ProductionEvaluationSchema = z.object({
  usedTargets: z.array(
    z.object({
      target: z.string(),
      usedCorrectly: z.boolean(),
      note: z.string()
    })
  ),
  grammarOk: z.boolean(),
  naturalness: z.number().int().min(1).max(5),
  corrected: z.string(),
  errors: z.array(
    z.object({
      type: z.enum([
        'tense',
        'article',
        'preposition',
        'word-order',
        'word-choice',
        'spelling',
        'other'
      ]),
      wrong: z.string(),
      correct: z.string(),
      explanationUz: z.string()
    })
  ),
  betterVariant: z.string(),
  passed: z.boolean()
});

export type ProductionEvaluation = z.infer<typeof ProductionEvaluationSchema>;

export const DeepCardSchema = z.object({
  lemma: z.string(),
  pos: z.string(),
  englishDefinition: z.string(),
  uzbekMeaning: z.string(),
  collocations: z.array(z.string()),
  wordFamily: z.object({
    noun: z.array(z.string()).default([]),
    verb: z.array(z.string()).default([]),
    adjective: z.array(z.string()).default([]),
    adverb: z.array(z.string()).default([])
  }),
  register: z.enum(['formal', 'neutral', 'informal', 'slang']),
  uzbekMistakes: z.array(z.string()),
  synonymNuance: z.string(),
  examples: z.array(
    z.object({
      context: z.enum(['work', 'daily', 'ielts']),
      sentence: z.string(),
      translationUz: z.string()
    })
  ),
  mnemonic: z.string(),
  morphemes: z.array(
    z.object({
      part: z.string(),
      type: z.enum(['prefix', 'root', 'suffix']),
      meaningUz: z.string()
    })
  )
});

export type DeepCard = z.infer<typeof DeepCardSchema>;

export const TransformDrillSchema = z.object({
  original: z.string(),
  drills: z.array(
    z.object({
      instructionUz: z.string(), // Masalan: "Inkor shakliga oʻtkazing"
      targetType: z.enum(['subject', 'polarity', 'question', 'tense']),
      prompt: z.string(),
      expectedAnswer: z.string(),
      acceptedVariants: z.array(z.string()).default([])
    })
  )
});

export type TransformDrill = z.infer<typeof TransformDrillSchema>;

export const RoleplayTurnSchema = z.object({
  scenario: z.string(),
  partnerName: z.string(),
  aiMessage: z.string(),
  steerTargets: z.array(z.string()),
  feedbackOnPrevious: z
    .object({
      passed: z.boolean(),
      corrections: z.array(z.string())
    })
    .nullable()
});

export type RoleplayTurn = z.infer<typeof RoleplayTurnSchema>;

export const GrammarExplanationSchema = z.object({
  tag: z.string(),
  explanationUz: z.string(),
  examples: z.array(
    z.object({
      english: z.string(),
      uzbek: z.string()
    })
  )
});

export type GrammarExplanation = z.infer<typeof GrammarExplanationSchema>;
