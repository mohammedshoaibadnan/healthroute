import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Truck,
  Check,
  Building2,
  ShieldCheck,
  Phone,
  User,
  Heart,
  AlertTriangle,
} from 'lucide-react';
import { PatientTransfer } from '../../types';

interface NewTransferModalProps {
  onClose: () => void;
}

export const NewTransferModal: React.FC<NewTransferModalProps> = ({ onClose }) => {
  const { cases, initiateTransfer, currentUser } = useApp();

  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id || '');
  const [receivingHospital, setReceivingHospital] = useState(
    'State Neurosciences & Trauma Institute (NIMHANS), Bengaluru'
  );
  const [receivingDepartment, setReceivingDepartment] = useState('Department of Neurosurgery - Trauma ICU');
  const [receivingDoctor, setReceivingDoctor] = useState('Dr. K. Srinivas (Consultant Neurosurgeon)');
  const [clinicalReason, setClinicalReason] = useState<PatientTransfer['clinicalReason']>(
    'Specialized Neuro-trauma / CT Surgery Intervention'
  );
  const [acceptanceConfirmed, setAcceptanceConfirmed] = useState(true);
  const [acceptanceRef, setAcceptanceRef] = useState('REF-NIM-2026-891');

  // Transport details
  const [ambulanceType, setAmbulanceType] = useState<PatientTransfer['transportDetails']['ambulanceType']>(
    'Advanced Life Support (ALS)'
  );
  const [vehicleRegNumber, setVehicleRegNumber] = useState('KA-01-G-9901 (Hospital Dedicated ALS)');
  const [driverName, setDriverName] = useState('EMT Sharanappa & Pilot Venkatesh');
  const [contactPhone, setContactPhone] = useState('+91 99801 44102');
  const [accompanyingStaff, setAccompanyingStaff] = useState(`${currentUser.name} + Staff Nurse Karthik`);
  const [transitChecklist, setTransitChecklist] = useState(true);

  // Summary
  const [airwayStatus, setAirwayStatus] = useState<PatientTransfer['summaryAtTransfer']['airwayStatus']>(
    'Intubated & Bagged/Ventilated'
  );
  const [ongoingInfusions, setOngoingInfusions] = useState('IV Normal Saline @ 75ml/hr, Inj. Mannitol 100ml bolus');
  const [handoverNotes, setHandoverNotes] = useState('Case telephonically discussed with receiving in-charge. All digital CT scans forwarded.');

  const targetCase = cases.find((c) => c.id === selectedCaseId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCase) return;

    initiateTransfer({
      caseId: targetCase.id,
      patientId: targetCase.patientId,
      patientName: targetCase.patientSnapshot.name,
      originatingHospital: 'Apex City Emergency Medical Centre (ER)',
      receivingHospital,
      receivingDepartment,
      receivingDoctorOrCoordinator: receivingDoctor,
      acceptanceConfirmed,
      acceptanceReferenceCode: acceptanceRef,
      clinicalReason,
      summaryAtTransfer: {
        triageCategory: `ESI ${targetCase.esiScore} (${targetCase.triageLevel})`,
        gcsScore: `${targetCase.vitals.gcs}/15`,
        currentVitals: `BP ${targetCase.vitals.bp}, HR ${targetCase.vitals.pulse}, SpO2 ${targetCase.vitals.spo2}%`,
        interventionsGiven: targetCase.chiefComplaint,
        airwayStatus,
        ongoingInfusions,
      },
      transportDetails: {
        ambulanceType,
        vehicleRegNumber,
        driverOrEMTName: driverName,
        contactPhone,
        accompanyingStaff,
        departureTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        estimatedArrival: 'Estimated transit: 25 mins',
        transitChecklistPassed: transitChecklist,
      },
      handoverNotes,
    });

    alert('Patient Transfer Initiated & Structured Handover Summary Generated.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        <div className="bg-[#0b192e] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <Truck className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Initiate Inter-Facility Patient Transfer
              </h2>
              <p className="text-xs text-slate-400">
                Structured clinical transfer summary & transport coordination
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {/* Select Case */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Patient / Active Emergency Case *
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.patientSnapshot.name} ({c.bedBay}, Triage {c.triageLevel})
                </option>
              ))}
            </select>
          </div>

          {/* Receiving Hospital & Doctor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Receiving Hospital / Facility *
              </label>
              <input
                type="text"
                required
                value={receivingHospital}
                onChange={(e) => setReceivingHospital(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Receiving Department / Unit
              </label>
              <input
                type="text"
                value={receivingDepartment}
                onChange={(e) => setReceivingDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Receiving Physician / In-charge
              </label>
              <input
                type="text"
                value={receivingDoctor}
                onChange={(e) => setReceivingDoctor(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Acceptance Reference Code
              </label>
              <input
                type="text"
                value={acceptanceRef}
                onChange={(e) => setAcceptanceRef(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptanceConfirmed}
                  onChange={(e) => setAcceptanceConfirmed(e.target.checked)}
                  className="rounded text-teal-600"
                />
                <span className="font-semibold text-slate-800">Bed Acceptance Confirmed</span>
              </label>
            </div>
          </div>

          {/* Clinical Reason */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Primary Clinical Reason for Transfer
            </label>
            <select
              value={clinicalReason}
              onChange={(e) => setClinicalReason(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
            >
              <option value="Specialized Neuro-trauma / CT Surgery Intervention">
                Specialized Neuro-trauma / CT Surgery Intervention
              </option>
              <option value="Lack of Pediatric Intensive Care (PICU) Bed">
                Lack of Pediatric Intensive Care (PICU) Bed
              </option>
              <option value="Immediate Percutaneous Coronary Intervention (PCI)">
                Immediate Percutaneous Coronary Intervention (PCI)
              </option>
              <option value="Advanced High-Tension Burn Care">
                Advanced High-Tension Burn Care
              </option>
              <option value="Higher Level Mechanical Ventilation / ECMO">
                Higher Level Mechanical Ventilation / ECMO
              </option>
              <option value="Family Requested Relocation">Family Requested Relocation</option>
            </select>
          </div>

          {/* Clinical Summary at Handover */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 block text-xs">
              Clinical Handover Parameters
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Airway Status</label>
                <select
                  value={airwayStatus}
                  onChange={(e) => setAirwayStatus(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="Intubated & Bagged/Ventilated">Intubated & Bagged/Ventilated</option>
                  <option value="Nasal Cannula / NRBM">Nasal Cannula / NRBM High Flow</option>
                  <option value="Room Air">Room Air (Spontaneous)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Ongoing Infusions / Inotropes</label>
                <input
                  type="text"
                  value={ongoingInfusions}
                  onChange={(e) => setOngoingInfusions(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Transport & Ambulance Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-slate-600 mb-0.5">Ambulance Type</label>
              <select
                value={ambulanceType}
                onChange={(e) => setAmbulanceType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              >
                <option value="Advanced Life Support (ALS)">Advanced Life Support (ALS)</option>
                <option value="Basic Life Support (BLS)">Basic Life Support (BLS)</option>
                <option value="Cardiac Care Ambulance">Cardiac Care Ambulance</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-0.5">Vehicle Registration No.</label>
              <input
                type="text"
                value={vehicleRegNumber}
                onChange={(e) => setVehicleRegNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-0.5">Accompanying Staff</label>
              <input
                type="text"
                value={accompanyingStaff}
                onChange={(e) => setAccompanyingStaff(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              />
            </div>
          </div>

          {/* Safety Checklist */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-900">
              <input
                type="checkbox"
                checked={transitChecklist}
                onChange={(e) => setTransitChecklist(e.target.checked)}
                className="rounded text-emerald-600"
              />
              <span>En-Route Transit Safety Checklist Verified</span>
            </label>
            <p className="text-[11px] text-emerald-700 mt-1">
              Includes: Airway secured, O2 cylinder pressure &gt; 1200 PSI verified, portable defibrillator/monitor battery 100%, emergency drug kit and suction unit tested.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Dispatch Transfer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
