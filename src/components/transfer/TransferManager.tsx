import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  Building2,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { NewTransferModal } from './NewTransferModal';
import { PatientTransfer } from '../../types';

export const TransferManager: React.FC = () => {
  const {
    transfers,
    updateTransferStatus,
    generateDocument,
    setSelectedDocId,
    setActiveTab,
  } = useApp();

  const [search, setSearch] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const activeTransfers = transfers.filter(
    (t) => t.status === 'Ambulance En-Route' || t.status === 'Initiated'
  );

  const filtered = transfers.filter((t) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.id.toLowerCase().includes(q) ||
        t.patientName.toLowerCase().includes(q) ||
        t.receivingHospital.toLowerCase().includes(q) ||
        t.clinicalReason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handlePrintSummary = (caseId: string) => {
    const doc = generateDocument('TRANSFER_SUMMARY', caseId);
    setSelectedDocId(doc.id);
    setActiveTab('documents');
  };

  const handleCompleteHandover = (transferId: string) => {
    const notes = prompt('Enter Handover Receiving Staff notes / Ack Ref:', 'Bed handover completed to Dr. Duty Incharge');
    if (notes) {
      updateTransferStatus(transferId, 'Handover Completed', notes);
      alert('Transfer status transitioned to Handover Completed.');
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Patient Transfer Coordination
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {activeTransfers.length} In Transit
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Inter-facility referral network, ambulance dispatch tracking, and clinical handover summaries.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Initiate New Transfer</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Transfer ID, receiving hospital, patient name, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-teal-500"
          />
        </div>
      </div>

      {/* Transfers Cards */}
      <div className="space-y-4">
        {filtered.map((t) => {
          const isEnRoute = t.status === 'Ambulance En-Route';
          const isDone = t.status === 'Handover Completed';
          return (
            <div
              key={t.id}
              className={`bg-white rounded-xl border p-4 sm:p-5 shadow-xs transition-all ${
                isEnRoute
                  ? 'border-emerald-300 ring-1 ring-emerald-200'
                  : 'border-slate-200/90'
              }`}
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {t.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        isDone
                          ? 'bg-slate-100 text-slate-700'
                          : isEnRoute
                          ? 'bg-emerald-500 text-white animate-pulse'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {t.status}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {t.transportDetails.ambulanceType}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 mt-2">
                    {t.patientName}
                  </h3>

                  <div className="mt-2 text-xs text-slate-600 flex flex-wrap items-center gap-y-1 gap-x-4">
                    <div className="flex items-center gap-1.5 font-medium text-slate-800">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.receivingHospital}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Unit:</span> {t.receivingDepartment}
                    </div>
                    <div>
                      <span className="text-slate-400">Acceptance Ref:</span>{' '}
                      <span className="font-mono font-semibold">{t.acceptanceReferenceCode}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => handlePrintSummary(t.caseId)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Print Transfer Summary</span>
                  </button>

                  {!isDone && (
                    <button
                      onClick={() => handleCompleteHandover(t.id)}
                      className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Handover Completed</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Handover & Transit Parameters */}
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                    Clinical Reason
                  </span>
                  <div className="font-medium text-slate-800 mt-0.5">{t.clinicalReason}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Airway: <strong>{t.summaryAtTransfer.airwayStatus}</strong>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                    Transport & Crew
                  </span>
                  <div className="font-medium text-slate-800 mt-0.5">
                    {t.transportDetails.vehicleRegNumber}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Staff: {t.transportDetails.accompanyingStaff} • {t.transportDetails.contactPhone}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                    Transit Status & ETA
                  </span>
                  <div className="font-semibold text-emerald-700 mt-0.5">
                    Departed {t.transportDetails.departureTime} • {t.transportDetails.estimatedArrival}
                  </div>
                  <div className="text-[11px] text-emerald-800 mt-0.5 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Safety Checklist Verified</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isNewModalOpen && (
        <NewTransferModal onClose={() => setIsNewModalOpen(false)} />
      )}
    </div>
  );
};
