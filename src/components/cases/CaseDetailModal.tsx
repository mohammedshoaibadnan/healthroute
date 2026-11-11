import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Stethoscope,
  Activity,
  Bed,
  User,
  ShieldAlert,
  Scale,
  Biohazard,
  Truck,
  Plus,
  Send,
  Printer,
  Clock,
  Heart,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { CaseStatus, ClinicalNote, CaseVitals } from '../../types';

export const CaseDetailModal: React.FC = () => {
  const {
    selectedCaseId,
    setSelectedCaseId,
    cases,
    updateCaseStatus,
    updateCaseVitals,
    addClinicalNote,
    currentUser,
    setActiveTab,
    generateDocument,
    setSelectedDocId,
  } = useApp();

  const activeCase = cases.find((c) => c.id === selectedCaseId);

  // Note form state
  const [newNote, setNewNote] = useState('');
  const [noteCategory, setNoteCategory] = useState<ClinicalNote['category']>('assessment');

  // Vitals edit state
  const [isEditingVitals, setIsEditingVitals] = useState(false);
  const [bp, setBp] = useState('');
  const [pulse, setPulse] = useState<number>(80);
  const [spo2, setSpo2] = useState<number>(98);
  const [temp, setTemp] = useState<number>(98.6);
  const [rr, setRr] = useState<number>(18);
  const [gcs, setGcs] = useState<number>(15);
  const [bloodSugar, setBloodSugar] = useState<number>(110);
  const [painScore, setPainScore] = useState<number>(3);

  if (!activeCase) return null;

  const patient = activeCase.patientSnapshot;

  const handleStartVitalsEdit = () => {
    setBp(activeCase.vitals.bp);
    setPulse(activeCase.vitals.pulse);
    setSpo2(activeCase.vitals.spo2);
    setTemp(activeCase.vitals.temp);
    setRr(activeCase.vitals.rr);
    setGcs(activeCase.vitals.gcs);
    setBloodSugar(activeCase.vitals.bloodSugar || 110);
    setPainScore(activeCase.vitals.painScore || 3);
    setIsEditingVitals(true);
  };

  const handleSaveVitals = (e: React.FormEvent) => {
    e.preventDefault();
    updateCaseVitals(activeCase.id, {
      bp,
      pulse: Number(pulse),
      spo2: Number(spo2),
      temp: Number(temp),
      rr: Number(rr),
      gcs: Number(gcs),
      bloodSugar: Number(bloodSugar),
      painScore: Number(painScore),
      recordedAt: new Date().toISOString(),
    });
    setIsEditingVitals(false);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    addClinicalNote(activeCase.id, newNote.trim(), noteCategory);
    setNewNote('');
  };

  const handleGenerateSheet = () => {
    const doc = generateDocument('EMERGENCY_CASE_SHEET', activeCase.id);
    setSelectedDocId(doc.id);
    setActiveTab('documents');
    setSelectedCaseId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[92vh] flex flex-col">
        {/* Header Strip */}
        <div className="bg-[#0b192e] text-white p-4 sm:p-5 flex items-start justify-between shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800">
                {activeCase.id}
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  activeCase.triageLevel === 'RED'
                    ? 'bg-rose-600 text-white'
                    : activeCase.triageLevel === 'YELLOW'
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                TRIAGE {activeCase.triageLevel} • ESI {activeCase.esiScore}
              </span>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                <Bed className="w-3 h-3 text-slate-400" />
                <span>{activeCase.bedBay}</span>
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold">{patient.name}</h2>
              {patient.isUnidentified && (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono">
                  TEMP ID: {patient.tempId}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-0.5">
              {patient.gender} • {patient.age} yrs • Blood:{' '}
              <strong className="text-white">{patient.bloodGroup || 'Unknown'}</strong> • Allergies:{' '}
              <span className="text-amber-300">{patient.allergies?.join(', ') || 'NKDA'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateSheet}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-teal-400" />
              <span>Print Case Sheet</span>
            </button>
            <button
              onClick={() => setSelectedCaseId(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Top Status & Fast Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">Case Status:</span>
              <select
                value={activeCase.status}
                onChange={(e) => updateCaseStatus(activeCase.id, e.target.value as CaseStatus)}
                className="font-bold text-xs px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-800 focus:border-teal-500"
              >
                <option value="Active Triage">Active Triage</option>
                <option value="Under Resuscitation">Under Resuscitation</option>
                <option value="Under Evaluation">Under Evaluation</option>
                <option value="Stabilized">Stabilized</option>
                <option value="Admitted ICU">Admitted ICU</option>
                <option value="Admitted Ward">Admitted Ward</option>
                <option value="Transferred">Transferred</option>
                <option value="Discharged">Discharged</option>
                <option value="DAMA (Discharge Against Medical Advice)">DAMA (LAMA)</option>
                <option value="Brought Dead / Expired">Brought Dead / Expired</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {activeCase.isMlc && (
                <button
                  onClick={() => {
                    setActiveTab('mlc');
                    setSelectedCaseId(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold border border-purple-200 hover:bg-purple-100 flex items-center gap-1"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Open MLC Record ({activeCase.mlcId})</span>
                </button>
              )}

              {activeCase.isPoisoning && (
                <button
                  onClick={() => {
                    setActiveTab('poisoning');
                    setSelectedCaseId(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold border border-rose-200 hover:bg-rose-100 flex items-center gap-1"
                >
                  <Biohazard className="w-3.5 h-3.5" />
                  <span>Open Poison Protocol ({activeCase.poisonCaseId})</span>
                </button>
              )}

              <button
                onClick={() => {
                  setActiveTab('transfers');
                  setSelectedCaseId(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 font-semibold border border-teal-200 hover:bg-teal-100 flex items-center gap-1"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Initiate Transfer</span>
              </button>
            </div>
          </div>

          {/* Vitals Ribbon */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                <h3 className="font-bold text-sm text-slate-900">Physiological Emergency Vitals</h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Recorded: {new Date(activeCase.vitals.recordedAt).toLocaleTimeString()}
                </span>
              </div>
              {!isEditingVitals ? (
                <button
                  onClick={handleStartVitalsEdit}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  Update Vitals
                </button>
              ) : (
                <button
                  onClick={() => setIsEditingVitals(false)}
                  className="text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
              )}
            </div>

            {isEditingVitals ? (
              <form onSubmit={handleSaveVitals} className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-0.5">Blood Pressure</label>
                  <input
                    type="text"
                    value={bp}
                    onChange={(e) => setBp(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded-lg"
                    placeholder="120/80"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-0.5">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    value={pulse}
                    onChange={(e) => setPulse(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-0.5">SpO2 (%)</label>
                  <input
                    type="number"
                    value={spo2}
                    onChange={(e) => setSpo2(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-0.5">GCS (3-15)</label>
                  <input
                    type="number"
                    min={3}
                    max={15}
                    value={gcs}
                    onChange={(e) => setGcs(parseInt(e.target.value) || 3)}
                    className="w-full px-2.5 py-1.5 border rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-0.5">Temp (°F)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={temp}
                    onChange={(e) => setTemp(parseFloat(e.target.value) || 98.6)}
                    className="w-full px-2.5 py-1.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-0.5">Resp Rate (/min)</label>
                  <input
                    type="number"
                    value={rr}
                    onChange={(e) => setRr(parseInt(e.target.value) || 16)}
                    className="w-full px-2.5 py-1.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-0.5">Blood Sugar (mg/dL)</label>
                  <input
                    type="number"
                    value={bloodSugar}
                    onChange={(e) => setBloodSugar(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border rounded-lg"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                  >
                    Save Vitals
                  </button>
                </div>
              </form>
            ) : (
              <div className="pt-3 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">BP (mmHg)</span>
                  <div className="text-sm font-black text-slate-900 mt-0.5">{activeCase.vitals.bp}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Pulse</span>
                  <div className="text-sm font-black text-slate-900 mt-0.5">{activeCase.vitals.pulse} bpm</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">SpO2</span>
                  <div className={`text-sm font-black mt-0.5 ${activeCase.vitals.spo2 < 90 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {activeCase.vitals.spo2}%
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">GCS Scale</span>
                  <div className={`text-sm font-black mt-0.5 ${activeCase.vitals.gcs <= 8 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {activeCase.vitals.gcs} / 15
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Temp</span>
                  <div className="text-sm font-black text-slate-900 mt-0.5">{activeCase.vitals.temp} °F</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Resp Rate</span>
                  <div className="text-sm font-black text-slate-900 mt-0.5">{activeCase.vitals.rr} /min</div>
                </div>
              </div>
            )}
          </div>

          {/* Chief Complaint & Incident Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Chief Complaint & Presentation</span>
              </h4>
              <p className="text-slate-700 leading-relaxed font-medium">
                {activeCase.chiefComplaint}
              </p>
              <div className="mt-3 text-slate-500 space-y-1">
                <div>
                  <span className="text-slate-400">Incident Category:</span>{' '}
                  <strong className="text-slate-800">{activeCase.incidentType}</strong>
                </div>
                {activeCase.incidentDetails.mechanism && (
                  <div>
                    <span className="text-slate-400">Mechanism:</span>{' '}
                    <span>{activeCase.incidentDetails.mechanism}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                <User className="w-4 h-4 text-teal-600" />
                <span>Emergency Team & Dispatch Details</span>
              </h4>
              <div className="space-y-1 text-slate-600">
                <div>
                  <span className="text-slate-400">Attending Physician:</span>{' '}
                  <strong className="text-slate-800">{activeCase.assignedPhysician}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Primary Resus Nurse:</span>{' '}
                  <strong className="text-slate-800">{activeCase.assignedNurse}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Brought In By:</span>{' '}
                  <span>{activeCase.incidentDetails.broughtBy}</span>
                </div>
                {activeCase.incidentDetails.vehicleNo && (
                  <div>
                    <span className="text-slate-400">Vehicle / Ambulance:</span>{' '}
                    <span className="font-mono">{activeCase.incidentDetails.vehicleNo}</span>
                  </div>
                )}
                {activeCase.incidentDetails.location && (
                  <div>
                    <span className="text-slate-400">Incident Location:</span>{' '}
                    <span>{activeCase.incidentDetails.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Clinical Timeline & Notes */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h4 className="font-bold text-sm text-slate-900">Clinical Timeline & Care Notes</h4>
              </div>
              <span className="text-[11px] text-slate-400">
                {activeCase.clinicalNotes.length} Entries Recorded
              </span>
            </div>

            {/* Note input */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <div className="flex items-center gap-2">
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 font-medium"
                >
                  <option value="assessment">Doctor Assessment</option>
                  <option value="vitals">Nurse Observation</option>
                  <option value="medication">Medication / IV Fluid</option>
                  <option value="procedure">Procedure / Intubation</option>
                  <option value="handover">Shift / Ward Handover</option>
                </select>
                <input
                  type="text"
                  placeholder="Record timestamped emergency observation, drug dose, or clinical note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-teal-500"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post Note</span>
                </button>
              </div>
            </form>

            {/* Notes List */}
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pt-2 space-y-2">
              {activeCase.clinicalNotes.map((note) => (
                <div key={note.id} className="pt-2 text-xs">
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <strong className="text-slate-800">{note.author}</strong>
                      <span className="text-slate-400">• {note.role}</span>
                      <span className="uppercase text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {note.category}
                      </span>
                    </div>
                    <span className="font-mono text-slate-400">
                      {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-700 mt-1 leading-relaxed">{note.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-mono">
            Created: {new Date(activeCase.createdAt).toLocaleString()}
          </div>
          <button
            onClick={() => setSelectedCaseId(null)}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold"
          >
            Close Case File
          </button>
        </div>
      </div>
    </div>
  );
};
