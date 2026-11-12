import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  AlertCircle, 
  Stethoscope, 
  Scale, 
  Biohazard, 
  Plus, 
  LayoutDashboard, 
  Activity,
  ShieldAlert,
  Flame
} from 'lucide-react';
import { EmergencyDashboard } from '../dashboard/EmergencyDashboard';
import { EmergencyCaseList } from '../cases/EmergencyCaseList';
import { MLCManager } from '../mlc/MLCManager';
import { PoisoningManager } from '../poison/PoisoningManager';

export const EmergencyCareView: React.FC = () => {
  const {
    cases,
    mlcCases,
    poisonCases,
    setIsNewCaseOpen,
    setSelectedCaseId
  } = useApp();

  const [activeEmergencySection, setActiveEmergencySection] = useState<'overview' | 'cases' | 'mlc' | 'poisoning'>('overview');

  const activeCases = cases.filter(
    (c) => !['Discharged', 'Transferred', 'Brought Dead / Expired'].includes(c.status)
  );
  const redCases = cases.filter(
    (c) => c.triageLevel === 'RED' && !['Discharged', 'Transferred', 'Brought Dead / Expired'].includes(c.status)
  );
  const pendingMlc = mlcCases.filter((m) => m.reviewStatus !== 'Signed & Sealed');

  return (
    <div className="space-y-4">
      {/* Emergency Header & Sub-Navigation */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Emergency Care & Acute Services
              </h1>
              {redCases.length > 0 && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                  {redCases.length} Critical Resuscitation
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Dedicated trauma resuscitation, ESI acute triage, Medico-Legal Cases (MLC), and clinical toxicology protocols.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewCaseOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Acute ER Case</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="max-w-7xl mx-auto mt-5 flex items-center gap-2 border-b border-slate-200/80 -mb-5 overflow-x-auto">
          <button
            onClick={() => setActiveEmergencySection('overview')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeEmergencySection === 'overview'
                ? 'border-teal-600 text-teal-800 bg-teal-50/40 rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-xl'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Triage Board & Resus Bays</span>
            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-700">
              {activeCases.length}
            </span>
          </button>

          <button
            onClick={() => setActiveEmergencySection('cases')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeEmergencySection === 'cases'
                ? 'border-teal-600 text-teal-800 bg-teal-50/40 rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-xl'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Active Case Roster</span>
            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-700">
              {cases.length}
            </span>
          </button>

          <button
            onClick={() => setActiveEmergencySection('mlc')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeEmergencySection === 'mlc'
                ? 'border-teal-600 text-teal-800 bg-teal-50/40 rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-xl'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Medico-Legal Cases (MLC)</span>
            {pendingMlc.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-purple-100 text-purple-800">
                {pendingMlc.length} Draft
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveEmergencySection('poisoning')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeEmergencySection === 'poisoning'
                ? 'border-teal-600 text-teal-800 bg-teal-50/40 rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-xl'
            }`}
          >
            <Biohazard className="w-4 h-4" />
            <span>Poisoning & Toxicology</span>
            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-700">
              {poisonCases.length}
            </span>
          </button>
        </div>
      </div>

      {/* Render Selected Emergency Subsection */}
      <div className="pb-8">
        {activeEmergencySection === 'overview' && <EmergencyDashboard />}
        {activeEmergencySection === 'cases' && <EmergencyCaseList />}
        {activeEmergencySection === 'mlc' && <MLCManager />}
        {activeEmergencySection === 'poisoning' && <PoisoningManager />}
      </div>
    </div>
  );
};
