import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEYS = {
  CUSTOM_URL: 'linguist_custom_supabase_url',
  CUSTOM_KEY: 'linguist_custom_supabase_key'
};

export function getSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean; source: 'env' | 'custom' | 'none' } {
  // Check localStorage first (user-defined in Settings UI)
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const customUrl = localStorage.getItem(STORAGE_KEYS.CUSTOM_URL);
    const customKey = localStorage.getItem(STORAGE_KEYS.CUSTOM_KEY);
    if (customUrl && customKey) {
      return { url: customUrl.trim(), anonKey: customKey.trim(), isConfigured: true, source: 'custom' };
    }
  }

  // Fallback to Vite env variables
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (envUrl && envKey && !envUrl.includes('placeholder')) {
    return { url: envUrl.trim(), anonKey: envKey.trim(), isConfigured: true, source: 'env' };
  }

  return {
    url: 'https://placeholder.supabase.co',
    anonKey: 'placeholder-anon-key',
    isConfigured: false,
    source: 'none'
  };
}

let activeCredentials = getSupabaseCredentials();
export let supabase: SupabaseClient = createClient(activeCredentials.url, activeCredentials.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

export const isSupabaseConfigured = activeCredentials.isConfigured;

export function reconfigureSupabase(url: string, anonKey: string): SupabaseClient {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_URL, url.trim());
    localStorage.setItem(STORAGE_KEYS.CUSTOM_KEY, anonKey.trim());
  }
  activeCredentials = { url: url.trim(), anonKey: anonKey.trim(), isConfigured: true, source: 'custom' };
  supabase = createClient(activeCredentials.url, activeCredentials.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });
  return supabase;
}

export function resetSupabaseConfig(): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_URL);
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_KEY);
  }
  activeCredentials = getSupabaseCredentials();
  supabase = createClient(activeCredentials.url, activeCredentials.anonKey);
}

export async function testSupabaseConnection(url?: string, anonKey?: string): Promise<{ success: boolean; message: string; version?: string }> {
  try {
    const clientToTest = (url && anonKey) ? createClient(url.trim(), anonKey.trim()) : supabase;
    // Probe sentences or auth health
    const { error } = await clientToTest.from('sentences').select('id').limit(1);
    if (error) {
      return {
        success: false,
        message: `Ulanish xatosi: ${error.message} (${error.code || 'xato kodi yoʻq'})`
      };
    }
    return {
      success: true,
      message: 'Supabase bilan aloqa muvaffaqiyatli oʻrnatildi!'
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Tarmoq yoki manzil xatosi: ${msg}`
    };
  }
}

export interface UserSettings {
  user_id: string;
  desired_retention: number;
  new_per_day: number;
  max_reviews_per_day: number;
  day_rollover_hour: number;
  timezone: string;
  tts_voice: string | null;
  theme: 'light' | 'dark' | 'system';
}

export const defaultSettings: UserSettings = {
  user_id: 'default-learner-id',
  desired_retention: 0.90,
  new_per_day: 15,
  max_reviews_per_day: 150,
  day_rollover_hour: 4,
  timezone: 'Asia/Tashkent',
  tts_voice: null,
  theme: 'system'
};
