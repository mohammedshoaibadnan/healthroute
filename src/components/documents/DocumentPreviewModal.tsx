import React from 'react';
import { useApp } from '../../context/AppContext';
import { HOSPITAL_INFO } from '../../data/mockData';
import {
  X,
  Printer,
  FileCheck,
  ShieldAlert,
  Building2,
  Calendar,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface DocumentPreviewModalProps {
  docId: string | null;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ docId, onClose }) => {
  const { documents, cases, mlcCases, poisonCases, transfers } = useApp();

  const doc = documents.find((d) => d.id === docId);
  if (!doc) return null;

  const linkedCase = cases.find((c) => c.id === doc.caseId);
  const linkedMlc = mlcCases.find((m) => m.caseId === doc.caseId);
  const linkedPoison = poisonCases.find((p) => p.caseId === doc.caseId);
  const linkedTransfer = transfers.find((t) => t.caseId === doc.caseId);

  const patient = linkedCase ? linkedCase.patientSnapshot : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[94vh] flex flex-col">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="no-print bg-[#0b192e] text-white p-3.5 px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-teal-400" />
            <span className="font-bold text-sm">Official Emergency Record Preview</span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              {doc.id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Document</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Stationery */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-6 flex-1 text-slate-900 bg-white font-sans">
          {/* Hospital Header Banner */}
          <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <Building2 className="w-5 h-5 text-slate-800" />
              <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
                {HOSPITAL_INFO.name}
              </h1>
            </div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              {HOSPITAL_INFO.subHeading} • {HOSPITAL_INFO.city}
            </p>
            <div className="text-[10px] text-slate-500 font-medium">
              {HOSPITAL_INFO.accreditation} • Emergency Hotline: {HOSPITAL_INFO.emergencyHelpline}
            </div>
          </div>

          {/* Title & Document Ref */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                Official Clinical Record
              </span>
              <h2 className="text-base font-bold text-slate-900">{doc.title}</h2>
            </div>
            <div className="text-right text-xs">
              <div className="font-mono font-bold text-slate-900">{doc.id}</div>
              <div className="text-slate-500 text-[11px]">
                Date: {new Date(doc.generatedAt).toLocaleDateString()} {new Date(doc.generatedAt).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Unidentified Patient Alert Strip if applicable */}
          {doc.isUnidentified && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <strong className="block font-bold uppercase tracking-wide">
                  Emergency Temporary Patient Identifier: {doc.tempId}
                </strong>
                <span>
                  Patient brought in without confirmed identity. Documented under the Hospital Emergency Unidentified Patient Coordination Protocol. Physical tags and clothing inventory catalogued.
                </span>
              </div>
            </div>
          )}

          {/* Patient Details Grid */}
          {patient && (
            <div className="bg-slate-50/80 rounded-lg p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Patient Name</span>
                <span className="font-bold text-slate-900">{patient.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Age / Gender</span>
                <span>{patient.age} Yrs / {patient.gender}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Blood Group</span>
                <span className="font-bold">{patient.bloodGroup || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">ID / MRN</span>
                <span className="font-mono">{patient.tempId || patient.permanentMrn || 'Emergency Case'}</span>
              </div>
            </div>
          )}

          {/* Dynamic Document Sections Based on Type */}
          {doc.docType === 'MLC_CERTIFICATE' && linkedMlc && (
            <div className="space-y-4 text-xs">
              <div className="bg-purple-50/60 p-3 rounded-lg border border-purple-200">
                <span className="font-bold text-purple-900 block mb-1">
                  Medico-Legal Police Intimation Record
                </span>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>Jurisdiction Police Station: <strong>{linkedMlc.policeStation}</strong></div>
                  <div>Station Diary / GD No: <strong className="font-mono">{linkedMlc.firOrGdNumber || 'Pending'}</strong></div>
                  <div>Brought By: <strong>{linkedMlc.broughtByName}</strong> ({linkedMlc.broughtByDesignation})</div>
                  <div>Provisional Opinion: <strong className="text-purple-800">{linkedMlc.injuryClassification}</strong></div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1.5 uppercase tracking-wide text-xs">
                  Documented External Physical Injuries ({linkedMlc.wounds.length})
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 border-b">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Anatomical Location</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Dimensions</th>
                        <th className="p-2">Margins & Age</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {linkedMlc.wounds.map((w, idx) => (
                        <tr key={w.id}>
                          <td className="p-2 font-bold">{idx + 1}</td>
                          <td className="p-2">{w.location}</td>
                          <td className="p-2 font-medium">{w.type}</td>
                          <td className="p-2 font-mono">{w.dimensions}</td>
                          <td className="p-2">{w.margins} ({w.ageOfInjuryProvisional})</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="text-slate-600 space-y-1">
                <div>Suspected Mechanism: <strong>{linkedMlc.weaponOrAgentSuspected}</strong></div>
                <div>Smell of Alcohol: <strong>{linkedMlc.smellOfAlcoholOrAgent}</strong></div>
                <div>Evidence Custody: <strong>{linkedMlc.clothingSealedAndHandedOver ? linkedMlc.sealedArticlesDescription : 'Nil seized'}</strong></div>
              </div>
            </div>
          )}

          {doc.docType === 'POISON_PROTOCOL' && linkedPoison && (
            <div className="space-y-4 text-xs">
              <div className="bg-rose-50/60 p-3 rounded-lg border border-rose-200 text-slate-700">
                <span className="font-bold text-rose-900 block mb-1">
                  Toxicology Intake & Presentation
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>Suspected Agent: <strong>{linkedPoison.suspectedAgent}</strong></div>
                  <div>Exposure: <strong>{linkedPoison.routeOfExposure}</strong> ({linkedPoison.estimatedTimeOfIngestion})</div>
                  <div>Gastric Lavage: <strong>{linkedPoison.decontaminationActions.gastricLavageDone ? 'Done' : 'Not Done'}</strong></div>
                  <div>Sample: <strong>{linkedPoison.samplePreservative}</strong></div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1.5 uppercase tracking-wide text-xs">
                  Antidote Dosing & Titration Timeline
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 border-b">
                      <tr>
                        <th className="p-2">Time</th>
                        <th className="p-2">Drug Name</th>
                        <th className="p-2">Dose / Route</th>
                        <th className="p-2">Administered By</th>
                        <th className="p-2">Patient Response</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {linkedPoison.antidotesAdministered.map((a) => (
                        <tr key={a.id}>
                          <td className="p-2 font-mono">{a.administeredAt}</td>
                          <td className="p-2 font-bold">{a.drugName}</td>
                          <td className="p-2">{a.dose} ({a.route})</td>
                          <td className="p-2">{a.administeredBy}</td>
                          <td className="p-2">{a.patientResponse}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {doc.docType === 'TRANSFER_SUMMARY' && linkedTransfer && (
            <div className="space-y-4 text-xs">
              <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200 text-slate-700">
                <span className="font-bold text-emerald-950 block mb-1">
                  Receiving Facility & Reason
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>Receiving Hospital: <strong>{linkedTransfer.receivingHospital}</strong></div>
                  <div>Acceptance Code: <strong className="font-mono">{linkedTransfer.acceptanceReferenceCode}</strong></div>
                  <div>Receiving Incharge: <strong>{linkedTransfer.receivingDoctorOrCoordinator}</strong></div>
                  <div>Clinical Reason: <strong>{linkedTransfer.clinicalReason}</strong></div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div>Status at Transfer: <strong>{linkedTransfer.summaryAtTransfer.triageCategory}</strong></div>
                <div>GCS & Vitals: <strong>{linkedTransfer.summaryAtTransfer.gcsScore} | {linkedTransfer.summaryAtTransfer.currentVitals}</strong></div>
                <div>Airway: <strong>{linkedTransfer.summaryAtTransfer.airwayStatus}</strong></div>
                <div>Infusions: <strong>{linkedTransfer.summaryAtTransfer.ongoingInfusions}</strong></div>
                <div>Ambulance: <strong>{linkedTransfer.transportDetails.ambulanceType} ({linkedTransfer.transportDetails.vehicleRegNumber})</strong></div>
              </div>
            </div>
          )}

          {doc.docType === 'EMERGENCY_CASE_SHEET' && linkedCase && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 text-sm">Presenting Complaint & Incident:</div>
                <p className="text-slate-700 leading-relaxed">{linkedCase.chiefComplaint}</p>
                <div className="text-slate-500 pt-1">
                  Incident Type: <strong>{linkedCase.incidentType}</strong> • Bed Bay: <strong>{linkedCase.bedBay}</strong>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Vital Parameters at Triage:</span>
                <div className="grid grid-cols-4 gap-2 text-center font-mono">
                  <div>BP: <strong>{linkedCase.vitals.bp}</strong></div>
                  <div>Pulse: <strong>{linkedCase.vitals.pulse} bpm</strong></div>
                  <div>SpO2: <strong>{linkedCase.vitals.spo2}%</strong></div>
                  <div>GCS: <strong>{linkedCase.vitals.gcs}/15</strong></div>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-900 block mb-1">Care Notes & Procedures:</span>
                <div className="border border-slate-200 rounded-lg p-2.5 space-y-2">
                  {linkedCase.clinicalNotes.map((n) => (
                    <div key={n.id} className="text-[11px] pb-1 border-b border-slate-100 last:border-none">
                      <span className="font-semibold text-slate-800">{n.author} ({n.role}):</span> {n.note}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Official Doctor Signature & Stamp Seal Box */}
          <div className="pt-8 border-t-2 border-slate-200 flex items-end justify-between text-xs">
            <div className="space-y-1">
              <div className="text-[10px] text-slate-400 font-mono">
                Security Hash: SHA256-ACEMC-{doc.id.replace('-', '')}-VERIFIED
              </div>
              <div className="text-slate-500 text-[11px]">
                Hospital Emergency Directorate • Apex City Bengaluru
              </div>
            </div>

            {/* Stamp Box */}
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center min-w-[200px] relative">
              <div className="w-16 h-16 rounded-full border-2 border-teal-600/40 text-teal-700/60 flex items-center justify-center font-serif text-[10px] uppercase font-bold mx-auto rotate-[-12deg] tracking-widest pointer-events-none">
                SEAL OF CASUALTY
              </div>
              <div className="mt-2 font-bold text-slate-800">{doc.author}</div>
              <div className="text-[10px] text-slate-500">Authorized Medical Officer</div>
              <div className="text-[9px] font-mono text-emerald-600 font-semibold mt-0.5">
                DIGITALLY VERIFIED
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="no-print p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Complies with NABH Emergency Record Keeping Standards.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
