import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllSentences, localStore, getSentenceReviewStats } from '../../lib/db';
import { uz } from '../../i18n/uz';
import { Flame, Play, Sparkles, Bell, CheckCircle2, Clock } from 'lucide-react';

export const TodayScreen: React.FC = () => {
  const { data: sentences = [] } = useQuery({
    queryKey: ['sentences'],
    queryFn: getAllSentences
  });

  const cards = useMemo(() => localStore.getCards(), []);
  const settings = useMemo(() => localStore.getSettings(), []);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleRequestNotification = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        new Notification('Linguist AI — Kunlik Eslatma', {
          body: `Bugun takrorlanishi kerak boʻlgan ${dueCards.length} ta gap mavjud. Muvaffaqiyatli mashgʻulot tilaymiz!`,
          icon: '/favicon.ico'
        });
      }
    }
  };

  // Compute due reviews vs new quota
  const now = new Date();
  const dueCards = cards.filter((c) => !c.suspended && new Date(c.due) <= now);
  const reviewedTodayCount = localStore
    .getLogs()
    .filter((l) => new Date(l.reviewed_at).toDateString() === now.toDateString()).length;

  const newCardsQuota = Math.max(0, settings.new_per_day - reviewedTodayCount);

  // Group sentences due today for specific reminders
  const dueSentences = useMemo(() => {
    const dueSentenceIds = new Set(dueCards.map((c) => c.sentence_id));
    return sentences.filter((s) => dueSentenceIds.has(s.id));
  }, [sentences, dueCards]);

  // Mastered sentences count (interval >= 21 days)
  const masteredCount = useMemo(() => {
    return sentences.filter((s) => {
      const stats = getSentenceReviewStats(s.id, cards);
      return stats.isMastered;
    }).length;
  }, [sentences, cards]);

  // Pick 3 target items for the Daily Mission
  const dailyMissionItems = useMemo(() => {
    if (sentences.length === 0) return [];
    const daySeed = now.getFullYear() * 1000 + (now.getMonth() + 1) * 50 + now.getDate();
    return [
      sentences[daySeed % sentences.length],
      sentences[(daySeed + 7) % sentences.length],
      sentences[(daySeed + 13) % sentences.length]
    ].filter(Boolean);
  }, [sentences, now]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Top Welcome Card */}
      <section className="border-b border-[#E2DBD0] pb-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-mono text-[#D9482B] tracking-wider uppercase font-semibold">
              {uz.today.title}
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif text-[#1B1A17] tracking-tight">
              {uz.today.greeting}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-[#FAF7F2] border border-[#E2DBD0] text-xs font-mono text-[#1B1A17]">
            <Flame className="w-4 h-4 text-[#D9482B]" />
            <span>{uz.today.streak(12)}</span>
          </div>
        </div>

        {/* Due Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
          <div className="p-4 bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px]">
            <div className="text-xs font-mono text-[#646059]">{uz.today.dueCards}</div>
            <div className="text-3xl font-serif text-[#D9482B] mt-1">{dueCards.length}</div>
            <div className="text-[11px] font-mono text-[#646059] mt-0.5">Intervali kelgan</div>
          </div>

          <div className="p-4 bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px]">
            <div className="text-xs font-mono text-[#646059]">{uz.today.newCards}</div>
            <div className="text-3xl font-serif text-[#4F6B4A] mt-1">{newCardsQuota}</div>
            <div className="text-[11px] font-mono text-[#646059] mt-0.5">Kunlik kvota</div>
          </div>

          <div className="p-4 bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px]">
            <div className="text-xs font-mono text-[#646059]">Bugun takrorlandi</div>
            <div className="text-3xl font-serif text-[#1B1A17] mt-1">{reviewedTodayCount}</div>
            <div className="text-[11px] font-mono text-[#646059] mt-0.5">Bajarilgan</div>
          </div>

          <div className="p-4 bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px]">
            <div className="text-xs font-mono text-[#646059]">Yodlangan gaplar</div>
            <div className="text-3xl font-serif text-[#065F46] mt-1">{masteredCount}</div>
            <div className="text-[11px] font-mono text-[#065F46] mt-0.5">Interval ≥ 21 kun</div>
          </div>
        </div>

        {/* Primary Action Button & Notification Toggle */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            to="/study"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-[#1B1A17] hover:bg-[#D9482B] text-[#F6F1E7] font-medium text-base rounded-[2px] transition-all shadow-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{uz.today.startSession}</span>
          </Link>

          {notificationPermission !== 'granted' ? (
            <button
              onClick={handleRequestNotification}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#FAF7F2] hover:bg-[#EAE4D9] border border-[#E2DBD0] text-xs font-mono text-[#646059] rounded-[2px] transition-colors"
            >
              <Bell className="w-3.5 h-3.5 text-[#D9482B]" />
              <span>{uz.today.enableNotifications}</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#4F6B4A]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{uz.today.notificationsActive}</span>
            </div>
          )}
        </div>
      </section>

      {/* Kunlik takrorlanishi kerak boʻlgan gaplar roʻyxati (Reminders) */}
      <section className="p-6 bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px] space-y-4">
        <div className="flex items-start justify-between gap-4 border-b border-[#E2DBD0] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#D9482B]" />
              <h2 className="text-lg font-serif font-bold text-[#1B1A17]">{uz.today.dueReminderTitle}</h2>
            </div>
            <p className="text-xs text-[#646059] mt-1">{uz.today.dueReminderDesc}</p>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded-[2px] bg-[#F9EBE7] text-[#D9482B] border border-[#F2C8C0] font-semibold shrink-0">
            {dueSentences.length} ta gap
          </span>
        </div>

        {dueSentences.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-[#646059]">
            {uz.today.noDueToday}
          </div>
        ) : (
          <div className="divide-y divide-[#E2DBD0]">
            {dueSentences.slice(0, 5).map((item) => {
              const stats = getSentenceReviewStats(item.id, cards);
              return (
                <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#646059]">
                        {uz.library.weekNumber(item.week)}
                      </span>
                      <span className="text-xs font-mono px-1.5 py-0.2 bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px]">
                        {uz.mastery.repsCount(stats.totalReps)}
                      </span>
                      <span className="text-xs font-mono text-[#D9482B]">
                        Interval: {stats.maxScheduledDays} kun
                      </span>
                    </div>
                    <div className="font-serif text-base text-[#1B1A17] font-medium mt-1">
                      {item.gap}
                    </div>
                    <div className="text-xs font-sans text-[#646059] mt-0.5">{item.tarjima}</div>
                  </div>

                  <Link
                    to="/study"
                    className="shrink-0 self-start sm:self-auto px-3 py-1.5 text-xs font-mono bg-[#1B1A17] text-[#F6F1E7] hover:bg-[#D9482B] rounded-[2px] transition-colors"
                  >
                    Takrorlash
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Kunlik missiya (Daily Mission §8) */}
      <section className="p-6 bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px] space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D9482B]" />
              <h2 className="text-lg font-serif font-bold text-[#1B1A17]">{uz.today.dailyMission}</h2>
            </div>
            <p className="text-xs text-[#646059] mt-1">{uz.today.missionDesc}</p>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded-[2px] bg-[#EDF3EC] text-[#4F6B4A] border border-[#B7D2B3]">
            Level 5 Transfer
          </span>
        </div>

        <div className="divide-y divide-[#E2DBD0]">
          {dailyMissionItems.map((item, idx) => (
            <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-mono text-[#646059] mr-2">#{idx + 1}</span>
                <span className="font-serif text-base text-[#1B1A17] font-medium">{item.gap}</span>
                <div className="text-xs font-sans text-[#646059] mt-0.5">{item.tarjima}</div>
              </div>
              <button
                onClick={() => alert(`${uz.today.usedSuccess}: "${item.gap}"`)}
                className="shrink-0 self-start sm:self-auto px-3 py-1 text-xs font-mono text-[#4F6B4A] hover:bg-[#EDF3EC] border border-[#B7D2B3] rounded-[2px] transition-colors"
              >
                {uz.today.markUsed}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
