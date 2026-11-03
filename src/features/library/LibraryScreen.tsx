import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllSentences, localStore, calculateMasteryLevel, getSentenceReviewStats } from '../../lib/db';
import { uz } from '../../i18n/uz';
import { Search, Volume2, X, ChevronRight } from 'lucide-react';
import { playTtsAudio } from '../../lib/tts';

export const LibraryScreen: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentWeek = searchParams.get('week') || 'all';
  const currentTag = searchParams.get('tag') || 'all';
  const currentMastery = searchParams.get('mastery') || 'all';
  const currentSearch = searchParams.get('q') || '';

  const [searchInput, setSearchInput] = useState(currentSearch);

  // Sync search input with URL search params debounced or on submit
  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  const { data: sentences = [], isLoading } = useQuery({
    queryKey: ['sentences'],
    queryFn: getAllSentences
  });

  const cards = useMemo(() => localStore.getCards(), []);
  const attempts = useMemo(() => localStore.getProductionAttempts(), []);

  // Distinct weeks (1 to 15)
  const weeks = useMemo(() => {
    const set = new Set<number>();
    sentences.forEach((s) => set.add(s.week));
    return Array.from(set).sort((a, b) => a - b);
  }, [sentences]);

  // Distinct grammar tags
  const grammarTags = useMemo(() => {
    const set = new Set<string>();
    sentences.forEach((s) => {
      if (s.grammar_tag) set.add(s.grammar_tag);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [sentences]);

  // Handle filter changes
  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('q', searchInput.trim());
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
    setSearchInput('');
  };

  // Filter sentences
  const filteredSentences = useMemo(() => {
    return sentences.filter((s) => {
      if (currentWeek !== 'all' && s.week !== Number(currentWeek)) return false;
      if (currentTag !== 'all' && s.grammar_tag !== currentTag) return false;

      const mastery = calculateMasteryLevel(s.id, cards, attempts);
      if (currentMastery !== 'all' && mastery !== Number(currentMastery)) return false;

      if (currentSearch) {
        const query = currentSearch.toLowerCase();
        const inGap = s.gap.toLowerCase().includes(query);
        const inTarjima = s.tarjima.toLowerCase().includes(query);
        const inTag = s.grammar_tag.toLowerCase().includes(query);
        if (!inGap && !inTarjima && !inTag) return false;
      }

      return true;
    });
  }, [sentences, currentWeek, currentTag, currentMastery, currentSearch, cards, attempts]);

  const getMasteryBadge = (level: number) => {
    switch (level) {
      case 1:
        return <span className="text-[11px] font-mono px-2 py-0.5 rounded-[2px] bg-[#E8EFF7] text-[#2C5282] border border-[#CBD5E1]">{uz.mastery.level1}</span>;
      case 2:
        return <span className="text-[11px] font-mono px-2 py-0.5 rounded-[2px] bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">{uz.mastery.level2}</span>;
      case 3:
        return <span className="text-[11px] font-mono px-2 py-0.5 rounded-[2px] bg-[#E0E7FF] text-[#3730A3] border border-[#C7D2FE]">{uz.mastery.level3}</span>;
      case 4:
        return <span className="text-[11px] font-mono px-2 py-0.5 rounded-[2px] bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">{uz.mastery.level4}</span>;
      case 5:
        return <span className="text-[11px] font-mono px-2 py-0.5 rounded-[2px] bg-[#EDF3EC] text-[#4F6B4A] border border-[#B7D2B3] font-semibold">{uz.mastery.level5}</span>;
      default:
        return <span className="text-[11px] font-mono px-2 py-0.5 rounded-[2px] bg-[#F1EFEA] text-[#646059] border border-[#E2DBD0]">{uz.mastery.level0}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8 border-b border-[#E2DBD0] pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif text-[#1B1A17] tracking-tight">{uz.library.title}</h1>
            <p className="text-sm text-[#646059] mt-1 font-sans">{uz.library.subtitle}</p>
          </div>
          <div className="text-xs font-mono text-[#646059]">
            {uz.library.totalFound(filteredSentences.length)}
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="mt-6 space-y-4">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-[#646059] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={uz.library.searchPlaceholder}
              className="w-full bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px] pl-10 pr-24 py-2.5 text-sm text-[#1B1A17] placeholder-[#646059] focus:outline-none focus:border-[#D9482B] transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  updateFilter('q', '');
                }}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-xs text-[#646059] hover:text-[#1B1A17]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#1B1A17] text-[#F6F1E7] text-xs font-medium rounded-[2px] hover:bg-[#D9482B] transition-colors"
            >
              Qidirish
            </button>
          </form>

          {/* Filter bars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Week Filter */}
            <div>
              <label className="block text-[#646059] mb-1 font-medium">{uz.library.filterByWeek}</label>
              <select
                value={currentWeek}
                onChange={(e) => updateFilter('week', e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#E2DBD0] rounded-[2px] px-2.5 py-1.5 text-[#1B1A17] focus:outline-none focus:border-[#D9482B]"
              >
                <option value="all">{uz.library.allWeeks}</option>
                {weeks.map((w) => (
                  <option key={w} value={w}>
                    {uz.library.weekNumber(w)}
                  </option>
                ))}
              </select>
            </div>

            {/* Grammar Tag Filter */}
            <div>
              <label className="block text-[#646059] mb-1 font-medium">{uz.library.filterByTag}</label>
              <select
                value={currentTag}
                onChange={(e) => updateFilter('tag', e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#E2DBD0] rounded-[2px] px-2.5 py-1.5 text-[#1B1A17] focus:outline-none focus:border-[#D9482B]"
              >
                <option value="all">{uz.library.allTags}</option>
                {grammarTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            {/* Mastery Level Filter */}
            <div>
              <label className="block text-[#646059] mb-1 font-medium">{uz.library.filterByMastery}</label>
              <select
                value={currentMastery}
                onChange={(e) => updateFilter('mastery', e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#E2DBD0] rounded-[2px] px-2.5 py-1.5 text-[#1B1A17] focus:outline-none focus:border-[#D9482B]"
              >
                <option value="all">{uz.library.allMastery}</option>
                <option value="0">{uz.mastery.level0}</option>
                <option value="1">{uz.mastery.level1}</option>
                <option value="2">{uz.mastery.level2}</option>
                <option value="3">{uz.mastery.level3}</option>
                <option value="4">{uz.mastery.level4}</option>
                <option value="5">{uz.mastery.level5}</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips / Clear */}
          {(currentWeek !== 'all' || currentTag !== 'all' || currentMastery !== 'all' || currentSearch) && (
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="text-[#646059]">Faol filtrlar:</span>
              <button
                onClick={clearAllFilters}
                className="text-[#D9482B] underline font-medium hover:text-[#b3351d]"
              >
                {uz.library.resetFilters}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Week Quick Select Pills (15 weeks visible!) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-4 mb-6 border-b border-[#E2DBD0] no-scrollbar">
        <button
          onClick={() => updateFilter('week', 'all')}
          className={`px-3 py-1 text-xs font-mono rounded-[2px] whitespace-nowrap transition-colors ${
            currentWeek === 'all'
              ? 'bg-[#1B1A17] text-[#F6F1E7]'
              : 'bg-[#FFFFFF] border border-[#E2DBD0] text-[#646059] hover:border-[#1B1A17]'
          }`}
        >
          {uz.library.allWeeks}
        </button>
        {weeks.map((w) => (
          <button
            key={w}
            onClick={() => updateFilter('week', String(w))}
            className={`px-2.5 py-1 text-xs font-mono rounded-[2px] whitespace-nowrap transition-colors ${
              currentWeek === String(w)
                ? 'bg-[#D9482B] text-[#FFFFFF]'
                : 'bg-[#FFFFFF] border border-[#E2DBD0] text-[#646059] hover:border-[#D9482B]'
            }`}
          >
            W{w}
          </button>
        ))}
      </div>

      {/* Sentences List */}
      {isLoading ? (
        <div className="py-20 text-center text-[#646059] font-mono text-sm">{uz.common.loading}</div>
      ) : filteredSentences.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-[#E2DBD0] rounded-[4px] p-8">
          <p className="text-base font-serif text-[#1B1A17]">{uz.library.noResults}</p>
          <button
            onClick={clearAllFilters}
            className="mt-3 px-4 py-1.5 text-xs bg-[#1B1A17] text-[#F6F1E7] rounded-[2px] hover:bg-[#D9482B]"
          >
            {uz.library.resetFilters}
          </button>
        </div>
      ) : (
        <div className="divide-y divide-[#E2DBD0] border-t border-b border-[#E2DBD0]">
          {filteredSentences.map((s) => {
            const mastery = calculateMasteryLevel(s.id, cards, attempts);
            const stats = getSentenceReviewStats(s.id, cards);
            return (
              <div
                key={s.id}
                className="py-4 hover:bg-[#FAF7F2] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group px-2"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono text-[#646059] bg-[#EAE4D9] px-1.5 py-0.5 rounded-[2px]">
                      {uz.library.weekNumber(s.week)}
                    </span>
                    <span className="text-[11px] font-mono text-[#4F6B4A] bg-[#EDF3EC] px-1.5 py-0.5 rounded-[2px] border border-[#B7D2B3]">
                      {s.grammar_tag}
                    </span>
                    {getMasteryBadge(mastery)}
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-[2px] bg-[#FAF7F2] text-[#646059] border border-[#E2DBD0]">
                      {uz.mastery.repsCount(stats.totalReps)}
                    </span>
                    {stats.isDue && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-[2px] bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] font-semibold">
                        {uz.mastery.dueToday}
                      </span>
                    )}
                    {stats.isMastered && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-[2px] bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] font-semibold">
                        ✓ {uz.mastery.masteredTag} ({stats.maxScheduledDays} kun)
                      </span>
                    )}
                  </div>

                  {/* English sentence - HERO typography */}
                  <h3 className="text-xl font-serif text-[#1B1A17] leading-relaxed group-hover:text-[#D9482B] transition-colors">
                    {s.gap}
                  </h3>

                  {/* Uzbek translation */}
                  <p className="text-sm font-sans text-[#646059]">{s.tarjima}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => playTtsAudio(s.gap, s.audio_path)}
                    title={uz.study.playAudio}
                    className="p-2 text-[#646059] hover:text-[#1B1A17] hover:bg-[#EAE4D9] rounded-[2px] transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <Link
                    to={`/sentences/${s.id}`}
                    className="inline-flex items-center gap-1 text-xs font-mono text-[#1B1A17] hover:text-[#D9482B] border border-[#E2DBD0] hover:border-[#D9482B] px-2.5 py-1.5 rounded-[2px] transition-colors"
                  >
                    <span>{uz.library.viewDetails}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
