import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Search,
  Filter,
  Eye,
  Printer,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Lock,
} from 'lucide-react';
import { HospitalDocument } from '../../types';
import { DocumentPreviewModal } from './DocumentPreviewModal';

export const DocumentCentre: React.FC = () => {
  const {
    documents,
    cases,
    generateDocument,
    selectedDocId,
    setSelectedDocId,
  } = useApp();

  const [search, setSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('ALL');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  // New doc generation state
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id || '');
  const [selectedDocType, setSelectedDocType] = useState<HospitalDocument['docType']>('EMERGENCY_CASE_SHEET');

  const filtered = documents.filter((d) => {
    if (docTypeFilter !== 'ALL' && d.docType !== docTypeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        d.id.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.patientName.toLowerCase().includes(q) ||
        d.caseId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    const created = generateDocument(selectedDocType, selectedCaseId);
    setIsGenerateModalOpen(false);
    setSelectedDocId(created.id);
  };

  const getDocTypeBadge = (type: HospitalDocument['docType']) => {
    switch (type) {
      case 'MLC_CERTIFICATE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'POISON_PROTOCOL':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'TRANSFER_SUMMARY':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'TRIAGE_SLIP':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Emergency Document Centre & Records
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              {documents.length} Records Archived
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tamper-evident clinical stationery, injury certificates, poison flowsheets, and transfer handover summaries.
          </p>
        </div>

        <button
          onClick={() => setIsGenerateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Generate New Record</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Document ID, patient name, case reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
          >
            <option value="ALL">All Document Types</option>
            <option value="EMERGENCY_CASE_SHEET">Emergency Case Sheets</option>
            <option value="MLC_CERTIFICATE">MLC Injury Certificates</option>
            <option value="POISON_PROTOCOL">Poisoning Protocols</option>
            <option value="TRANSFER_SUMMARY">Transfer Summaries</option>
            <option value="TRIAGE_SLIP">Triage Slips</option>
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((d) => (
          <div
            key={d.id}
            onClick={() => setSelectedDocId(d.id)}
            className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs hover:border-teal-500 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                  {d.id}
                </span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getDocTypeBadge(d.docType)}`}>
                  {d.docType.replace(/_/g, ' ')}
                </span>
              </div>

              <h3 className="font-bold text-sm text-slate-900 mt-2.5 group-hover:text-teal-600 transition-colors line-clamp-2">
                {d.title}
              </h3>

              <div className="mt-2 text-xs text-slate-600 space-y-1">
                <div>
                  <span className="text-slate-400">Patient:</span>{' '}
                  <strong className="text-slate-900">{d.patientName}</strong>
                  {d.isUnidentified && (
                    <span className="ml-1 text-[9px] uppercase font-bold px-1 rounded bg-amber-100 text-amber-800">
                      TEMP ID
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400">Case Link:</span>{' '}
                  <span className="font-mono font-medium text-slate-700">{d.caseId}</span>
                </div>
                <div>
                  <span className="text-slate-400">Author:</span> {d.author}
                </div>
              </div>

              <p className="mt-2.5 text-[11px] text-slate-500 line-clamp-2 italic bg-slate-50 p-2 rounded-lg">
                "{d.summaryExcerpt}"
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400 font-mono">
                {new Date(d.generatedAt).toLocaleDateString()}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDocId(d.id);
                }}
                className="text-teal-600 font-semibold hover:underline flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Record</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Generate Document Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Generate Official Emergency Record</h3>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Active Emergency Case *
                </label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} — {c.patientSnapshot.name} ({c.bedBay})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Document Form Type *
                </label>
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium"
                >
                  <option value="EMERGENCY_CASE_SHEET">Emergency Resuscitation & Case Sheet</option>
                  <option value="MLC_CERTIFICATE">Provisional Medico-Legal Injury Certificate</option>
                  <option value="POISON_PROTOCOL">Toxicology & Poison Protocol Record</option>
                  <option value="TRANSFER_SUMMARY">Structured Inter-Facility Transfer Summary</option>
                  <option value="TRIAGE_SLIP">Emergency Triage Slip</option>
                  <option value="DAMA_RECORD">Discharge Against Medical Advice (DAMA/LAMA)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-xs"
                >
                  Generate Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {selectedDocId && (
        <DocumentPreviewModal
          docId={selectedDocId}
          onClose={() => setSelectedDocId(null)}
        />
      )}
    </div>
  );
};
