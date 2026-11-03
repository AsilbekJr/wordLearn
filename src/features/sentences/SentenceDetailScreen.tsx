import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllSentences, localStore, calculateMasteryLevel, getSentenceReviewStats } from '../../lib/db';
import { uz } from '../../i18n/uz';
import { Volume2, ArrowLeft, Sparkles, AlertTriangle, Layers, RotateCcw, CheckCircle, Clock } from 'lucide-react';
import { playTtsAudio } from '../../lib/tts';

export const SentenceDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: sentences = [] } = useQuery({
    queryKey: ['sentences'],
    queryFn: getAllSentences
  });

  const allCards = useMemo(() => localStore.getCards(), []);
  const sentence = sentences.find((s) => s.id === id);
  const cards = useMemo(() => allCards.filter((c) => c.sentence_id === id), [allCards, id]);
  const attempts = useMemo(() => localStore.getProductionAttempts().filter((a) => a.sentence_id === id), [id]);

  const mastery = sentence ? calculateMasteryLevel(sentence.id, cards, attempts) : 0;
  const reviewStats = useMemo(() => sentence ? getSentenceReviewStats(sentence.id, allCards) : null, [sentence, allCards]);

  if (!sentence) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-sm text-[#646059]">{uz.library.noResults}</p>
        <Link to="/library" className="mt-4 inline-block text-xs font-mono text-[#D9482B] underline">
          Kutubxonaga qaytish
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/library"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[#646059] hover:text-[#1B1A17] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kutubxonaga qaytish</span>
        </Link>
      </div>

      {/* Main Sentence Card */}
      <section className="bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px] p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded-[2px] bg-[#EAE4D9] text-[#646059]">
              {uz.library.weekNumber(sentence.week)}
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-[2px] bg-[#EDF3EC] text-[#4F6B4A] border border-[#B7D2B3]">
              {sentence.grammar_tag}
            </span>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded-[2px] bg-[#FAF7F2] border border-[#E2DBD0]">
            Daraja: {mastery}/5
          </span>
        </div>

        {/* Hero English sentence */}
        <div className="flex items-start justify-between gap-4 pt-2">
          <h1 className="text-3xl sm:text-4xl font-serif text-[#1B1A17] leading-snug">
            {sentence.gap}
          </h1>
          <button
            onClick={() => playTtsAudio(sentence.gap, sentence.audio_path)}
            className="p-3 text-[#1B1A17] hover:text-[#D9482B] hover:bg-[#FAF7F2] rounded-[2px] border border-[#E2DBD0] transition-colors shrink-0"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>

        {/* Repetition & Mastery Indicators */}
        {reviewStats && (
          <div className="flex items-center gap-2 flex-wrap pt-1 text-xs font-mono">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] bg-[#FAF7F2] border border-[#E2DBD0] text-[#1B1A17]">
              <RotateCcw className="w-3 h-3 text-[#646059]" />
              <span>{uz.mastery.repsCount(reviewStats.totalReps)}</span>
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] bg-[#FAF7F2] border border-[#E2DBD0] text-[#646059]">
              <Clock className="w-3 h-3" />
              <span>{uz.mastery.intervalDays(reviewStats.maxScheduledDays)}</span>
            </span>

            {reviewStats.isMastered ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] bg-[#EDF3EC] border border-[#B7D2B3] text-[#4F6B4A] font-semibold">
                <CheckCircle className="w-3 h-3" />
                <span>{uz.mastery.masteredTag} (Interval ≥ 21 kun)</span>
              </span>
            ) : reviewStats.isDue ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] bg-[#F9EBE7] border border-[#F2C8C0] text-[#D9482B] font-semibold animate-pulse">
                <span>● {uz.mastery.dueToday}</span>
              </span>
            ) : null}
          </div>
        )}

        {/* Uzbek Translation */}
        <p className="text-lg font-sans text-[#646059] border-t border-[#E2DBD0] pt-4">
          {sentence.tarjima}
        </p>

        {/* Lemma tokens */}
        {sentence.vocab_items && sentence.vocab_items.length > 0 && (
          <div className="pt-3 border-t border-[#E2DBD0]/60 flex items-center gap-2 flex-wrap text-xs font-mono text-[#646059]">
            <span className="font-sans font-medium text-[#1B1A17]">Leksik birliklar:</span>
            {sentence.vocab_items.map((v, i) => (
              <span key={i} className="px-2 py-0.5 bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px]">
                {v.lemma} ({v.pos})
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Deep Card AI Component (§6) */}
      <section className="bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px] p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-[#E2DBD0] pb-3">
          <Sparkles className="w-4 h-4 text-[#D9482B]" />
          <h2 className="text-lg font-serif font-bold text-[#1B1A17]">{uz.detail.deepCard}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {/* Word Family */}
          <div className="space-y-2">
            <h3 className="font-mono text-xs text-[#646059] uppercase tracking-wider font-semibold">
              {uz.detail.wordFamily}
            </h3>
            <div className="p-3 bg-[#FAF7F2] rounded-[2px] border border-[#E2DBD0] space-y-1 text-xs">
              <div><strong className="font-mono text-[#1B1A17]">Feʼl (verb):</strong> work, decide, improve</div>
              <div><strong className="font-mono text-[#1B1A17]">Ot (noun):</strong> worker, decision, improvement</div>
              <div><strong className="font-mono text-[#1B1A17]">Sifat (adj):</strong> decisive, improvable</div>
            </div>
          </div>

          {/* Collocations */}
          <div className="space-y-2">
            <h3 className="font-mono text-xs text-[#646059] uppercase tracking-wider font-semibold">
              {uz.detail.collocations}
            </h3>
            <div className="p-3 bg-[#FAF7F2] rounded-[2px] border border-[#E2DBD0] text-xs space-y-1 text-[#1B1A17]">
              <div>• make a decision (NOT do a decision)</div>
              <div>• heavily influence / highly likely</div>
              <div>• take responsibility for</div>
            </div>
          </div>

          {/* Mistakes of Uzbek speakers */}
          <div className="space-y-2 md:col-span-2">
            <h3 className="font-mono text-xs text-[#D9482B] uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {uz.detail.uzbekMistakes}
            </h3>
            <div className="p-3 bg-[#F9EBE7] rounded-[2px] border border-[#F2C8C0] text-xs text-[#1B1A17] space-y-1">
              <div>
                <strong>Notoʻgʻri:</strong> "I am agree with you" → <strong>Toʻgʻri:</strong> "I agree with you" (Agree feʼl hisoblanadi, sifat emas).
              </div>
              <div>
                <strong>Predlog xatosi:</strong> "depend of" emas, "depend on" ishlatiladi.
              </div>
            </div>
          </div>

          {/* Morpheme breakdown & Mnemonic */}
          <div className="space-y-2 md:col-span-2">
            <h3 className="font-mono text-xs text-[#646059] uppercase tracking-wider font-semibold">
              {uz.detail.morphemes} & {uz.detail.mnemonic}
            </h3>
            <div className="p-3 bg-[#FAF7F2] rounded-[2px] border border-[#E2DBD0] text-xs space-y-2 text-[#1B1A17]">
              <div>
                <span className="font-mono bg-[#EAE4D9] px-1.5 py-0.5 rounded-[2px] mr-1">un- (inkor)</span> +
                <span className="font-mono bg-[#EAE4D9] px-1.5 py-0.5 rounded-[2px] mx-1">predict (ildiz)</span> +
                <span className="font-mono bg-[#EAE4D9] px-1.5 py-0.5 rounded-[2px] ml-1">-able (imkoniyat qoʻshimchasi)</span>
                = oldindan aytib boʻlmaydigan.
              </div>
              <div className="italic text-[#646059]">
                Mnemonic: Soʻz qismlarini bogʻlab eslab qoling: Pre (oldindan) + dict (aytish, diktovka) → oldindan aytmoq.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mode status summary */}
      <section className="bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px] p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E2DBD0] pb-3">
          <Layers className="w-4 h-4 text-[#4F6B4A]" />
          <h2 className="text-lg font-serif font-bold text-[#1B1A17]">Mashq rejimlari holati</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          {(['recognition', 'recall', 'cloze', 'dictation', 'speaking', 'transform', 'production'] as const).map((m) => {
            const card = cards.find((c) => c.mode === m);
            return (
              <div key={m} className="p-3 bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px]">
                <div className="font-semibold text-[#1B1A17]">{uz.modes[m]}</div>
                <div className="mt-1 text-[#646059]">
                  {card ? `Reps: ${card.reps} | S: ${Math.round(card.stability || 0)}d` : 'Qulflangan'}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
