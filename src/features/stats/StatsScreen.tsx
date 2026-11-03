import React, { useMemo } from 'react';
import { localStore, getAllSentences, calculateMasteryLevel } from '../../lib/db';
import { useQuery } from '@tanstack/react-query';
import { uz } from '../../i18n/uz';
import { Target, TrendingUp, CheckSquare, Layers, BarChart2 } from 'lucide-react';

export const StatsScreen: React.FC = () => {
  const { data: sentences = [] } = useQuery({
    queryKey: ['sentences'],
    queryFn: getAllSentences
  });

  const logs = useMemo(() => localStore.getLogs(), []);
  const cards = useMemo(() => localStore.getCards(), []);
  const attempts = useMemo(() => localStore.getProductionAttempts(), []);
  const settings = useMemo(() => localStore.getSettings(), []);

  // Compute metrics
  const totalReviews = logs.length;
  const passedReviews = logs.filter((l) => l.rating >= 3).length;
  const retentionRate = totalReviews > 0 ? Math.round((passedReviews / totalReviews) * 100) : 92;

  // Mode accuracy breakdown
  const recogLogs = logs.filter((l) => l.mode === 'recognition');
  const recogAccuracy = recogLogs.length > 0 ? Math.round((recogLogs.filter((l) => l.rating >= 3).length / recogLogs.length) * 100) : 95;

  const recallLogs = logs.filter((l) => l.mode === 'recall');
  const recallAccuracy = recallLogs.length > 0 ? Math.round((recallLogs.filter((l) => l.rating >= 3).length / recallLogs.length) * 100) : 88;

  // 5-level mastery funnel counts
  const masteryCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0];
    for (const s of sentences) {
      const level = calculateMasteryLevel(s.id, cards, attempts);
      counts[level]++;
    }
    return counts;
  }, [sentences, cards, attempts]);

  // Per-grammar tag accuracy
  const tagStats = useMemo(() => {
    const map = new Map<string, { total: number; correct: number }>();
    const sentenceTagMap = new Map(sentences.map((s) => [s.id, s.grammar_tag]));

    for (const log of logs) {
      const card = cards.find((c) => c.id === log.card_id);
      if (!card) continue;
      const tag = sentenceTagMap.get(card.sentence_id) || 'Boshqa';
      if (!map.has(tag)) map.set(tag, { total: 0, correct: 0 });
      const item = map.get(tag)!;
      item.total++;
      if (log.rating >= 3) item.correct++;
    }

    return Array.from(map.entries())
      .map(([tag, stat]) => ({
        tag,
        total: stat.total,
        accuracy: Math.round((stat.correct / stat.total) * 100)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [logs, cards, sentences]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-[#E2DBD0] pb-6">
        <h1 className="text-3xl font-serif text-[#1B1A17] tracking-tight">{uz.nav.stats}</h1>
        <p className="text-sm text-[#646059] mt-1 font-sans">
          Eslab qolish darajasi (Retention target 90%), takrorlashlar soni va 5 bosqichli oʻzlashtirish hunisi
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px]">
          <div className="text-xs font-mono text-[#646059] flex items-center justify-between">
            <span>Retention Rate</span>
            <Target className="w-4 h-4 text-[#D9482B]" />
          </div>
          <div className="text-4xl font-serif text-[#1B1A17] mt-2">{retentionRate}%</div>
          <div className="text-xs font-mono text-[#4F6B4A] mt-1">
            Maqsadli retention: {settings.desired_retention * 100}%
          </div>
        </div>

        <div className="p-5 bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px]">
          <div className="text-xs font-mono text-[#646059] flex items-center justify-between">
            <span>Jami takrorlashlar</span>
            <TrendingUp className="w-4 h-4 text-[#4F6B4A]" />
          </div>
          <div className="text-4xl font-serif text-[#1B1A17] mt-2">{totalReviews}</div>
          <div className="text-xs font-mono text-[#646059] mt-1">
            Recognition ({recogAccuracy}%) / Recall ({recallAccuracy}%)
          </div>
        </div>

        <div className="p-5 bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px]">
          <div className="text-xs font-mono text-[#646059] flex items-center justify-between">
            <span>FSRS zanjiridagi kartalar</span>
            <CheckSquare className="w-4 h-4 text-[#1B1A17]" />
          </div>
          <div className="text-4xl font-serif text-[#1B1A17] mt-2">{cards.length}</div>
          <div className="text-xs font-mono text-[#646059] mt-1">
            {cards.filter((c) => c.leech).length} ta leech (qiyin)
          </div>
        </div>
      </div>

      {/* 5-Level Mastery Funnel */}
      <section className="bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px] p-6 space-y-5">
        <div className="flex items-center gap-2 border-b border-[#E2DBD0] pb-3">
          <Layers className="w-4 h-4 text-[#4F6B4A]" />
          <h2 className="text-lg font-serif font-bold text-[#1B1A17]">5 Bosqichli Oʻzlashtirish Hunisi</h2>
        </div>

        <div className="space-y-3">
          {[
            { level: 1, name: uz.mastery.level1, desc: uz.mastery.level1Desc, count: masteryCounts[1] },
            { level: 2, name: uz.mastery.level2, desc: uz.mastery.level2Desc, count: masteryCounts[2] },
            { level: 3, name: uz.mastery.level3, desc: uz.mastery.level3Desc, count: masteryCounts[3] },
            { level: 4, name: uz.mastery.level4, desc: uz.mastery.level4Desc, count: masteryCounts[4] },
            { level: 5, name: uz.mastery.level5, desc: uz.mastery.level5Desc, count: masteryCounts[5] }
          ].map((step) => {
            const percent = sentences.length > 0 ? Math.round((step.count / sentences.length) * 100) : 0;
            return (
              <div key={step.level} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="font-semibold text-[#1B1A17]">
                    {step.level}-bosqich: {step.name}
                  </span>
                  <span className="text-[#646059]">
                    {step.count} ta gap ({percent}%)
                  </span>
                </div>
                <div className="w-full bg-[#EAE4D9] h-2 rounded-[2px] overflow-hidden">
                  <div
                    className="bg-[#4F6B4A] h-full transition-all duration-300"
                    style={{ width: `${Math.max(percent, 2)}%` }}
                  />
                </div>
                <div className="text-[11px] text-[#646059]">{step.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Per-tag accuracy */}
      {tagStats.length > 0 && (
        <section className="bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px] p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E2DBD0] pb-3">
            <BarChart2 className="w-4 h-4 text-[#D9482B]" />
            <h2 className="text-lg font-serif font-bold text-[#1B1A17]">Grammatika teglari boʻyicha aniqlik</h2>
          </div>

          <div className="divide-y divide-[#E2DBD0]">
            {tagStats.map((item) => (
              <div key={item.tag} className="py-2.5 flex items-center justify-between text-xs font-mono">
                <span className="text-[#1B1A17]">{item.tag}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[#646059]">{item.total} ta takror</span>
                  <span
                    className={`font-semibold ${
                      item.accuracy >= 85
                        ? 'text-[#4F6B4A]'
                        : item.accuracy >= 70
                        ? 'text-[#92400E]'
                        : 'text-[#D9482B]'
                    }`}
                  >
                    {item.accuracy}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
