import React from 'react';
import { useApp, NavigationTab } from '../../context/AppContext';
import {
  LayoutDashboard,
  Stethoscope,
  UserPlus,
  Scale,
  Biohazard,
  Truck,
  FileText,
  ShieldCheck,
} from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab, cases, mlcCases } = useApp();

  const activeCasesCount = cases.filter(c => !['Discharged', 'Transferred', 'Brought Dead / Expired'].includes(c.status)).length;
  const pendingMlcCount = mlcCases.filter(m => m.reviewStatus !== 'Signed & Sealed').length;

  const tabs: Array<{ id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cases', label: 'Cases', icon: Stethoscope, badge: activeCasesCount },
    { id: 'registration', label: 'Intake', icon: UserPlus },
    { id: 'mlc', label: 'MLC', icon: Scale, badge: pendingMlcCount },
    { id: 'poisoning', label: 'Tox', icon: Biohazard },
    { id: 'transfers', label: 'Transfer', icon: Truck },
    { id: 'documents', label: 'Docs', icon: FileText },
    { id: 'admin', label: 'Admin', icon: ShieldCheck },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center p-1 relative rounded-lg transition-colors ${
              isActive ? 'text-teal-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <Icon className="w-4 h-4" />
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-bold px-1 rounded-full">
                  {tab.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
