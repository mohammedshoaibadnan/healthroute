import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Calendar, Clock, User, Phone, Stethoscope, AlertCircle } from 'lucide-react';
import { AppointmentType } from '../../types';

export const NewAppointmentModal: React.FC = () => {
  const { 
    isNewAppointmentOpen, 
    setIsNewAppointmentOpen, 
    bookAppointment, 
    patients, 
    currentUser 
  } = useApp();

  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  
  // New patient fields
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('45');
  const [patientGender, setPatientGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [patientPhone, setPatientPhone] = useState('+91 98800 00000');

  // Appointment details
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('11:45 AM');
  const [type, setType] = useState<AppointmentType>('New Consultation');
  const [chiefComplaint, setChiefComplaint] = useState('Routine clinical checkup & review');
  const [notes, setNotes] = useState('Patient scheduled for OPD clinic evaluation.');
  const [roomNumber, setRoomNumber] = useState('Room 204');

  if (!isNewAppointmentOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'existing') {
      const selected = patients.find((p) => p.id === selectedPatientId);
      if (selected) {
        bookAppointment({
          patientId: selected.id,
          patientName: selected.name,
          patientAge: selected.age,
          patientGender: selected.gender,
          patientPhone: selected.contactNumber,
          date,
          timeSlot,
          type,
          chiefComplaint,
          notes,
          doctorName: currentUser.name,
          roomNumber,
        });
      }
    } else {
      if (!patientName.trim()) return;
      bookAppointment({
        patientName,
        patientAge: parseInt(patientAge, 10) || 40,
        patientGender,
        patientPhone,
        date,
        timeSlot,
        type,
        chiefComplaint,
        notes,
        doctorName: currentUser.name,
        roomNumber,
      });
    }

    setIsNewAppointmentOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0b192e] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Schedule Outpatient Appointment</h2>
              <p className="text-xs text-slate-300">Apex City Hospital & Healthcare Centre • OPD Clinic</p>
            </div>
          </div>
          <button
            onClick={() => setIsNewAppointmentOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {/* Patient Selection Toggle */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Patient Selection</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setMode('existing')}
                className={`py-1.5 rounded-md font-semibold transition-all ${
                  mode === 'existing' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Existing Registered Patient
              </button>
              <button
                type="button"
                onClick={() => setMode('new')}
                className={`py-1.5 rounded-md font-semibold transition-all ${
                  mode === 'new' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                New Walk-In Intake
              </button>
            </div>
          </div>

          {mode === 'existing' ? (
            <div>
              <label className="block text-slate-700 font-medium mb-1">Select Patient from Records</label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-teal-500 font-medium"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.age}y / {p.gender}) — {p.isUnidentified ? `[TEMP: ${p.tempId}]` : p.id}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smt. Kamala Devi"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-teal-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Age</label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Gender</label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-teal-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-teal-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Date, Time & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Appointment Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Time Slot</label>
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-teal-500"
              >
                <option value="09:00 AM">09:00 AM</option>
                <option value="09:30 AM">09:30 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="10:30 AM">10:30 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="11:30 AM">11:30 AM</option>
                <option value="11:45 AM">11:45 AM</option>
                <option value="12:00 PM">12:00 PM</option>
                <option value="12:30 PM">12:30 PM</option>
                <option value="02:00 PM">02:00 PM</option>
                <option value="02:30 PM">02:30 PM</option>
                <option value="03:00 PM">03:00 PM</option>
                <option value="03:30 PM">03:30 PM</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Consultation Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AppointmentType)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-teal-500"
              >
                <option value="New Consultation">New Consultation</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Routine Review">Routine Review</option>
                <option value="Pre-Operative Clearance">Pre-Op Clearance</option>
                <option value="Post-Discharge Review">Post-Discharge</option>
                <option value="Teleconsultation">Teleconsultation</option>
              </select>
            </div>
          </div>

          {/* Doctor & Room */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Attending Physician</label>
              <input
                type="text"
                disabled
                value={currentUser.name}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Consultation Chamber</label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-teal-500"
              />
            </div>
          </div>

          {/* Chief Complaint & Reason */}
          <div>
            <label className="block text-slate-700 font-medium mb-1">Chief Complaint / Reason for Visit *</label>
            <input
              type="text"
              required
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="e.g. Recurrent retrosternal heaviness on exertion, BP monitoring"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-teal-500"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-slate-700 font-medium mb-1">Preliminary Triage / Reception Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-teal-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewAppointmentOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-xs transition-colors"
            >
              Confirm Appointment Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
