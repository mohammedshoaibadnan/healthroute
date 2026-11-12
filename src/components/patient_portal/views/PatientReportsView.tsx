import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  FileText, 
  Search, 
  Upload, 
  Download, 
  Eye, 
  ShieldCheck, 
  AlertTriangle, 
  Building2, 
  Clock, 
  Filter,
  CheckCircle2
} from 'lucide-react';
import { filterPatientDocuments } from '../../../utils/rules';
import { PatientDocument, DiagnosticLabReport } from '../../../types';

export const PatientReportsView: React.FC = () => {
  const { 
    patientDocuments, 
    labReports, 
    activePatient, 
    setPreviewDocument, 
    setPreviewLabReport,
    setIsPatientUploadDocOpen 
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const patientDocs = patientDocuments.filter((d) => d.patientId === activePatient.id);
  const patientLabs = labReports.filter((l) => l.patientId === activePatient.id);

  const filteredDocs = filterPatientDocuments(patientDocs, categoryFilter, searchQuery);

  const categories = [
    'All',
    'Laboratory',
    'Discharge Summary',
    'Prescription',
    'Radiology / Imaging',
    'Patient Uploaded',
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Lab Reports & Investigation Records</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>NABL Certified Diagnostic Feed</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pathology reports, biochemical investigations, radiology scans, and patient-uploaded external records
          </p>
        </div>

        <button
          onClick={() => setIsPatientUploadDocOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer self-start sm:self-auto active:scale-[0.98]"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Medical Document</span>
        </button>
      </div>

      {/* Diagnostic Lab Highlights (NABL Certified Lab Feeds) */}
      {patientLabs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span>Central Hospital Diagnostic Laboratory Reports</span>
            </h3>
            <span className="text-[11px] text-slate-400">Direct hospital laboratory integration</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patientLabs.map((lab) => (
              <div
                key={lab.id}
                onClick={() => setPreviewLabReport(lab)}
                className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-teal-400 transition-all cursor-pointer space-y-3 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">{lab.id} • {lab.category}</span>
                    <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-teal-900 transition-colors">
                      {lab.testName}
                    </h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    lab.status === 'Critical Panic Alert'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}>
                    {lab.status}
                  </span>
                </div>

                {/* Key Parameter Pill Snippets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {lab.parameters.slice(0, 3).map((p, i) => (
                    <span
                      key={i}
                      className={`text-[10px] font-medium px-2 py-1 rounded-lg border ${
                        p.flag === 'Critical' || p.flag === 'High'
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {p.name}: <strong className="font-mono">{p.value} {p.unit}</strong> ({p.flag})
                    </span>
                  ))}
                  {lab.parameters.length > 3 && (
                    <span className="text-[10px] font-semibold text-slate-400 self-center">
                      +{lab.parameters.length - 3} more
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  <span>Ordered by: {lab.orderingDoctor || 'Dr. Vikram Malhotra'}</span>
                  <span className="text-teal-700 font-semibold group-hover:underline flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> View Official Report
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar for Documents */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports by title, keywords, findings..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Medical Documents Table / Cards */}
      <div className="space-y-3">
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No Documents Found</p>
            <p className="text-xs text-slate-400">Try adjusting your search query or upload a new record.</p>
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">{doc.title}</h3>
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.2 rounded border border-slate-200">
                      {doc.category}
                    </span>
                    {doc.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-2 py-0.2 rounded border border-amber-200">
                        Patient Uploaded
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">{doc.summary}</p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                    <span>Source: {doc.source}</span>
                    <span>•</span>
                    <span>Date: {doc.date}</span>
                    <span>•</span>
                    <span>{doc.fileType} Format ({doc.fileSize})</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <button
                  onClick={() => setPreviewDocument(doc)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200/80 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={() => alert(`Downloaded "${doc.title}.pdf"`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
