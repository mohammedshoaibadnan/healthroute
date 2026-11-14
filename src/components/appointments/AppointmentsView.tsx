import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Calendar, 
  Clock, 
  Search, 
  Plus, 
  Play, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Stethoscope, 
  CalendarCheck2,
  Phone,
  AlertCircle,
  Video,
  Building2,
  RefreshCw,
  Check,
  Lock
} from 'lucide-react';
import { Appointment } from '../../types';
import { Avatar } from '../common/Avatar';
import {
  getAppointmentStatusBadge,
  filterHospitalAppointments,
  canManageAppointmentRequest,
} from '../../utils/rules';
import {
  DoctorDeclineRequestModal,
  DoctorProposeRescheduleModal,
} from './DoctorRequestActionModals';

export const AppointmentsView: React.FC = () => {
  const {
    currentUser,
    appointments,
    updateAppointmentStatus,
    acceptPatientAppointmentRequest,
    startConsultation,
    setIsNewAppointmentOpen,
    setActiveTab,
    patients,
    allStaff,
    doctorsDirectory,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'today' | 'upcoming' | 'requested' | 'all'>('today');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [doctorFilter, setDoctorFilter] = useState<string>('all');

  const [declineTarget, setDeclineTarget] = useState<Appointment | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const todayDate = new Date().toISOString().split('T')[0];

  const scopedAppointments = filterHospitalAppointments(
    appointments,
    selectedDateFilter,
    todayDate,
    doctorFilter
  );

  const filteredAppointments = scopedAppointments.filter((apt) => {
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
    if (typeFilter !== 'all' && apt.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = apt.patientName.toLowerCase().includes(q);
      const matchPhone = apt.patientPhone.includes(q);
      const matchToken = String(apt.tokenNumber).includes(q);
      const matchReason = apt.chiefComplaint.toLowerCase().includes(q);
      const matchDoc = apt.doctorName.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchToken && !matchReason && !matchDoc) return false;
    }
    return true;
  });

  const todayList = appointments.filter((a) => a.date === todayDate && a.status !== 'Requested');
  const upcomingList = appointments.filter(
    (a) => a.date > todayDate && !['Cancelled', 'Completed', 'No Show', 'Requested'].includes(a.status)
  );
  const requestedList = appointments.filter(
    (a) => a.status === 'Requested' || (a.status === 'Rescheduled' && a.rescheduleResponseStatus === 'Rejected')
  );
  const pendingRescheduleList = appointments.filter(
    (a) => a.status === 'Rescheduled' && a.rescheduleResponseStatus === 'Pending'
  );
  const waitingCount = todayList.filter((a) => a.status === 'Waiting').length;
  const inConsultCount = todayList.filter((a) => a.status === 'In Consultation').length;
  const completedCount = todayList.filter((a) => a.status === 'Completed').length;

  const handleAcceptRequest = (apt: Appointment) => {
    const res = acceptPatientAppointmentRequest(apt.id);
    if (res.success) {
      setFeedbackBanner({
        type: 'success',
        text: `Appointment ${apt.id} for ${apt.patientName} accepted and scheduled by ${currentUser.name}.`,
      });
    } else {
      setFeedbackBanner({
        type: 'error',
        text: res.error || 'Unable to accept appointment request.',
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Outpatient Appointments & Patient Queue
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              OPD Clinic
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time outpatient consultation schedule, upcoming bookings, patient portal requests, and token queue.
          </p>
        </div>

        <button
          onClick={() => setIsNewAppointmentOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs shadow-teal-600/20 transition-all cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div
          role="status"
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-medium ${
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
            className="text-[11px] font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div
          onClick={() => setSelectedDateFilter('today')}
          className={`bg-white rounded-2xl border p-4 shadow-xs cursor-pointer transition-all ${
            selectedDateFilter === 'today' ? 'border-teal-500 ring-2 ring-teal-500/10' : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Today's Consultations</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-1.5 tabular-nums">{todayList.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">{waitingCount} waiting • {inConsultCount} active</div>
        </div>
        <div
          onClick={() => setSelectedDateFilter('upcoming')}
          className={`bg-white rounded-2xl border p-4 shadow-xs cursor-pointer transition-all ${
            selectedDateFilter === 'upcoming' ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-700">Upcoming Schedule</div>
          <div className="text-3xl font-extrabold text-blue-900 mt-1.5 tabular-nums">{upcomingList.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Future scheduled dates</div>
        </div>
        <div
          onClick={() => setSelectedDateFilter('requested')}
          className={`bg-white rounded-2xl border p-4 shadow-xs cursor-pointer transition-all ${
            selectedDateFilter === 'requested' ? 'border-amber-500 ring-2 ring-amber-500/10' : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">Patient Requests</div>
          <div className="text-3xl font-extrabold text-amber-900 mt-1.5 tabular-nums">{requestedList.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {pendingRescheduleList.length > 0
              ? `${pendingRescheduleList.length} reschedule proposed`
              : 'Awaiting hospital approval'}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-700">In Consultation</div>
          <div className="text-3xl font-extrabold text-teal-900 mt-1.5 tabular-nums">{inConsultCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Active doctor encounter</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Completed Today</div>
          <div className="text-3xl font-extrabold text-emerald-900 mt-1.5 tabular-nums">{completedCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Prescription & notes done</div>
        </div>
      </div>

      {/* Patient Booking Requests Awaiting Approval Section */}
      <div className="bg-amber-50/70 rounded-2xl border border-amber-200/90 p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-slate-900">
                  Patient Booking Requests Awaiting Approval
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  {requestedList.length} Pending Request{requestedList.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Review incoming appointment requests. Only the assigned specialist (or hospital administrator) can accept, decline, or propose a new schedule.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDateFilter(selectedDateFilter === 'requested' ? 'today' : 'requested')}
            className="text-xs font-bold text-amber-900 hover:text-amber-950 bg-white px-3 py-1.5 rounded-xl border border-amber-200 shadow-2xs cursor-pointer self-start sm:self-center"
          >
            {selectedDateFilter === 'requested' ? "Show Today's Consultations" : 'Filter Requests Only'}
          </button>
        </div>

        {requestedList.length === 0 ? (
          <div className="bg-white/90 rounded-xl p-5 border border-amber-200/60 text-center space-y-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
            <p className="text-xs font-bold text-slate-800">No Pending Patient Booking Requests</p>
            <p className="text-[11px] text-slate-500">All incoming patient appointment requests have been reviewed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-1">
            {requestedList.map((req) => {
              const pat = patients.find((p) => p.id === req.patientId || p.name === req.patientName);
              const isAuthorized = canManageAppointmentRequest(currentUser, req);
              const isRejectedReschedule = req.status === 'Rescheduled' && req.rescheduleResponseStatus === 'Rejected';

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl p-4 border border-amber-200/90 shadow-2xs flex flex-col justify-between gap-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar
                        src={req.patientPhotoUrl || pat?.photoUrl}
                        name={req.patientName}
                        gender={req.patientGender}
                        size="md"
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{req.patientName}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getAppointmentStatusBadge(req.status)}`}>
                            {req.status}
                          </span>
                          {isRejectedReschedule && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                              Patient Rejected Proposed Slot
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {req.patientAge}y • {req.patientGender} • {req.patientPhone}
                          {pat?.permanentMrn ? ` • MRN: ${pat.permanentMrn}` : ''}
                        </p>
                        <p className="text-[11px] text-teal-800 font-semibold truncate">
                          Assigned Doctor: {req.doctorName} ({req.department || 'OPD'})
                        </p>
                        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-700 pt-0.5">
                          <span className="flex items-center gap-1 font-bold text-slate-900">
                            <Calendar className="w-3.5 h-3.5 text-amber-600" />
                            {req.date}
                          </span>
                          <span className="flex items-center gap-1 font-bold text-slate-900">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            {req.timeSlot}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {req.type}
                          </span>
                          {req.consultationMode && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold">
                              {req.consultationMode.includes('Video') ? (
                                <Video className="w-3 h-3 text-teal-600" />
                              ) : (
                                <Building2 className="w-3 h-3 text-teal-600" />
                              )}
                              {req.consultationMode}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 italic pt-0.5">
                          Reason: "{req.chiefComplaint}"
                        </p>
                        {isRejectedReschedule && req.proposedDate && (
                          <p className="text-[11px] text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 mt-1">
                            Rejected Proposal: {req.proposedDate} at {req.proposedTimeSlot}
                            {req.reschedulePatientNote ? ` — "${req.reschedulePatientNote}"` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg shrink-0">
                      #{req.tokenNumber}
                    </span>
                  </div>

                  {/* Action Controls for Assigned Doctor */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    {isAuthorized ? (
                      <>
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Authorised as {currentUser.name}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAcceptRequest(req)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept Request</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRescheduleTarget(req)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold transition-all cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Propose Reschedule</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeclineTarget(req)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Decline</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full flex items-center justify-between gap-2 text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                        <span className="flex items-center gap-1.5 font-medium text-slate-700">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Assigned to <strong>{req.doctorName}</strong> — Only the assigned doctor can manage this request</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        {/* Schedule Scope Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: `Today's Consultations (${todayList.length})` },
              { id: 'upcoming', label: `Upcoming Appointments (${upcomingList.length})` },
              { id: 'requested', label: `Patient Booking Requests (${requestedList.length})` },
              { id: 'all', label: `All Appointments (${appointments.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedDateFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedDateFilter === tab.id
                    ? 'bg-[#0b192e] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            Showing {filteredAppointments.length} appointment{filteredAppointments.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, doctor, token number, phone number, or reason..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-teal-500 bg-slate-50/60"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Specialist Doctor filter */}
            <select
              aria-label="Filter by Specialist Doctor"
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-hidden focus:border-teal-500 font-semibold cursor-pointer"
            >
              <option value="all">All 6 Specialists</option>
              {doctorsDirectory.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>

            {/* Status filter — all 8 statuses supported */}
            <select
              aria-label="Filter by Appointment Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-hidden focus:border-teal-500 font-semibold cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Requested">Requested</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Rescheduled">Rescheduled</option>
              <option value="Waiting">Waiting</option>
              <option value="In Consultation">In Consultation</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No Show">No Show</option>
            </select>

            {/* Type filter */}
            <select
              aria-label="Filter by Consultation Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-hidden focus:border-teal-500 font-semibold cursor-pointer"
            >
              <option value="all">All Consultation Types</option>
              <option value="New Consultation">New Consultation</option>
              <option value="Follow-up Review">Follow-up Review</option>
              <option value="Chronic Care Review">Chronic Care Review</option>
              <option value="Post-Operative Check">Post-Operative Check</option>
              <option value="Preventive Health Assessment">Preventive Check</option>
              <option value="Specialist Referral">Specialist Referral</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointments Master Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-5">Token & Time</th>
                <th className="py-3.5 px-5">Patient Details</th>
                <th className="py-3.5 px-5">Doctor & Room</th>
                <th className="py-3.5 px-5">Type</th>
                <th className="py-3.5 px-5">Chief Complaint / Reason</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <CalendarCheck2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No appointments found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => {
                  const isAuthorized = canManageAppointmentRequest(currentUser, apt);
                  return (
                    <tr key={apt.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Token & Time */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-xl bg-[#0b192e] text-teal-300 font-extrabold flex items-center justify-center text-xs shrink-0 shadow-xs">
                            #{apt.tokenNumber}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span className="tabular-nums">{apt.timeSlot}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">{apt.date}</span>
                            {apt.proposedDate && apt.status === 'Rescheduled' && (
                              <div className="text-[10px] text-indigo-700 font-semibold mt-0.5">
                                Proposed: {apt.proposedDate} • {apt.proposedTimeSlot}
                              </div>
                            )}
                            {apt.originalDate && apt.originalDate !== apt.date && (
                              <div className="text-[10px] text-slate-400">
                                Orig: {apt.originalDate} ({apt.originalTimeSlot})
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={apt.patientPhotoUrl || patients.find((p) => p.id === apt.patientId || p.name === apt.patientName)?.photoUrl}
                            name={apt.patientName}
                            gender={apt.patientGender}
                            size="md"
                            status={apt.status === 'In Consultation' ? 'in-consult' : apt.status === 'Waiting' ? 'waiting' : undefined}
                            className="ring-2 ring-slate-100"
                          />
                          <div>
                            <div className="font-bold text-slate-900 text-sm leading-tight hover:text-teal-900 transition-colors">{apt.patientName}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="font-medium">{apt.patientAge}y • {apt.patientGender}</span>
                              <span className="text-slate-300">•</span>
                              <span className="flex items-center gap-0.5 font-mono text-[10px] text-slate-500">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {apt.patientPhone}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Doctor & Room */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            src={apt.doctorPhotoUrl || allStaff.find((s) => s.id === apt.doctorId || s.name === apt.doctorName)?.photoUrl}
                            name={apt.doctorName}
                            size="xs"
                          />
                          <div>
                            <div className="font-semibold text-slate-900 text-xs">{apt.doctorName}</div>
                            <div className="text-[10px] text-teal-700 font-semibold">{apt.roomNumber || apt.roomNo || 'Room 204'}</div>
                            {apt.acceptedByDoctorName && (
                              <div className="text-[10px] text-emerald-700 font-medium">
                                Accepted by {apt.acceptedByDoctorName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-4 px-5">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200/80">
                          {apt.type}
                        </span>
                      </td>

                      {/* Complaint */}
                      <td className="py-4 px-5 max-w-xs">
                        <p className="text-slate-800 font-medium truncate">{apt.chiefComplaint}</p>
                        {apt.declineReason && (
                          <p className="text-[10px] text-rose-600 font-medium truncate mt-0.5">
                            Declined: {apt.declineReason}
                          </p>
                        )}
                        {!apt.declineReason && apt.cancellationReason && (
                          <p className="text-[10px] text-rose-600 font-medium truncate mt-0.5">
                            Cancelled: {apt.cancellationReason}
                          </p>
                        )}
                        {apt.rescheduleReason && (
                          <p className="text-[10px] text-indigo-700 font-medium truncate mt-0.5">
                            Reschedule Note: {apt.rescheduleReason}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold border ${getAppointmentStatusBadge(apt.status)}`}>
                            {apt.status}
                          </span>
                          {apt.status === 'Rescheduled' && apt.rescheduleResponseStatus && (
                            <div className="text-[10px] font-semibold text-indigo-700">
                              {apt.rescheduleResponseStatus === 'Pending'
                                ? 'Awaiting Patient Reply'
                                : `Patient ${apt.rescheduleResponseStatus}`}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {apt.status === 'Waiting' && (
                            <button
                              onClick={() => startConsultation(apt.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Start Consult</span>
                            </button>
                          )}

                          {apt.status === 'In Consultation' && (
                            <button
                              onClick={() => startConsultation(apt.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
                            >
                              <Stethoscope className="w-3.5 h-3.5" />
                              <span>Continue</span>
                            </button>
                          )}

                          {apt.status === 'Requested' && (
                            isAuthorized ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleAcceptRequest(apt)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Accept</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRescheduleTarget(apt)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-semibold text-xs cursor-pointer"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Reschedule</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeclineTarget(apt)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs cursor-pointer"
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>Decline</span>
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                Assigned to {apt.doctorName}
                              </span>
                            )
                          )}

                          {(apt.status === 'Scheduled' || apt.status === 'Rescheduled' || apt.status === 'Confirmed') && (
                            <>
                              {apt.status !== 'Rescheduled' && (
                                <button
                                  onClick={() => updateAppointmentStatus(apt.id, 'Waiting')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
                                  title="Mark as arrived at clinic"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Check-In</span>
                                </button>
                              )}
                              {isAuthorized && (
                                <button
                                  type="button"
                                  onClick={() => setRescheduleTarget(apt)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-semibold text-xs cursor-pointer"
                                  title="Propose a new date and time"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Reschedule</span>
                                </button>
                              )}
                              {isAuthorized && (
                                <button
                                  onClick={() => setDeclineTarget(apt)}
                                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Decline or cancel appointment"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}

                          {apt.status === 'Completed' && (
                            <button
                              onClick={() => setActiveTab('clinical')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-xs hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>View Note</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals for Declining and Proposing Reschedule */}
      {declineTarget && (
        <DoctorDeclineRequestModal
          appointment={declineTarget}
          onClose={() => setDeclineTarget(null)}
        />
      )}
      {rescheduleTarget && (
        <DoctorProposeRescheduleModal
          appointment={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
        />
      )}
    </div>
  );
};


