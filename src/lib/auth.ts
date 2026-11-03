import { create } from 'zustand';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { localStore } from './db';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;

  init: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  error: null,
  isConfigured: isSupabaseConfigured,

  init: async () => {
    try {
      set({ loading: true });
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        set({ error: error.message, loading: false });
        return;
      }

      const session = data.session;
      const user = session?.user ?? null;

      if (user) {
        // Update user_id in localStore settings to match Supabase auth.uid()
        const settings = localStore.getSettings();
        if (settings.user_id !== user.id) {
          localStore.saveSettings({ ...settings, user_id: user.id });
        }
      }

      set({ session, user, loading: false });

      // Listen for auth state changes
      supabase.auth.onAuthStateChange((_event, newSession) => {
        const newUser = newSession?.user ?? null;
        if (newUser) {
          const settings = localStore.getSettings();
          if (settings.user_id !== newUser.id) {
            localStore.saveSettings({ ...settings, user_id: newUser.id });
          }
        }
        set({ session: newSession, user: newUser });
      });
    } catch (e) {
      console.warn('Auth init failed:', e);
      set({ loading: false });
    }
  },

  signInWithEmail: async (email, password) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (error) {
        set({ error: error.message, loading: false });
        return { success: false, error: error.message };
      }

      if (data.user) {
        const settings = localStore.getSettings();
        localStore.saveSettings({ ...settings, user_id: data.user.id });
      }

      set({ session: data.session, user: data.user, loading: false, error: null });
      return { success: true };
    } catch (err: unknown) {
      const msg = (err as AuthError)?.message || 'Kirishda kutilmagan xatolik yuz berdi';
      set({ error: msg, loading: false });
      return { success: false, error: msg };
    }
  },

  signUpWithEmail: async (email, password) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim()
      });

      if (error) {
        set({ error: error.message, loading: false });
        return { success: false, error: error.message };
      }

      if (data.user) {
        const settings = localStore.getSettings();
        localStore.saveSettings({ ...settings, user_id: data.user.id });
      }

      set({ session: data.session, user: data.user, loading: false, error: null });
      return { success: true };
    } catch (err: unknown) {
      const msg = (err as AuthError)?.message || 'Roʻyxatdan oʻtishda kutilmagan xatolik yuz berdi';
      set({ error: msg, loading: false });
      return { success: false, error: msg };
    }
  },

  signOut: async () => {
    try {
      set({ loading: true });
      await supabase.auth.signOut();
      set({ user: null, session: null, loading: false });
    } catch (e) {
      console.warn('SignOut failed:', e);
      set({ user: null, session: null, loading: false });
    }
  },

  clearError: () => set({ error: null })
}));
