import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllSentences, localStore, getSentenceReviewStats } from '../../lib/db';
import { buildStudyQueue } from '../../lib/queue';
import { useSessionStore } from '../../stores/session.store';
import { checkAnswer, CheckResult } from '../../lib/answerCheck';
import { generateCloze, ClozeItem } from '../../lib/cloze';
import { uz } from '../../i18n/uz';
import { Volume2, RotateCcw, ArrowLeft, Check, Mic, MicOff } from 'lucide-react';
import { playTtsAudio } from '../../lib/tts';

export const StudyScreen: React.FC = () => {
  const { data: sentences = [] } = useQuery({
    queryKey: ['sentences'],
    queryFn: getAllSentences
  });

  const cards = useMemo(() => localStore.getCards(), []);
  const settings = useMemo(() => localStore.getSettings(), []);

  const {
    queue,
    currentIndex,
    isRevealed,
    draftAnswer,
    history,
    cardStartTime,
    lastGraduatedNotice,
    initSession,
    reveal,
    setDraftAnswer,
    submitRating,
    dismissGraduatedNotice,
    undoLast
  } = useSessionStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Initialize queue if empty
  useEffect(() => {
    if (sentences.length > 0 && queue.length === 0) {
      const builtQueue = buildStudyQueue(sentences, cards, { settings });
      initSession(builtQueue);
    }
  }, [sentences, cards, settings, queue.length, initSession]);

  const currentItem = queue[currentIndex];
  const isFinished = queue.length > 0 && currentIndex >= queue.length;
  const mode = currentItem?.card.mode || 'recognition';

  const currentSentenceStats = useMemo(() => {
    if (!currentItem) return null;
    return getSentenceReviewStats(currentItem.sentence.id, cards);
  }, [currentItem, cards]);

  // Compute cloze item if in cloze mode
  const clozeItem: ClozeItem | null = useMemo(() => {
    if (mode !== 'cloze' || !currentItem) return null;
    return generateCloze(currentItem.sentence.gap, currentItem.sentence.grammar_tag);
  }, [mode, currentItem]);

  // Compute answer check for typed modes (recall, cloze, dictation, transform)
  const checkResult: CheckResult | null = useMemo(() => {
    if (!isRevealed || !currentItem) return null;
    const duration = Date.now() - cardStartTime;

    if (mode === 'cloze' && clozeItem) {
      return checkAnswer(draftAnswer, clozeItem.blank, duration);
    }

    if (mode === 'recall' || mode === 'dictation' || mode === 'speaking') {
      return checkAnswer(draftAnswer, currentItem.sentence.gap, duration);
    }

    return null;
  }, [mode, isRevealed, currentItem, clozeItem, draftAnswer, cardStartTime]);

  // Auto-play audio in dictation mode on card load
  useEffect(() => {
    if (mode === 'dictation' && currentItem && !isRevealed) {
      playTtsAudio(currentItem.sentence.gap, currentItem.sentence.audio_path);
    }
  }, [mode, currentItem, isRevealed]);

  // Focus input when moving to a new card in typed modes
  useEffect(() => {
    if (['recall', 'cloze', 'dictation'].includes(mode) && !isRevealed && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, mode, isRevealed]);

  // Speech Recognition (Web Speech API STT)
  const handleToggleStt = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Brauzeringiz ovoz bilan kiritishni (Web Speech API) qoʻllab-quvvatlamaydi.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setDraftAnswer(transcript);
        setIsRecording(false);
        reveal();
      };

      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping = document.activeElement === inputRef.current && !isRevealed;

      if (e.key === 'r' || e.key === 'R') {
        if (!isTyping && currentItem) {
          e.preventDefault();
          playTtsAudio(currentItem.sentence.gap, currentItem.sentence.audio_path);
        }
        return;
      }

      if (e.key === 'u' || e.key === 'U') {
        if (!isTyping && history.length > 0) {
          e.preventDefault();
          undoLast();
        }
        return;
      }

      if (e.code === 'Space') {
        if (!isRevealed && !isTyping) {
          e.preventDefault();
          reveal();
          if (currentItem) {
            playTtsAudio(currentItem.sentence.gap, currentItem.sentence.audio_path);
          }
        }
        return;
      }

      if (e.key === 'Enter') {
        if (!isRevealed) {
          e.preventDefault();
          reveal();
          if (currentItem) {
            playTtsAudio(currentItem.sentence.gap, currentItem.sentence.audio_path);
          }
        } else if (checkResult) {
          e.preventDefault();
          submitRating(checkResult.suggestedRating, settings.desired_retention);
        }
        return;
      }

      if (isRevealed) {
        if (e.key === '1') {
          e.preventDefault();
          submitRating(1, settings.desired_retention);
        } else if (e.key === '2') {
          e.preventDefault();
          submitRating(2, settings.desired_retention);
        } else if (e.key === '3') {
          e.preventDefault();
          submitRating(3, settings.desired_retention);
        } else if (e.key === '4') {
          e.preventDefault();
          submitRating(4, settings.desired_retention);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRevealed, currentItem, checkResult, history.length, settings.desired_retention, reveal, submitRating, undoLast]);

  if (queue.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-serif text-[#1B1A17]">{uz.today.emptyQueue}</h2>
        <p className="text-xs font-mono text-[#646059]">Barcha kartalar oʻzlashtirilgan yoki navbat tugagan.</p>
        <Link
          to="/"
          className="inline-block mt-4 text-xs font-mono px-5 py-2.5 bg-[#1B1A17] text-[#F6F1E7] rounded-[2px] hover:bg-[#D9482B] transition-colors"
        >
          {uz.study.backToDashboard}
        </Link>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-12 h-12 mx-auto rounded-full bg-[#EDF3EC] border border-[#B7D2B3] flex items-center justify-center">
          <Check className="w-6 h-6 text-[#4F6B4A]" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-serif text-[#1B1A17]">{uz.study.finish}</h1>
          <p className="text-sm text-[#646059] font-sans">
            Bugungi navbatdagi {queue.length} ta mashq toʻliq bajarildi.
          </p>
        </div>
        <div>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-[#1B1A17] hover:bg-[#D9482B] text-[#F6F1E7] text-sm font-medium rounded-[2px] transition-colors"
          >
            {uz.study.backToDashboard}
          </Link>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round((currentIndex / queue.length) * 100);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col min-h-[calc(100vh-6rem)] justify-between">
      {/* Top Session Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-mono text-[#646059]">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-[#1B1A17]">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Chiqish</span>
          </Link>
          <div className="flex items-center gap-3">
            <span>
              {currentIndex + 1} / {queue.length}
            </span>
            {history.length > 0 && (
              <button
                onClick={undoLast}
                title={uz.study.undo}
                className="inline-flex items-center gap-1 text-[#D9482B] hover:underline"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Qaytarish (U)</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Hairline Bar */}
        <div className="w-full bg-[#E2DBD0] h-1 rounded-full overflow-hidden">
          <div
            className="bg-[#1B1A17] h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Study Card */}
      <div className="my-auto py-6">
        {/* Graduated to Mastered Notification */}
        {lastGraduatedNotice && (
          <div className="mb-4 p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-[3px] flex items-center justify-between gap-3 text-xs font-mono text-[#065F46] animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-base">🎉</span>
              <span>
                <strong>"Yodlandi"</strong> darajasiga oʻtdi! (Interval: {lastGraduatedNotice.interval} kun).
                Keyingi takrorlash 3 haftadan soʻng.
              </span>
            </div>
            <button
              onClick={dismissGraduatedNotice}
              className="px-2.5 py-1 bg-[#FFFFFF] border border-[#A7F3D0] rounded-[2px] hover:bg-[#A7F3D0] text-[#065F46] shrink-0"
            >
              Yopish
            </button>
          </div>
        )}

        <div className="bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px] p-6 sm:p-10 space-y-6 shadow-sm">
          {/* Tags Header */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-[#EAE4D9] text-[#646059] rounded-[2px]">
                {uz.library.weekNumber(currentItem.sentence.week)}
              </span>
              <span className="px-2 py-0.5 bg-[#EDF3EC] text-[#4F6B4A] border border-[#B7D2B3] rounded-[2px]">
                {currentItem.sentence.grammar_tag}
              </span>
              {currentSentenceStats && (
                <span className="px-2 py-0.5 bg-[#FAF7F2] border border-[#E2DBD0] text-[#646059] rounded-[2px]">
                  {uz.mastery.repsCount(currentSentenceStats.totalReps)}
                  {currentSentenceStats.maxScheduledDays > 0 &&
                    ` • Interval: ${currentSentenceStats.maxScheduledDays} kun`}
                </span>
              )}
              {currentSentenceStats?.isMastered && (
                <span className="px-2 py-0.5 bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] rounded-[2px] font-semibold">
                  ✓ {uz.mastery.masteredTag}
                </span>
              )}
            </div>
            <span className="px-2 py-0.5 bg-[#FAF7F2] border border-[#E2DBD0] text-[#646059] rounded-[2px] font-semibold">
              {uz.modes[mode]}
            </span>
          </div>

          {/* Prompt Section by Mode */}
          <div className="space-y-4">
            {/* 1. CLOZE MODE */}
            {mode === 'cloze' && clozeItem && (
              <div className="space-y-6">
                <div>
                  <div className="text-xs font-mono text-[#646059] uppercase tracking-wider mb-2">
                    Boʻsh joyni toʻldiring:
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-serif text-[#1B1A17] leading-relaxed">
                    {clozeItem.clozeSentence}
                  </h2>
                  <p className="text-sm text-[#646059] mt-2 italic font-sans">
                    Tarjimasi: {currentItem.sentence.tarjima}
                  </p>
                </div>

                {!isRevealed ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      reveal();
                      playTtsAudio(currentItem.sentence.gap, currentItem.sentence.audio_path);
                    }}
                    className="space-y-3"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={draftAnswer}
                      onChange={(e) => setDraftAnswer(e.target.value)}
                      placeholder="Tushirib qoldirilgan qismni yozing..."
                      className="w-full bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px] p-3 text-base font-serif text-[#1B1A17] focus:outline-none focus:border-[#D9482B]"
                      autoFocus
                    />
                    <div className="flex justify-between items-center text-xs font-mono text-[#646059]">
                      <span>Enter: Tekshirish</span>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#1B1A17] text-[#F6F1E7] rounded-[2px] text-xs font-medium hover:bg-[#D9482B]"
                      >
                        {uz.study.submit}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="pt-4 border-t border-[#E2DBD0] space-y-2">
                    <div className="text-sm font-serif">
                      <span className="text-xs font-mono text-[#646059] mr-2">Toʻliq gap:</span>
                      <strong className="text-[#1B1A17]">{currentItem.sentence.gap}</strong>
                    </div>
                    <div className="text-sm font-mono text-[#4F6B4A]">
                      Tushirilgan soʻz: <u>{clozeItem.blank}</u>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. DICTATION MODE */}
            {mode === 'dictation' && (
              <div className="space-y-6">
                <div>
                  <div className="text-xs font-mono text-[#646059] uppercase tracking-wider mb-2">
                    Diktant (faqat ovoz orqali tinglang va yozing):
                  </div>
                  <div className="flex items-center gap-3 py-4">
                    <button
                      onClick={() => playTtsAudio(currentItem.sentence.gap, currentItem.sentence.audio_path)}
                      className="px-4 py-2.5 bg-[#FAF7F2] border border-[#E2DBD0] text-[#1B1A17] rounded-[2px] flex items-center gap-2 hover:border-[#D9482B] transition-colors"
                    >
                      <Volume2 className="w-5 h-5 text-[#D9482B]" />
                      <span className="text-xs font-mono">Qayta eshitish (R)</span>
                    </button>
                  </div>
                </div>

                {!isRevealed ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      reveal();
                    }}
                    className="space-y-3"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={draftAnswer}
                      onChange={(e) => setDraftAnswer(e.target.value)}
                      placeholder="Eshitgan gapingizni yozing..."
                      className="w-full bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px] p-3 text-base font-serif text-[#1B1A17] focus:outline-none focus:border-[#D9482B]"
                      autoFocus
                    />
                    <div className="flex justify-between items-center text-xs font-mono text-[#646059]">
                      <span>Enter: Tekshirish</span>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#1B1A17] text-[#F6F1E7] rounded-[2px] text-xs font-medium hover:bg-[#D9482B]"
                      >
                        {uz.study.submit}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="pt-4 border-t border-[#E2DBD0] space-y-2">
                    <div className="text-lg font-serif text-[#1B1A17]">
                      {currentItem.sentence.gap}
                    </div>
                    <div className="text-sm text-[#646059]">{currentItem.sentence.tarjima}</div>
                  </div>
                )}
              </div>
            )}

            {/* 3. SPEAKING MODE */}
            {mode === 'speaking' && (
              <div className="space-y-6">
                <div>
                  <div className="text-xs font-mono text-[#646059] uppercase tracking-wider mb-2">
                    Gapirish mashqi (Oʻzbekcha maʼnoni ovoz bilan inglizcha ayting):
                  </div>
                  <h2 className="text-2xl font-serif text-[#1B1A17] leading-relaxed">
                    {currentItem.sentence.tarjima}
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleToggleStt}
                    className={`px-4 py-2.5 rounded-[2px] flex items-center gap-2 border transition-colors ${
                      isRecording
                        ? 'bg-[#F9EBE7] border-[#D9482B] text-[#D9482B] animate-pulse'
                        : 'bg-[#1B1A17] text-[#F6F1E7] hover:bg-[#D9482B]'
                    }`}
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span className="text-xs font-mono">
                      {isRecording ? uz.study.micListening : uz.study.micStart}
                    </span>
                  </button>
                </div>

                {draftAnswer && (
                  <div className="p-3 bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px] text-sm font-serif">
                    <span className="text-xs font-mono text-[#646059] block mb-1">Eshitilgan nutq:</span>
                    {draftAnswer}
                  </div>
                )}

                {isRevealed && (
                  <div className="pt-4 border-t border-[#E2DBD0] space-y-2">
                    <div className="text-xs font-mono text-[#646059]">Toʻgʻri shakl:</div>
                    <div className="text-xl font-serif text-[#1B1A17]">{currentItem.sentence.gap}</div>
                  </div>
                )}
              </div>
            )}

            {/* 4. RECALL MODE */}
            {mode === 'recall' && (
              <div className="space-y-6">
                <div>
                  <div className="text-xs font-mono text-[#646059] uppercase tracking-wider mb-1">
                    Oʻzbekcha maʼnosi:
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-serif text-[#1B1A17] leading-relaxed">
                    {currentItem.sentence.tarjima}
                  </h2>
                </div>

                {!isRevealed ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      reveal();
                      playTtsAudio(currentItem.sentence.gap, currentItem.sentence.audio_path);
                    }}
                    className="space-y-3"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={draftAnswer}
                      onChange={(e) => setDraftAnswer(e.target.value)}
                      placeholder={uz.study.yourAnswerPlaceholder}
                      className="w-full bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px] p-3.5 text-lg font-serif text-[#1B1A17] focus:outline-none focus:border-[#D9482B] transition-colors"
                      autoFocus
                    />
                    <div className="flex justify-between items-center text-xs font-mono text-[#646059]">
                      <span>Enter: Tekshirish</span>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#1B1A17] hover:bg-[#D9482B] text-[#F6F1E7] rounded-[2px] font-medium text-xs transition-colors"
                      >
                        {uz.study.submit}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4 pt-4 border-t border-[#E2DBD0]">
                    {checkResult && (
                      <div className="p-4 bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px] space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-semibold text-[#1B1A17]">
                            Natija:{' '}
                            <span
                              className={
                                checkResult.verdict === 'exact' || checkResult.verdict === 'accepted'
                                  ? 'text-[#4F6B4A]'
                                  : checkResult.verdict === 'near'
                                  ? 'text-[#92400E]'
                                  : 'text-[#D9482B]'
                              }
                            >
                              {checkResult.verdict === 'exact'
                                ? 'Toʻliq toʻgʻri'
                                : checkResult.verdict === 'accepted'
                                ? 'Qabul qilindi (qisqartma)'
                                : checkResult.verdict === 'near'
                                ? 'Kichik xato'
                                : 'Notoʻgʻri'}
                            </span>
                          </span>
                          <span className="text-[#646059]">
                            Oʻxshashlik: {Math.round(checkResult.similarity * 100)}%
                          </span>
                        </div>

                        {draftAnswer && (
                          <div className="text-sm font-serif">
                            <span className="text-xs font-mono text-[#646059] mr-2">Siz yozdingiz:</span>
                            <span className="text-[#646059]">{draftAnswer}</span>
                          </div>
                        )}

                        <div className="text-lg font-serif text-[#1B1A17]">
                          <span className="text-xs font-mono text-[#646059] mr-2 block sm:inline">
                            Toʻgʻri javob:
                          </span>
                          <strong>{currentItem.sentence.gap}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 5. RECOGNITION (DEFAULT) */}
            {mode === 'recognition' && (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-3xl sm:text-4xl font-serif text-[#1B1A17] leading-snug">
                    {currentItem.sentence.gap}
                  </h1>
                  <button
                    onClick={() => playTtsAudio(currentItem.sentence.gap, currentItem.sentence.audio_path)}
                    title={uz.study.playAudio}
                    className="p-3 text-[#1B1A17] hover:text-[#D9482B] hover:bg-[#FAF7F2] rounded-[2px] border border-[#E2DBD0] transition-colors shrink-0"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>

                {!isRevealed ? (
                  <div className="pt-8 text-center">
                    <button
                      onClick={() => {
                        reveal();
                        playTtsAudio(currentItem.sentence.gap, currentItem.sentence.audio_path);
                      }}
                      className="w-full sm:w-auto px-8 py-3 bg-[#1B1A17] hover:bg-[#D9482B] text-[#F6F1E7] text-sm font-medium rounded-[2px] transition-colors"
                    >
                      {uz.study.reveal}
                    </button>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-[#E2DBD0] space-y-2">
                    <div className="text-xs font-mono text-[#646059] uppercase tracking-wider">
                      Oʻzbekcha tarjimasi:
                    </div>
                    <p className="text-xl font-sans text-[#1B1A17] leading-relaxed">
                      {currentItem.sentence.tarjima}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Rating Controls */}
      <div className="pt-4 border-t border-[#E2DBD0]">
        {isRevealed ? (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              <button
                onClick={() => submitRating(1, settings.desired_retention)}
                className="p-3 sm:py-3.5 bg-[#FFFFFF] hover:bg-[#F9EBE7] border border-[#E2DBD0] hover:border-[#D9482B] rounded-[2px] flex flex-col items-center justify-center transition-colors group"
              >
                <span className="text-xs sm:text-sm font-semibold text-[#D9482B] group-hover:scale-105 transition-transform">
                  {uz.ratings.again}
                </span>
                <span className="text-[10px] font-mono text-[#646059] mt-0.5">1-tugma</span>
              </button>

              <button
                onClick={() => submitRating(2, settings.desired_retention)}
                className="p-3 sm:py-3.5 bg-[#FFFFFF] hover:bg-[#FEF3C7] border border-[#E2DBD0] hover:border-[#F59E0B] rounded-[2px] flex flex-col items-center justify-center transition-colors group"
              >
                <span className="text-xs sm:text-sm font-semibold text-[#92400E] group-hover:scale-105 transition-transform">
                  {uz.ratings.hard}
                </span>
                <span className="text-[10px] font-mono text-[#646059] mt-0.5">2-tugma</span>
              </button>

              <button
                onClick={() => submitRating(3, settings.desired_retention)}
                className="p-3 sm:py-3.5 bg-[#FFFFFF] hover:bg-[#EDF3EC] border border-[#E2DBD0] hover:border-[#4F6B4A] rounded-[2px] flex flex-col items-center justify-center transition-colors group"
              >
                <span className="text-xs sm:text-sm font-semibold text-[#4F6B4A] group-hover:scale-105 transition-transform">
                  {uz.ratings.good}
                </span>
                <span className="text-[10px] font-mono text-[#646059] mt-0.5">3-tugma</span>
              </button>

              <button
                onClick={() => submitRating(4, settings.desired_retention)}
                className="p-3 sm:py-3.5 bg-[#FFFFFF] hover:bg-[#E0E7FF] border border-[#E2DBD0] hover:border-[#3730A3] rounded-[2px] flex flex-col items-center justify-center transition-colors group"
              >
                <span className="text-xs sm:text-sm font-semibold text-[#3730A3] group-hover:scale-105 transition-transform">
                  {uz.ratings.easy}
                </span>
                <span className="text-[10px] font-mono text-[#646059] mt-0.5">4-tugma</span>
              </button>
            </div>
            <div className="text-center text-[11px] font-mono text-[#646059]">
              {uz.ratings.keysHint} | R: Ovozni eshitish
            </div>
          </div>
        ) : (
          <div className="text-center text-xs font-mono text-[#646059] py-2">
            Boʻsh joy (Space) yoki Enter bosib javobni oching
          </div>
        )}
      </div>
    </div>
  );
};
