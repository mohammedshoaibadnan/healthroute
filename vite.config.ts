import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

function normalizeSupabaseUrl(value: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed || !trimmed.startsWith('https://')) return '';
  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname.endsWith('.supabase.co') && !parsed.hostname.includes('supabase')) {
      return '';
    }
    return parsed.origin;
  } catch {
    return '';
  }
}

function isSafePublishableKey(value: string): boolean {
  const trimmed = (value || '').trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return false;
  }
  if (trimmed.startsWith('sb_secret_') || trimmed.toLowerCase().includes('service_role')) {
    return false;
  }
  const parts = trimmed.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      if (payload?.role === 'service_role') {
        return false;
      }
    } catch {
      // non-JSON segment
    }
  }
  return true;
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');

  const urlCandidates = [
    env.VITE_SUPABASE_URL,
    env.SUPABASE_URL,
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_URL,
  ];
  const resolvedSupabaseUrl = urlCandidates.map((c) => normalizeSupabaseUrl(c || '')).find(Boolean) || '';

  const keyCandidates = [
    env.VITE_SUPABASE_ANON_KEY,
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
    env.SUPABASE_PUBLISHABLE_KEY,
    env.SUPABASE_ANON_KEY,
    env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_URL,
  ];
  const safePublishableKey =
    keyCandidates.map((c) => (c || '').trim()).find((c) => isSafePublishableKey(c)) || '';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(resolvedSupabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(safePublishableKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

