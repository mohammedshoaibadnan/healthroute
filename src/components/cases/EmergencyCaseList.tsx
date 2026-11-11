import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Stethoscope,
  Plus,
  Search,
  Filter,
  Eye,
  Bed,
  Heart,
  Scale,
  Biohazard,
  Truck,
  AlertTriangle,
} from 'lucide-react';
import { TriageLevel, CaseStatus } from '../../types';
import { filterEmergencyCases } from '../../utils/rules';

export const EmergencyCaseList: React.FC = () => {
  const {
    cases,
    setSelectedCaseId,
    setIsNewCaseOpen,
    setActiveTab,
  } = useApp();

  const [search, setSearch] = useState('');
  const [triageFilter, setTriageFilter] = useState<'ALL' | TriageLevel>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [onlyUnidentified, setOnlyUnidentified] = useState(false);
  const [onlyMlc, setOnlyMlc] = useState(false);
  const [onlyPoison, setOnlyPoison] = useState(false);

  const filtered = filterEmergencyCases(cases, {
    search,
    triage: triageFilter,
    status: statusFilter,
    onlyUnidentified,
    onlyMlc,
    onlyPoison,
  });

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Emergency Case Management
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {cases.length} Total Cases
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time emergency tracking, triage allocation, clinical timelines, and bed occupancy.
          </p>
        </div>

        <button
          onClick={() => setIsNewCaseOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0b192e] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-teal-400" />
          <span>New Emergency Case</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by patient name, case ID, temporary ID, bed bay or physician..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-teal-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Triage filter pills */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {(['ALL', 'RED', 'YELLOW', 'GREEN'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setTriageFilter(lvl)}
                  className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                    triageFilter === lvl
                      ? 'bg-[#0b192e] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Status select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">All Active Cases</option>
              <option value="Under Resuscitation">Under Resuscitation</option>
              <option value="Active Triage">Active Triage</option>
              <option value="Under Evaluation">Under Evaluation</option>
              <option value="Stabilized">Stabilized</option>
              <option value="Transferred">Transferred</option>
              <option value="Discharged">Discharged</option>
            </select>
          </div>
        </div>

        {/* Quick Attribute Toggles */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Quick Flags:
          </span>
          <button
            onClick={() => setOnlyUnidentified(!onlyUnidentified)}
            className={`px-2.5 py-1 rounded-md font-semibold border transition-colors ${
              onlyUnidentified
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Unidentified Patients Only
          </button>
          <button
            onClick={() => setOnlyMlc(!onlyMlc)}
            className={`px-2.5 py-1 rounded-md font-semibold border transition-colors ${
              onlyMlc
                ? 'bg-purple-100 text-purple-900 border-purple-300'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Medico-Legal Cases (MLC)
          </button>
          <button
            onClick={() => setOnlyPoison(!onlyPoison)}
            className={`px-2.5 py-1 rounded-md font-semibold border transition-colors ${
              onlyPoison
                ? 'bg-rose-100 text-rose-900 border-rose-300'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Poisoning / Toxin Ingestion
          </button>
        </div>
      </div>

      {/* Cases Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => {
          const patient = c.patientSnapshot;
          return (
            <div
              key={c.id}
              onClick={() => setSelectedCaseId(c.id)}
              className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs hover:border-teal-500 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Top strip */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-teal-600 transition-colors">
                        {c.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          c.triageLevel === 'RED'
                            ? 'bg-rose-600 text-white'
                            : c.triageLevel === 'YELLOW'
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {c.triageLevel} (ESI {c.esiScore})
                      </span>
                    </div>

                    <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                      <Bed className="w-3 h-3 text-slate-400" />
                      <span>{c.bedBay}</span>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {c.status}
                  </span>
                </div>

                {/* Patient Information */}
                <div className="mt-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900">{patient.name}</span>
                    {patient.isUnidentified && (
                      <span className="text-[9px] uppercase font-bold px-1 rounded bg-amber-100 text-amber-800 border border-amber-300">
                        TEMP ID
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {patient.gender} • {patient.age}y {patient.bloodGroup ? `• Blood: ${patient.bloodGroup}` : ''}
                  </div>
                  {patient.tempId && (
                    <div className="text-[10px] font-mono text-amber-800 font-semibold mt-0.5">
                      {patient.tempId}
                    </div>
                  )}
                </div>

                {/* Complaint */}
                <div className="mt-2.5">
                  <p className="text-xs text-slate-700 line-clamp-2 leading-snug font-medium">
                    {c.chiefComplaint}
                  </p>
                </div>

                {/* Vitals summary */}
                <div className="mt-3 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-mono grid grid-cols-3 gap-1 text-center">
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase">BP</span>
                    <strong>{c.vitals.bp}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase">Pulse</span>
                    <strong>{c.vitals.pulse} bpm</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase">SpO2</span>
                    <strong className={c.vitals.spo2 < 90 ? 'text-rose-600' : 'text-slate-800'}>
                      {c.vitals.spo2}%
                    </strong>
                  </div>
                </div>

                {/* Flags */}
                <div className="mt-2.5 flex items-center gap-1.5 text-[10px]">
                  {c.isMlc && (
                    <span className="font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                      <Scale className="w-2.5 h-2.5" />
                      <span>MLC</span>
                    </span>
                  )}
                  {c.isPoisoning && (
                    <span className="font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                      <Biohazard className="w-2.5 h-2.5" />
                      <span>Tox</span>
                    </span>
                  )}
                  {c.transferId && (
                    <span className="font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1">
                      <Truck className="w-2.5 h-2.5" />
                      <span>Transfer</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom staff info & action */}
              <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <div className="text-slate-500 truncate max-w-[150px]">
                  Dr. {c.assignedPhysician.split(' ').pop()}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCaseId(c.id);
                  }}
                  className="text-teal-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>Open Sheet</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
