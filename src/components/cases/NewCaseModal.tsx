import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Stethoscope,
  Heart,
  Bed,
  Scale,
  Biohazard,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { IncidentCategory, TriageLevel } from '../../types';
import { evaluateTriageLevel } from '../../utils/rules';

export const NewCaseModal: React.FC = () => {
  const {
    isNewCaseOpen,
    setIsNewCaseOpen,
    patients,
    createEmergencyCase,
    currentUser,
    setSelectedCaseId,
  } = useApp();

  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [incidentType, setIncidentType] = useState<IncidentCategory>('RTA (Road Traffic Accident)');
  const [broughtBy, setBroughtBy] = useState('108 EMRI Ambulance');
  const [vehicleNo, setVehicleNo] = useState('');
  const [incidentLocation, setIncidentLocation] = useState('');
  const [bedBay, setBedBay] = useState('Resus Bay 3');
  const [isMlc, setIsMlc] = useState(false);
  const [isPoisoning, setIsPoisoning] = useState(false);

  // Vitals
  const [bp, setBp] = useState('120/80');
  const [pulse, setPulse] = useState<number>(84);
  const [spo2, setSpo2] = useState<number>(97);
  const [temp, setTemp] = useState<number>(98.6);
  const [rr, setRr] = useState<number>(18);
  const [gcs, setGcs] = useState<number>(15);
  const [painScore, setPainScore] = useState<number>(4);

  if (!isNewCaseOpen) return null;

  // Auto-calculated triage assessment
  const triageAssessment = evaluateTriageLevel(
    { bp, pulse, spo2, temp, rr, gcs, painScore },
    chiefComplaint,
    incidentType.includes('Cardiac') && gcs < 10
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chiefComplaint.trim()) {
      alert('Please enter a chief complaint or presenting condition.');
      return;
    }

    const targetPatient = patients.find((p) => p.id === selectedPatientId);
    if (!targetPatient) {
      alert('Please select a registered emergency patient.');
      return;
    }

    const created = createEmergencyCase(
      {
        triageLevel: triageAssessment.triageLevel,
        esiScore: triageAssessment.esiScore,
        chiefComplaint: chiefComplaint.trim(),
        incidentType,
        incidentDetails: {
          broughtBy,
          vehicleNo: vehicleNo || undefined,
          location: incidentLocation || undefined,
        },
        vitals: {
          bp,
          pulse: Number(pulse),
          spo2: Number(spo2),
          temp: Number(temp),
          rr: Number(rr),
          gcs: Number(gcs),
          painScore: Number(painScore),
          recordedAt: new Date().toISOString(),
        },
        bedBay,
        assignedPhysician: currentUser.name,
        assignedNurse: 'Sister Rekha Varma',
        isMlc,
        isPoisoning,
        status: triageAssessment.triageLevel === 'RED' ? 'Under Resuscitation' : 'Active Triage',
      },
      targetPatient
    );

    setIsNewCaseOpen(false);
    setSelectedCaseId(created.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        <div className="bg-[#0b192e] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <Stethoscope className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">New Emergency Case Intake</h2>
              <p className="text-xs text-slate-400">
                Triage Officer: {currentUser.name} • Station: {currentUser.station}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsNewCaseOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {/* Patient Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Registered Patient (or Unidentified Temp ID) *
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 bg-white"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.tempId ? `[${p.tempId}]` : p.permanentMrn ? `[MRN: ${p.permanentMrn}]` : ''} ({p.gender}, {p.age}y)
                </option>
              ))}
            </select>
          </div>

          {/* Chief Complaint */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Chief Complaint & Acute Symptoms *
            </label>
            <textarea
              required
              rows={2}
              placeholder="e.g. High-velocity collision with road barrier, loss of consciousness, scalp laceration"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500"
            />
          </div>

          {/* Incident Type & Bed Allocation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Incident Category
              </label>
              <select
                value={incidentType}
                onChange={(e) => {
                  const val = e.target.value as IncidentCategory;
                  setIncidentType(val);
                  if (val.includes('Poisoning')) setIsPoisoning(true);
                  if (val.includes('RTA') || val.includes('Assault') || val.includes('Burn')) setIsMlc(true);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 bg-white"
              >
                <option value="RTA (Road Traffic Accident)">RTA (Road Traffic Accident)</option>
                <option value="Poisoning / Toxin Ingestion">Poisoning / Toxin Ingestion</option>
                <option value="Acute Coronary / Cardiac Arrest">Acute Coronary / Cardiac Arrest</option>
                <option value="Physical Assault / Trauma">Physical Assault / Trauma</option>
                <option value="Fall from Height">Fall from Height</option>
                <option value="Severe Burn">Severe Burn</option>
                <option value="Acute Stroke / CVA">Acute Stroke / CVA</option>
                <option value="Severe Respiratory Distress">Severe Respiratory Distress</option>
                <option value="Pediatric Emergency">Pediatric Emergency</option>
                <option value="General Medical Acute">General Medical Acute</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Bed className="w-3.5 h-3.5 text-slate-500" />
                <span>Bed / Bay Allocation</span>
              </label>
              <select
                value={bedBay}
                onChange={(e) => setBedBay(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 bg-white"
              >
                <option value="Resus Bay 1 (Red Zone)">Resus Bay 1 (Red Zone)</option>
                <option value="Resus Bay 2 (Red Zone)">Resus Bay 2 (Red Zone)</option>
                <option value="Resus Bay 3 (Red Zone)">Resus Bay 3 (Red Zone)</option>
                <option value="Trauma Bay 1 (Acute)">Trauma Bay 1 (Acute)</option>
                <option value="Trauma Bay 2 (Acute)">Trauma Bay 2 (Acute)</option>
                <option value="Acute ER Bed 04">Acute ER Bed 04</option>
                <option value="Acute ER Bed 05">Acute ER Bed 05</option>
                <option value="Tox Isolation Bed 01">Tox Isolation Bed 01</option>
                <option value="Ambulatory Cubicle 1">Ambulatory Cubicle 1</option>
              </select>
            </div>
          </div>

          {/* Vitals Panel */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                <span>Emergency Triage Vitals</span>
              </span>
              <span className="text-[11px] text-slate-500">Auto-scores ESI Level</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">BP (mmHg)</label>
                <input
                  type="text"
                  placeholder="120/80"
                  value={bp}
                  onChange={(e) => setBp(e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Heart Rate</label>
                <input
                  type="number"
                  value={pulse}
                  onChange={(e) => setPulse(parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">SpO2 (%)</label>
                <input
                  type="number"
                  value={spo2}
                  onChange={(e) => setSpo2(parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border rounded-lg bg-white font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">GCS (3-15)</label>
                <input
                  type="number"
                  min={3}
                  max={15}
                  value={gcs}
                  onChange={(e) => setGcs(parseInt(e.target.value) || 3)}
                  className="w-full px-2.5 py-1.5 border rounded-lg bg-white font-bold"
                />
              </div>
            </div>
          </div>

          {/* Auto Triage Badge & Explanation */}
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            triageAssessment.triageLevel === 'RED'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : triageAssessment.triageLevel === 'YELLOW'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded font-black text-white text-xs ${
                triageAssessment.triageLevel === 'RED' ? 'bg-rose-600' : triageAssessment.triageLevel === 'YELLOW' ? 'bg-amber-500' : 'bg-emerald-600'
              }`}>
                TRIAGE {triageAssessment.triageLevel} (ESI {triageAssessment.esiScore})
              </span>
              <span className="text-[11px] font-medium leading-tight">{triageAssessment.reason}</span>
            </div>
          </div>

          {/* Special Protocol Flags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-purple-200 bg-purple-50/50 cursor-pointer">
              <input
                type="checkbox"
                checked={isMlc}
                onChange={(e) => setIsMlc(e.target.checked)}
                className="rounded text-purple-600"
              />
              <div>
                <span className="font-bold text-purple-900">Flag as Medico-Legal Case (MLC)</span>
                <p className="text-[10px] text-purple-700">Auto-drafts injury chart & police intimation</p>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-rose-200 bg-rose-50/50 cursor-pointer">
              <input
                type="checkbox"
                checked={isPoisoning}
                onChange={(e) => setIsPoisoning(e.target.checked)}
                className="rounded text-rose-600"
              />
              <div>
                <span className="font-bold text-rose-900">Flag as Poisoning / Toxicology Protocol</span>
                <p className="text-[10px] text-rose-700">Activates atropinization & gastric lavage sheet</p>
              </div>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewCaseOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Create Emergency Case</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
