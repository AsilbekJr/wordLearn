import React, { useState, useMemo } from 'react';
import { localStore, ProductionAttempt } from '../../lib/db';
import { evaluateProductionSentence } from '../../lib/ai';
import { ProductionEvaluation } from '../../../supabase/functions/_shared/schemas';
import { uz } from '../../i18n/uz';
import { Sparkles, MessageSquare, Mic, PenTool, CheckCircle2, AlertTriangle, Send } from 'lucide-react';

export const ProductionLabScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'write' | 'roleplay' | 'speaking'>('write');
  const [learnerText, setLearnerText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<ProductionEvaluation | null>(null);

  // Roleplay chat state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'partner' | 'user'; text: string }>>([
    {
      sender: 'partner',
      text: "Hello! Welcome to the interview. Could you describe a project you have been working on recently?"
    }
  ]);
  const [roleplayInput, setRoleplayInput] = useState('');

  // Pick today's target structures
  const currentTargets = useMemo(() => {
    return ['have been working', 'in order to', 'highly recommended'];
  }, []);

  const situation = "Siz ish intervyusida soʻnggi loyihangiz va tajribangiz haqida gapirib beryapsiz.";

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!learnerText.trim() || isEvaluating) return;

    setIsEvaluating(true);
    try {
      const result = await evaluateProductionSentence({
        targets: currentTargets,
        situation,
        learnerText,
        channel: activeTab === 'speaking' ? 'spoken' : 'typed'
      });

      setEvaluation(result);

      // Save attempt to localStore
      const attempt: ProductionAttempt = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        user_id: 'default-learner-id',
        channel: activeTab === 'speaking' ? 'spoken' : 'typed',
        learner_text: learnerText,
        ai_verdict: result,
        created_at: new Date().toISOString()
      };
      localStore.addProductionAttempt(attempt);

      // Save errors to error_log
      if (result.errors && result.errors.length > 0) {
        for (const err of result.errors) {
          localStore.addErrorLog({
            id: Date.now() + Math.random(),
            user_id: 'default-learner-id',
            grammar_tag: err.type,
            wrong: err.wrong,
            correct: err.correct,
            error_type: err.type,
            created_at: new Date().toISOString()
          });
        }
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleRoleplaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleplayInput.trim()) return;

    const userMsg = roleplayInput.trim();
    setChatMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setRoleplayInput('');

    // Simulated partner response steering towards target
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'partner',
          text: "That sounds very interesting. How did you manage to solve the biggest performance bottlenecks?"
        }
      ]);
    }, 700);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-[#E2DBD0] pb-6">
        <h1 className="text-3xl font-serif text-[#1B1A17] tracking-tight">{uz.productionLab.title}</h1>
        <p className="text-sm text-[#646059] mt-1 font-sans">{uz.productionLab.subtitle}</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2DBD0] pb-2">
        <button
          onClick={() => setActiveTab('write')}
          className={`px-4 py-2 text-xs font-mono rounded-[2px] flex items-center gap-2 transition-colors ${
            activeTab === 'write'
              ? 'bg-[#1B1A17] text-[#F6F1E7]'
              : 'text-[#646059] hover:bg-[#EAE4D9]'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>{uz.productionLab.writeMode}</span>
        </button>

        <button
          onClick={() => setActiveTab('roleplay')}
          className={`px-4 py-2 text-xs font-mono rounded-[2px] flex items-center gap-2 transition-colors ${
            activeTab === 'roleplay'
              ? 'bg-[#1B1A17] text-[#F6F1E7]'
              : 'text-[#646059] hover:bg-[#EAE4D9]'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{uz.productionLab.roleplayMode}</span>
        </button>

        <button
          onClick={() => setActiveTab('speaking')}
          className={`px-4 py-2 text-xs font-mono rounded-[2px] flex items-center gap-2 transition-colors ${
            activeTab === 'speaking'
              ? 'bg-[#1B1A17] text-[#F6F1E7]'
              : 'text-[#646059] hover:bg-[#EAE4D9]'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>{uz.productionLab.speakingMode}</span>
        </button>
      </div>

      {/* Write & Speaking Lab */}
      {(activeTab === 'write' || activeTab === 'speaking') && (
        <div className="space-y-6">
          {/* Situation & Target Cards */}
          <div className="p-6 bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px] space-y-4">
            <div>
              <div className="text-xs font-mono text-[#D9482B] uppercase tracking-wider font-semibold">
                {uz.productionLab.situation}
              </div>
              <p className="text-base font-serif text-[#1B1A17] mt-1">{situation}</p>
            </div>

            <div>
              <div className="text-xs font-mono text-[#646059] uppercase tracking-wider mb-2 font-semibold">
                {uz.productionLab.targets}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {currentTargets.map((target) => (
                  <span
                    key={target}
                    className="px-2.5 py-1 bg-[#FAF7F2] border border-[#E2DBD0] text-[#1B1A17] text-xs font-mono rounded-[2px]"
                  >
                    + {target}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleEvaluate} className="space-y-4">
            <textarea
              rows={4}
              value={learnerText}
              onChange={(e) => setLearnerText(e.target.value)}
              placeholder="Oʻz gapingizni ingliz tilida yozing (kamida 1 ta maqsadli iborani tabiiy qoʻllang)..."
              className="w-full bg-[#FFFFFF] border border-[#E2DBD0] rounded-[2px] p-4 text-base font-serif text-[#1B1A17] focus:outline-none focus:border-[#D9482B] transition-colors"
            />

            <button
              type="submit"
              disabled={isEvaluating || !learnerText.trim()}
              className="px-6 py-2.5 bg-[#1B1A17] hover:bg-[#D9482B] disabled:opacity-50 text-[#F6F1E7] text-xs font-medium rounded-[2px] flex items-center gap-2 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isEvaluating ? uz.productionLab.analyzing : uz.productionLab.submitForFeedback}</span>
            </button>
          </form>

          {/* AI Feedback Output */}
          {evaluation && (
            <div className="p-6 bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px] space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#E2DBD0] pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={`w-5 h-5 ${evaluation.passed ? 'text-[#4F6B4A]' : 'text-[#D9482B]'}`}
                  />
                  <h3 className="text-lg font-serif font-bold text-[#1B1A17]">
                    {uz.productionLab.feedbackTitle}
                  </h3>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded-[2px] bg-[#FAF7F2] border border-[#E2DBD0]">
                  Tabiiylik: {evaluation.naturalness}/5
                </span>
              </div>

              {/* Target check */}
              <div className="space-y-1.5">
                <div className="text-xs font-mono text-[#646059]">Iboralar tekshiruvi:</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {evaluation.usedTargets.map((item, idx) => (
                    <span
                      key={idx}
                      className={`text-xs font-mono px-2.5 py-1 rounded-[2px] border ${
                        item.usedCorrectly
                          ? 'bg-[#EDF3EC] text-[#4F6B4A] border-[#B7D2B3]'
                          : 'bg-[#F9EBE7] text-[#D9482B] border-[#F2C8C0]'
                      }`}
                    >
                      {item.target} ({item.note})
                    </span>
                  ))}
                </div>
              </div>

              {/* Better variant */}
              <div className="p-3 bg-[#FAF7F2] rounded-[2px] border border-[#E2DBD0] space-y-1 text-sm font-serif">
                <div className="text-xs font-mono text-[#646059]">{uz.productionLab.betterVariant}:</div>
                <div className="text-[#1B1A17]">{evaluation.betterVariant}</div>
              </div>

              {/* Errors in Uzbek */}
              {evaluation.errors && evaluation.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-mono text-[#D9482B] flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Tuzatishlar va izohlar:</span>
                  </div>
                  {evaluation.errors.map((err, i) => (
                    <div key={i} className="text-xs font-sans text-[#646059] p-2 bg-[#F9EBE7] rounded-[2px]">
                      <strong className="text-[#D9482B]">{err.wrong}</strong> →{' '}
                      <strong className="text-[#4F6B4A]">{err.correct}</strong>: {err.explanationUz}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Roleplay Lab */}
      {activeTab === 'roleplay' && (
        <div className="bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px] p-6 space-y-4">
          <div className="border-b border-[#E2DBD0] pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-serif font-bold text-[#1B1A17]">Intervyu simulyatsiyasi</h2>
              <p className="text-xs text-[#646059]">Mavzu: Job Interview (Software Engineer)</p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded-[2px] bg-[#EDF3EC] text-[#4F6B4A]">
              AI Partner: Active
            </span>
          </div>

          {/* Chat Messages */}
          <div className="space-y-3 min-h-[220px] max-h-[350px] overflow-y-auto p-2">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3.5 rounded-[3px] text-sm font-serif ${
                    msg.sender === 'user'
                      ? 'bg-[#1B1A17] text-[#F6F1E7]'
                      : 'bg-[#FAF7F2] border border-[#E2DBD0] text-[#1B1A17]'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] font-mono text-[#646059] mt-0.5 px-1">
                  {msg.sender === 'user' ? 'Siz' : 'Examiner'}
                </span>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleRoleplaySubmit} className="relative flex items-center gap-2 pt-2">
            <input
              type="text"
              value={roleplayInput}
              onChange={(e) => setRoleplayInput(e.target.value)}
              placeholder="Ingliz tilida javob bering..."
              className="flex-1 bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px] px-3.5 py-2.5 text-sm font-serif text-[#1B1A17] focus:outline-none focus:border-[#D9482B]"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#1B1A17] hover:bg-[#D9482B] text-[#F6F1E7] rounded-[2px] transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
