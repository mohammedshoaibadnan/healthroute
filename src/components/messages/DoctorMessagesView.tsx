import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  MessageSquare,
  Send,
  Clock,
  CheckCheck,
  ShieldAlert,
  Lock,
  Calendar,
  FileText,
  Archive,
  RotateCcw,
  Search,
  UserCheck,
  AlertCircle,
  Stethoscope,
  Sparkles,
  CheckCircle2,
  Building2,
  PhoneCall,
} from 'lucide-react';
import { Avatar } from '../common/Avatar';
import {
  getVisibleConversationsForStaff,
  getConversationMessages,
  isConversationAwaitingDoctorReply,
  getUnreadMessageCountForConversation,
  canDoctorReplyToConversation,
  canAccessConversation,
} from '../../utils/rules';
import { ConversationStatus, MessageCategory } from '../../types';

export const DoctorMessagesView: React.FC = () => {
  const {
    currentUser,
    allStaff,
    switchUser,
    conversations,
    patientMessages,
    patients,
    appointments,
    encounters,
    selectedConversationId,
    setSelectedConversationId,
    sendDoctorReply,
    markConversationRead,
    updateConversationStatus,
    setActiveTab,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'Active' | 'Archived'>('Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyCategory, setReplyCategory] = useState<MessageCategory>('Follow-up Coordination');
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const isDoctorOrAdmin =
    currentUser.role === 'doctor' || currentUser.role === 'cmo' || currentUser.role === 'admin';

  // Conversations authorized for current staff member
  const allAuthorizedConversations = useMemo(
    () => getVisibleConversationsForStaff(conversations, currentUser, 'All'),
    [conversations, currentUser]
  );

  const activeCount = useMemo(
    () => allAuthorizedConversations.filter((c) => c.status === 'Active').length,
    [allAuthorizedConversations]
  );

  const archivedCount = useMemo(
    () => allAuthorizedConversations.filter((c) => c.status === 'Archived').length,
    [allAuthorizedConversations]
  );

  const filteredConversations = useMemo(() => {
    const byStatus = getVisibleConversationsForStaff(conversations, currentUser, statusFilter);
    if (!searchQuery.trim()) return byStatus;
    const q = searchQuery.toLowerCase().trim();
    return byStatus.filter(
      (c) =>
        c.patientName.toLowerCase().includes(q) ||
        c.doctorName.toLowerCase().includes(q) ||
        (c.relatedAppointmentId && c.relatedAppointmentId.toLowerCase().includes(q))
    );
  }, [conversations, currentUser, statusFilter, searchQuery]);

  // Select first available authorized conversation if current selection is not accessible
  const activeConversation = useMemo(() => {
    if (selectedConversationId) {
      const found = allAuthorizedConversations.find((c) => c.id === selectedConversationId);
      if (found) return found;
    }
    return filteredConversations[0] || allAuthorizedConversations[0] || null;
  }, [selectedConversationId, allAuthorizedConversations, filteredConversations]);

  // Automatically mark patient messages as read when the assigned doctor (or admin) opens the conversation
  useEffect(() => {
    if (
      activeConversation &&
      canAccessConversation(
        { type: 'staff', id: currentUser.id, role: currentUser.role },
        activeConversation
      )
    ) {
      const unreadCount = getUnreadMessageCountForConversation(
        patientMessages,
        activeConversation.id,
        'Doctor'
      );
      if (unreadCount > 0) {
        markConversationRead(activeConversation.id, 'Doctor');
      }
    }
  }, [activeConversation?.id, currentUser.id, currentUser.role, patientMessages.length]);

  const activeMessages = useMemo(() => {
    if (!activeConversation) return [];
    return getConversationMessages(patientMessages, activeConversation.id);
  }, [patientMessages, activeConversation]);

  const activePatientRecord = useMemo(() => {
    if (!activeConversation) return null;
    return patients.find((p) => p.id === activeConversation.patientId) || null;
  }, [patients, activeConversation]);

  const relatedAppointment = useMemo(() => {
    if (!activeConversation?.relatedAppointmentId) return null;
    return appointments.find((a) => a.id === activeConversation.relatedAppointmentId) || null;
  }, [appointments, activeConversation]);

  const patientLatestEncounter = useMemo(() => {
    if (!activeConversation) return null;
    return (
      encounters.find(
        (e) =>
          e.patientId === activeConversation.patientId &&
          (!e.doctorId || e.doctorId === activeConversation.doctorId)
      ) || null
    );
  }, [encounters, activeConversation]);

  const totalUnreadForDoctor = useMemo(() => {
    return allAuthorizedConversations.reduce(
      (sum, conv) => sum + getUnreadMessageCountForConversation(patientMessages, conv.id, 'Doctor'),
      0
    );
  }, [allAuthorizedConversations, patientMessages]);

  const awaitingReplyCount = useMemo(() => {
    return allAuthorizedConversations.filter(
      (conv) =>
        conv.status === 'Active' && isConversationAwaitingDoctorReply(patientMessages, conv.id)
    ).length;
  }, [allAuthorizedConversations, patientMessages]);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !replyText.trim()) return;

    const result = sendDoctorReply(activeConversation.id, replyText.trim(), replyCategory);
    if (!result.success) {
      setFeedbackBanner({
        type: 'error',
        text: result.error || 'Could not send reply.',
      });
      return;
    }

    setReplyText('');
    setFeedbackBanner({
      type: 'success',
      text: `Reply delivered to ${activeConversation.patientName}. Patient notification dispatched.`,
    });
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  const handleToggleArchive = (convId: string, currentStatus: ConversationStatus) => {
    const nextStatus: ConversationStatus = currentStatus === 'Active' ? 'Archived' : 'Active';
    const res = updateConversationStatus(convId, nextStatus);
    if (res.success) {
      setFeedbackBanner({
        type: 'success',
        text:
          nextStatus === 'Archived'
            ? 'Conversation moved to Archived threads. Full message history preserved.'
            : 'Conversation restored to Active inbox.',
      });
      setTimeout(() => setFeedbackBanner(null), 3500);
    }
  };

  const doctorStaffProfiles = useMemo(
    () => allStaff.filter((s) => s.role === 'doctor' || s.role === 'cmo'),
    [allStaff]
  );

  return (
    <div className="space-y-5">
      {/* Top Clinical Header & Doctor Isolation Status */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-700 font-bold text-xs uppercase tracking-wider mb-1">
              <MessageSquare className="w-4 h-4 text-teal-600" />
              <span>Connected Doctor–Patient Messaging Inbox</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Patient Communications & Follow-Up Coordination
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Two-way clinical coordination linked with patient appointments, prescriptions, and diagnostic records.
            </p>
          </div>

          {/* Summary KPI Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3.5 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-900">
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                Assigned Threads
              </p>
              <p className="text-base font-bold">{allAuthorizedConversations.length}</p>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Awaiting Doctor Reply
              </p>
              <p className="text-base font-bold">{awaitingReplyCount}</p>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-900">
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                Unread Patient Msgs
              </p>
              <p className="text-base font-bold">{totalUnreadForDoctor}</p>
            </div>
          </div>
        </div>

        {/* Role & Doctor Isolation Notice + Quick Specialist Switcher for Demo Verification */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2 text-xs text-slate-600">
            <Lock className="w-4 h-4 text-teal-600 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              {currentUser.role === 'admin' ? (
                <>
                  Viewing as <strong className="text-slate-900">{currentUser.name} (Hospital Administrator)</strong> — Administrative oversight enabled across hospital conversations.
                </>
              ) : isDoctorOrAdmin ? (
                <>
                  Viewing inbox for <strong className="text-slate-900">{currentUser.name}</strong> ({currentUser.specialty || currentUser.department}). Strict doctor privacy enforced: you can only view and reply to conversations assigned to your doctor ID (<code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">{currentUser.id}</code>).
                </>
              ) : (
                <>
                  Viewing as <strong className="text-slate-900">{currentUser.name} ({currentUser.role.toUpperCase()})</strong> — Private doctor–patient conversations are restricted to the assigned physician.
                </>
              )}
            </span>
          </div>

          {/* Demo Doctor Profile Switcher (Clearly labelled as simulation, not real authentication) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Demo Doctor Inbox Switcher:
            </span>
            {doctorStaffProfiles.map((doc) => {
              const isCurrent = currentUser.id === doc.id;
              const docConvCount = conversations.filter((c) => c.doctorId === doc.id).length;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => switchUser(doc.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{doc.name.replace('Dr. ', 'Dr. ')}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                      isCurrent ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {docConvCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Routine Coordination & Non-Emergency Boundary Notice */}
      <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Clinical Communication Boundary: </span>
            <span>
              This messaging channel is strictly for routine, non-urgent outpatient coordination (appointment questions, follow-up timing, lab report availability, and administrative queries). It is not monitored continuously for medical emergencies and must not be used for automated diagnosis or emergency triage.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100/90 border border-rose-200 text-rose-900 font-bold text-[11px] shrink-0">
          <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
          <span>Emergency Care: 108</span>
        </div>
      </div>

      {feedbackBanner && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-[11px] underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {!isDoctorOrAdmin ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Doctor–Patient Conversations Are Role-Restricted
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Your active session role is <strong>{currentUser.designation} ({currentUser.role.toUpperCase()})</strong>. Only the assigned doctor or an authorised hospital administrator may read or reply to patient clinical messages.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => switchUser('staff-doc-1')}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer"
            >
              Switch Demo Session to Dr. Vikram Malhotra
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Assigned Patient Conversations List */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Patient Conversations
                </h2>
                <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('Active')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      statusFilter === 'Active'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Active ({activeCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('Archived')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      statusFilter === 'Archived'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Archived ({archivedCount})
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search patient name or appointment ID..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-hidden focus:border-teal-600"
                />
              </div>
            </div>

            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  No {statusFilter.toLowerCase()} conversations found
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {statusFilter === 'Active'
                    ? `No active patient message threads are currently assigned to ${currentUser.name}.`
                    : 'Archived conversations will appear here while preserving full message history.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {filteredConversations.map((conv) => {
                  const isSelected = activeConversation?.id === conv.id;
                  const convMsgs = getConversationMessages(patientMessages, conv.id);
                  const lastMsg = convMsgs[convMsgs.length - 1];
                  const unreadCount = getUnreadMessageCountForConversation(
                    patientMessages,
                    conv.id,
                    'Doctor'
                  );
                  const awaitingReply = isConversationAwaitingDoctorReply(
                    patientMessages,
                    conv.id
                  );

                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setSelectedConversationId(conv.id)}
                      className={`w-full p-4 text-left transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-teal-50/70 border-l-4 border-teal-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <Avatar
                        src={conv.patientPhotoUrl}
                        name={conv.patientName}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {conv.patientName}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            {unreadCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-bold">
                                {unreadCount} new
                              </span>
                            )}
                          </div>
                        </div>

                        {currentUser.role === 'admin' && (
                          <p className="text-[10px] font-semibold text-teal-700 truncate mt-0.5">
                            Assigned: {conv.doctorName}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {conv.relatedAppointmentId && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {conv.relatedAppointmentId}
                            </span>
                          )}
                          {awaitingReply ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              Awaiting Reply
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Replied
                            </span>
                          )}
                        </div>

                        {lastMsg ? (
                          <p className="text-[11px] text-slate-500 truncate mt-1.5">
                            <span className="font-semibold text-slate-700">
                              {lastMsg.senderRole === 'Patient' ? 'Patient: ' : 'You: '}
                            </span>
                            {lastMsg.text}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic mt-1">
                            Conversation initialized
                          </p>
                        )}

                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(conv.lastMessageAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Active Conversation Thread & Clinical Context */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col min-h-[600px] overflow-hidden">
            {!activeConversation ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Select a Patient Conversation
                </h3>
                <p className="text-xs text-slate-500 max-w-md">
                  Choose a conversation from your inbox on the left to review patient questions, check linked appointment context, and send a verified clinician response.
                </p>
              </div>
            ) : (
              <>
                {/* Conversation Thread Header */}
                <div className="p-4 border-b border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={activeConversation.patientPhotoUrl}
                      name={activeConversation.patientName}
                      size="md"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          {activeConversation.patientName}
                        </h3>
                        {activePatientRecord && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                            {activePatientRecord.age}y • {activePatientRecord.gender} •{' '}
                            {activePatientRecord.permanentMrn || activePatientRecord.id}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            activeConversation.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          {activeConversation.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Attending Specialist: <strong className="text-slate-700">{activeConversation.doctorName}</strong> ({activeConversation.doctorSpecialty || activeConversation.doctorDepartment})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {isConversationAwaitingDoctorReply(
                      patientMessages,
                      activeConversation.id
                    ) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold">
                        <Clock className="w-3 h-3 text-amber-700" />
                        <span>Patient Awaiting Reply</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleToggleArchive(
                          activeConversation.id,
                          activeConversation.status
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {activeConversation.status === 'Active' ? (
                        <>
                          <Archive className="w-3.5 h-3.5 text-slate-500" />
                          <span>Archive</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
                          <span>Restore Active</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Connected Clinical Context Bar (Appointment & Diagnosis Reference) */}
                <div className="px-4 py-2.5 bg-teal-50/40 border-b border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-3 text-slate-600">
                    {relatedAppointment ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-teal-600" />
                        <span>
                          Linked Visit: <strong>{relatedAppointment.id}</strong> ({relatedAppointment.date} at {relatedAppointment.timeSlot} • {relatedAppointment.status})
                        </span>
                      </span>
                    ) : activeConversation.relatedAppointmentId ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-teal-600" />
                        <span>Linked Visit: {activeConversation.relatedAppointmentId}</span>
                      </span>
                    ) : null}

                    {patientLatestEncounter && (
                      <span className="inline-flex items-center gap-1.5 text-slate-600">
                        <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                        <span className="truncate max-w-xs">
                          Recent Assessment: <strong>{patientLatestEncounter.assessmentDiagnosis}</strong>
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('appointments')}
                      className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                    >
                      View Appointments
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('clinical')}
                      className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                    >
                      Clinical Chart
                    </button>
                  </div>
                </div>

                {/* Chronological Message Stream */}
                <div className="flex-1 p-5 space-y-4 overflow-y-auto bg-slate-50/30 max-h-[420px]">
                  {activeMessages.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      No messages in this conversation yet.
                    </div>
                  ) : (
                    activeMessages.map((msg) => {
                      const isDoctorSender =
                        msg.senderRole === 'Doctor' || msg.sender === 'doctor';

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            isDoctorSender ? 'items-end' : 'items-start'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1 px-1">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isDoctorSender
                                  ? 'bg-teal-100 text-teal-900'
                                  : 'bg-slate-200 text-slate-800'
                              }`}
                            >
                              {isDoctorSender
                                ? `Doctor • ${msg.doctorName}`
                                : `Patient • ${msg.patientName || activeConversation.patientName}`}
                            </span>
                            {msg.category && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                                {msg.category}
                              </span>
                            )}
                          </div>

                          <div
                            className={`max-w-xl p-4 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                              isDoctorSender
                                ? 'bg-teal-700 text-white rounded-br-xs'
                                : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-xs'
                            }`}
                          >
                            <p className="whitespace-pre-line">{msg.text}</p>

                            {msg.attachment && (
                              <div
                                className={`mt-3 p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                                  isDoctorSender
                                    ? 'bg-teal-800/70 border-teal-500/40 text-teal-50'
                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-4 h-4 shrink-0 text-teal-500" />
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-bold truncate">
                                      {msg.attachment.fileName}
                                    </p>
                                    <p className="text-[10px] opacity-80">
                                      {msg.attachment.fileType} • {msg.attachment.fileSize}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-500/20">
                                  Attached Record
                                </span>
                              </div>
                            )}

                            <div
                              className={`flex items-center justify-end gap-2 mt-2 text-[10px] ${
                                isDoctorSender ? 'text-teal-100' : 'text-slate-400'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>
                                {new Date(msg.timestamp).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span>•</span>
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>
                                {isDoctorSender
                                  ? msg.isRead
                                    ? 'Read by Patient'
                                    : 'Delivered • Unread by Patient'
                                  : msg.isRead
                                  ? 'Read by Doctor'
                                  : 'Unread'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Doctor Reply Composer */}
                {canDoctorReplyToConversation(currentUser, activeConversation) ? (
                  <form
                    onSubmit={handleSendReply}
                    className="p-4 border-t border-slate-200/80 bg-white space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                          Response Topic:
                        </span>
                        {(
                          [
                            'Follow-up Coordination',
                            'Medication Review',
                            'Lab Follow-up',
                            'Appointment',
                            'General Query',
                          ] as const
                        ).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setReplyCategory(cat)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                              replyCategory === cat
                                ? 'bg-teal-700 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      {/* Quick Coordination Snippets */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setReplyText(
                              `Thank you for your message. Please continue your current prescribed regimen as scheduled and bring your recent reports to your upcoming consultation.`
                            )
                          }
                          className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 cursor-pointer"
                        >
                          + Routine Follow-up Note
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setReplyText(
                              `I have reviewed your query. Please arrive 15 minutes prior to your scheduled OPD slot with your previous records.`
                            )
                          }
                          className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 cursor-pointer"
                        >
                          + Pre-Visit Instructions
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <textarea
                        rows={2}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Reply as ${currentUser.name} to ${activeConversation.patientName}...`}
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:border-teal-600 resize-none"
                      />
                      <button
                        type="submit"
                        disabled={!replyText.trim()}
                        className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 self-end shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Doctor Reply</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-600 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-500" />
                    <span>
                      Only <strong>{activeConversation.doctorName}</strong> can reply to this conversation.
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
