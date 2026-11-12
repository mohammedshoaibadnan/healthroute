import React from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  X, 
  Download, 
  Printer, 
  ShieldCheck, 
  FileText, 
  Calendar, 
  Building2, 
  User, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { HOSPITAL_INFO } from '../../../data/mockData';

export const DocumentPreviewModal: React.FC = () => {
  const { 
    previewDocument, 
    setPreviewDocument, 
    previewLabReport, 
    setPreviewLabReport, 
    previewEncounter, 
    setPreviewEncounter,
    activePatient 
  } = useApp();

  const isOpen = !!previewDocument || !!previewLabReport || !!previewEncounter;

  if (!isOpen) return null;

  const handleClose = () => {
    setPreviewDocument(null);
    setPreviewLabReport(null);
    setPreviewEncounter(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden my-8">
        {/* Modal Top Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal-400">Official Clinical Document Preview</p>
              <h3 className="text-sm font-semibold truncate max-w-md">
                {previewDocument?.title || previewLabReport?.testName || `Clinical Consultation - ${previewEncounter?.assessmentDiagnosis || 'Encounter Note'}`}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors cursor-pointer"
              title="Print document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={() => {
                const docName = previewDocument?.title || previewLabReport?.testName || 'clinical_record';
                alert(`Downloaded verified PDF: "${docName}.pdf"`);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Sheet Body (Letterhead Style) */}
        <div className="p-8 max-h-[75vh] overflow-y-auto space-y-6 text-slate-800 text-xs leading-relaxed bg-white font-sans">
          {/* Institutional Hospital Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-teal-700 font-bold text-base">
                <Building2 className="w-5 h-5 text-teal-600" />
                <span>{HOSPITAL_INFO.name}</span>
              </div>
              <p className="text-[11px] text-slate-500">{HOSPITAL_INFO.subHeading}</p>
              <p className="text-[11px] text-slate-500">{HOSPITAL_INFO.city} • {HOSPITAL_INFO.accreditation}</p>
              <p className="text-[11px] text-slate-500 font-mono">{HOSPITAL_INFO.clinicHelpline}</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>CLINICALLY VERIFIED RECORD</span>
              </span>
              <p className="text-[10px] text-slate-400 mt-2 font-mono">Hospital Code: {HOSPITAL_INFO.code}</p>
              <p className="text-[10px] text-slate-400 font-mono">Date Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          {/* Patient Details Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Patient Name</p>
              <p className="font-bold text-slate-900">{activePatient.name}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">MRN / ABHA</p>
              <p className="font-mono text-slate-700">{activePatient.permanentMrn || 'AC-BLR-2026-7819'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Age / Gender / Blood</p>
              <p className="text-slate-700">{activePatient.age} Yrs • {activePatient.gender} • <span className="font-semibold text-rose-700">{activePatient.bloodGroup || 'A+'}</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Attending Physician</p>
              <p className="font-medium text-slate-900">{activePatient.primaryPhysician?.split('(')[0] || 'Dr. Vikram Malhotra'}</p>
            </div>
          </div>

          {/* Document Content Switch */}
          {previewDocument && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="text-sm font-bold text-slate-900">{previewDocument.title}</h4>
                <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {previewDocument.category}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="text-xs font-semibold text-slate-700">Clinical Summary & Findings:</p>
                <p className="text-xs text-slate-600 leading-relaxed">{previewDocument.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-600">
                <div>
                  <span className="font-bold text-slate-700">Issuing Authority:</span> {previewDocument.source}
                </div>
                <div>
                  <span className="font-bold text-slate-700">Record Date:</span> {previewDocument.date}
                </div>
                <div>
                  <span className="font-bold text-slate-700">Document Type:</span> {previewDocument.fileType} Format ({previewDocument.fileSize})
                </div>
                <div>
                  <span className="font-bold text-slate-700">Verification Status:</span> {previewDocument.isVerified ? 'Verified by Hospital Records Desk' : 'Patient Uploaded (Provisional)'}
                </div>
              </div>

              {previewDocument.tags && previewDocument.tags.length > 0 && (
                <div className="flex items-center gap-1.5 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tags:</span>
                  {previewDocument.tags.map((t, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {previewLabReport && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{previewLabReport.testName}</h4>
                  <p className="text-[11px] text-slate-500">Department: {previewLabReport.category} • Specimen: Venous Blood</p>
                </div>
                <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {previewLabReport.status}
                </span>
              </div>

              {/* Lab Parameters Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Investigation Parameter</th>
                      <th className="px-3 py-2">Observed Value</th>
                      <th className="px-3 py-2">Reference Biological Interval</th>
                      <th className="px-3 py-2">Status Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewLabReport.parameters.map((param, i) => (
                      <tr key={i} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2 font-medium text-slate-900">{param.name}</td>
                        <td className="px-3 py-2 font-bold font-mono">
                          {param.value} <span className="text-[10px] font-normal text-slate-500">{param.unit}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-500 text-[11px]">{param.referenceRange}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            param.flag === 'Critical'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : param.flag === 'High'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : param.flag === 'Low'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {param.flag}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewLabReport.impression && (
                <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200/80 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-900">Pathologist Clinical Impression</p>
                  <p className="text-xs text-slate-700">{previewLabReport.impression}</p>
                </div>
              )}
            </div>
          )}

          {previewEncounter && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Clinical Consultation Record</h4>
                  <p className="text-[11px] text-slate-500">Encounter: {previewEncounter.encounterType || 'OPD'} • Dr. {previewEncounter.doctorName}</p>
                </div>
                <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {previewEncounter.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Chief Complaint & Subjective History</p>
                  <p className="text-slate-800 font-medium">{previewEncounter.chiefComplaint}</p>
                  {previewEncounter.subjectiveHistory && (
                    <p className="text-slate-600 text-[11px] mt-1">{previewEncounter.subjectiveHistory}</p>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Clinician Assessment & Diagnosis</p>
                  <p className="text-slate-900 font-bold">{previewEncounter.assessmentDiagnosis || 'Clinical Assessment Completed'}</p>
                  {previewEncounter.clinicalAdvice && (
                    <p className="text-slate-600 text-[11px] mt-1">{previewEncounter.clinicalAdvice}</p>
                  )}
                </div>
              </div>

              {/* Prescriptions List */}
              {previewEncounter.prescriptions && previewEncounter.prescriptions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>Prescribed Medications ({previewEncounter.prescriptions.length})</span>
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="px-3 py-2">Medicine Name</th>
                          <th className="px-3 py-2">Dosage</th>
                          <th className="px-3 py-2">Frequency</th>
                          <th className="px-3 py-2">Duration</th>
                          <th className="px-3 py-2">Instructions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewEncounter.prescriptions.map((rx, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-bold text-slate-900">{rx.drugName || rx.medicineName}</td>
                            <td className="px-3 py-2 text-slate-700">{rx.dosage}</td>
                            <td className="px-3 py-2 text-slate-700">{rx.frequency}</td>
                            <td className="px-3 py-2 text-slate-700">{rx.duration}</td>
                            <td className="px-3 py-2 text-slate-600 text-[11px]">{rx.instructions || rx.timing || 'As directed'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Official Doctor Signature Block */}
          <div className="pt-6 border-t border-slate-200 flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1 text-[11px] text-slate-500 max-w-sm">
              <p className="font-semibold text-slate-700">Confidential Healthcare Record</p>
              <p>Generated via HealthRoute Secure Integrated Clinical Network. This document contains clinician-verified medical data.</p>
            </div>
            <div className="text-right space-y-1">
              <div className="w-36 h-10 border-b border-dashed border-slate-400 ml-auto flex items-end justify-center pb-1">
                <span className="font-serif italic text-teal-800 text-sm font-bold">Dr. V. Malhotra</span>
              </div>
              <p className="text-xs font-bold text-slate-900">Dr. Vikram Malhotra, MD, DM</p>
              <p className="text-[10px] text-slate-500">Reg. No: KMC-49120 • Consultant Physician</p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">HealthRoute Patient Portal • Secure Document Viewer</span>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
