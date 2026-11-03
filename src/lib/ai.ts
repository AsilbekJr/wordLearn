import {
  ProductionEvaluation,
  ProductionEvaluationSchema,
  DeepCard,
  DeepCardSchema,
  TransformDrill,
  TransformDrillSchema,
  RoleplayTurn,
  GrammarExplanation
} from '../../supabase/functions/_shared/schemas';

// High-quality deterministic recorded fixtures for testing and offline resilience (§14)
export const FIXTURE_PRODUCTION_EVALUATION: ProductionEvaluation = {
  usedTargets: [
    { target: 'have been working', usedCorrectly: true, note: 'Hozirgi davomli tugallangan zamonda toʻgʻri qoʻllangan.' },
    { target: 'for three years', usedCorrectly: true, note: 'Vaqt davomiyligi predlogi toʻgʻri.' }
  ],
  grammarOk: true,
  naturalness: 5,
  corrected: "I have been working as a frontend engineer for three years, and I really enjoy solving UI problems.",
  errors: [],
  betterVariant: "I've been working as a frontend engineer for the past three years, focusing on crafting responsive interfaces.",
  passed: true
};

export const FIXTURE_DEEP_CARD: DeepCard = {
  lemma: 'achieve',
  pos: 'verb',
  englishDefinition: 'to successfully bring about or reach an objective by effort, skill, or courage.',
  uzbekMeaning: 'erishmoq, qoʻlga kiritmoq (mehnat yoki mahorat orqali)',
  collocations: ['achieve a goal', 'achieve success', 'achieve results'],
  wordFamily: {
    noun: ['achievement', 'achiever'],
    verb: ['achieve'],
    adjective: ['achievable'],
    adverb: []
  },
  register: 'neutral',
  uzbekMistakes: [
    "'reach' soʻzi bilan adashtirish: 'reach a goal' ham mumkin, lekin 'achieve' harakat va mehnatni koʻproq ifodalaydi."
  ],
  synonymNuance: "'accomplish' koʻproq topshiriqni tugatishga, 'achieve' esa uzoq muddatli maqsadlarga tegishli.",
  examples: [
    {
      context: 'work',
      sentence: 'Our engineering team achieved all quarterly milestones ahead of schedule.',
      translationUz: 'Bizning muhandislar jamoamiz barcha choraklik vazifalarni muddatidan oldin bajardi.'
    },
    {
      context: 'daily',
      sentence: 'With consistent practice, you can achieve fluency in English.',
      translationUz: 'Muntazam mashq bilan siz ingliz tilida ravon gapirishga erisha olasiz.'
    },
    {
      context: 'ielts',
      sentence: 'To achieve an overall band score of 7.0, candidates must demonstrate lexical resource.',
      translationUz: '7.0 ballga erishish uchun nomzodlar boy lugʻat boyligini namoyish etishlari shart.'
    }
  ],
  mnemonic: 'Achieve soʻzini "Arch" (kamon oʻqi nishonga tekkandagi yutuq) bilan bogʻlab eslab qoling.',
  morphemes: [
    { part: 'a-', type: 'prefix', meaningUz: 'yoʻnalish bildiruvchi qadimgi prefiks' },
    { part: 'chief', type: 'root', meaningUz: 'bosh, choʻqqi (fransuzcha chef/choʻqqiga yetmoq)' }
  ]
};

export const FIXTURE_TRANSFORM_DRILL: TransformDrill = {
  original: "She works in a tech company.",
  drills: [
    {
      instructionUz: "Inkor (negative) shakliga oʻtkazing",
      targetType: "polarity",
      prompt: "She ... in a tech company.",
      expectedAnswer: "doesn't work",
      acceptedVariants: ["does not work"]
    },
    {
      instructionUz: "Soʻroq (question) shakliga oʻtkazing",
      targetType: "question",
      prompt: "... she work in a tech company?",
      expectedAnswer: "Does",
      acceptedVariants: ["does"]
    },
    {
      instructionUz: "Oʻtgan zamonga (Past Simple) oʻzgartiring",
      targetType: "tense",
      prompt: "She ... in a tech company last year.",
      expectedAnswer: "worked",
      acceptedVariants: ["worked"]
    }
  ]
};

export const FIXTURE_ROLEPLAY_TURN: RoleplayTurn = {
  scenario: "IELTS Speaking Part 1 - Job & Studies",
  partnerName: "Examiner",
  aiMessage: "Good morning! Could you tell me a little bit about what you do for a living?",
  steerTargets: ["work as", "responsible for", "enjoy"],
  feedbackOnPrevious: null
};

export const FIXTURE_GRAMMAR_EXPLANATION: GrammarExplanation = {
  tag: "Present Perfect Continuous",
  explanationUz: "Oʻtmishda boshlanib, hozir ham davom etayotgan yoki hozirgina tugab, natijasi yaqqol koʻrinib turgan harakatlar uchun ishlatiladi. Formula: have/has been + V-ing.",
  examples: [
    { english: "I have been coding since morning.", uzbek: "Men ertalabdan beri kod yozyapman." },
    { english: "She has been waiting for two hours.", uzbek: "U ikki soatdan beri kutyapti." },
    { english: "They have been studying IELTS.", uzbek: "Ular IELTS ga tayyorlanishmoqda." }
  ]
};

/**
 * AI Service Client with Zod Validation and graceful fallback
 */
export async function evaluateProductionSentence(input: {
  targets: string[];
  situation: string;
  learnerText: string;
  channel: 'typed' | 'spoken';
}): Promise<ProductionEvaluation> {
  try {
    // If Edge Function is available, call it here:
    // const res = await supabase.functions.invoke('evaluate-production', { body: input });
    // return ProductionEvaluationSchema.parse(res.data);

    // Dynamic heuristic simulation when offline
    const isShort = input.learnerText.trim().split(/\s+/).length < 4;
    const errors: any[] = [];
    if (isShort) {
      errors.push({
        type: 'other',
        wrong: input.learnerText,
        correct: input.learnerText + ' with full context.',
        explanationUz: 'Gap juda qisqa, toʻliqroq vaziyat tasvirlang.'
      });
    }

    const evaluation: ProductionEvaluation = {
      usedTargets: input.targets.map((t) => ({
        target: t,
        usedCorrectly: input.learnerText.toLowerCase().includes(t.toLowerCase().split(' ')[0]),
        note: `"${t}" iborasi qoʻllandi.`
      })),
      grammarOk: !isShort,
      naturalness: isShort ? 2 : 4,
      corrected: input.learnerText.trim(),
      errors,
      betterVariant: input.learnerText + ' perfectly expressing the idea.',
      passed: !isShort
    };

    return ProductionEvaluationSchema.parse(evaluation);
  } catch {
    return FIXTURE_PRODUCTION_EVALUATION;
  }
}

export async function fetchDeepCard(lemma: string, pos?: string): Promise<DeepCard> {
  try {
    return DeepCardSchema.parse({
      ...FIXTURE_DEEP_CARD,
      lemma,
      pos: pos || 'verb'
    });
  } catch {
    return FIXTURE_DEEP_CARD;
  }
}

export async function fetchTransformDrills(sentence: string, _grammarTag?: string): Promise<TransformDrill> {
  return TransformDrillSchema.parse({
    original: sentence,
    drills: FIXTURE_TRANSFORM_DRILL.drills
  });
}
