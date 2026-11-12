import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  X, 
  Calendar, 
  Clock, 
  Stethoscope, 
  Building2, 
  Video, 
  User, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Avatar } from '../../common/Avatar';

export const BookAppointmentModal: React.FC = () => {
  const { 
    isPatientBookingModalOpen, 
    setIsPatientBookingModalOpen,
    selectedBookingDoctor,
    setSelectedBookingDoctor,
    doctorsDirectory,
    requestPatientAppointment,
    activePatient,
    setActiveTab
  } = useApp();

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [consultationMode, setConsultationMode] = useState<'In-Person OPD' | 'Video Tele-Consult'>('In-Person OPD');
  const [chiefComplaint, setChiefComplaint] = useState<string>('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmedAptId, setConfirmedAptId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (selectedBookingDoctor) {
      setSelectedDoctorId(selectedBookingDoctor.id);
      setSelectedSlot(selectedBookingDoctor.availableSlots[0] || '10:00 AM');
    } else if (doctorsDirectory.length > 0) {
      setSelectedDoctorId(doctorsDirectory[0].id);
      setSelectedSlot(doctorsDirectory[0].availableSlots[0] || '10:00 AM');
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
    setIsConfirmed(false);
    setErrorMsg('');
  }, [isPatientBookingModalOpen, selectedBookingDoctor, doctorsDirectory]);

  if (!isPatientBookingModalOpen) return null;

  const currentDoctor = doctorsDirectory.find((d) => d.id === selectedDoctorId) || doctorsDirectory[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chiefComplaint.trim()) {
      setErrorMsg('Please describe the reason for your consultation.');
      return;
    }
    if (!selectedDate) {
      setErrorMsg('Please select a preferred appointment date.');
      return;
    }

    const newApt = requestPatientAppointment({
      doctorId: currentDoctor.id,
      doctorName: currentDoctor.name,
      doctorPhotoUrl: currentDoctor.photoUrl,
      department: currentDoctor.department,
      date: selectedDate,
      timeSlot: selectedSlot || '10:00 AM',
      type: 'New Consultation',
      chiefComplaint: chiefComplaint.trim(),
      consultationMode,
      hospitalName: currentDoctor.hospitalAffiliation,
    });

    setConfirmedAptId(newApt.id);
    setIsConfirmed(true);
  };

  const handleClose = () => {
    setIsPatientBookingModalOpen(false);
    setSelectedBookingDoctor(null);
    setIsConfirmed(false);
    setChiefComplaint('');
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-400">HealthRoute Outpatient Scheduling</p>
              <h3 className="text-sm font-semibold">Book Doctor Consultation</h3>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confirmation View */}
        {isConfirmed ? (
          <div className="p-8 text-center space-y-5 bg-white">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Booking Request Submitted Successfully
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-2">Appointment #{confirmedAptId}</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your consultation request has been registered in the hospital management queue. A confirmation SMS will be dispatched once the doctor approves the slot.
              </p>
            </div>

            {/* Appointment Summary Box */}
            <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3 text-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                <Avatar src={currentDoctor?.photoUrl} name={currentDoctor?.name || 'Doctor'} size="md" />
                <div>
                  <p className="font-bold text-slate-900">{currentDoctor?.name}</p>
                  <p className="text-teal-700 text-[11px] font-medium">{currentDoctor?.specialty}</p>
                  <p className="text-[10px] text-slate-400">{currentDoctor?.hospitalAffiliation}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400">Scheduled Date:</span>
                  <p className="font-bold text-slate-800">{selectedDate}</p>
                </div>
                <div>
                  <span className="text-slate-400">Time Slot:</span>
                  <p className="font-bold text-slate-800">{selectedSlot}</p>
                </div>
                <div>
                  <span className="text-slate-400">Consultation Type:</span>
                  <p className="font-bold text-slate-800">{consultationMode}</p>
                </div>
                <div>
                  <span className="text-slate-400">Patient:</span>
                  <p className="font-bold text-slate-800">{activePatient.name}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 text-[11px]">
                <span className="text-slate-400">Reason for Visit:</span>
                <p className="text-slate-700 font-medium italic">"{chiefComplaint}"</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  handleClose();
                  setActiveTab('patient-appointments');
                }}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all"
              >
                View in My Appointments
              </button>
              <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer transition-all"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Booking Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs text-slate-700">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Doctor Selection */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Select Specialist / Doctor
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1">
                {doctorsDirectory.map((doc) => {
                  const isSelected = doc.id === selectedDoctorId;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        setSelectedDoctorId(doc.id);
                        setSelectedSlot(doc.availableSlots[0] || '10:00 AM');
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'bg-teal-50/70 border-teal-500 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Avatar src={doc.photoUrl} name={doc.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className={`font-bold truncate ${isSelected ? 'text-teal-950' : 'text-slate-900'}`}>{doc.name}</p>
                        <p className="text-[10px] text-teal-700 truncate">{doc.specialty}</p>
                        <p className="text-[10px] text-slate-400">₹{doc.consultationFee} • {doc.availability}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Consultation Mode */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Consultation Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConsultationMode('In-Person OPD')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    consultationMode === 'In-Person OPD'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Building2 className={`w-4 h-4 ${consultationMode === 'In-Person OPD' ? 'text-teal-400' : 'text-slate-500'}`} />
                  <div>
                    <p className="font-bold text-xs">In-Person OPD</p>
                    <p className={`text-[10px] ${consultationMode === 'In-Person OPD' ? 'text-slate-300' : 'text-slate-400'}`}>Visit hospital consultation suite</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setConsultationMode('Video Tele-Consult')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    consultationMode === 'Video Tele-Consult'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Video className={`w-4 h-4 ${consultationMode === 'Video Tele-Consult' ? 'text-teal-400' : 'text-slate-500'}`} />
                  <div>
                    <p className="font-bold text-xs">Video Tele-Consult</p>
                    <p className={`text-[10px] ${consultationMode === 'Video Tele-Consult' ? 'text-slate-300' : 'text-slate-400'}`}>Online video consultation from home</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Date & Time Slot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Preferred Date
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Available Time Slots
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(currentDoctor?.availableSlots || ['09:00 AM', '10:30 AM', '11:45 AM', '02:30 PM']).map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        selectedSlot === slot
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chief Complaint / Symptoms */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Reason for Visit / Health Symptoms
              </label>
              <textarea
                rows={3}
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="Briefly describe your symptoms, purpose of consultation, or follow-up notes..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500 transition-all placeholder:text-slate-400"
                required
              />
            </div>

            {/* Patient Context Note */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-700">Booking for: </span>
                <span>{activePatient.name} (MRN: {activePatient.permanentMrn || 'AC-BLR-2026-7819'})</span>
              </div>
              <span className="font-mono text-teal-700 font-bold">Estimated Fee: ₹{currentDoctor?.consultationFee || 900}</span>
            </div>

            {/* Submit & Cancel */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <span>Confirm Appointment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
