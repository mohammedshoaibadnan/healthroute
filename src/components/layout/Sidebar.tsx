import React from 'react';
import { useApp, NavigationTab } from '../../context/AppContext';
import {
  LayoutDashboard,
  UserPlus,
  Stethoscope,
  Scale,
  Biohazard,
  Truck,
  FileText,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
  Siren,
  Database,
  Building2,
} from 'lucide-react';

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeColor?: string;
  description: string;
}

export const Sidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    cases, 
    mlcCases, 
    poisonCases, 
    transfers, 
    patients,
    currentUser,
    switchRole,
    setIsFirebaseArchitectureOpen
  } = useApp();

  const unidentifiedCount = patients.filter(p => p.isUnidentified).length;
  const activeCasesCount = cases.filter(c => !['Discharged', 'Transferred', 'Brought Dead / Expired'].includes(c.status)).length;
  const pendingMlcCount = mlcCases.filter(m => m.reviewStatus !== 'Signed & Sealed').length;
  const activePoisonCount = poisonCases.length;
  const enRouteTransfers = transfers.filter(t => t.status === 'Ambulance En-Route' || t.status === 'Initiated').length;

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Emergency Dashboard',
      icon: LayoutDashboard,
      badge: activeCasesCount > 0 ? activeCasesCount : undefined,
      badgeColor: 'bg-teal-600 text-white',
      description: 'Active triage & bay overview',
    },
    {
      id: 'cases',
      label: 'Emergency Cases',
      icon: Stethoscope,
      badge: activeCasesCount,
      badgeColor: 'bg-blue-600 text-white',
      description: 'Triage, vitals & care notes',
    },
    {
      id: 'registration',
      label: 'Patient Intake & Temp IDs',
      icon: UserPlus,
      badge: unidentifiedCount > 0 ? `${unidentifiedCount} Temp` : undefined,
      badgeColor: 'bg-amber-600 text-white',
      description: 'Unidentified intake & records',
    },
    {
      id: 'mlc',
      label: 'Medico-Legal (MLC)',
      icon: Scale,
      badge: pendingMlcCount > 0 ? `${pendingMlcCount} Draft` : undefined,
      badgeColor: 'bg-purple-600 text-white',
      description: 'Wound charts & police intimation',
    },
    {
      id: 'poisoning',
      label: 'Poisoning Protocol',
      icon: Biohazard,
      badge: activePoisonCount > 0 ? activePoisonCount : undefined,
      badgeColor: 'bg-rose-600 text-white',
      description: 'Atropine titration & tox reports',
    },
    {
      id: 'transfers',
      label: 'Patient Transfers',
      icon: Truck,
      badge: enRouteTransfers > 0 ? `${enRouteTransfers} Active` : undefined,
      badgeColor: 'bg-emerald-600 text-white',
      description: 'Inter-facility transfer summaries',
    },
    {
      id: 'documents',
      label: 'Document Centre',
      icon: FileText,
      description: 'Case sheets, slips & legal certs',
    },
    {
      id: 'admin',
      label: 'Admin & Audit Logs',
      icon: ShieldCheck,
      description: 'Staff roster & activity trail',
    },
  ];

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200/90 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-69px)]">
      {/* Top Nav Items */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Emergency Modules
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-[#0b192e] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <div className="text-left">
                  <div className="leading-tight">{item.label}</div>
                  <div className={`text-[10px] ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                    {item.description}
                  </div>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    item.badgeColor || 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Information & Quick Role Bar */}
      <div className="p-3 border-t border-slate-200/80 bg-slate-50/70 space-y-3">
        {/* Unidentified Patients Alert Pill */}
        {unidentifiedCount > 0 && (
          <div 
            onClick={() => setActiveTab('registration')}
            className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs cursor-pointer hover:bg-amber-100/70 transition-colors"
          >
            <div className="flex items-center gap-1.5 font-semibold text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{unidentifiedCount} Unidentified Patient{unidentifiedCount > 1 ? 's' : ''}</span>
            </div>
            <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">
              Temporary emergency IDs active. Reconciliation required upon identification.
            </p>
          </div>
        )}

        {/* Quick Role Switcher Bar */}
        <div>
          <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Demo Role Access</span>
            <span className="text-teal-600 font-semibold">{currentUser.role.toUpperCase()}</span>
          </div>
          <div className="grid grid-cols-5 gap-1 text-[10px] font-semibold text-center">
            {(['doctor', 'cmo', 'nurse', 'records', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => switchRole(r)}
                className={`py-1 rounded capitalize transition-all border ${
                  currentUser.role === r
                    ? 'bg-[#0b192e] text-white border-slate-900 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title={`Switch to ${r.toUpperCase()} role`}
              >
                {r === 'records' ? 'Rec' : r}
              </button>
            ))}
          </div>
        </div>

        {/* Firebase Blueprint Box */}
        <div 
          onClick={() => setIsFirebaseArchitectureOpen(true)}
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs cursor-pointer hover:border-teal-500 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-semibold text-slate-800">Firebase Arch</span>
          </div>
          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
            READY
          </span>
        </div>
      </div>
    </aside>
  );
};
