import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  Users,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  Database,
  Building2,
  Bed,
  Activity,
  UserCheck,
  Lock,
} from 'lucide-react';
import { UserRole, AuditLog } from '../../types';

export const AdminDashboard: React.FC = () => {
  const {
    allStaff,
    auditLogs,
    currentUser,
    switchUser,
    setIsFirebaseArchitectureOpen,
    cases,
  } = useApp();

  const [auditSearch, setAuditSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'roster' | 'audit' | 'capacity'>('roster');

  const filteredLogs = auditLogs.filter((log) => {
    if (roleFilter !== 'ALL' && log.userRole !== roleFilter) return false;
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      return (
        log.userName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.targetId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Hospital Operations & Administration
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
              Admin & Compliance
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Emergency department staff roster, role-based access management, capacity command, and immutable audit logs.
          </p>
        </div>

        <button
          onClick={() => setIsFirebaseArchitectureOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0b192e] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Database className="w-3.5 h-3.5 text-teal-400" />
          <span>Firebase Production Blueprint</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-slate-200/60 p-1 rounded-xl text-xs font-semibold max-w-md">
        <button
          onClick={() => setActiveTab('roster')}
          className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'roster'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-blue-600" />
          <span>Staff Roster ({allStaff.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-purple-600" />
          <span>System Audit Trail ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('capacity')}
          className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'capacity'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bed className="w-3.5 h-3.5 text-teal-600" />
          <span>ER Bays & Capacity</span>
        </button>
      </div>

      {/* STAFF ROSTER TAB */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Emergency Department Staff Roster</h3>
                <p className="text-xs text-slate-500">Authorized personnel with role-based access</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Staff Member</th>
                    <th className="py-2.5 px-3">Role & Access Level</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Active Shift & Station</th>
                    <th className="py-2.5 px-3">Duty Status</th>
                    <th className="py-2.5 px-3 text-right">Session Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{staff.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          ID: {staff.employeeCode} • {staff.email}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {staff.role}
                        </span>
                        <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                          {staff.designation}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        {staff.department}
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-slate-800 font-medium">{staff.activeShift}</div>
                        <div className="text-[11px] text-teal-700 font-medium mt-0.5">
                          {staff.station}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          On Active Duty
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        {currentUser.id === staff.id ? (
                          <span className="text-xs font-bold text-teal-600 flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Active User</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => switchUser(staff.id)}
                            className="px-3 py-1 rounded-md bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 font-semibold border border-slate-200 transition-colors"
                          >
                            Switch To User
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOG TAB */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search logs by staff name, action, target ID, details..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-teal-500"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white font-medium"
              >
                <option value="ALL">All Staff Roles</option>
                <option value="doctor">Doctors</option>
                <option value="cmo">Casualty Medical Officers (CMO)</option>
                <option value="nurse">Nurses</option>
                <option value="records">Records Staff</option>
                <option value="admin">Administrators</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">User & Role</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Target</th>
                    <th className="py-2.5 px-3">Audit Details</th>
                    <th className="py-2.5 px-3">Station IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900">{log.userName}</span>
                        <span className="ml-1 text-[9px] uppercase font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                          {log.userRole}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {log.targetType}: {log.targetId}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-[280px] truncate">
                        {log.details}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px] whitespace-nowrap">
                        {log.ipStation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CAPACITY & BAYS TAB */}
      {activeTab === 'capacity' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-600" />
              <span>Resuscitation Zone (Red Bay) — 4 Bays</span>
            </h3>
            <p className="text-xs text-slate-500">
              High-acuity invasive resuscitation with dedicated wall O2, ventilator, and crash carts.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                <div className="font-bold text-rose-950">Resus Bay 1</div>
                <div className="text-[11px] text-rose-800 mt-0.5">Occupied: Unidentified Male #26</div>
                <span className="text-[9px] font-bold uppercase px-1 rounded bg-rose-600 text-white mt-1 inline-block">ESI 1 Polytrauma</span>
              </div>
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                <div className="font-bold text-rose-950">Resus Bay 2</div>
                <div className="text-[11px] text-rose-800 mt-0.5">Occupied: Unidentified Female #19</div>
                <span className="text-[9px] font-bold uppercase px-1 rounded bg-rose-600 text-white mt-1 inline-block">ESI 2 OP Poison</span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="font-bold text-emerald-950">Resus Bay 3</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Reserved for Incoming 108 Ambulance</div>
                <span className="text-[9px] font-bold uppercase px-1 rounded bg-emerald-600 text-white mt-1 inline-block">Crash Cart Ready</span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="font-bold text-emerald-950">Resus Bay 4</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Available (Cleaned & Disinfected)</div>
                <span className="text-[9px] font-bold uppercase px-1 rounded bg-slate-200 text-slate-700 mt-1 inline-block">VACANT</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Bed className="w-4 h-4 text-blue-600" />
              <span>Trauma Acute & Observation Bays</span>
            </h3>
            <p className="text-xs text-slate-500">
              Monitored acute bays for initial stabilization, imaging, and pre-admission workup.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">Trauma Bay 3 (Cardiac)</div>
                <div className="text-[11px] text-slate-600 mt-0.5">Patient: Rameshwar Reddy</div>
                <span className="text-[9px] font-semibold text-teal-700 mt-1 block">Transferred to Cath Lab</span>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="font-bold text-amber-950">Acute ER Bed 04</div>
                <div className="text-[11px] text-amber-800 mt-0.5">Patient: Pooja Venkatesh</div>
                <span className="text-[9px] font-semibold text-amber-900 mt-1 block">Awaiting USG Abdomen</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">Ambulatory Cubicle 2</div>
                <div className="text-[11px] text-slate-600 mt-0.5">Patient: Gopal Krishnan</div>
                <span className="text-[9px] font-semibold text-slate-700 mt-1 block">Wrist Plaster Slab Done</span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="font-bold text-emerald-950">Tox Decontamination Room</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Specialized chemical wash & drain</div>
                <span className="text-[9px] font-bold text-emerald-700 mt-1 block">READY FOR INTAKE</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
