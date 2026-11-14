import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  Bell, 
  Calendar, 
  FileText, 
  Pill, 
  MessageSquare,
  CheckCheck, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { PatientNotification } from '../../../types';

export const PatientNotificationsView: React.FC = () => {
  const { 
    patientNotifications, 
    markNotificationRead, 
    markAllNotificationsRead, 
    setActiveTab, 
    setSelectedConversationId,
    activePatient 
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<'all' | 'appointment' | 'message' | 'report' | 'prescription' | 'pharmacy' | 'reminder'>('all');

  const notifications = patientNotifications.filter(
    (n) =>
      n.patientId === activePatient.id &&
      n.targetAudience !== 'doctor' &&
      n.targetAudience !== 'pharmacy'
  );

  const filteredNotifs = notifications.filter((n) => {
    if (categoryFilter === 'all') return true;
    return n.category === categoryFilter;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getCategoryIcon = (category: PatientNotification['category']) => {
    switch (category) {
      case 'appointment':
        return <Calendar className="w-4 h-4 text-teal-600" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case 'report':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'prescription':
      case 'pharmacy':
        return <Pill className="w-4 h-4 text-purple-600" />;
      case 'reminder':
      default:
        return <Clock className="w-4 h-4 text-amber-600" />;
    }
  };

  const handleNotificationClick = (notif: PatientNotification) => {
    markNotificationRead(notif.id);
    if (notif.conversationId) {
      setSelectedConversationId(notif.conversationId);
    }
    if (notif.actionTab) {
      setActiveTab(notif.actionTab);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Notification & Alert Centre</h1>
            {unreadCount > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-200">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time appointment schedule changes, doctor message replies, newly published lab investigation sheets, and reminders
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllNotificationsRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200/80 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-teal-600" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 text-xs font-medium">
        {[
          { id: 'all', label: 'All Notifications' },
          { id: 'appointment', label: 'Appointments' },
          { id: 'message', label: 'Doctor Replies' },
          { id: 'report', label: 'Lab Reports' },
          { id: 'prescription', label: 'Prescriptions' },
          { id: 'pharmacy', label: 'Pharmacy' },
          { id: 'reminder', label: 'Care Reminders' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              categoryFilter === tab.id
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifs.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
            <Bell className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No Notifications in this Category</p>
            <p className="text-xs text-slate-400">You are all caught up with your clinical alerts.</p>
          </div>
        ) : (
          filteredNotifs.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                !notif.isRead
                  ? 'bg-teal-50/40 border-teal-200 shadow-xs hover:bg-teal-50/70'
                  : 'bg-white border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                  {getCategoryIcon(notif.category)}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-xs font-bold ${!notif.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                      {notif.title}
                    </h3>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-teal-600" title="Unread Alert" />
                    )}
                    {notif.priority === 'high' && (
                      <span className="text-[9px] font-bold uppercase text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                        Priority
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">{notif.message}</p>
                  <p className="text-[10px] text-slate-400 pt-1">
                    {new Date(notif.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-center">
                <span className="text-xs text-teal-700 font-semibold hover:underline hidden sm:inline">
                  View Detail
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
