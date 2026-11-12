import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Activity, 
  Clock, 
  ShieldCheck, 
  Download, 
  User,
  FlaskConical,
  HeartPulse
} from 'lucide-react';
import { DiagnosticLabReport } from '../../types';

export const MedicalRecordsView: React.FC = () => {
  const {
    labReports,
    patients,
    currentUser,
    logAuditAction
  } = useApp();

  const [reports, setReports] = useState<DiagnosticLabReport[]>(labReports);
  const [selectedReportId, setSelectedReportId] = useState<string>(reports[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPanic, setFilterPanic] = useState(false);

  const filteredReports = reports.filter((r) => {
    if (filterPanic && !r.criticalPanicValue) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.patientName.toLowerCase().includes(q) ||
        r.testName.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeReport = reports.find((r) => r.id === selectedReportId) || reports[0];

  const handleAcknowledge = (reportId: string) => {
    setReports((prev) =>
      prev.map((r) => {
        if (r.id === reportId) {
          return {
            ...r,
            status: 'Reviewed',
            reviewedBy: currentUser.name,
          };
        }
        return r;
      })
    );
    logAuditAction(
      'Diagnostic Report Acknowledged',
      'SYSTEM',
      reportId,
      `Dr. ${currentUser.name} reviewed and acknowledged laboratory findings for ${activeReport?.patientName}`
    );
  };

  const getFlagBadge = (flag?: string) => {
    switch (flag) {
      case 'Critical':
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 font-bold border-rose-300';
      case 'High':
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 font-semibold border-amber-300';
      case 'Low':
      case 'LOW':
        return 'bg-blue-100 text-blue-800 font-semibold border-blue-300';
      default:
        return 'bg-emerald-50 text-emerald-800 font-semibold border-emerald-200';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Medical Records & Diagnostic Investigations
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              Laboratory & Pathology
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Access longitudinal lab reports, cardiac biomarkers, pathology findings, and review panic values.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setFilterPanic(!filterPanic)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              filterPanic
                ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            <AlertCircle className={`w-3.5 h-3.5 ${filterPanic ? 'text-rose-600' : 'text-slate-400'}`} />
            <span>Critical Panic Values ({reports.filter((r) => r.criticalPanicValue).length})</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Report List (Left) + Detailed Report (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Report Directory */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] flex flex-col h-[750px]">
          <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/75 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Reports ({reports.length})
              </span>
              <span className="text-[11px] text-teal-700 font-semibold">NABL Accredited</span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, test name, ID..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:border-teal-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {filteredReports.map((rep) => {
              const isSelected = rep.id === (activeReport ? activeReport.id : '');
              return (
                <div
                  key={rep.id}
                  onClick={() => setSelectedReportId(rep.id)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-teal-50/90 border border-teal-200 shadow-xs'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs">{rep.testName}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {rep.patientName} • {(rep.collectedAt || rep.sampleDate || '').split('T')[0]}
                      </p>
                    </div>
                    {rep.criticalPanicValue ? (
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                        PANIC
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {rep.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/50 text-[10px] text-slate-500">
                    <span className="font-mono font-medium">{rep.id}</span>
                    <span className={rep.status === 'Reviewed' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                      {rep.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Lab Investigation Detail */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] flex flex-col h-[750px]">
          {activeReport ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Report Header */}
              <div className="pb-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-slate-900">{activeReport.testName}</h2>
                    <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                      {activeReport.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Patient: <span className="font-bold text-slate-800">{activeReport.patientName}</span> ({activeReport.patientId}) • Sample Drawn: {activeReport.collectedAt || activeReport.sampleDate}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {activeReport.status === 'Reviewed' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Reviewed by {activeReport.reviewedBy || currentUser.name}</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAcknowledge(activeReport.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Review & Acknowledge</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Critical Alert Warning Box if Panic Value */}
              {activeReport.criticalPanicValue && (
                <div className="p-4.5 bg-rose-50/90 border border-rose-200/90 rounded-2xl flex items-start gap-3.5 shadow-xs">
                  <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                      Clinical Panic Value Alert
                    </h4>
                    <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                      This diagnostic parameter exceeds standard critical safety limits. Immediate physician evaluation and prompt therapeutic intervention are required.
                    </p>
                  </div>
                </div>
              )}

              {/* Laboratory Results Table with Reference Range Highlighting */}
              <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <FlaskConical className="w-4 h-4 text-teal-600" />
                    <span>Laboratory Findings & Biomarker Assays</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">Method: Chemiluminescence / Spectrophotometry</span>
                </div>

                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-4">Test Parameter</th>
                      <th className="py-3 px-4">Observed Result</th>
                      <th className="py-3 px-4">Biological Reference Range</th>
                      <th className="py-3 px-4">Units</th>
                      <th className="py-3 px-4 text-right">Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeReport.parameters.map((param, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{param.name}</td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-900 text-sm">{param.value}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">{param.referenceRange}</td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">{param.unit}</td>
                        <td className="py-3.5 px-4 text-right">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] border ${getFlagBadge(param.flag)}`}>
                            {param.flag || 'Normal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Clinical Interpretation & Pathologist Impression */}
              <div className="p-4.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2 text-xs shadow-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <HeartPulse className="w-4 h-4 text-teal-600" />
                  <span>Clinical Impression & Pathologist Correlation</span>
                </div>
                <p className="text-slate-700 leading-relaxed font-normal">
                  {activeReport.clinicalNotes || activeReport.impression || 'Diagnostic assays verified against standardized laboratory reference intervals.'}
                </p>
                <div className="pt-2.5 border-t border-slate-200/60 text-[10px] text-slate-500 flex items-center justify-between">
                  <span className="font-medium">Authorizing Pathologist: Dr. Ananya Sen, MD (Pathology)</span>
                  <span className="font-semibold text-slate-700">Apex Diagnostic Labs (NABL Accredited)</span>
                </div>
              </div>

              {/* Legal & Compliance Footer */}
              <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800">Hospital Central Pathology Laboratory</p>
                    <p className="text-[10px] text-slate-400">Electronic report verified under ISO 15189 standards</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-slate-400">Report Stamp: ACH-LAB-2026</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
              <ClipboardList className="w-12 h-12 stroke-1 mb-2 text-slate-300" />
              <p>Select a diagnostic investigation report from the list to view full parameter results.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
