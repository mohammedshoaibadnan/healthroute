import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Activity,
  AlertTriangle,
  Siren,
  Scale,
  Biohazard,
  Truck,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  FileCheck,
  UserCheck,
  Bed,
} from 'lucide-react';
import { TriageLevel, CaseStatus, EmergencyCase } from '../../types';
import { filterEmergencyCases } from '../../utils/rules';

export const EmergencyDashboard: React.FC = () => {
  const {
    cases,
    patients,
    mlcCases,
    poisonCases,
    transfers,
    incomingAmbulances,
    currentUser,
    setActiveTab,
    setSelectedCaseId,
    setIsNewRegistrationOpen,
    setIsNewCaseOpen,
    acknowledgeAmbulance,
    reserveBayForAmbulance,
    auditLogs,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [triageFilter, setTriageFilter] = useState<'ALL' | TriageLevel>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ACTIVE');
  const [onlyUnidentified, setOnlyUnidentified] = useState(false);
  const [onlyMlc, setOnlyMlc] = useState(false);

  // Filtered cases
  const filteredCases = filterEmergencyCases(cases, {
    search: searchQuery,
    triage: triageFilter,
    status: statusFilter,
    onlyUnidentified,
    onlyMlc,
  });

  // Key KPI metrics
  const redCases = cases.filter(c => c.triageLevel === 'RED' && !['Discharged', 'Transferred', 'Brought Dead / Expired'].includes(c.status));
  const yellowCases = cases.filter(c => c.triageLevel === 'YELLOW' && !['Discharged', 'Transferred', 'Brought Dead / Expired'].includes(c.status));
  const unidentifiedPatients = patients.filter(p => p.isUnidentified);
  const pendingMlc = mlcCases.filter(m => m.reviewStatus !== 'Signed & Sealed');
  const activeTox = poisonCases.length;
  const enRouteAmbulances = incomingAmbulances.filter(a => a.preAlertStatus !== 'Arrived Bay');

  const getTriageBadge = (level: TriageLevel, esi: number) => {
    switch (level) {
      case 'RED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-xs bg-rose-600 text-white shadow-xs animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            RED (ESI {esi})
          </span>
        );
      case 'YELLOW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold text-xs bg-amber-500 text-white">
            YELLOW (ESI {esi})
          </span>
        );
      case 'GREEN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold text-xs bg-emerald-600 text-white">
            GREEN (ESI {esi})
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded font-semibold text-xs bg-slate-700 text-white">
            BLACK
          </span>
        );
    }
  };

  const getStatusBadge = (status: CaseStatus) => {
    switch (status) {
      case 'Under Resuscitation':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Resuscitation</span>;
      case 'Active Triage':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">Triage Intake</span>;
      case 'Under Evaluation':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">Under Eval</span>;
      case 'Stabilized':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Stabilized</span>;
      case 'Transferred':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">Transferred</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome & Quick Action Bar */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Emergency Operations Command
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              Live Station
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Logged in as <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.designation}) • Active Shift: {currentUser.activeShift}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsNewRegistrationOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Fast-Track Intake (Unidentified)</span>
          </button>

          <button
            onClick={() => setIsNewCaseOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0b192e] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-teal-400" />
            <span>New Emergency Case</span>
          </button>

          <button
            onClick={() => setActiveTab('mlc')}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors"
          >
            <Scale className="w-3.5 h-3.5 text-purple-600" />
            <span>Draft MLC</span>
          </button>

          <button
            onClick={() => setActiveTab('poisoning')}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors"
          >
            <Biohazard className="w-3.5 h-3.5 text-rose-600" />
            <span>Tox Protocol</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Red cases */}
        <div 
          onClick={() => { setTriageFilter('RED'); setStatusFilter('ACTIVE'); }}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs hover:border-rose-400 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Resuscitation</span>
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{redCases.length}</div>
          <p className="text-[11px] text-slate-500 font-medium">RED / ESI 1-2 Critical</p>
        </div>

        {/* Yellow cases */}
        <div 
          onClick={() => { setTriageFilter('YELLOW'); setStatusFilter('ACTIVE'); }}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs hover:border-amber-400 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Emergent</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{yellowCases.length}</div>
          <p className="text-[11px] text-slate-500 font-medium">YELLOW / ESI 3</p>
        </div>

        {/* Unidentified Patients */}
        <div 
          onClick={() => setActiveTab('registration')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs hover:border-teal-500 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-teal-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Unidentified</span>
            <ShieldAlert className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{unidentifiedPatients.length}</div>
          <p className="text-[11px] text-teal-700 font-semibold">Active Temp IDs</p>
        </div>

        {/* Pending MLCs */}
        <div 
          onClick={() => setActiveTab('mlc')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs hover:border-purple-400 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending MLC</span>
            <Scale className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{pendingMlc.length}</div>
          <p className="text-[11px] text-slate-500 font-medium">Requires CMO Review</p>
        </div>

        {/* Active Poisoning */}
        <div 
          onClick={() => setActiveTab('poisoning')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs hover:border-rose-400 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tox Protocol</span>
            <Biohazard className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{activeTox}</div>
          <p className="text-[11px] text-slate-500 font-medium">Atropine / Lavage</p>
        </div>

        {/* Bay Capacity */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Resus Bays</span>
            <Bed className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">2 / 4</div>
          <p className="text-[11px] text-emerald-600 font-semibold">2 Bays Available</p>
        </div>
      </div>

      {/* Incoming Ambulances Live Pre-Alert Banner */}
      {enRouteAmbulances.length > 0 && (
        <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm border border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <Siren className="w-5 h-5 text-amber-400 animate-bounce" />
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">
                  INCOMING AMBULANCE PRE-ALERT & TRANSIT RADAR ({enRouteAmbulances.length})
                </h2>
                <p className="text-[11px] text-slate-400">Pre-hospital telemetry and estimated arrival times</p>
              </div>
            </div>
            <span className="text-xs bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded border border-amber-500/30">
              Live Transit Feed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {enRouteAmbulances.map((amb) => (
              <div 
                key={amb.id} 
                className="bg-slate-800/90 rounded-lg p-3 border border-slate-700 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{amb.vehicleNo}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      amb.triagePriority === 'RED' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {amb.triagePriority} • ETA {amb.etaMinutes}m
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 font-medium mt-1.5 line-clamp-2">
                    {amb.patientBrief}
                  </p>

                  <div className="mt-2 text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded space-y-1">
                    <div><span className="text-slate-400">Suspected:</span> {amb.suspectedCondition}</div>
                    <div><span className="text-slate-400">Vitals:</span> {amb.vitalsEstimate}</div>
                    <div><span className="text-slate-400">Crew:</span> {amb.crewContact}</div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-700/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">
                    Assigned: <strong className="text-teal-400">{amb.receivingBayReserved}</strong>
                  </span>
                  {!amb.acknowledgedByHospital ? (
                    <button
                      onClick={() => acknowledgeAmbulance(amb.id)}
                      className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-colors"
                    >
                      Acknowledge & Prep
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Bay Prepped
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Cases Board */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Table Controls & Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Active Emergency Cases</h2>
            <p className="text-xs text-slate-500">Live clinical triage board, vitals and bed allocations</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search patient, Temp ID, case..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-teal-500"
              />
            </div>

            {/* Triage Pills */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              {(['ALL', 'RED', 'YELLOW', 'GREEN'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTriageFilter(t)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    triageFilter === t
                      ? 'bg-[#0b192e] text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Unidentified toggle */}
            <button
              onClick={() => setOnlyUnidentified(!onlyUnidentified)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                onlyUnidentified
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Unidentified Only
            </button>

            {/* MLC toggle */}
            <button
              onClick={() => setOnlyMlc(!onlyMlc)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                onlyMlc
                  ? 'bg-purple-50 text-purple-800 border-purple-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              MLC Cases
            </button>
          </div>
        </div>

        {/* Cases Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Case ID & Bed</th>
                <th className="py-2.5 px-3">Patient Information</th>
                <th className="py-2.5 px-3">Triage / ESI</th>
                <th className="py-2.5 px-3">Chief Complaint</th>
                <th className="py-2.5 px-3">Current Vitals</th>
                <th className="py-2.5 px-3">Assigned Staff</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No emergency cases match the active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => {
                  const patient = c.patientSnapshot;
                  return (
                    <tr 
                      key={c.id} 
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => setSelectedCaseId(c.id)}
                    >
                      {/* Case & Bed */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                          {c.id}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mt-0.5">
                          <Bed className="w-3 h-3 text-slate-400" />
                          <span>{c.bedBay}</span>
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">{patient.name}</span>
                          {patient.isUnidentified && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              TEMP ID
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {patient.gender} • {patient.age} yrs {patient.bloodGroup ? `• Blood: ${patient.bloodGroup}` : ''}
                        </div>
                        {patient.tempId && (
                          <div className="text-[10px] font-mono text-amber-800 font-semibold mt-0.5">
                            {patient.tempId}
                          </div>
                        )}
                        {patient.permanentMrn && (
                          <div className="text-[10px] font-mono text-slate-500">
                            MRN: {patient.permanentMrn}
                          </div>
                        )}
                      </td>

                      {/* Triage */}
                      <td className="py-3 px-3">
                        {getTriageBadge(c.triageLevel, c.esiScore)}
                        <div className="text-[10px] text-slate-500 mt-1">
                          {c.incidentType.split(' ')[0]}
                        </div>
                      </td>

                      {/* Chief complaint */}
                      <td className="py-3 px-3 max-w-[240px]">
                        <p className="font-medium text-slate-800 line-clamp-2 leading-snug">
                          {c.chiefComplaint}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                          {c.isMlc && (
                            <span className="font-bold px-1 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200">
                              MLC Case
                            </span>
                          )}
                          {c.isPoisoning && (
                            <span className="font-bold px-1 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200">
                              Poisoning
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Current vitals */}
                      <td className="py-3 px-3">
                        <div className="text-[11px] font-mono space-y-0.5">
                          <div>
                            <span className="text-slate-400">BP:</span> <strong className="text-slate-800">{c.vitals.bp}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">HR:</span> <strong className="text-slate-800">{c.vitals.pulse}</strong> • <span className="text-slate-400">SpO2:</span> <strong className={c.vitals.spo2 < 90 ? 'text-rose-600 font-bold' : 'text-slate-800'}>{c.vitals.spo2}%</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">GCS:</span> <strong className={c.vitals.gcs <= 8 ? 'text-rose-600 font-bold' : 'text-slate-800'}>{c.vitals.gcs}/15</strong>
                          </div>
                        </div>
                      </td>

                      {/* Assigned staff */}
                      <td className="py-3 px-3 text-[11px]">
                        <div className="text-slate-800 font-medium">{c.assignedPhysician}</div>
                        <div className="text-slate-500 mt-0.5">{c.assignedNurse}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {getStatusBadge(c.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCaseId(c.id);
                          }}
                          className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 font-semibold border border-slate-200 transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Case Sheet</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lower Dashboard Grid: Pending Tasks & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending Medico-Legal Review & Police Intimation */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-sm text-slate-900">Medico-Legal Cases (MLC) Pending Review</h3>
            </div>
            <button
              onClick={() => setActiveTab('mlc')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <span>View All MLCs</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {mlcCases.slice(0, 3).map((m) => (
              <div key={m.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{m.id}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                      {m.injuryClassification}
                    </span>
                    {m.isUnidentified && (
                      <span className="text-[10px] font-bold px-1 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        Temp ID
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 font-medium mt-0.5">{m.patientName}</p>
                  <p className="text-[11px] text-slate-400">PS: {m.policeStation}</p>
                </div>

                <div className="text-right">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    m.reviewStatus === 'Signed & Sealed' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {m.reviewStatus}
                  </span>
                  <div className="mt-1">
                    <button
                      onClick={() => setActiveTab('mlc')}
                      className="text-[11px] text-teal-600 hover:underline font-semibold"
                    >
                      Review Wounds
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Emergency Audit Trail */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h3 className="font-bold text-sm text-slate-900">Live Hospital Activity & Audit Stream</h3>
            </div>
            <button
              onClick={() => setActiveTab('admin')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <span>Full Audit Logs</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2 space-y-1">
            {auditLogs.slice(0, 4).map((log) => (
              <div key={log.id} className="py-2 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <div className="flex items-center gap-1.5 font-medium">
                    <strong className="text-slate-800">{log.userName}</strong>
                    <span className="text-[10px] uppercase px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                      {log.userRole}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="font-semibold text-slate-900 mt-0.5">{log.action}</div>
                <p className="text-[11px] text-slate-500 line-clamp-1">{log.details}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
