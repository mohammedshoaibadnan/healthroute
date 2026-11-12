import React from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  UserCheck, 
  FileText, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Share2, 
  KeyRound,
  History
} from 'lucide-react';

export const PatientPrivacyView: React.FC = () => {
  const { 
    privacySettings, 
    updatePrivacySettings, 
    accessAuditLogs, 
    activePatient 
  } = useApp();

  const handleToggle = (key: keyof typeof privacySettings) => {
    updatePrivacySettings({ [key]: !privacySettings[key] });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Privacy, Consent & Data Governance</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Patient Sovereignty</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage electronic health record sharing, consent authorisations, and view verifiable clinician access logs
          </p>
        </div>
      </div>

      {/* Consent Notice */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
        <p className="font-bold text-slate-900 flex items-center gap-1.5">
          <Lock className="w-4 h-4 text-teal-600" />
          <span>Patient Consent Framework Notice</span>
        </p>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          HealthRoute enforces granular role-based permissions. Authorised hospital clinicians only access patient records required for direct clinical care, triage, and pharmacy fulfillment. You can inspect every access record and toggle optional data-sharing preferences below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Consent Toggles */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-teal-600" />
              <span>Data Sharing & Consent Preferences</span>
            </h3>
            <span className="text-[10px] text-slate-400">Manage anytime</span>
          </div>

          <div className="space-y-4">
            {/* Toggle 1: Emergency Access */}
            <div className="flex items-start justify-between gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-900 text-xs">Emergency First-Responder Fast-Track Access</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Allows emergency trauma and casualty doctors to access your critical drug allergies and stent implants immediately during an acute crisis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('emergencyAccessGranted')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  privacySettings.emergencyAccessGranted ? 'bg-teal-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    privacySettings.emergencyAccessGranted ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Specialist Collaboration */}
            <div className="flex items-start justify-between gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-900 text-xs">Inter-Department Specialist Care Sharing</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Permits cross-specialty physicians (e.g. Neurology, Nephrology) at Apex City Hospital to review historical lab reports when referred.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('shareWithSpecialists')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  privacySettings.shareWithSpecialists ? 'bg-teal-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    privacySettings.shareWithSpecialists ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 3: Family Proxy Access */}
            <div className="flex items-start justify-between gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-900 text-xs">Designated Family Member Proxy Access</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Authorized proxy: <strong>{privacySettings.familyMemberName || 'Sunita Reddy (Spouse)'}</strong>. Allows appointment scheduling and lab report collection.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('familyAccessGranted')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  privacySettings.familyAccessGranted ? 'bg-teal-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    privacySettings.familyAccessGranted ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 4: Anonymized Research Consent */}
            <div className="flex items-start justify-between gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-900 text-xs">Anonymized Academic Research Participation</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Allow de-identified cardiac outcome metrics to contribute to cardiovascular clinical research studies.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('anonymizedResearchConsent')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  privacySettings.anonymizedResearchConsent ? 'bg-teal-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    privacySettings.anonymizedResearchConsent ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Verifiable Access History Audit Log */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-teal-600" />
              <span>Verifiable Record Access History</span>
            </h3>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Live Audit Trail
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Every clinical team member who opened, reviewed, or updated your electronic medical file is logged below.
          </p>

          <div className="space-y-3">
            {accessAuditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{log.accessorName}</span>
                    <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded font-semibold border border-teal-200">
                      {log.accessorRole}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                </div>

                <p className="text-slate-600 text-[11px] font-medium">{log.purpose}</p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>{log.department}</span>
                  <span className="text-slate-600 font-semibold">{log.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
