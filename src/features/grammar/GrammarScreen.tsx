import React, { useState } from 'react';
import { uz } from '../../i18n/uz';
import { BookMarked, Layers, HelpCircle, ArrowRight } from 'lucide-react';

export const GrammarScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'morphology' | 'confusable' | 'guessFirst'>('confusable');

  // Confusable pairs interactive drill state
  const confusableDrills = [
    {
      id: 1,
      pair: "will vs going to",
      question: "Look at those dark clouds! It ... rain soon.",
      options: ["is going to", "will"],
      correct: "is going to",
      explanationUz: "Koʻrinib turgan dalil (qora bulutlar) asosidagi bashoratlar uchun 'going to' ishlatiladi. 'Will' esa kutilmagan qarorlar yoki shaxsiy fikrlar uchun xos."
    },
    {
      id: 2,
      pair: "Present Perfect vs Past Simple",
      question: "I ... my keys yesterday evening.",
      options: ["lost", "have lost"],
      correct: "lost",
      explanationUz: "Aniq oʻtgan vaqt koʻrsatilgan boʻlsa ('yesterday evening'), har doim Past Simple ishlatiladi."
    },
    {
      id: 3,
      pair: "must vs have to",
      question: "In the UK, all drivers ... drive on the left side of the road.",
      options: ["have to", "must"],
      correct: "have to",
      explanationUz: "Qonun va tashqi majburiyatlar uchun 'have to' koʻproq mos keladi."
    }
  ];

  const [currentConfusableIdx, setCurrentConfusableIdx] = useState(0);
  const [selectedConfusableAnswer, setSelectedConfusableAnswer] = useState<string | null>(null);

  const currentConfusable = confusableDrills[currentConfusableIdx];

  // Morphology lab drills
  const morphologyDrills = [
    {
      base: "decide (feʼl)",
      question: "Ushbu soʻzning OT (noun) shaklini yasang:",
      options: ["decision", "decisive", "decidedly"],
      correct: "decision",
      affixInfo: "-ion qoʻshimchasi feʼldan mavhum ot yasaydi."
    },
    {
      base: "predict (feʼl)",
      question: "Oldindan aytib boʻlmaydigan (inkor sifat) shakli:",
      options: ["unpredictable", "predictable", "predictably"],
      correct: "unpredictable",
      affixInfo: "un- (inkor) + predict (ildiz) + -able (imkoniyat sifati)."
    }
  ];
  const [morphologyIdx, setMorphologyIdx] = useState(0);
  const [selectedMorphAnswer, setSelectedMorphAnswer] = useState<string | null>(null);

  const currentMorph = morphologyDrills[morphologyIdx];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-[#E2DBD0] pb-6">
        <h1 className="text-3xl font-serif text-[#1B1A17] tracking-tight">{uz.nav.grammar}</h1>
        <p className="text-sm text-[#646059] mt-1 font-sans">
          Morfologiya laboratoriyasi, soʻz yasash mantiqi va chalkash grammatik juftliklar trenajyori
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2DBD0] pb-2">
        <button
          onClick={() => setActiveTab('confusable')}
          className={`px-4 py-2 text-xs font-mono rounded-[2px] flex items-center gap-2 transition-colors ${
            activeTab === 'confusable'
              ? 'bg-[#1B1A17] text-[#F6F1E7]'
              : 'text-[#646059] hover:bg-[#EAE4D9]'
          }`}
        >
          <BookMarked className="w-3.5 h-3.5" />
          <span>Chalkash juftliklar (Discrimination)</span>
        </button>

        <button
          onClick={() => setActiveTab('morphology')}
          className={`px-4 py-2 text-xs font-mono rounded-[2px] flex items-center gap-2 transition-colors ${
            activeTab === 'morphology'
              ? 'bg-[#1B1A17] text-[#F6F1E7]'
              : 'text-[#646059] hover:bg-[#EAE4D9]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Morfologiya laboratoriyasi</span>
        </button>

        <button
          onClick={() => setActiveTab('guessFirst')}
          className={`px-4 py-2 text-xs font-mono rounded-[2px] flex items-center gap-2 transition-colors ${
            activeTab === 'guessFirst'
              ? 'bg-[#1B1A17] text-[#F6F1E7]'
              : 'text-[#646059] hover:bg-[#EAE4D9]'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Mantiqiy taxmin (Guess-first)</span>
        </button>
      </div>

      {/* 1. CONFUSABLE PAIRS */}
      {activeTab === 'confusable' && (
        <div className="bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px] p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#E2DBD0] pb-3 text-xs font-mono">
            <span className="text-[#D9482B] font-semibold">{currentConfusable.pair}</span>
            <span className="text-[#646059]">
              {currentConfusableIdx + 1} / {confusableDrills.length}
            </span>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-serif text-[#1B1A17] leading-relaxed">
              {currentConfusable.question}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {currentConfusable.options.map((opt) => {
                const isSelected = selectedConfusableAnswer === opt;
                const isCorrect = opt === currentConfusable.correct;
                return (
                  <button
                    key={opt}
                    onClick={() => setSelectedConfusableAnswer(opt)}
                    className={`p-4 text-left font-serif text-lg border rounded-[2px] transition-colors ${
                      isSelected
                        ? isCorrect
                          ? 'bg-[#EDF3EC] border-[#4F6B4A] text-[#4F6B4A]'
                          : 'bg-[#F9EBE7] border-[#D9482B] text-[#D9482B]'
                        : 'bg-[#FAF7F2] border-[#E2DBD0] text-[#1B1A17] hover:border-[#1B1A17]'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedConfusableAnswer && (
            <div className="p-4 bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px] space-y-3 animate-in fade-in">
              <div className="text-xs font-mono font-semibold text-[#1B1A17]">
                {selectedConfusableAnswer === currentConfusable.correct
                  ? 'Toʻgʻri tanlov!'
                  : 'Notoʻgʻri javob.'}
              </div>
              <p className="text-sm font-sans text-[#646059]">{currentConfusable.explanationUz}</p>

              <button
                onClick={() => {
                  setSelectedConfusableAnswer(null);
                  setCurrentConfusableIdx((prev) => (prev + 1) % confusableDrills.length);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B1A17] text-[#F6F1E7] text-xs font-mono rounded-[2px] hover:bg-[#D9482B] transition-colors"
              >
                <span>Keyingi mashq</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. MORPHOLOGY LAB */}
      {activeTab === 'morphology' && (
        <div className="bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px] p-6 sm:p-8 space-y-6">
          <div className="border-b border-[#E2DBD0] pb-3 text-xs font-mono text-[#4F6B4A]">
            Baza soʻz: <strong>{currentMorph.base}</strong>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-serif text-[#1B1A17]">{currentMorph.question}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {currentMorph.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSelectedMorphAnswer(opt)}
                  className={`p-3 text-center font-mono text-sm border rounded-[2px] transition-colors ${
                    selectedMorphAnswer === opt
                      ? opt === currentMorph.correct
                        ? 'bg-[#EDF3EC] border-[#4F6B4A] text-[#4F6B4A]'
                        : 'bg-[#F9EBE7] border-[#D9482B] text-[#D9482B]'
                      : 'bg-[#FAF7F2] border-[#E2DBD0] text-[#1B1A17] hover:border-[#1B1A17]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {selectedMorphAnswer && (
            <div className="p-4 bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px] space-y-2">
              <div className="text-xs font-mono text-[#4F6B4A] font-semibold">Morfologik tahlil:</div>
              <p className="text-sm font-sans text-[#646059]">{currentMorph.affixInfo}</p>
              <button
                onClick={() => {
                  setSelectedMorphAnswer(null);
                  setMorphologyIdx((prev) => (prev + 1) % morphologyDrills.length);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1B1A17] text-[#F6F1E7] text-xs font-mono rounded-[2px] hover:bg-[#D9482B] transition-colors"
              >
                <span>Keyingi morfologiya</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. GUESS FIRST */}
      {activeTab === 'guessFirst' && (
        <div className="bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px] p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-serif font-bold text-[#1B1A17]">Mantiqiy taxmin rejimi</h2>
          <p className="text-sm text-[#646059]">
            Nomaʼlum soʻz kontekst va morfologik qismlari (affikslari) bilan koʻrsatiladi. Tarjimani ochishdan oldin uning maʼnosini mantiqan topishga harakat qiling.
          </p>
          <div className="p-4 bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px] text-sm font-serif">
            "The results were <strong>inconclusive</strong> due to insufficient test samples."
            <div className="text-xs font-mono text-[#646059] mt-2">
              Qismlari: in- (inkor) + conclude (xulosa qilmoq) + -ive (sifat qoʻshimchasi)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
