import React, { useState, useRef, useEffect } from 'react';
import { localStore } from '../../lib/db';
import { uz } from '../../i18n/uz';
import {
  Save,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Cloud,
  CloudOff,
  RefreshCw,
  LogIn,
  UserPlus,
  LogOut,
  Database
} from 'lucide-react';
import {
  getSupabaseCredentials,
  reconfigureSupabase,
  resetSupabaseConfig,
  testSupabaseConnection
} from '../../lib/supabase';
import { useAuthStore } from '../../lib/auth';
import { pushLocalToCloud, pullCloudToLocal } from '../../lib/sync';

export const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState(localStore.getSettings());
  const [savedMsg, setSavedMsg] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supabase connection state
  const creds = getSupabaseCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(creds.isConfigured ? creds.url : '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(creds.isConfigured ? creds.anonKey : '');
  const [connectionTestMsg, setConnectionTestMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Auth store
  const { user, loading: authLoading, signInWithEmail, signUpWithEmail, signOut, init } = useAuthStore();
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMsg, setAuthMsg] = useState<{ error?: string; success?: string } | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStore.saveSettings(settings);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  const handleSaveSupabaseConfig = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setConnectionTestMsg({ success: false, text: 'Iltimos, Supabase URL va Anon Key ni kiriting.' });
      return;
    }
    setIsTesting(true);
    const testResult = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
    setIsTesting(false);

    if (testResult.success) {
      reconfigureSupabase(supabaseUrl, supabaseAnonKey);
      await init();
      setConnectionTestMsg({ success: true, text: 'Sozlamalar saqlandi va Supabase bilan aloqa oʻrnatildi!' });
    } else {
      setConnectionTestMsg({ success: false, text: testResult.message });
    }
  };

  const handleResetSupabaseConfig = () => {
    resetSupabaseConfig();
    const fresh = getSupabaseCredentials();
    setSupabaseUrl(fresh.isConfigured ? fresh.url : '');
    setSupabaseAnonKey(fresh.isConfigured ? fresh.anonKey : '');
    setConnectionTestMsg(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthMsg({ error: 'Email va parolni toʻliq kiriting.' });
      return;
    }
    setAuthMsg(null);
    const res = await signInWithEmail(authEmail, authPassword);
    if (!res.success) {
      setAuthMsg({ error: res.error || 'Kirishda xatolik' });
    } else {
      setAuthMsg({ success: 'Muvaffaqiyatli tizimga kirildi!' });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthMsg({ error: 'Email va parolni toʻliq kiriting.' });
      return;
    }
    setAuthMsg(null);
    const res = await signUpWithEmail(authEmail, authPassword);
    if (!res.success) {
      setAuthMsg({ error: res.error || 'Roʻyxatdan oʻtishda xatolik' });
    } else {
      setAuthMsg({ success: 'Roʻyxatdan oʻtildi! Agar tasdiqlash yoqilgan boʻlsa, pochtangizni tekshiring.' });
    }
  };

  const handlePushSync = async () => {
    if (!user) {
      setSyncStatus('Avval tizimga kiring.');
      return;
    }
    setIsSyncing(true);
    setSyncStatus('Lokal natijalar bulutga yuklanmoqda...');
    const res = await pushLocalToCloud(user.id);
    setIsSyncing(false);
    if (res.success) {
      setSyncStatus(`Muvaffaqiyatli sinxronlandi! (${res.cardsSynced} ta karta bulutda saqlandi)`);
    } else {
      setSyncStatus(`Sinxronlash xatosi: ${res.error}`);
    }
  };

  const handlePullSync = async () => {
    if (!user) {
      setSyncStatus('Avval tizimga kiring.');
      return;
    }
    setIsSyncing(true);
    setSyncStatus('Bulutdan natijalar olinmoqda...');
    const res = await pullCloudToLocal(user.id);
    setIsSyncing(false);
    if (res.success) {
      setSyncStatus(`Muvaffaqiyatli yuklab olindi! (${res.cardsCount} ta karta yangilandi)`);
    } else {
      setSyncStatus(`Yuklab olish xatosi: ${res.error}`);
    }
  };

  const handleExport = () => {
    const data = {
      cards: localStore.getCards(),
      logs: localStore.getLogs(),
      settings: localStore.getSettings(),
      attempts: localStore.getProductionAttempts(),
      errors: localStore.getErrorLog(),
      userSentences: localStore.getUserSentences(),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linguist-ai-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.cards && Array.isArray(json.cards)) {
          localStore.saveCards(json.cards);
        }
        if (json.settings) {
          localStore.saveSettings(json.settings);
          setSettings(json.settings);
        }
        setImportStatus('Maʼlumotlar muvaffaqiyatli tiklandi!');
        setTimeout(() => setImportStatus(null), 3000);
      } catch {
        setImportStatus('Xatolik: JSON fayl formati notoʻgʻri.');
        setTimeout(() => setImportStatus(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="border-b border-[#E2DBD0] pb-4">
        <h1 className="text-3xl font-serif text-[#1B1A17]">{uz.settings.title}</h1>
        <p className="text-sm text-[#646059] mt-1">FSRS algoritmi, Supabase bulutli bazasi va tizim sozlamalari</p>
      </div>

      {/* Supabase Cloud Database Section */}
      <section className="bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px] p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[#D9482B]" />
              <h2 className="text-lg font-serif font-bold text-[#1B1A17]">{uz.settings.supabaseTitle}</h2>
            </div>
            <p className="text-xs text-[#646059] mt-1">{uz.settings.supabaseSubtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            {creds.isConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-[#EDF3EC] border border-[#B7D2B3] text-[#4F6B4A] text-xs font-mono">
                <Cloud className="w-3.5 h-3.5" />
                <span>
                  {uz.settings.supabaseConnected} {creds.source === 'env' ? '(.env dan oʻqildi)' : ''}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-[#FAF7F2] border border-[#E2DBD0] text-[#646059] text-xs font-mono">
                <CloudOff className="w-3.5 h-3.5" />
                <span>{uz.settings.supabaseNotConfigured}</span>
              </span>
            )}
          </div>
        </div>

        {/* Supabase URL and Key inputs */}
        <div className="space-y-3 pt-2 border-t border-[#E2DBD0]">
          <div>
            <label className="block text-xs font-mono text-[#646059] uppercase mb-1">
              {uz.settings.supabaseUrl}
            </label>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px] px-3 py-2 text-xs font-mono text-[#1B1A17] focus:outline-none focus:border-[#D9482B]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[#646059] uppercase mb-1">
              {uz.settings.supabaseAnonKey}
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              className="w-full bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px] px-3 py-2 text-xs font-mono text-[#1B1A17] focus:outline-none focus:border-[#D9482B]"
            />
          </div>

          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <button
              type="button"
              disabled={isTesting}
              onClick={handleSaveSupabaseConfig}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B1A17] hover:bg-[#D9482B] text-[#F6F1E7] text-xs font-mono rounded-[2px] transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isTesting ? 'Tekshirilmoqda...' : 'Saqlash va Ulanish'}</span>
            </button>

            {creds.source === 'custom' && (
              <button
                type="button"
                onClick={handleResetSupabaseConfig}
                className="px-3 py-2 border border-[#E2DBD0] text-[#646059] hover:text-[#1B1A17] text-xs font-mono rounded-[2px] transition-colors"
              >
                Asliga qaytarish
              </button>
            )}

            {connectionTestMsg && (
              <span
                className={`text-xs font-mono flex items-center gap-1.5 ${
                  connectionTestMsg.success ? 'text-[#4F6B4A]' : 'text-[#D9482B]'
                }`}
              >
                {connectionTestMsg.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{connectionTestMsg.text}</span>
              </span>
            )}
          </div>
        </div>

        {/* User Authentication & Cloud Sync Section */}
        {creds.isConfigured && (
          <div className="pt-4 border-t border-[#E2DBD0] space-y-4">
            <h3 className="text-xs font-mono text-[#646059] uppercase tracking-wider font-semibold">
              Foydalanuvchi hisobi va sinxronlash
            </h3>

            {user ? (
              <div className="p-4 bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px] space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs font-mono">
                    <span className="text-[#646059]">Kirilgan hisob: </span>
                    <strong className="text-[#1B1A17]">{user.email}</strong>
                    <div className="text-[10px] text-[#646059] mt-0.5">UID: {user.id}</div>
                  </div>

                  <button
                    onClick={() => signOut()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFFFF] border border-[#E2DBD0] text-[#D9482B] text-xs font-mono rounded-[2px] hover:bg-[#F9EBE7] transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{uz.settings.signOut}</span>
                  </button>
                </div>

                {/* Cloud Sync Buttons */}
                <div className="pt-2 border-t border-[#E2DBD0]/60 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handlePushSync}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1B1A17] text-[#F6F1E7] hover:bg-[#D9482B] text-xs font-mono rounded-[2px] transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{uz.settings.syncToCloud}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handlePullSync}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FFFFFF] border border-[#E2DBD0] text-[#1B1A17] hover:border-[#1B1A17] text-xs font-mono rounded-[2px] transition-colors disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{uz.settings.syncFromCloud}</span>
                  </button>

                  {syncStatus && (
                    <span className="text-xs font-mono text-[#4F6B4A] block sm:inline">
                      {syncStatus}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <form className="p-4 bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-[#646059] mb-1">
                      {uz.settings.email}
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="user@example.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#E2DBD0] rounded-[2px] px-3 py-2 text-xs font-mono text-[#1B1A17]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#646059] mb-1">
                      {uz.settings.password}
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#E2DBD0] rounded-[2px] px-3 py-2 text-xs font-mono text-[#1B1A17]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={handleSignIn}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B1A17] text-[#F6F1E7] hover:bg-[#D9482B] text-xs font-mono rounded-[2px] transition-colors disabled:opacity-50"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{uz.settings.signIn}</span>
                  </button>

                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={handleSignUp}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FFFFFF] border border-[#E2DBD0] text-[#1B1A17] hover:border-[#1B1A17] text-xs font-mono rounded-[2px] transition-colors disabled:opacity-50"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{uz.settings.signUp}</span>
                  </button>

                  {authMsg?.error && (
                    <span className="text-xs font-mono text-[#D9482B]">{authMsg.error}</span>
                  )}
                  {authMsg?.success && (
                    <span className="text-xs font-mono text-[#4F6B4A]">{authMsg.success}</span>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* Migration / Schema guidance */}
        <div className="pt-2 text-[11px] font-mono text-[#646059] space-y-1">
          <p className="font-semibold text-[#1B1A17]">💡 Supabase maʼlumotlar bazasini tayyorlash:</p>
          <p>
            1. Supabase loyihangizning <strong>SQL Editor</strong> boʻlimiga kirib,{' '}
            <code className="text-[#D9482B] bg-[#FAF7F2] px-1 py-0.5 rounded">
              supabase/migrations/20261103000000_init_schema.sql
            </code>{' '}
            faylini bajaring.
          </p>
          <p>
            2. 1515 ta gapni bazaga yuklash uchun terminalda{' '}
            <code className="text-[#4F6B4A] bg-[#FAF7F2] px-1 py-0.5 rounded">
              pnpm seed:supabase
            </code>{' '}
            buyrugʻini ishga tushiring.
          </p>
        </div>
      </section>

      {/* FSRS Learning Algorithm Settings */}
      <form onSubmit={handleSave} className="bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px] p-6 space-y-6">
        <h2 className="text-lg font-serif font-bold text-[#1B1A17]">FSRS Algoritmi va Limitlar</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-[#646059] uppercase mb-1">
              {uz.settings.desiredRetention}
            </label>
            <input
              type="number"
              step="0.01"
              min="0.70"
              max="0.99"
              value={settings.desired_retention}
              onChange={(e) => setSettings({ ...settings, desired_retention: parseFloat(e.target.value) })}
              className="w-full sm:w-48 bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px] px-3 py-2 text-sm text-[#1B1A17] focus:outline-none focus:border-[#D9482B]"
            />
            <p className="text-[11px] text-[#646059] mt-1">FSRS standart tavsiyasi: 0.90 (90%)</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-[#646059] uppercase mb-1">
                {uz.settings.newPerDay}
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.new_per_day}
                onChange={(e) => setSettings({ ...settings, new_per_day: parseInt(e.target.value, 10) })}
                className="w-full bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px] px-3 py-2 text-sm text-[#1B1A17]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#646059] uppercase mb-1">
                {uz.settings.maxReviewsPerDay}
              </label>
              <input
                type="number"
                min="10"
                max="1000"
                value={settings.max_reviews_per_day}
                onChange={(e) => setSettings({ ...settings, max_reviews_per_day: parseInt(e.target.value, 10) })}
                className="w-full bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px] px-3 py-2 text-sm text-[#1B1A17]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-[#646059] uppercase mb-1">
                {uz.settings.dayRolloverHour}
              </label>
              <input
                type="number"
                min="0"
                max="23"
                value={settings.day_rollover_hour}
                onChange={(e) => setSettings({ ...settings, day_rollover_hour: parseInt(e.target.value, 10) })}
                className="w-full bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px] px-3 py-2 text-sm text-[#1B1A17]"
              />
              <p className="text-[11px] text-[#646059] mt-1">Standart: 04:00 (Asia/Tashkent)</p>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#646059] uppercase mb-1">
                {uz.settings.timezone}
              </label>
              <input
                type="text"
                disabled
                value={settings.timezone}
                className="w-full bg-[#FAF7F2] border border-[#E2DBD0] rounded-[2px] px-3 py-2 text-sm text-[#646059] cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E2DBD0] flex items-center justify-between">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B1A17] hover:bg-[#D9482B] text-[#F6F1E7] text-xs font-medium rounded-[2px] transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{uz.settings.save}</span>
          </button>

          {savedMsg && <span className="text-xs font-mono text-[#4F6B4A]">Sozlamalar saqlandi!</span>}
        </div>
      </form>

      {/* Export / Import Section */}
      <section className="bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px] p-6 space-y-4">
        <h2 className="text-base font-serif font-bold text-[#1B1A17]">{uz.settings.exportImport}</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FAF7F2] border border-[#E2DBD0] text-[#1B1A17] text-xs font-mono rounded-[2px] hover:border-[#1B1A17] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{uz.settings.exportData}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FAF7F2] border border-[#E2DBD0] text-[#1B1A17] text-xs font-mono rounded-[2px] hover:border-[#1B1A17] transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{uz.settings.importData}</span>
          </button>

          {importStatus && (
            <span
              className={`text-xs font-mono flex items-center gap-1 ${
                importStatus.includes('Xatolik') ? 'text-[#D9482B]' : 'text-[#4F6B4A]'
              }`}
            >
              {importStatus.includes('Xatolik') ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {importStatus}
            </span>
          )}
        </div>
      </section>
    </div>
  );
};
