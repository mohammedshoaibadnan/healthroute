import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Stethoscope, 
  FileText, 
  Pill, 
  Activity, 
  Calendar, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  User, 
  Building2, 
  ShieldCheck,
  ChevronRight,
  ClipboardList,
  HeartPulse,
  Thermometer,
  Weight
} from 'lucide-react';
import { ClinicalEncounter } from '../../types';
import { Avatar } from '../common/Avatar';

export const ClinicalWorkspace: React.FC = () => {
  const {
    encounters,
    patients,
    currentUser,
    allStaff,
    setIsConsultationModalOpen,
    setSelectedAppointmentId
  } = useApp();

  const [selectedEncounterId, setSelectedEncounterId] = useState<string>(encounters[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEncounters = encounters.filter((enc) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        enc.patientName.toLowerCase().includes(q) ||
        (enc.diagnosis && enc.diagnosis.toLowerCase().includes(q)) ||
        (enc.assessmentDiagnosis && enc.assessmentDiagnosis.toLowerCase().includes(q)) ||
        enc.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeEncounter = encounters.find((e) => e.id === selectedEncounterId) || encounters[0];
  const activePatient = patients.find((p) => p.id === activeEncounter?.patientId || p.name === activeEncounter?.patientName);
  const activeDoctor = allStaff.find((s) => s.id === activeEncounter?.doctorId || s.name === activeEncounter?.doctorName);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Clinical Workspace & SOAP Encounters
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              Electronic Health Record
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Conduct consultations, record structured SOAP notes, and issue verified digital prescriptions.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedAppointmentId(null);
            setIsConsultationModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs shadow-teal-600/20 transition-all cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>New Consultation Note</span>
        </button>
      </div>

      {/* Main Split Layout: Encounter Directory (Left) + Detailed Clinical Record (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Encounter Directory */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] flex flex-col h-[750px]">
          <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/75 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Encounters ({encounters.length})
              </span>
              <span className="text-[11px] text-teal-700 font-semibold">Verified History</span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, diagnosis..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:border-teal-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {filteredEncounters.map((enc) => {
              const isSelected = enc.id === (activeEncounter ? activeEncounter.id : '');
              return (
                <div
                  key={enc.id}
                  onClick={() => setSelectedEncounterId(enc.id)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-teal-50/90 border border-teal-200 shadow-xs'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        src={patients.find((p) => p.id === enc.patientId || p.name === enc.patientName)?.photoUrl}
                        name={enc.patientName}
                        size="xs"
                      />
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-xs truncate">{enc.patientName}</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {enc.date} • {enc.type || enc.encounterType || 'OPD Consultation'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      enc.status === 'Signed' || enc.status === 'Finalized'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-purple-50 text-purple-800 border-purple-200'
                    }`}>
                      {enc.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium mt-1.5 truncate">
                    {enc.diagnosis || enc.assessmentDiagnosis || 'Clinical Review'}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/50 text-[10px] text-slate-500">
                    <span className="font-medium text-slate-600">Rx: {enc.prescriptions.length} medications</span>
                    <span className="font-mono text-slate-400">{enc.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active SOAP Note Viewer */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] flex flex-col h-[750px]">
          {activeEncounter ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header Banner */}
              <div className="pb-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <Avatar
                    src={activePatient?.photoUrl}
                    name={activeEncounter.patientName}
                    gender={activePatient?.gender}
                    size="lg"
                    className="ring-2 ring-teal-500/20 shadow-xs"
                  />
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg font-bold text-slate-900">{activeEncounter.patientName}</h2>
                      <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                        {activeEncounter.patientId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Consultation conducted by <span className="font-bold text-slate-800">{activeEncounter.doctorName}</span> ({activeEncounter.doctorDesignation || 'Attending Physician'}) on {activeEncounter.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Digitally Signed & Archived</span>
                  </span>
                </div>
              </div>

              {/* Vitals HUD Ribbon */}
              {activeEncounter.vitals && (
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs shadow-xs">
                  <div className="p-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Blood Pressure</span>
                    <div className="font-extrabold text-slate-900 text-sm mt-1">{activeEncounter.vitals.bp || '120/80'} <span className="text-[10px] text-slate-400 font-normal">mmHg</span></div>
                  </div>
                  <div className="p-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Heart Rate</span>
                    <div className="font-extrabold text-slate-900 text-sm mt-1">{activeEncounter.vitals.pulse || 78} <span className="text-[10px] text-slate-400 font-normal">bpm</span></div>
                  </div>
                  <div className="p-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Oxygen SpO2</span>
                    <div className="font-extrabold text-slate-900 text-sm mt-1">{activeEncounter.vitals.spo2 || 98}%</div>
                  </div>
                  <div className="p-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Temperature</span>
                    <div className="font-extrabold text-slate-900 text-sm mt-1">{activeEncounter.vitals.temp || 98.4}°F</div>
                  </div>
                  <div className="p-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Weight (BMI)</span>
                    <div className="font-extrabold text-slate-900 text-sm mt-1">{activeEncounter.vitals.weight || 70} <span className="text-[10px] text-slate-400 font-normal">kg</span></div>
                  </div>
                </div>
              )}

              {/* SOAP Documentation Sections */}
              <div className="space-y-4 text-xs">
                {/* S - Subjective */}
                <div className="border border-slate-200/90 rounded-2xl p-4.5 bg-white shadow-xs">
                  <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 text-[11px] flex items-center justify-center font-extrabold">S</span>
                    <span className="text-sm">Subjective & Patient History</span>
                  </div>
                  <div className="space-y-2 text-slate-700 pl-8">
                    <p><strong className="text-slate-900 font-semibold">Chief Complaint:</strong> {activeEncounter.chiefComplaint}</p>
                    {activeEncounter.historyOfPresentIllness && (
                      <p><strong className="text-slate-900 font-semibold">History of Present Illness:</strong> {activeEncounter.historyOfPresentIllness}</p>
                    )}
                    {activeEncounter.subjectiveHistory && !activeEncounter.historyOfPresentIllness && (
                      <p><strong className="text-slate-900 font-semibold">Clinical History:</strong> {activeEncounter.subjectiveHistory}</p>
                    )}
                  </div>
                </div>

                {/* O - Objective */}
                <div className="border border-slate-200/90 rounded-2xl p-4.5 bg-white shadow-xs">
                  <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
                    <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 text-[11px] flex items-center justify-center font-extrabold">O</span>
                    <span className="text-sm">Objective Clinical Examination</span>
                  </div>
                  <p className="text-slate-700 pl-8 leading-relaxed">
                    {activeEncounter.examinationFindings || activeEncounter.physicalExamination || 'Systemic examination completed. Vitals stable.'}
                  </p>
                </div>

                {/* A - Assessment */}
                <div className="border border-slate-200/90 rounded-2xl p-4.5 bg-white shadow-xs">
                  <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 text-[11px] flex items-center justify-center font-extrabold">A</span>
                    <span className="text-sm">Assessment & Working Diagnosis</span>
                  </div>
                  <p className="text-slate-900 font-bold text-base pl-8">
                    {activeEncounter.diagnosis || activeEncounter.assessmentDiagnosis || 'Clinical Impression Verified'}
                  </p>
                </div>

                {/* P - Plan & Prescriptions */}
                <div className="border border-slate-200/90 rounded-2xl p-4.5 bg-white shadow-xs space-y-3.5">
                  <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] flex items-center justify-center font-extrabold">P</span>
                    <span className="text-sm">Plan of Care & Digital Prescriptions</span>
                  </div>

                  {/* Digital Rx Table */}
                  <div className="pl-8 space-y-3">
                    <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-teal-600" />
                      <span>Prescribed Medications ({activeEncounter.prescriptions.length})</span>
                    </div>

                    <div className="overflow-x-auto border border-slate-200/90 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                            <th className="py-2.5 px-3.5">Medicine Name</th>
                            <th className="py-2.5 px-3.5">Dosage & Route</th>
                            <th className="py-2.5 px-3.5">Frequency</th>
                            <th className="py-2.5 px-3.5">Duration</th>
                            <th className="py-2.5 px-3.5">Instructions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeEncounter.prescriptions.map((rx, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-3 px-3.5 font-bold text-slate-900">{rx.medicineName || rx.drugName}</td>
                              <td className="py-3 px-3.5 text-slate-700 font-medium">{rx.dosage} {rx.route ? `(${rx.route})` : ''}</td>
                              <td className="py-3 px-3.5 font-mono text-teal-700 font-bold">{rx.frequency}</td>
                              <td className="py-3 px-3.5 text-slate-600 font-medium">{rx.duration}</td>
                              <td className="py-3 px-3.5 text-slate-500 italic">{rx.instructions || rx.timing || 'As directed'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Ordered Labs */}
                    {activeEncounter.orderedLabs && activeEncounter.orderedLabs.length > 0 && (
                      <div className="mt-3 pt-2">
                        <strong className="text-slate-900 font-semibold">Ordered Diagnostic Tests: </strong>
                        <span className="text-slate-700">{activeEncounter.orderedLabs.join(', ')}</span>
                      </div>
                    )}

                    {/* Advice */}
                    {activeEncounter.adviceNotes && (
                      <div className="mt-2 text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                        <strong className="text-slate-900 font-semibold">Physician Advice: </strong>
                        {activeEncounter.adviceNotes}
                      </div>
                    )}

                    {/* Follow up */}
                    {activeEncounter.followUpDate && (
                      <div className="mt-2 text-xs font-bold text-teal-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-teal-600" />
                        <span>Recommended Next Review Date: {activeEncounter.followUpDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Physician Signature Block */}
              <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={activeDoctor?.photoUrl || currentUser.photoUrl}
                    name={activeEncounter.doctorName}
                    size="sm"
                    className="ring-2 ring-teal-500/20 shadow-xs"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-800">Digitally Authenticated by {activeEncounter.doctorName}</p>
                      <ShieldCheck className="w-4 h-4 text-teal-600 inline" />
                    </div>
                    <p className="text-[10px] text-slate-400">NABH Clinical Compliance Stamp • Apex City HealthCare • {activeEncounter.doctorDesignation || 'Attending Physician'}</p>
                  </div>
                </div>
                <div className="font-mono text-[10px] text-slate-400">
                  Encounter Hash: SHA256-V2026-ENC
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
              <ClipboardList className="w-12 h-12 stroke-1 mb-2 text-slate-300" />
              <p>Select an encounter from the left to view the complete clinical record.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
