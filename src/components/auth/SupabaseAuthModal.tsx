import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle2,
  X,
  Database,
  LogOut,
  RefreshCw,
  KeyRound,
  UserCheck,
  Terminal,
  Loader2,
  ServerCrash,
  FileCode2,
} from 'lucide-react';

export const SupabaseAuthModal: React.FC = () => {
  const {
    authMode,
    configStatus,
    user,
    resolvedIdentity,
    isInitialLoading,
    isActionLoading,
    authError,
    isAuthModalOpen,
    setIsAuthModalOpen,
    signInWithPassword,
    signOut,
    refreshServerIdentity,
    enterDemoSimulationMode,
    clearAuthError,
  } = useAuth();

  const {
    dbSyncStatus,
    dbSyncError,
    lastDbSyncedAt,
    schemaAuditReport,
    isSchemaAuditRunning,
    runLiveSchemaAudit,
    refreshDatabaseWorkspace,
    clearDbSyncError,
  } = useApp();

  const [email, setEmail] = useState('v.malhotra@apexhospital.demo.org');
  const [password, setPassword] = useState('');

  if (!isAuthModalOpen) return null;

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signInWithPassword(email, password);
  };

  const demoAccounts = [
    { id: 'staff-doc-1', role: 'doctor', name: 'Dr. Vikram Malhotra', email: 'v.malhotra@apexhospital.demo.org' },
    { id: 'staff-cmo-1', role: 'cmo', name: 'Dr. Ananya Deshmukh', email: 'a.deshmukh@apexhospital.demo.org' },
    { id: 'staff-nurse-1', role: 'nurse', name: 'Sister Rekha Varma', email: 'r.varma@apexhospital.demo.org' },
    { id: 'staff-pharm-1', role: 'pharmacist', name: 'Meera Krishnan', email: 'm.krishnan@apexhospital.demo.org' },
    { id: 'staff-rec-1', role: 'records', name: 'Suresh Kumar', email: 's.kumar@apexhospital.demo.org' },
    { id: 'staff-admin-1', role: 'admin', name: 'Rajeshwari Rao', email: 'r.rao@apexhospital.demo.org' },
  ];

  const tablesReady = schemaAuditReport ? schemaAuditReport.allMigrationsApplied : false;
  const missingTablesCount = schemaAuditReport
    ? schemaAuditReport.expectedTablesCount - schemaAuditReport.existingTablesCount
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Top Header */}
        <div className="bg-[#0b192e] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  Supabase PostgreSQL Authentication & Session Authority
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    authMode === 'authenticated_supabase'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                  }`}
                >
                  {authMode === 'authenticated_supabase' ? 'Verified DB Session' : 'Demo Sandbox Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Phase 6C • Complete 33-Table Database Integration, Server-Authoritative RBAC & Live Schema Audit
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close authentication modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto text-xs">
          {/* Environment & Security Boundary Status Bar */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-teal-600" />
                <span>Supabase Environment & Security Boundary</span>
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  configStatus.isConfigured && configStatus.isValid
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {configStatus.isConfigured && configStatus.isValid ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Publishable Client Ready</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    <span>Awaiting VITE_SUPABASE_URL & Anon Key</span>
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Project URL</div>
                <div className="font-mono text-[11px] text-slate-800 truncate mt-0.5">
                  {configStatus.supabaseUrl || 'Not set (VITE_SUPABASE_URL)'}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Publishable Key</div>
                <div className="font-semibold text-[11px] text-slate-800 mt-0.5">
                  {configStatus.hasPublishableKey ? 'Configured (Anon / Publishable)' : 'Not set'}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Service-Role Guard</div>
                <div className="font-semibold text-[11px] text-emerald-700 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{configStatus.isValid ? 'Zero Secret Exposure' : 'Violation Blocked'}</span>
                </div>
              </div>
            </div>

            {!configStatus.isConfigured && (
              <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>Environment Variable Note:</strong> Ensure both{' '}
                <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200">
                  VITE_SUPABASE_URL
                </code>{' '}
                (e.g. <code className="font-mono">https://&lt;project-ref&gt;.supabase.co</code>) and{' '}
                <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200">
                  VITE_SUPABASE_ANON_KEY
                </code>{' '}
                are set in your environment panel. While unconfigured, HealthRoute operates safely in isolated{' '}
                <strong>Demo Simulation Mode</strong>.
              </div>
            )}
          </div>

          {/* Phase 6C: Live 33-Table Schema & RPC Migration Audit */}
          {configStatus.isConfigured && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-teal-600" />
                  <span className="font-bold text-slate-900">
                    Live Supabase Schema & Migration Audit (33 Tables / 6 Transactional RPCs)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {authMode === 'authenticated_supabase' && (
                    <button
                      type="button"
                      onClick={() => void refreshDatabaseWorkspace()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Sync Workspace</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void runLiveSchemaAudit()}
                    disabled={isSchemaAuditRunning}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0b192e] hover:bg-slate-800 text-white font-semibold text-[11px] cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSchemaAuditRunning ? 'animate-spin' : ''}`} />
                    <span>{isSchemaAuditRunning ? 'Auditing...' : 'Re-Run Live Schema Audit'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">PostgreSQL Tables</div>
                  <div
                    className={`font-bold text-xs mt-0.5 ${
                      tablesReady ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {schemaAuditReport
                      ? `${schemaAuditReport.existingTablesCount} / ${schemaAuditReport.expectedTablesCount} Verified`
                      : 'Checking...'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Transactional RPCs</div>
                  <div className="font-bold text-xs text-slate-800 mt-0.5">
                    {schemaAuditReport
                      ? `${schemaAuditReport.existingRpcsCount} / ${schemaAuditReport.expectedRpcsCount} Verified`
                      : 'Checking...'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Persistence Mode</div>
                  <div className="font-bold text-xs text-slate-800 mt-0.5">
                    {dbSyncStatus === 'synced'
                      ? `PostgreSQL Synced (${lastDbSyncedAt ? new Date(lastDbSyncedAt).toLocaleTimeString() : 'Live'})`
                      : dbSyncStatus === 'syncing' || dbSyncStatus === 'loading'
                      ? 'Syncing with Supabase...'
                      : dbSyncStatus === 'schema_missing'
                      ? 'Awaiting SQL Migration'
                      : dbSyncStatus === 'error'
                      ? 'Database Error / RLS Blocked'
                      : 'Isolated Demo Sandbox'}
                  </div>
                </div>
              </div>

              {schemaAuditReport && missingTablesCount > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1.5 leading-relaxed">
                  <div className="font-bold flex items-center gap-1.5 text-amber-950">
                    <ServerCrash className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>
                      Manual SQL Execution Required in Supabase SQL Editor ({missingTablesCount} of{' '}
                      {schemaAuditReport.expectedTablesCount} tables not yet created)
                    </span>
                  </div>
                  <p>
                    PostgREST (<code className="font-mono">PGRST205</code>) confirmed that the Phase 6 SQL migrations have not
                    yet been executed in your Supabase project. Open your{' '}
                    <strong>Supabase Dashboard → SQL Editor</strong> and run the consolidated script{' '}
                    <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300 font-bold">
                      /supabase/FULL_PHASE6_SUPABASE_SETUP.sql
                    </code>{' '}
                    (or migrations <code className="font-mono">000001</code> through <code className="font-mono">000005</code> in{' '}
                    <code className="font-mono">/supabase/migrations/</code>), then click{' '}
                    <strong>Re-Run Live Schema Audit</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Database Sync Error Banner */}
          {dbSyncError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-xs text-rose-900">PostgreSQL Persistence / RLS Authority Notice</p>
                  <p className="text-[11px] text-rose-800 leading-relaxed">{dbSyncError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearDbSyncError}
                className="text-rose-500 hover:text-rose-800 p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Loading State */}
          {(isInitialLoading || isActionLoading) && (
            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 text-teal-900 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-teal-600 animate-spin shrink-0" />
              <div>
                <p className="font-bold text-xs">Verifying Supabase Session & Server Role Authority...</p>
                <p className="text-[11px] text-teal-700">
                  Checking JWT signature and resolving linked clinical profile from public.staff_users / public.patients.
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {authError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-xs text-rose-900">Authentication / Profile Resolution Notice</p>
                  <p className="text-[11px] text-rose-800 leading-relaxed">{authError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearAuthError}
                className="text-rose-500 hover:text-rose-800 p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Active Authenticated Session View */}
          {user && resolvedIdentity ? (
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{resolvedIdentity.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {resolvedIdentity.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {resolvedIdentity.designation || 'Verified Patient Account'} • ID:{' '}
                      <code className="font-mono font-bold">{resolvedIdentity.id}</code>
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      auth.uid(): {resolvedIdentity.authUserId}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={signOut}
                  disabled={isActionLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-white/90 border border-emerald-200/80 text-[11px] text-slate-600">
                <strong>Strict Session Lock Active:</strong> Client-side Demo Role Simulation is disabled while signed into a
                real Supabase session. Your effective role (<code className="font-mono font-bold">{resolvedIdentity.role}</code>) is
                enforced by PostgreSQL Row Level Security.
              </div>
            </div>
          ) : user && !resolvedIdentity ? (
            /* Authenticated in auth.users, but not yet linked in public.staff_users or public.patients */
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-amber-900 text-sm flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-700" />
                  <span>Link Your Supabase Auth User to a HealthRoute Profile</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={refreshServerIdentity}
                    disabled={isActionLoading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Re-Check Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={signOut}
                    className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 font-semibold text-xs cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-amber-800 leading-relaxed">
                Signed in as <strong>{user.email}</strong> (<code className="font-mono">{user.id}</code>). Run one of the
                following SQL statements in your Supabase SQL Editor to bind this user to a staff or patient record:
              </p>

              <pre className="p-3 rounded-xl bg-slate-900 text-teal-300 font-mono text-[11px] overflow-x-auto">
{`-- Bind to Senior Cardiologist (Dr. Vikram Malhotra):
UPDATE public.staff_users SET auth_user_id = '${user.id}' WHERE id = 'staff-doc-1';

-- Or bind to Chief Pharmacist (Meera Krishnan):
UPDATE public.staff_users SET auth_user_id = '${user.id}' WHERE id = 'staff-pharm-1';

-- Or bind to Patient (Rameshwar Reddy):
UPDATE public.patients SET auth_user_id = '${user.id}' WHERE id = 'pat-known-01';`}
              </pre>
            </div>
          ) : (
            /* Sign-In Form */
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Supabase Account Email</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="v.malhotra@apexhospital.demo.org"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:outline-hidden focus:border-teal-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter Supabase user password"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-teal-600"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Demo Account Email Fillers */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Quick-Fill Seeded Staff Emails (For Supabase Auth Testing)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {demoAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setEmail(acc.email)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                        email === acc.email
                          ? 'bg-teal-50 border-teal-300 text-teal-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {acc.name} ({acc.role})
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={enterDemoSimulationMode}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Continue in Isolated Demo Simulation Mode
                </button>

                <button
                  type="submit"
                  disabled={isActionLoading || !configStatus.isConfigured}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b192e] hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  {isActionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                  ) : (
                    <KeyRound className="w-4 h-4 text-teal-400" />
                  )}
                  <span>Sign In with Supabase Auth</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
