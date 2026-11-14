import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateSupabaseEnvSecurity } from '../utils/rules';

export interface SupabaseConfigStatus {
  isValid: boolean;
  isConfigured: boolean;
  supabaseUrl: string;
  hasPublishableKey: boolean;
  violations: string[];
}

function readFrontendEnvRecord(): Record<string, string | undefined> {
  const metaEnv = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
  const record: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(metaEnv)) {
    if (typeof v === 'string') {
      record[k] = v;
    }
  }
  return record;
}

const envSecurityResult = validateSupabaseEnvSecurity(readFrontendEnvRecord());

let singletonClient: SupabaseClient | null = null;

if (envSecurityResult.isConfigured && envSecurityResult.isValid) {
  singletonClient = createClient(
    envSecurityResult.supabaseUrl,
    envSecurityResult.supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'hr_supabase_auth_token',
      },
    }
  );
}

/**
 * Returns the singleton Supabase client if valid public credentials are configured
 * and zero security violations exist; otherwise returns null (Demo Simulation Mode).
 */
export function getSupabaseClient(): SupabaseClient | null {
  return singletonClient;
}

/**
 * Returns the validated Supabase public configuration status and any security boundary violations.
 */
export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  return {
    isValid: envSecurityResult.isValid,
    isConfigured: envSecurityResult.isConfigured,
    supabaseUrl: envSecurityResult.supabaseUrl,
    hasPublishableKey: Boolean(envSecurityResult.supabaseAnonKey),
    violations: envSecurityResult.violations,
  };
}

export const supabase = singletonClient;
