import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Scale,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  Eye,
  FileCheck,
  Printer,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { MLCEditModal } from './MLCEditModal';

export const MLCManager: React.FC = () => {
  const {
    mlcCases,
    currentUser,
    setSelectedDocId,
    setActiveTab,
    generateDocument,
  } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedMlcForModal, setSelectedMlcForModal] = useState<string | null>(null);

  const pendingReviewCount = mlcCases.filter((m) => m.reviewStatus !== 'Signed & Sealed').length;
  const signedCount = mlcCases.filter((m) => m.reviewStatus === 'Signed & Sealed').length;
  const intimationSentCount = mlcCases.filter((m) => m.intimationSentToPolice).length;

  const filtered = mlcCases.filter((m) => {
    if (statusFilter !== 'ALL' && m.reviewStatus !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchId = m.id.toLowerCase().includes(q);
      const matchName = m.patientName.toLowerCase().includes(q);
      const matchPs = m.policeStation.toLowerCase().includes(q);
      const matchFir = m.firOrGdNumber?.toLowerCase().includes(q);
      return matchId || matchName || matchPs || matchFir;
    }
    return true;
  });

  const handlePrint = (caseId: string) => {
    const doc = generateDocument('MLC_CERTIFICATE', caseId);
    setSelectedDocId(doc.id);
    setActiveTab('documents');
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Medico-Legal Case (MLC) Directorate
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              {mlcCases.length} Registered MLCs
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Casualty Medical Officer (CMO) examination register, wound documentation, chain of custody, and police intimation memos.
          </p>
        </div>
      </div>

      {/* Statutory Healthcare Compliance Banner */}
      <div className="bg-purple-900 text-white rounded-xl p-4 shadow-sm flex items-start gap-3">
        <Scale className="w-5 h-5 text-purple-300 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <h2 className="font-bold text-sm text-purple-100">
            Mandatory Medico-Legal Examination & Documentation Rules (India)
          </h2>
          <p className="text-purple-200 leading-relaxed">
            All alleged road traffic accidents (RTA), assaults, gunshot wounds, burns, suspected poisoning, and industrial accidents brought to the emergency department must have an official MLC registered.
            <strong> Statutory Notice:</strong> MLC decisions, injury classification, and intimation submissions remain strictly under authorized hospital medical staff control. No automated police notifications or legal judgements are made.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-xs font-bold uppercase tracking-wider">Pending CMO Review</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{pendingReviewCount}</div>
          <p className="text-[11px] text-slate-500">Drafted certificates requiring validation</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider">Signed & Sealed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{signedCount}</div>
          <p className="text-[11px] text-slate-500">Finalized with hospital wax seal</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-xs font-bold uppercase tracking-wider">Police Intimations</span>
            <Send className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{intimationSentCount}</div>
          <p className="text-[11px] text-slate-500">Memos dispatched to Police Chowki</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by MLC number, patient name, Police Station, GD/FIR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
          >
            <option value="ALL">All MLC Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending CMO Review">Pending CMO Review</option>
            <option value="Signed & Sealed">Signed & Sealed</option>
          </select>
        </div>
      </div>

      {/* MLC Cards / Table */}
      <div className="space-y-3">
        {filtered.map((m) => {
          const isSigned = m.reviewStatus === 'Signed & Sealed';
          return (
            <div
              key={m.id}
              className={`bg-white rounded-xl border p-4 shadow-xs transition-all ${
                isSigned ? 'border-emerald-200/80' : 'border-purple-200/80 hover:border-purple-400'
              }`}
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {m.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        isSigned
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {m.reviewStatus}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      Injury: {m.injuryClassification}
                    </span>
                    {m.isUnidentified && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        Unidentified Patient
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 mt-2">
                    {m.patientName}
                  </h3>

                  <div className="mt-1 text-xs text-slate-600 flex flex-wrap items-center gap-y-1 gap-x-4">
                    <div>
                      <span className="text-slate-400">Jurisdiction Police Station:</span>{' '}
                      <strong className="text-slate-800">{m.policeStation}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Station Diary / GD:</span>{' '}
                      <span className="font-mono font-medium">{m.firOrGdNumber || 'Not recorded'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Brought By:</span> {m.broughtByName} ({m.broughtByDesignation})
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => handlePrint(m.caseId)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Certificate</span>
                  </button>

                  <button
                    onClick={() => setSelectedMlcForModal(m.id)}
                    className="px-4 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isSigned ? 'View MLC Record' : 'Review & Edit MLC'}</span>
                  </button>
                </div>
              </div>

              {/* Wounds snapshot */}
              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div className="text-slate-600">
                  <span className="text-slate-400 block text-[11px]">Wounds Catalogued:</span>
                  <strong>{m.wounds.length} Documented Lesions</strong>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {m.wounds.map((w) => `${w.type} (${w.location})`).join(', ') || 'No wounds'}
                  </div>
                </div>

                <div className="text-slate-600">
                  <span className="text-slate-400 block text-[11px]">Police Intimation Status:</span>
                  {m.intimationSentToPolice ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Dispatched & Acknowledged</span>
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pending Dispatch to Chowki</span>
                    </span>
                  )}
                </div>

                <div className="text-slate-600">
                  <span className="text-slate-400 block text-[11px]">Chain of Evidence:</span>
                  <span>{m.clothingSealedAndHandedOver ? 'Clothing sealed with hospital seal' : 'No articles seized'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {selectedMlcForModal && (
        <MLCEditModal
          mlcId={selectedMlcForModal}
          onClose={() => setSelectedMlcForModal(null)}
        />
      )}
    </div>
  );
};
