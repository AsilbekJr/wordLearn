/**
 * Application environment configuration read directly from .env / Vite env.
 */
export const envConfig = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    isSet: Boolean(
      import.meta.env.VITE_SUPABASE_URL &&
      !import.meta.env.VITE_SUPABASE_URL.includes('your-project') &&
      !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')
    )
  },
  vercel: {
    appUrl: import.meta.env.VITE_APP_URL || 'https://wordlearn.vercel.app',
    env: import.meta.env.VITE_VERCEL_ENV || 'production',
    isProduction: import.meta.env.VITE_VERCEL_ENV === 'production'
  }
};
