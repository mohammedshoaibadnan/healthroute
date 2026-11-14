import React from 'react';
import { useApp, NavigationTab } from '../../context/AppContext';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Stethoscope,
  ClipboardList,
  MessageSquare,
  AlertCircle,
  Truck,
  FileText,
  Pill,
} from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab, appointments, cases } = useApp();

  const waitingAppointments = appointments.filter((a) => a.status === 'Waiting').length;
  const activeEmergencyCases = cases.filter(
    (c) => !['Discharged', 'Transferred', 'Brought Dead / Expired'].includes(c.status)
  ).length;

  const tabs: Array<{ id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'appointments', label: 'Appts', icon: CalendarClock, badge: waitingAppointments },
    { id: 'clinical', label: 'Clinical', icon: Stethoscope },
    { id: 'pharmacy', label: 'Pharmacy', icon: Pill },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'records', label: 'Records', icon: ClipboardList },
    { id: 'emergency', label: 'ER Care', icon: AlertCircle, badge: activeEmergencyCases },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-1 py-1.5 flex items-center justify-around shadow-lg">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center p-1 relative rounded-lg transition-colors ${
              isActive ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <Icon className="w-4 h-4" />
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1 -right-2 bg-teal-600 text-white text-[9px] font-bold px-1 rounded-full">
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
