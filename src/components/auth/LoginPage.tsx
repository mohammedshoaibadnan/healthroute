import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { HOSPITAL_INFO } from '../../data/mockData';
import {
  Activity,
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight,
  Database,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { UserRole } from '../../types';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { allStaff, switchUser, setIsFirebaseArchitectureOpen } = useApp();
  const {
    configStatus,
    isActionLoading,
    authError,
    signInWithPassword,
    enterDemoSimulationMode,
  } = useAuth();

  const [email, setEmail] = useState('v.malhotra@apexhospital.demo.org');
  const [password, setPassword] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('staff-doc-1');

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (configStatus.isConfigured && password.trim().length > 0) {
      const res = await signInWithPassword(email, password);
      if (res.success) {
        onLoginSuccess();
      }
      return;
    }
    await enterDemoSimulationMode();
    switchUser(selectedStaffId);
    onLoginSuccess();
  };

  const handleQuickRoleSelect = async (staffId: string) => {
    await enterDemoSimulationMode();
    switchUser(staffId);
    onLoginSuccess();
  };

  const rolesCatalog = [
    {
      role: 'doctor' as UserRole,
      title: 'Emergency Physician / Consultant',
      staff: allStaff.find((s) => s.role === 'doctor')!,
      color: 'border-blue-200 bg-blue-50/50 hover:border-blue-400',
      badge: 'bg-blue-100 text-blue-800',
      description: 'Acute resuscitation, bedside vitals, drug orders & trauma evaluation',
    },
    {
      role: 'cmo' as UserRole,
      title: 'Casualty Medical Officer (CMO)',
      staff: allStaff.find((s) => s.role === 'cmo')!,
      color: 'border-purple-200 bg-purple-50/50 hover:border-purple-400',
      badge: 'bg-purple-100 text-purple-800',
      description: 'Statutory Medico-Legal signing, wound examination, police intimation',
    },
    {
      role: 'nurse' as UserRole,
      title: 'Emergency Triage Specialist Nurse',
      staff: allStaff.find((s) => s.role === 'nurse')!,
      color: 'border-teal-200 bg-teal-50/50 hover:border-teal-400',
      badge: 'bg-teal-100 text-teal-800',
      description: 'Rapid triage scoring, vital signs monitoring, antidote administration',
    },
    {
      role: 'records' as UserRole,
      title: 'Emergency Records & Admissions',
      staff: allStaff.find((s) => s.role === 'records')!,
      color: 'border-amber-200 bg-amber-50/50 hover:border-amber-400',
      badge: 'bg-amber-100 text-amber-800',
      description: 'Unidentified intake, temporary ID generation, permanent MRN reconciliation',
    },
    {
      role: 'pharmacist' as UserRole,
      title: 'Chief Hospital Pharmacist',
      staff: allStaff.find((s) => s.role === 'pharmacist')!,
      color: 'border-indigo-200 bg-indigo-50/50 hover:border-indigo-400',
      badge: 'bg-indigo-100 text-indigo-800',
      description: 'Central formulary, batch & expiry control, verified prescription dispensing',
    },
    {
      role: 'admin' as UserRole,
      title: 'Hospital Operations Director',
      staff: allStaff.find((s) => s.role === 'admin')!,
      color: 'border-rose-200 bg-rose-50/50 hover:border-rose-400',
      badge: 'bg-rose-100 text-rose-800',
      description: 'System audit trails, staff duty rosters, capacity allocation',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900">
      {/* Top Banner */}
      <div className="bg-[#0b192e] text-white px-4 py-2 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-400" />
          <span className="font-bold tracking-wide">HealthRoute</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300 font-medium">{HOSPITAL_INFO.name}</span>
        </div>
        <button
          onClick={() => setIsFirebaseArchitectureOpen(true)}
          className="text-amber-300 hover:text-amber-200 text-[11px] font-semibold flex items-center gap-1"
        >
          <Database className="w-3.5 h-3.5" />
          <span>Firebase Blueprint</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl w-full mx-auto p-4 sm:p-6 my-auto space-y-8">
        {/* Title */}
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-xl bg-[#0b192e] text-teal-400 flex items-center justify-center mx-auto shadow-md border border-slate-700">
            <Activity className="w-6 h-6 text-teal-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            HealthRoute Emergency Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Secure, role-authorized access for acute trauma intake, Medico-Legal documentation, and emergency transfers.
          </p>
        </div>

        {/* Quick Demo Role Picker Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-400">
              Select Role for Prototype Demonstration
            </span>
            <span className="text-slate-500 font-medium">Click any profile to log in immediately</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rolesCatalog.map((item) => (
              <div
                key={item.staff.id}
                onClick={() => handleQuickRoleSelect(item.staff.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between ${item.color} group`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${item.badge}`}>
                      {item.role}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">{item.staff.employeeCode}</span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-teal-700 transition-colors">
                    {item.staff.name}
                  </h3>
                  <div className="text-xs font-semibold text-slate-700 mt-0.5">{item.title}</div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-teal-700 group-hover:translate-x-0.5 transition-transform">
                  <span>Enter as {item.role.toUpperCase()}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Standard Credentials Form / Supabase SSO */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs max-w-md mx-auto space-y-4">
          <div className="text-center">
            <h3 className="font-bold text-sm text-slate-900">Hospital Staff Single Sign-On</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {configStatus.isConfigured
                ? 'Connected to Supabase PostgreSQL Auth'
                : 'Demo Sandbox Mode (Set VITE_SUPABASE_URL to enable live Auth)'}
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleManualLogin} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Profile</label>
              <select
                value={selectedStaffId}
                onChange={(e) => {
                  setSelectedStaffId(e.target.value);
                  const match = allStaff.find((s) => s.id === e.target.value);
                  if (match) setEmail(match.email);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
              >
                {allStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.designation})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hospital Email</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">PIN / Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Supabase password (or leave blank for Demo)"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isActionLoading}
              className="w-full py-2.5 rounded-lg bg-[#0b192e] hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              {isActionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-teal-400" />
              )}
              <span>Authenticate & Enter Emergency Workspace</span>
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-4 border-t border-slate-200 text-center text-xs text-slate-400 bg-white">
        HealthRoute Emergency Management Prototype • Designed for Indian Healthcare Accreditation & Clinical Coordination
      </footer>
    </div>
  );
};
