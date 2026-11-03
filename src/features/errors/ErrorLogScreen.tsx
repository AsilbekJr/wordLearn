import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { localStore, getAllSentences } from '../../lib/db';
import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '../../stores/session.store';
import { buildStudyQueue } from '../../lib/queue';
import { uz } from '../../i18n/uz';
import { AlertCircle, RotateCcw, Trash2 } from 'lucide-react';

export const ErrorLogScreen: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [errors, setErrors] = useState(localStore.getErrorLog());

  const { data: sentences = [] } = useQuery({
    queryKey: ['sentences'],
    queryFn: getAllSentences
  });

  const settings = useMemo(() => localStore.getSettings(), []);
  const initSession = useSessionStore((state) => state.initSession);

  // Group errors by grammar tag
  const groupedErrors = useMemo(() => {
    const map = new Map<string, typeof errors>();
    for (const err of errors) {
      const tag = err.grammar_tag || 'Boshqa';
      if (!map.has(tag)) map.set(tag, []);
      map.get(tag)!.push(err);
    }
    return map;
  }, [errors]);

  const distinctTags = useMemo(() => Array.from(groupedErrors.keys()), [groupedErrors]);

  const filteredErrors = useMemo(() => {
    if (selectedTag === 'all') return errors;
    return errors.filter((e) => e.grammar_tag === selectedTag);
  }, [errors, selectedTag]);

  const handleRetestTag = (tag: string) => {
    const matchingSentences = sentences.filter((s) => s.grammar_tag === tag);
    if (matchingSentences.length === 0) return;

    const cards = localStore.getCards();
    const queue = buildStudyQueue(matchingSentences, cards, {
      settings: { ...settings, new_per_day: 15, max_reviews_per_day: 30 }
    });

    if (queue.length > 0) {
      initSession(queue);
      navigate('/study');
    } else {
      alert(`"${tag}" mavzusida hozircha oʻrganilmagan kartalar mavjud emas.`);
    }
  };

  const handleClearErrors = () => {
    if (window.confirm('Haqiqatan ham barcha xatolar tarixini tozalamoqchimisiz?')) {
      try {
        localStorage.removeItem('linguist_error_log_v1');
        setErrors([]);
      } catch (e) {
        console.warn(e);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-[#E2DBD0] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-[#1B1A17] tracking-tight">{uz.errorLog.title}</h1>
          <p className="text-sm text-[#646059] mt-1 font-sans">{uz.errorLog.subtitle}</p>
        </div>
        {errors.length > 0 && (
          <button
            onClick={handleClearErrors}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#D9482B] hover:text-[#b3351d] transition-colors self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Tozalash</span>
          </button>
        )}
      </div>

      {/* Filter by Tag */}
      {distinctTags.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <span className="text-xs font-mono text-[#646059] shrink-0">Filtr:</span>
          <button
            onClick={() => setSelectedTag('all')}
            className={`px-2.5 py-1 text-xs font-mono rounded-[2px] transition-colors whitespace-nowrap ${
              selectedTag === 'all'
                ? 'bg-[#1B1A17] text-[#F6F1E7]'
                : 'bg-[#FFFFFF] border border-[#E2DBD0] text-[#646059] hover:border-[#1B1A17]'
            }`}
          >
            Barchasi ({errors.length})
          </button>
          {distinctTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-2.5 py-1 text-xs font-mono rounded-[2px] transition-colors whitespace-nowrap ${
                selectedTag === tag
                  ? 'bg-[#D9482B] text-[#FFFFFF]'
                  : 'bg-[#FFFFFF] border border-[#E2DBD0] text-[#646059] hover:border-[#D9482B]'
              }`}
            >
              {tag} ({groupedErrors.get(tag)?.length})
            </button>
          ))}
        </div>
      )}

      {/* Error Items List */}
      {filteredErrors.length === 0 ? (
        <div className="py-16 bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px] text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#EDF3EC] border border-[#B7D2B3] flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-[#4F6B4A]" />
          </div>
          <h2 className="text-xl font-serif text-[#1B1A17]">{uz.errorLog.empty}</h2>
          <p className="text-xs font-mono text-[#646059] max-w-sm mx-auto">
            Mashgʻulot paytida noaniq javob berilgan kartalar shu yerda jamlanadi.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#E2DBD0] bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px]">
          {filteredErrors.map((err) => (
            <div
              key={err.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAF7F2] transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#D9482B] bg-[#F9EBE7] px-2 py-0.5 rounded-[2px] border border-[#F2C8C0]">
                    {err.grammar_tag}
                  </span>
                  <span className="text-[11px] font-mono text-[#646059]">
                    {new Date(err.created_at).toLocaleDateString('uz-UZ')}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-serif">
                    <span className="text-xs font-mono text-[#D9482B] mr-2">Xato:</span>
                    <span className="line-through text-[#646059]">{err.wrong}</span>
                  </div>
                  <div className="text-base font-serif text-[#1B1A17]">
                    <span className="text-xs font-mono text-[#4F6B4A] mr-2">Toʻgʻri:</span>
                    <strong>{err.correct}</strong>
                  </div>
                </div>
              </div>

              <div className="shrink-0 self-end sm:self-center">
                <button
                  onClick={() => handleRetestTag(err.grammar_tag)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#1B1A17] hover:text-[#F6F1E7] border border-[#E2DBD0] text-[#1B1A17] text-xs font-mono rounded-[2px] transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Qayta mashq</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
