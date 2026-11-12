import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  Plus, 
  Play, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Stethoscope, 
  Building2,
  CalendarCheck2,
  Phone,
  FileText,
  User
} from 'lucide-react';
import { Appointment, AppointmentStatus, AppointmentType } from '../../types';
import { Avatar } from '../common/Avatar';

export const AppointmentsView: React.FC = () => {
  const {
    appointments,
    updateAppointmentStatus,
    startConsultation,
    setIsNewAppointmentOpen,
    setActiveTab,
    patients,
    allStaff
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'today' | 'all'>('today');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const todayDate = new Date().toISOString().split('T')[0];

  const filteredAppointments = appointments.filter((apt) => {
    if (selectedDateFilter === 'today' && apt.date !== todayDate) return false;
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
    if (typeFilter !== 'all' && apt.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = apt.patientName.toLowerCase().includes(q);
      const matchPhone = apt.patientPhone.includes(q);
      const matchToken = String(apt.tokenNumber).includes(q);
      const matchReason = apt.chiefComplaint.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchToken && !matchReason) return false;
    }
    return true;
  });

  const todayList = appointments.filter((a) => a.date === todayDate);
  const waitingCount = todayList.filter((a) => a.status === 'Waiting').length;
  const inConsultCount = todayList.filter((a) => a.status === 'In Consultation').length;
  const completedCount = todayList.filter((a) => a.status === 'Completed').length;

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'Waiting':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'In Consultation':
        return 'bg-teal-50 text-teal-800 border-teal-200 animate-pulse';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Scheduled':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'No Show':
      case 'Cancelled':
        return 'bg-slate-100 text-slate-600 border-slate-200';
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
            Real-time outpatient consultation schedule, token numbers, and clinical note triggers.
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

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Today's Schedule</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-1.5 tabular-nums">{todayList.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Booked outpatient slots</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">Waiting in Lobby</div>
          <div className="text-3xl font-extrabold text-amber-900 mt-1.5 tabular-nums">{waitingCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Checked-in & ready</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-700">In Consultation</div>
          <div className="text-3xl font-extrabold text-teal-900 mt-1.5 tabular-nums">{inConsultCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Active doctor encounter</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Completed</div>
          <div className="text-3xl font-extrabold text-emerald-900 mt-1.5 tabular-nums">{completedCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Prescription & notes done</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, token number, phone number, or reason..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-teal-500 bg-slate-50/60"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date filter */}
            <select
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-hidden focus:border-teal-500 font-semibold cursor-pointer"
            >
              <option value="today">Today's Appointments</option>
              <option value="all">All Dates</option>
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-hidden focus:border-teal-500 font-semibold cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Waiting">Waiting</option>
              <option value="In Consultation">In Consultation</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {/* Type filter */}
            <select
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
                filteredAppointments.map((apt) => (
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
                          <div className="text-[10px] text-teal-700 font-semibold">{apt.roomNumber || 'Room 204'}</div>
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
                      {apt.notes && <p className="text-[10px] text-slate-400 truncate mt-0.5">{apt.notes}</p>}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-5">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(apt.status)}`}>
                        {apt.status}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
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

                        {apt.status === 'Scheduled' && (
                          <>
                            <button
                              onClick={() => updateAppointmentStatus(apt.id, 'Waiting')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
                              title="Mark as arrived at clinic"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Check-In</span>
                            </button>
                            <button
                              onClick={() => updateAppointmentStatus(apt.id, 'Cancelled')}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Cancel slot"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
