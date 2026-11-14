import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  MessageSquare,
  Send,
  ShieldAlert,
  Clock,
  CheckCheck,
  Stethoscope,
  PhoneCall,
  Calendar,
  FileText,
  Plus,
  Archive,
  RotateCcw,
  CheckCircle2,
  Paperclip,
  X,
  Lock,
  Sparkles,
} from 'lucide-react';
import { Avatar } from '../../common/Avatar';
import {
  getVisibleConversationsForPatient,
  getConversationMessages,
  isConversationAwaitingDoctorReply,
  getUnreadMessageCountForConversation,
  getPatientConnectedDoctors,
} from '../../../utils/rules';
import { ConversationStatus, MessageCategory, MessageAttachment } from '../../../types';

export const PatientMessagesView: React.FC = () => {
  const {
    activePatient,
    conversations,
    patientMessages,
    doctorsDirectory,
    appointments,
    encounters,
    patientDocuments,
    selectedConversationId,
    setSelectedConversationId,
    startOrSelectConversation,
    sendPatientMessage,
    markConversationRead,
    updateConversationStatus,
    setActiveTab,
    setPortalMode,
    switchUser,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'Active' | 'Archived'>('Active');
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [category, setCategory] = useState<MessageCategory>('General Query');
  const [selectedAppointmentIdForMsg, setSelectedAppointmentIdForMsg] = useState<string>('');
  const [selectedAttachmentDocId, setSelectedAttachmentDocId] = useState<string>('');
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Connected doctors for this patient (prioritizing doctors from appointments, prescriptions, or primary physician)
  const connectedDoctorEntries = useMemo(
    () =>
      getPatientConnectedDoctors(
        activePatient,
        doctorsDirectory,
        appointments,
        encounters
      ),
    [activePatient, doctorsDirectory, appointments, encounters]
  );

  // All conversations belonging to activePatient
  const allPatientConversations = useMemo(
    () => getVisibleConversationsForPatient(conversations, activePatient.id, 'All'),
    [conversations, activePatient.id]
  );

  const activeConversationsList = useMemo(
    () => getVisibleConversationsForPatient(conversations, activePatient.id, 'Active'),
    [conversations, activePatient.id]
  );

  const archivedConversationsList = useMemo(
    () => getVisibleConversationsForPatient(conversations, activePatient.id, 'Archived'),
    [conversations, activePatient.id]
  );

  const displayedConversations =
    statusFilter === 'Active' ? activeConversationsList : archivedConversationsList;

  // Determine the currently open conversation for activePatient
  const currentConversation = useMemo(() => {
    if (selectedConversationId) {
      const match = allPatientConversations.find((c) => c.id === selectedConversationId);
      if (match) return match;
    }
    return displayedConversations[0] || allPatientConversations[0] || null;
  }, [selectedConversationId, allPatientConversations, displayedConversations]);

  // Mark unread doctor replies as read when patient opens the conversation
  useEffect(() => {
    if (currentConversation && currentConversation.patientId === activePatient.id) {
      const unreadFromDoctor = getUnreadMessageCountForConversation(
        patientMessages,
        currentConversation.id,
        'Patient'
      );
      if (unreadFromDoctor > 0) {
        markConversationRead(currentConversation.id, 'Patient');
      }
    }
  }, [currentConversation?.id, activePatient.id, patientMessages.length]);

  const currentMessages = useMemo(() => {
    if (!currentConversation) return [];
    return getConversationMessages(patientMessages, currentConversation.id);
  }, [patientMessages, currentConversation]);

  const isAwaitingDoctorReply = useMemo(() => {
    if (!currentConversation) return false;
    return isConversationAwaitingDoctorReply(patientMessages, currentConversation.id);
  }, [patientMessages, currentConversation]);

  // Appointments between activePatient and currentConversation.doctorId
  const doctorRelatedAppointments = useMemo(() => {
    if (!currentConversation) return [];
    return appointments.filter(
      (a) =>
        a.patientId === activePatient.id &&
        (a.doctorId === currentConversation.doctorId ||
          a.doctorName.toLowerCase().includes(currentConversation.doctorName.toLowerCase()))
    );
  }, [appointments, activePatient.id, currentConversation]);

  // Patient's available documents for optional attachment reference
  const myDocuments = useMemo(
    () => patientDocuments.filter((d) => d.patientId === activePatient.id),
    [patientDocuments, activePatient.id]
  );

  const selectedDocForAttachment = useMemo(
    () => myDocuments.find((d) => d.id === selectedAttachmentDocId) || null,
    [myDocuments, selectedAttachmentDocId]
  );

  const handleStartConversationWithDoctor = (
    doctorId: string,
    defaultAppointmentId?: string
  ) => {
    const conv = startOrSelectConversation(doctorId, defaultAppointmentId);
    if (conv) {
      setStatusFilter('Active');
      setSelectedConversationId(conv.id);
      setIsNewConversationModalOpen(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !currentConversation) return;

    const attachment: MessageAttachment | undefined = selectedDocForAttachment
      ? {
          fileName: selectedDocForAttachment.title,
          fileType: selectedDocForAttachment.fileType,
          fileSize: selectedDocForAttachment.fileSize,
          documentId: selectedDocForAttachment.id,
          category: selectedDocForAttachment.category,
        }
      : undefined;

    const relatedAptId =
      selectedAppointmentIdForMsg || currentConversation.relatedAppointmentId;

    const sent = sendPatientMessage(
      messageText.trim(),
      currentConversation.doctorId,
      currentConversation.doctorName,
      category,
      relatedAptId,
      attachment
    );

    if (sent) {
      setMessageText('');
      setSelectedAttachmentDocId('');
      setShowAttachmentPicker(false);
      setFeedbackNotice(
        `Message delivered to ${currentConversation.doctorName}'s hospital inbox. Status: Awaiting Doctor Reply.`
      );
      setTimeout(() => setFeedbackNotice(null), 4500);
    }
  };

  const handleToggleArchive = (convId: string, currentStatus: ConversationStatus) => {
    const nextStatus: ConversationStatus =
      currentStatus === 'Active' ? 'Archived' : 'Active';
    const res = updateConversationStatus(convId, nextStatus);
    if (res.success) {
      setStatusFilter(nextStatus);
      setFeedbackNotice(
        nextStatus === 'Archived'
          ? 'Conversation archived. You can view or restore it anytime from the Archived tab.'
          : 'Conversation restored to Active threads.'
      );
      setTimeout(() => setFeedbackNotice(null), 3500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-teal-700 font-bold text-xs uppercase tracking-wider mb-1">
            <MessageSquare className="w-4 h-4" />
            <span>Care Team Communication</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Messages & Follow-Up Queries
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Send non-urgent questions regarding appointments, prescriptions, lab reports, or follow-up care directly to your consulting doctors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsNewConversationModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Doctor Conversation</span>
          </button>
        </div>
      </div>

      {/* Non-Emergency Communication Boundary Notice */}
      <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950">
            <p className="font-bold">
              Routine Care Coordination Only — Not an Emergency Service
            </p>
            <p className="text-amber-800 mt-0.5 leading-relaxed">
              Messages are delivered to your doctor&apos;s Hospital Dashboard inbox and are not monitored continuously. Do not use messaging for chest pain, severe breathlessness, or life-threatening emergencies.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('patient-emergency')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Emergency: Call 108</span>
        </button>
      </div>

      {feedbackNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackNotice}</span>
          </div>
          {currentConversation && (
            <button
              type="button"
              onClick={() => {
                switchUser(currentConversation.doctorId);
                setPortalMode('hospital');
                setActiveTab('messages');
              }}
              className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
            >
              Open {currentConversation.doctorName}&apos;s Hospital Inbox →
            </button>
          )}
        </div>
      )}

      {/* Main Two-Column Messaging Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Patient's Conversations + Connected Care Team */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                My Conversations
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
                  Active ({activeConversationsList.length})
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
                  Archived ({archivedConversationsList.length})
                </button>
              </div>
            </div>

            {displayedConversations.length === 0 ? (
              <div className="p-6 text-center space-y-3">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  No {statusFilter.toLowerCase()} conversations
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {statusFilter === 'Active'
                    ? 'Start a conversation with one of your consulting specialists below.'
                    : 'You have not archived any conversations yet.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {displayedConversations.map((conv) => {
                  const isSelected = currentConversation?.id === conv.id;
                  const convMsgs = getConversationMessages(patientMessages, conv.id);
                  const lastMsg = convMsgs[convMsgs.length - 1];
                  const unreadFromDoctor = getUnreadMessageCountForConversation(
                    patientMessages,
                    conv.id,
                    'Patient'
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
                        src={conv.doctorPhotoUrl}
                        name={conv.doctorName}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {conv.doctorName}
                          </p>
                          {unreadFromDoctor > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-bold shrink-0">
                              {unreadFromDoctor} new
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-teal-700 font-medium truncate">
                          {conv.doctorSpecialty || conv.doctorDepartment}
                        </p>

                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {conv.relatedAppointmentId && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {conv.relatedAppointmentId}
                            </span>
                          )}
                          {awaitingReply ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              Awaiting Doctor Reply
                            </span>
                          ) : convMsgs.length > 0 ? (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Doctor Replied
                            </span>
                          ) : null}
                        </div>

                        {lastMsg && (
                          <p className="text-[11px] text-slate-500 truncate mt-1.5">
                            <span className="font-semibold text-slate-700">
                              {lastMsg.senderRole === 'Patient' ? 'You: ' : 'Doctor: '}
                            </span>
                            {lastMsg.text}
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

          {/* Connected Care Team Quick-Start Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Your Consulting Doctors
              </h3>
              <span className="text-[10px] text-teal-700 font-semibold">
                Click to message
              </span>
            </div>
            <div className="space-y-2">
              {connectedDoctorEntries.map(({ doctor, isConnected, relationshipLabels, relatedAppointments }) => {
                const existingConv = allPatientConversations.find(
                  (c) => c.doctorId === doctor.id
                );
                return (
                  <button
                    key={doctor.id}
                    type="button"
                    onClick={() =>
                      handleStartConversationWithDoctor(
                        doctor.id,
                        relatedAppointments[0]?.id
                      )
                    }
                    className="w-full p-2.5 rounded-2xl border border-slate-200/80 hover:border-teal-300 hover:bg-teal-50/30 transition-all flex items-center justify-between gap-2.5 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={doctor.photoUrl} name={doctor.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {doctor.name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {doctor.specialty}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {relationshipLabels.slice(0, 2).map((lbl) => (
                            <span
                              key={lbl}
                              className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                                isConnected
                                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {lbl}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-teal-700 shrink-0 px-2 py-1 rounded-lg bg-teal-50">
                      {existingConv ? 'Open' : 'Start'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Active Conversation Thread */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col min-h-[560px] overflow-hidden">
          {!currentConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Start a Conversation with Your Doctor
              </h3>
              <p className="text-xs text-slate-500 max-w-md">
                Select one of your consulting doctors from the left panel or click &ldquo;New Doctor Conversation&rdquo; to ask a question about an appointment, prescription, or report.
              </p>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={currentConversation.doctorPhotoUrl}
                    name={currentConversation.doctorName}
                    size="md"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        {currentConversation.doctorName}
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          currentConversation.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {currentConversation.status}
                      </span>
                    </div>
                    <p className="text-xs text-teal-700 font-medium">
                      {currentConversation.doctorSpecialty ||
                        currentConversation.doctorDepartment}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isAwaitingDoctorReply && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Awaiting Doctor Reply</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      handleToggleArchive(
                        currentConversation.id,
                        currentConversation.status
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {currentConversation.status === 'Active' ? (
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

              {/* Linked Appointment & Privacy Context Bar */}
              <div className="px-4 py-2.5 bg-teal-50/40 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2 text-slate-600">
                  <Lock className="w-3.5 h-3.5 text-teal-600" />
                  <span>
                    Private conversation between <strong>{activePatient.name}</strong> and{' '}
                    <strong>{currentConversation.doctorName}</strong>
                  </span>
                  {currentConversation.relatedAppointmentId && (
                    <span className="px-2 py-0.5 rounded-md bg-white border border-teal-200 text-teal-800 text-[11px] font-semibold">
                      Linked Appointment: {currentConversation.relatedAppointmentId}
                    </span>
                  )}
                </div>

                {doctorRelatedAppointments.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Ref Visit:
                    </span>
                    <select
                      value={
                        selectedAppointmentIdForMsg ||
                        currentConversation.relatedAppointmentId ||
                        ''
                      }
                      onChange={(e) => setSelectedAppointmentIdForMsg(e.target.value)}
                      className="text-[11px] px-2 py-0.5 rounded-lg border border-slate-200 bg-white text-slate-700"
                    >
                      <option value="">General Consultation</option>
                      {doctorRelatedAppointments.map((apt) => (
                        <option key={apt.id} value={apt.id}>
                          {apt.id} ({apt.date} • {apt.type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Message Stream */}
              <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[420px] bg-slate-50/30">
                {currentMessages.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <Stethoscope className="w-8 h-8 text-teal-600/50 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">
                      Start your conversation with {currentConversation.doctorName}
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Send your question below. Your message will appear in {currentConversation.doctorName}&apos;s Hospital Dashboard inbox for a personal clinician reply.
                    </p>
                  </div>
                ) : (
                  currentMessages.map((msg) => {
                    const isPatient =
                      msg.senderRole === 'Patient' || msg.sender === 'patient';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isPatient ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isPatient
                                ? 'bg-teal-100 text-teal-900'
                                : 'bg-blue-100 text-blue-900'
                            }`}
                          >
                            {isPatient
                              ? `Patient • ${activePatient.name}`
                              : `Doctor • ${msg.doctorName}`}
                          </span>
                          {msg.category && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                              {msg.category}
                            </span>
                          )}
                        </div>

                        <div
                          className={`max-w-xl p-4 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                            isPatient
                              ? 'bg-teal-700 text-white rounded-br-xs'
                              : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-line">{msg.text}</p>

                          {msg.attachment && (
                            <div
                              className={`mt-3 p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                                isPatient
                                  ? 'bg-teal-800/70 border-teal-500/40 text-teal-50'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold truncate">
                                    {msg.attachment.fileName}
                                  </p>
                                  <p className="text-[10px] opacity-80">
                                    {msg.attachment.fileType} • {msg.attachment.fileSize}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/15">
                                Attached Record
                              </span>
                            </div>
                          )}

                          <div
                            className={`flex items-center justify-end gap-1.5 mt-2 text-[10px] ${
                              isPatient ? 'text-teal-100' : 'text-slate-400'
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
                              {isPatient
                                ? msg.isRead
                                  ? 'Read by Doctor'
                                  : 'Delivered • Unread by Doctor'
                                : msg.isRead
                                ? 'Read'
                                : 'New Reply'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input Composer */}
              <form
                onSubmit={handleSend}
                className="p-4 border-t border-slate-100 bg-white space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                      Query Topic:
                    </span>
                    {(
                      [
                        'General Query',
                        'Medication Review',
                        'Lab Follow-up',
                        'Appointment',
                        'Follow-up Coordination',
                        'Administrative Query',
                      ] as const
                    ).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                          category === cat
                            ? 'bg-teal-700 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAttachmentPicker(!showAttachmentPicker)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-teal-600" />
                    <span>
                      {selectedDocForAttachment
                        ? 'Change Attached Record'
                        : 'Attach Health Record'}
                    </span>
                  </button>
                </div>

                {showAttachmentPicker && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">
                        Select a Health Record from Your File to Reference:
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAttachmentPicker(false)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {myDocuments.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => {
                            setSelectedAttachmentDocId(doc.id);
                            setShowAttachmentPicker(false);
                          }}
                          className={`p-2 rounded-lg border text-left text-xs flex items-center justify-between cursor-pointer ${
                            selectedAttachmentDocId === doc.id
                              ? 'bg-teal-50 border-teal-400 text-teal-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate">{doc.title}</span>
                          <span className="text-[10px] text-slate-400 ml-2 shrink-0">
                            {doc.fileType}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDocForAttachment && (
                  <div className="px-3 py-2 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between text-xs text-teal-900">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-teal-600" />
                      <span>
                        Attached Record: <strong>{selectedDocForAttachment.title}</strong> ({selectedDocForAttachment.fileType}, {selectedDocForAttachment.fileSize})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedAttachmentDocId('')}
                      className="text-teal-700 hover:text-teal-900 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={`Write a message to ${currentConversation.doctorName}...`}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200/90 text-xs text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:border-teal-600"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim()}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Message</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Modal to Start a New Conversation with a Connected Doctor */}
      {isNewConversationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Select a Doctor to Message
                </h3>
                <p className="text-xs text-slate-500">
                  Choose from your connected care team or hospital specialists.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewConversationModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {connectedDoctorEntries.map(
                ({ doctor, isConnected, relationshipLabels, relatedAppointments }) => (
                  <button
                    key={doctor.id}
                    type="button"
                    onClick={() =>
                      handleStartConversationWithDoctor(
                        doctor.id,
                        relatedAppointments[0]?.id
                      )
                    }
                    className="w-full p-3.5 rounded-2xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 transition-all flex items-center justify-between gap-3 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={doctor.photoUrl} name={doctor.name} size="md" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {doctor.name}
                        </p>
                        <p className="text-[11px] text-teal-700 font-medium truncate">
                          {doctor.specialty}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {relationshipLabels.map((lbl) => (
                            <span
                              key={lbl}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isConnected
                                  ? 'bg-teal-100 text-teal-900'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {lbl}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold shrink-0">
                      Select
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
