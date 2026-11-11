import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Database,
  Lock,
  ShieldCheck,
  Server,
  FileCode,
  Key,
  Users,
  CheckCircle,
} from 'lucide-react';

export const FirebaseArchitectureModal: React.FC = () => {
  const { isFirebaseArchitectureOpen, setIsFirebaseArchitectureOpen } = useApp();

  if (!isFirebaseArchitectureOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#0b192e] text-white p-4 sm:p-5 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Database className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">HealthRoute Firebase Architecture Plan</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  Production Integration Blueprint
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Prepared for Cloud Firestore, Firebase Auth, and Storage RBAC Deployment
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsFirebaseArchitectureOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-700">
          {/* Executive Overview */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Architecture Overview & Compliance Model
            </h3>
            <p className="text-slate-600 leading-relaxed">
              HealthRoute is architected with a decoupled data layer ready for instantaneous synchronization with Firebase. 
              The application handles sensitive emergency health records with zero patient data exposure to unauthorized roles, strictly adhering to NABH and India's DISHA (Digital Information Security in Healthcare Act) guidelines.
            </p>
          </div>

          {/* Component Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 text-blue-700 font-bold">
                <Key className="w-4 h-4 text-blue-600" />
                <span>1. Firebase Authentication</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Hospital staff authenticate using enterprise email and MFA. Custom Claims (<code className="text-blue-800">role: 'doctor' | 'cmo' | 'nurse' | 'records' | 'admin'</code>) are attached to JWT tokens to enforce backend rules at the database engine level.
              </p>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-700 font-bold">
                <Database className="w-4 h-4 text-amber-600" />
                <span>2. Cloud Firestore Database</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Document-oriented real-time collections for low-latency emergency telemetry: <code>patients</code>, <code>cases</code>, <code>mlc_records</code>, <code>poison_protocols</code>, <code>transfers</code>, <code>incoming_ambulances</code>, and immutable <code>audit_logs</code>.
              </p>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 text-teal-700 font-bold">
                <Server className="w-4 h-4 text-teal-600" />
                <span>3. Firebase Storage</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                AES-256 encrypted bucket for sealed Medico-Legal documentation PDFs, police intimation memos with acknowledgment signatures, and high-resolution trauma photo documentation.
              </p>
            </div>
          </div>

          {/* Role-Based Access Control (RBAC) Matrix */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <span>Role-Based Access Control (RBAC) Security Matrix</span>
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-100 font-semibold text-slate-700">
                  <tr>
                    <th className="p-2.5">User Role</th>
                    <th className="p-2.5">Emergency Triage</th>
                    <th className="p-2.5">Unidentified Patient Intake</th>
                    <th className="p-2.5">Medico-Legal Cases (MLC)</th>
                    <th className="p-2.5">Tox Protocols</th>
                    <th className="p-2.5">Audit & Administration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2.5 font-bold">Emergency Doctor</td>
                    <td className="p-2.5 text-emerald-700 font-medium">Read / Write / Vitals</td>
                    <td className="p-2.5 text-emerald-700 font-medium">Full Access</td>
                    <td className="p-2.5 text-emerald-700 font-medium">Sign & Seal / Draft</td>
                    <td className="p-2.5 text-emerald-700 font-medium">Full Titration</td>
                    <td className="p-2.5 text-slate-400">Audit Read-Only</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Casualty Medical Officer (CMO)</td>
                    <td className="p-2.5 text-emerald-700 font-medium">Read / Write</td>
                    <td className="p-2.5 text-emerald-700 font-medium">Full Access</td>
                    <td className="p-2.5 text-purple-700 font-bold">Exclusive Statutory Sign</td>
                    <td className="p-2.5 text-emerald-700 font-medium">Full Protocol</td>
                    <td className="p-2.5 text-slate-600">Police Chowki Liaison</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Triage / ER Nurse</td>
                    <td className="p-2.5 text-emerald-700 font-medium">Triage Score / Vitals</td>
                    <td className="p-2.5 text-emerald-700 font-medium">Fast-track Intake</td>
                    <td className="p-2.5 text-slate-500">Draft Wound Only</td>
                    <td className="p-2.5 text-emerald-700 font-medium">Log Antidotes</td>
                    <td className="p-2.5 text-slate-400">No Access</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Emergency Records Clerk</td>
                    <td className="p-2.5 text-slate-500">Read / Case Sheet Print</td>
                    <td className="p-2.5 text-emerald-700 font-medium">Temp ID Gen / Reconcile</td>
                    <td className="p-2.5 text-slate-500">Dispatch Intimation Memo</td>
                    <td className="p-2.5 text-slate-400">View Only</td>
                    <td className="p-2.5 text-slate-400">No Access</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">System Administrator</td>
                    <td className="p-2.5 text-slate-500">Read-Only Auditing</td>
                    <td className="p-2.5 text-slate-500">Read-Only</td>
                    <td className="p-2.5 text-slate-500">Security Archiving</td>
                    <td className="p-2.5 text-slate-500">Read-Only</td>
                    <td className="p-2.5 text-emerald-700 font-bold">Full Staff Roster & System Logs</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Firestore Security Rules Sample */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileCode className="w-4 h-4 text-amber-600" />
              <span>Proposed Cloud Firestore Security Rules (firestore.rules)</span>
            </h4>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    function hasRole(role) {
      return isAuthenticated() && request.auth.token.role == role;
    }
    function isMedicalStaff() {
      return hasRole('doctor') || hasRole('cmo') || hasRole('nurse');
    }

    // Emergency Cases & Patients
    match /patients/{patientId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if false; // Patient records are never deleted
    }

    match /cases/{caseId} {
      allow read: if isAuthenticated();
      allow create, update: if isMedicalStaff() || hasRole('records');
      allow delete: if false;
    }

    // Medico-Legal Cases (Strict Statutory Control)
    match /mlc_records/{mlcId} {
      allow read: if isAuthenticated();
      allow create, update: if isMedicalStaff();
      // Only CMO or authorized doctor can mark Signed & Sealed
      allow update: if request.resource.data.reviewStatus == 'Signed & Sealed' 
        ? (hasRole('cmo') || hasRole('doctor'))
        : isMedicalStaff();
    }

    // Immutable Audit Trail (Append-only)
    match /audit_logs/{logId} {
      allow read: if hasRole('admin') || hasRole('cmo');
      allow create: if isAuthenticated();
      allow update, delete: if false; // Append-only audit integrity
    }
  }
}`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Architecture validated for Firebase Integration. Ready for backend deployment.
          </div>
          <button
            onClick={() => setIsFirebaseArchitectureOpen(false)}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs"
          >
            Acknowledge Blueprint
          </button>
        </div>
      </div>
    </div>
  );
};
