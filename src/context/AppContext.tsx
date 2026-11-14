import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
  StaffUser,
  UserRole,
  Patient,
  EmergencyCase,
  MedicoLegalCase,
  PoisoningCase,
  PatientTransfer,
  HospitalDocument,
  AuditLog,
  IncomingAmbulance,
  CaseStatus,
  CaseVitals,
  ClinicalNote,
  PoisonAntidoteAdmin,
} from '../types';
import {
  HOSPITAL_INFO,
  INITIAL_STAFF,
  INITIAL_PATIENTS,
  INITIAL_CASES,
  INITIAL_MLCS,
  INITIAL_POISON_CASES,
  INITIAL_TRANSFERS,
  INITIAL_DOCUMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_INCOMING_AMBULANCES,
  INITIAL_APPOINTMENTS,
  INITIAL_ENCOUNTERS,
  INITIAL_FOLLOWUPS,
  INITIAL_LAB_REPORTS,
  INITIAL_DOCTORS_DIRECTORY,
  INITIAL_PATIENT_DOCUMENTS,
  INITIAL_CONVERSATIONS,
  INITIAL_PATIENT_MESSAGES,
  INITIAL_PATIENT_NOTIFICATIONS,
  INITIAL_PRIVACY_SETTINGS,
  INITIAL_PRIVACY_SETTINGS_BY_PATIENT,
  INITIAL_ACCESS_AUDIT_LOGS,
  INITIAL_MEDICATION_ACTIVITIES,
  INITIAL_PHARMACY_MEDICINES,
  INITIAL_PHARMACY_BATCHES,
  INITIAL_PHARMACY_TRANSACTIONS,
  INITIAL_PHARMACY_DISPENSING_RECORDS,
  INITIAL_PHARMACY_REORDER_REQUESTS,
} from '../data/mockData';
import {
  generateTempPatientId,
  generateMlcId,
  generatePoisonCaseId,
  generateTransferId,
  acceptAppointmentRequest,
  declineAppointmentRequest,
  proposeAppointmentReschedule,
  respondToRescheduleProposal,
  normalizePrescriptionItems,
  derivePatientMedicationRegimen,
  discontinuePrescriptionInEncounter,
  createPatientMedicationActivity,
  formatDoctorDisplayName,
  buildConversationId,
  canAccessConversation,
  canDoctorReplyToConversation,
  markConversationMessagesAsRead,
  createOrUpdateConversationAndMessage,
  canManagePharmacyInventory,
  addCatalogueMedicine,
  receiveNewPharmacyBatch,
  adjustPharmacyBatchStock as adjustPharmacyBatchStockRule,
  confirmPharmacyDispensing,
  createLocalReorderRequest,
  getMedicineStockSummary,
  isBatchNearExpiry,
  appendDeduplicatedNotification,
  DispenseLineInput,
  resolvePatientPrivacySettings,
  updatePatientPrivacySettingsMap,
  normalizeAccessAuditRecords,
  filterAccessAuditsForPatient,
  synchronizeReconciledPatientSnapshots,
} from '../utils/rules';
import {
  Appointment,
  AppointmentStatus,
  ClinicalEncounter,
  FollowUpReminder,
  DiagnosticLabReport,
  PatientTriageStatus,
  PatientPortalTab,
  DoctorDirectoryItem,
  PatientDocument,
  MessageConversation,
  ConversationStatus,
  MessageSenderRole,
  MessageCategory,
  MessageAttachment,
  PatientMessage,
  PatientNotification,
  PrivacyConsentSettings,
  PatientPrivacySettingsMap,
  AccessAuditRecord,
  PrescriptionStatus,
  PatientMedicationActivity,
  MedicationActivityStatus,
  PharmacyDosageForm,
  PharmacyMedicine,
  PharmacyBatch,
  PharmacyTransaction,
  PharmacyDispensingRecord,
  PharmacyReorderRequest,
  PharmacyReorderStatus,
} from '../types';
import { getSupabaseClient } from '../lib/supabaseClient';
import {
  SupabaseSchemaAuditReport,
  createInitialSchemaAuditReport,
  auditSupabaseSchemaStatus,
  fetchAuthorizedHospitalWorkspace,
  dbRegisterPatient,
  dbReconcileUnidentifiedPatient,
  dbUpdatePatientFields,
  dbUpsertPatientPrivacySettings,
  dbRecordPatientAccessAudit,
  dbUpsertAppointment,
  dbUpdateAppointmentFields,
  dbUpsertClinicalEncounter,
  dbUpsertMedicationActivity,
  dbCompleteFollowUpReminder,
  dbAcknowledgeLabReport,
  dbCreateEmergencyCaseBundle,
  dbUpdateEmergencyCaseFields,
  dbInsertEmergencyTimelineNote,
  dbUpsertMlcCase,
  dbUpsertPoisonCase,
  dbUpsertTransfer,
  dbInsertClinicalDocument,
  dbInsertPatientPortalDocument,
  dbUpsertConversation,
  dbInsertPatientMessage,
  dbMarkConversationMessagesRead,
  dbInsertNotification,
  dbMarkNotificationRead,
  dbMarkAllNotificationsRead,
  dbUpsertPharmacyMedicine,
  dbReceivePharmacyBatchStock,
  dbAdjustPharmacyBatchStock,
  dbDispensePrescription,
  dbUpsertPharmacyReorderRequest,
  dbInsertAuditLog,
} from '../services/supabaseDatabaseService';

export type NavigationTab = 
  | 'overview'
  | 'patients'
  | 'appointments'
  | 'clinical'
  | 'pharmacy'
  | 'records'
  | 'messages'
  | 'emergency'
  | 'transfers'
  | 'documents'
  | 'admin'
  | 'mlc'
  | 'poisoning'
  | 'registration'
  | 'cases'
  | 'dashboard'
  | PatientPortalTab;

interface AppContextType {
  currentUser: StaffUser;
  allStaff: StaffUser[];
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  switchRole: (role: UserRole) => void;
  switchUser: (staffId: string) => void;
  
  // Data
  patients: Patient[];
  cases: EmergencyCase[];
  mlcCases: MedicoLegalCase[];
  poisonCases: PoisoningCase[];
  transfers: PatientTransfer[];
  documents: HospitalDocument[];
  auditLogs: AuditLog[];
  incomingAmbulances: IncomingAmbulance[];

  // General Healthcare: Appointments, Consultations & Labs
  appointments: Appointment[];
  encounters: ClinicalEncounter[];
  followUps: FollowUpReminder[];
  labReports: DiagnosticLabReport[];
  medicationActivities: PatientMedicationActivity[];

  // Patient Actions
  registerPatient: (data: Partial<Patient>) => { patient: Patient; tempId?: string };
  reconcilePatient: (patientId: string, permanentDetails: { name: string; contactNumber: string; address?: string; nationalId?: string; abhaId?: string }) => void;
  updatePatientPhoto: (patientId: string, photoUrl: string) => void;

  // Appointments & Consultations Actions
  bookAppointment: (data: Partial<Appointment>) => Appointment;
  updateAppointmentStatus: (aptId: string, status: AppointmentStatus) => void;
  updateAppointmentTriageStatus: (aptId: string, status: PatientTriageStatus) => void;
  startConsultation: (aptId: string) => void;
  saveClinicalEncounter: (enc: Partial<ClinicalEncounter>) => ClinicalEncounter;
  activateDraftPrescription: (encounterId: string) => ClinicalEncounter | null;
  discontinuePrescription: (encounterId: string, prescriptionItemId?: string, reason?: string) => ClinicalEncounter | null;
  recordPatientMedicationActivity: (input: {
    encounterId: string;
    prescriptionItemId: string;
    medicineName: string;
    status: MedicationActivityStatus;
    note?: string;
  }) => PatientMedicationActivity;
  completeFollowUp: (fuId: string) => void;
  acknowledgeLabReport: (reportId: string) => void;

  // Case Actions
  createEmergencyCase: (caseInput: Partial<EmergencyCase>, patientInput: Partial<Patient>) => EmergencyCase;
  updateCaseStatus: (caseId: string, newStatus: CaseStatus) => void;
  updateCaseVitals: (caseId: string, vitals: CaseVitals) => void;
  addClinicalNote: (caseId: string, noteText: string, category: ClinicalNote['category']) => void;
  
  // MLC Actions
  saveMlcDraft: (mlc: Partial<MedicoLegalCase>) => MedicoLegalCase;
  signAndSealMlc: (mlcId: string) => boolean;
  markPoliceIntimation: (mlcId: string, stationDiaryNo?: string) => void;

  // Poisoning Actions
  savePoisonCase: (poison: Partial<PoisoningCase>) => PoisoningCase;
  administerAntidote: (poisonCaseId: string, antidote: Omit<PoisonAntidoteAdmin, 'id' | 'administeredAt' | 'administeredBy'>) => void;
  updateAtropinization: (poisonCaseId: string, status: PoisoningCase['atropinizationStatus']) => void;

  // Transfer Actions
  initiateTransfer: (transferInput: Partial<PatientTransfer>) => PatientTransfer;
  updateTransferStatus: (transferId: string, status: PatientTransfer['status'], notes?: string) => void;

  // Ambulance Actions
  acknowledgeAmbulance: (ambulanceId: string) => void;
  reserveBayForAmbulance: (ambulanceId: string, bayName: string) => void;

  // Document Actions
  generateDocument: (docType: HospitalDocument['docType'], caseId: string) => HospitalDocument;

  // Modals & Active Selections
  selectedCaseId: string | null;
  setSelectedCaseId: (id: string | null) => void;
  selectedMlcId: string | null;
  setSelectedMlcId: (id: string | null) => void;
  selectedPoisonId: string | null;
  setSelectedPoisonId: (id: string | null) => void;
  selectedTransferId: string | null;
  setSelectedTransferId: (id: string | null) => void;
  selectedDocId: string | null;
  setSelectedDocId: (id: string | null) => void;
  selectedAppointmentId: string | null;
  setSelectedAppointmentId: (id: string | null) => void;
  editingEncounter: ClinicalEncounter | null;
  setEditingEncounter: (enc: ClinicalEncounter | null) => void;
  
  // Dialog Open States
  isNewRegistrationOpen: boolean;
  setIsNewRegistrationOpen: (open: boolean) => void;
  isNewCaseOpen: boolean;
  setIsNewCaseOpen: (open: boolean) => void;
  isNewAppointmentOpen: boolean;
  setIsNewAppointmentOpen: (open: boolean) => void;
  isConsultationModalOpen: boolean;
  setIsConsultationModalOpen: (open: boolean) => void;
  isFirebaseArchitectureOpen: boolean;
  setIsFirebaseArchitectureOpen: (open: boolean) => void;

  // Patient Portal Core State
  portalMode: 'hospital' | 'patient';
  setPortalMode: (mode: 'hospital' | 'patient') => void;
  activePatientId: string;
  setActivePatientId: (id: string) => void;
  activePatient: Patient;

  // Patient Portal Collections & Shared Messaging
  doctorsDirectory: DoctorDirectoryItem[];
  patientDocuments: PatientDocument[];
  conversations: MessageConversation[];
  patientMessages: PatientMessage[];
  patientNotifications: PatientNotification[];
  privacySettings: PrivacyConsentSettings;
  accessAuditLogs: AccessAuditRecord[];
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;

  // Patient Portal & Connected Appointment / Messaging Actions
  requestPatientAppointment: (data: Partial<Appointment>) => Appointment;
  acceptPatientAppointmentRequest: (aptId: string) => { success: boolean; error?: string; appointment?: Appointment };
  declinePatientAppointmentRequest: (aptId: string, declineReason?: string) => { success: boolean; error?: string; appointment?: Appointment };
  proposeDoctorReschedule: (aptId: string, proposedDate: string, proposedTimeSlot: string, reason?: string) => { success: boolean; error?: string; appointment?: Appointment };
  respondToDoctorRescheduleProposal: (aptId: string, decision: 'accept' | 'reject', patientNote?: string) => { success: boolean; error?: string; appointment?: Appointment };
  rescheduleAppointment: (aptId: string, newDate: string, newTimeSlot: string, reason?: string) => void;
  cancelAppointment: (aptId: string, reason: string) => void;
  uploadPatientDocument: (doc: {
    title: string;
    category: PatientDocument['category'];
    source: string;
    fileType: PatientDocument['fileType'];
    fileSize: string;
    summary: string;
    tags: string[];
  }) => PatientDocument;
  startOrSelectConversation: (doctorId: string, relatedAppointmentId?: string) => MessageConversation | null;
  sendPatientMessage: (
    text: string,
    doctorId: string,
    doctorName: string,
    category?: MessageCategory,
    relatedAppointmentId?: string,
    attachment?: MessageAttachment
  ) => PatientMessage | null;
  sendDoctorReply: (
    conversationId: string,
    text: string,
    category?: MessageCategory
  ) => { success: boolean; error?: string; message?: PatientMessage };
  markConversationRead: (conversationId: string, viewerRole: MessageSenderRole) => void;
  updateConversationStatus: (
    conversationId: string,
    status: ConversationStatus
  ) => { success: boolean; error?: string };
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;
  updatePatientProfile: (patientId: string, updates: Partial<Patient>) => void;
  updatePrivacySettings: (updates: Partial<PrivacyConsentSettings>) => void;
  recordEmergencyAccess: (purpose: string) => void;

  // Patient Portal Modals
  isPatientBookingModalOpen: boolean;
  setIsPatientBookingModalOpen: (open: boolean) => void;
  selectedBookingDoctor: DoctorDirectoryItem | null;
  setSelectedBookingDoctor: (doc: DoctorDirectoryItem | null) => void;
  isPatientUploadDocOpen: boolean;
  setIsPatientUploadDocOpen: (open: boolean) => void;
  previewDocument: PatientDocument | null;
  setPreviewDocument: (doc: PatientDocument | null) => void;
  previewLabReport: DiagnosticLabReport | null;
  setPreviewLabReport: (report: DiagnosticLabReport | null) => void;
  previewEncounter: ClinicalEncounter | null;
  setPreviewEncounter: (enc: ClinicalEncounter | null) => void;

  // Hospital Pharmacy State & Actions (Phase 5)
  pharmacyMedicines: PharmacyMedicine[];
  pharmacyBatches: PharmacyBatch[];
  pharmacyTransactions: PharmacyTransaction[];
  pharmacyDispensingRecords: PharmacyDispensingRecord[];
  pharmacyReorderRequests: PharmacyReorderRequest[];
  addPharmacyMedicine: (input: {
    genericName: string;
    brandName?: string;
    strength: string;
    dosageForm: PharmacyDosageForm;
    manufacturer: string;
    category: string;
    storageRequirements?: string;
    unitOfMeasurement?: string;
    minimumStockThreshold: number;
  }) => { success: boolean; error?: string; medicine?: PharmacyMedicine };
  togglePharmacyMedicineStatus: (medicineId: string) => { success: boolean; error?: string };
  updatePharmacyMedicineThreshold: (medicineId: string, threshold: number) => { success: boolean; error?: string };
  receivePharmacyBatchStock: (input: {
    medicineId: string;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    purchaseDate: string;
    supplierReference: string;
    supplierName: string;
    stockLocation: string;
    reason?: string;
  }) => { success: boolean; error?: string; batch?: PharmacyBatch };
  adjustPharmacyBatchStock: (input: {
    batchId: string;
    quantityDelta: number;
    reason: string;
    transactionType?: 'Stock Adjustment' | 'Batch Addition' | 'Expiry Write-Off';
  }) => { success: boolean; error?: string };
  dispensePrescription: (
    encounterId: string,
    lineInputs: DispenseLineInput[],
    notes?: string
  ) => { success: boolean; error?: string; record?: PharmacyDispensingRecord };
  createPharmacyReorderRequest: (input: {
    medicineId: string;
    requestedQuantity: number;
    supplierName: string;
    supplierReference?: string;
    reason?: 'Low Stock' | 'Out of Stock' | 'Near Expiry Replacement';
    notes?: string;
    submitImmediately?: boolean;
  }) => { success: boolean; error?: string; request?: PharmacyReorderRequest };
  updatePharmacyReorderStatus: (
    requestId: string,
    status: PharmacyReorderStatus
  ) => { success: boolean; error?: string };

  // Audit
  logAuditAction: (action: string, targetType: AuditLog['targetType'], targetId: string, details: string) => void;

  // Phase 6C: Live Database Persistence & Schema Audit State
  dbSyncStatus: 'demo_sandbox' | 'loading' | 'synced' | 'syncing' | 'schema_missing' | 'error';
  dbSyncError: string | null;
  lastDbSyncedAt: string | null;
  schemaAuditReport: SupabaseSchemaAuditReport | null;
  isSchemaAuditRunning: boolean;
  runLiveSchemaAudit: () => Promise<SupabaseSchemaAuditReport | null>;
  refreshDatabaseWorkspace: () => Promise<void>;
  clearDbSyncError: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authMode, resolvedIdentity, setIsAuthModalOpen } = useAuth();
  const supabase = getSupabaseClient();
  const [currentUser, setCurrentUser] = useState<StaffUser>(INITIAL_STAFF[0]);
  const [allStaff, setAllStaff] = useState<StaffUser[]>(INITIAL_STAFF);
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');

  // Phase 6C: Database synchronization & live schema audit states
  const [dbSyncStatus, setDbSyncStatus] = useState<
    'demo_sandbox' | 'loading' | 'synced' | 'syncing' | 'schema_missing' | 'error'
  >('demo_sandbox');
  const [dbSyncError, setDbSyncError] = useState<string | null>(null);
  const [lastDbSyncedAt, setLastDbSyncedAt] = useState<string | null>(null);
  const [schemaAuditReport, setSchemaAuditReport] = useState<SupabaseSchemaAuditReport | null>(() =>
    supabase ? createInitialSchemaAuditReport() : null
  );
  const [isSchemaAuditRunning, setIsSchemaAuditRunning] = useState<boolean>(false);

  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('hr_patients');
    if (saved) {
      try {
        const parsed: Patient[] = JSON.parse(saved);
        return parsed.map((p) => {
          const init = INITIAL_PATIENTS.find((ip) => ip.id === p.id);
          return init?.photoUrl && !p.photoUrl ? { ...p, photoUrl: init.photoUrl } : p;
        });
      } catch {
        return INITIAL_PATIENTS;
      }
    }
    return INITIAL_PATIENTS;
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem('hr_appointments');
    if (saved) {
      try {
        const parsed: Appointment[] = JSON.parse(saved);
        if (parsed.some((a) => a.date === today)) {
          const mapped: Appointment[] = parsed.map((a): Appointment => {
            const init = INITIAL_APPOINTMENTS.find((ia) => ia.id === a.id);
            const matchedDoc = INITIAL_DOCTORS_DIRECTORY.find(
              (d) => d.id === (a.doctorId || init?.doctorId) || d.name === a.doctorName
            );
            return {
              ...a,
              doctorId: a.doctorId || init?.doctorId || matchedDoc?.id || 'staff-doc-1',
              doctorName: a.doctorName || init?.doctorName || matchedDoc?.name || 'Dr. Vikram Malhotra',
              department: a.department || init?.department || matchedDoc?.department,
              patientPhotoUrl: a.patientPhotoUrl || init?.patientPhotoUrl,
              doctorPhotoUrl: a.doctorPhotoUrl || init?.doctorPhotoUrl || matchedDoc?.photoUrl,
              triageStatus: a.triageStatus || init?.triageStatus,
              vitalsSnapshot: a.vitalsSnapshot || init?.vitalsSnapshot,
            };
          });
          // Append any missing initial appointments (such as APT-2026-008, APT-2026-009)
          INITIAL_APPOINTMENTS.forEach((ia) => {
            if (!mapped.some((m) => m.id === ia.id)) {
              mapped.push(ia);
            }
          });
          return mapped;
        }
      } catch {
        return INITIAL_APPOINTMENTS;
      }
    }
    return INITIAL_APPOINTMENTS;
  });

  const [encounters, setEncounters] = useState<ClinicalEncounter[]>(() => {
    const saved = localStorage.getItem('hr_encounters');
    if (saved) {
      try {
        const parsed: ClinicalEncounter[] = JSON.parse(saved);
        const mapped: ClinicalEncounter[] = parsed.map((enc): ClinicalEncounter => {
          const init = INITIAL_ENCOUNTERS.find((ie) => ie.id === enc.id);
          const defaultStatus: PrescriptionStatus =
            enc.prescriptionStatus || init?.prescriptionStatus || (enc.status === 'Draft' ? 'Draft' : 'Active');
          return {
            ...enc,
            prescriptionStatus: defaultStatus,
            prescriptions: normalizePrescriptionItems(enc.prescriptions || [], {
              encounterId: enc.id,
              patientId: enc.patientId,
              doctorId: enc.doctorId || init?.doctorId || 'staff-doc-1',
              doctorName: enc.doctorName,
              createdDate: enc.date,
              defaultStatus,
            }),
          };
        });
        INITIAL_ENCOUNTERS.forEach((ie) => {
          if (!mapped.some((m) => m.id === ie.id)) {
            mapped.push(ie);
          }
        });
        return mapped;
      } catch {
        return INITIAL_ENCOUNTERS;
      }
    }
    return INITIAL_ENCOUNTERS;
  });

  const [medicationActivities, setMedicationActivities] = useState<PatientMedicationActivity[]>(() => {
    const saved = localStorage.getItem('hr_medication_activities');
    if (saved) {
      try {
        const parsed: PatientMedicationActivity[] = JSON.parse(saved);
        return parsed.map((act) => ({
          ...act,
          reportedBy: 'patient' as const,
        }));
      } catch {
        return INITIAL_MEDICATION_ACTIVITIES;
      }
    }
    return INITIAL_MEDICATION_ACTIVITIES;
  });

  const [followUps, setFollowUps] = useState<FollowUpReminder[]>(() => {
    const saved = localStorage.getItem('hr_followups');
    return saved ? JSON.parse(saved) : INITIAL_FOLLOWUPS;
  });

  const [labReports, setLabReports] = useState<DiagnosticLabReport[]>(() => {
    const saved = localStorage.getItem('hr_labs');
    if (saved) {
      try {
        const parsed: DiagnosticLabReport[] = JSON.parse(saved);
        return parsed.map((r) => {
          const init = INITIAL_LAB_REPORTS.find((ir) => ir.id === r.id);
          return {
            ...r,
            criticalPanicValue:
              r.criticalPanicValue !== undefined
                ? r.criticalPanicValue
                : init?.criticalPanicValue ||
                  r.status === 'Critical Panic Alert' ||
                  r.parameters?.some((p) => p.flag === 'Critical'),
          };
        });
      } catch {
        return INITIAL_LAB_REPORTS;
      }
    }
    return INITIAL_LAB_REPORTS;
  });

  const [cases, setCases] = useState<EmergencyCase[]>(() => {
    const saved = localStorage.getItem('hr_cases');
    return saved ? JSON.parse(saved) : INITIAL_CASES;
  });

  const [mlcCases, setMlcCases] = useState<MedicoLegalCase[]>(() => {
    const saved = localStorage.getItem('hr_mlcs');
    return saved ? JSON.parse(saved) : INITIAL_MLCS;
  });

  const [poisonCases, setPoisonCases] = useState<PoisoningCase[]>(() => {
    const saved = localStorage.getItem('hr_poisons');
    return saved ? JSON.parse(saved) : INITIAL_POISON_CASES;
  });

  const [transfers, setTransfers] = useState<PatientTransfer[]>(() => {
    const saved = localStorage.getItem('hr_transfers');
    return saved ? JSON.parse(saved) : INITIAL_TRANSFERS;
  });

  const [documents, setDocuments] = useState<HospitalDocument[]>(() => {
    const saved = localStorage.getItem('hr_docs');
    return saved ? JSON.parse(saved) : INITIAL_DOCUMENTS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('hr_audits');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [incomingAmbulances, setIncomingAmbulances] = useState<IncomingAmbulance[]>(INITIAL_INCOMING_AMBULANCES);

  // Modals & Selected states
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedMlcId, setSelectedMlcId] = useState<string | null>(null);
  const [selectedPoisonId, setSelectedPoisonId] = useState<string | null>(null);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [editingEncounter, setEditingEncounter] = useState<ClinicalEncounter | null>(null);

  const [isNewRegistrationOpen, setIsNewRegistrationOpen] = useState(false);
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isFirebaseArchitectureOpen, setIsFirebaseArchitectureOpen] = useState(false);

  // Patient Portal Core State
  const [portalMode, setPortalModeState] = useState<'hospital' | 'patient'>(() => {
    const saved = localStorage.getItem('hr_portal_mode');
    return (saved === 'patient' || saved === 'hospital') ? saved : 'hospital';
  });
  const [activePatientId, setActivePatientId] = useState<string>('pat-known-01');

  const [doctorsDirectory] = useState<DoctorDirectoryItem[]>(INITIAL_DOCTORS_DIRECTORY);

  const [patientDocuments, setPatientDocuments] = useState<PatientDocument[]>(() => {
    const saved = localStorage.getItem('hr_patient_docs');
    return saved ? JSON.parse(saved) : INITIAL_PATIENT_DOCUMENTS;
  });

  const [conversations, setConversations] = useState<MessageConversation[]>(() => {
    const saved = localStorage.getItem('hr_conversations');
    if (saved) {
      try {
        const parsed: MessageConversation[] = JSON.parse(saved);
        const mapped = parsed.map((c) => {
          const init = INITIAL_CONVERSATIONS.find((ic) => ic.id === c.id);
          return {
            ...init,
            ...c,
            status: c.status || 'Active',
          };
        });
        INITIAL_CONVERSATIONS.forEach((ic) => {
          if (!mapped.some((m) => m.id === ic.id)) {
            mapped.push(ic);
          }
        });
        return mapped;
      } catch {
        return INITIAL_CONVERSATIONS;
      }
    }
    return INITIAL_CONVERSATIONS;
  });

  const [patientMessages, setPatientMessages] = useState<PatientMessage[]>(() => {
    const saved = localStorage.getItem('hr_patient_messages');
    if (saved) {
      try {
        const parsed: PatientMessage[] = JSON.parse(saved);
        const mapped: PatientMessage[] = parsed.map((m) => {
          const init = INITIAL_PATIENT_MESSAGES.find((im) => im.id === m.id);
          const resolvedRole: MessageSenderRole =
            m.senderRole || (m.sender === 'doctor' ? 'Doctor' : 'Patient');
          const resolvedSenderId =
            m.senderId || (resolvedRole === 'Doctor' ? m.doctorId : m.patientId);
          return {
            ...init,
            ...m,
            conversationId: m.conversationId || init?.conversationId || buildConversationId(m.patientId, m.doctorId),
            senderId: resolvedSenderId,
            senderRole: resolvedRole,
            sender: resolvedRole === 'Doctor' ? 'doctor' : 'patient',
          };
        });
        INITIAL_PATIENT_MESSAGES.forEach((im) => {
          if (!mapped.some((m) => m.id === im.id)) {
            mapped.push(im);
          }
        });
        return mapped;
      } catch {
        return INITIAL_PATIENT_MESSAGES;
      }
    }
    return INITIAL_PATIENT_MESSAGES;
  });

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const [patientNotifications, setPatientNotifications] = useState<PatientNotification[]>(() => {
    const saved = localStorage.getItem('hr_patient_notifs');
    return saved ? JSON.parse(saved) : INITIAL_PATIENT_NOTIFICATIONS;
  });

  const [legacyPrivacySettings] = useState<PrivacyConsentSettings>(() => {
    const saved = localStorage.getItem('hr_privacy_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_PRIVACY_SETTINGS;
      }
    }
    return INITIAL_PRIVACY_SETTINGS;
  });

  const [privacySettingsByPatient, setPrivacySettingsByPatient] = useState<PatientPrivacySettingsMap>(() => {
    const savedMap = localStorage.getItem('hr_privacy_settings_by_patient');
    if (savedMap) {
      try {
        return {
          ...INITIAL_PRIVACY_SETTINGS_BY_PATIENT,
          ...JSON.parse(savedMap),
        };
      } catch {
        // fallback below
      }
    }
    const savedLegacy = localStorage.getItem('hr_privacy_settings');
    if (savedLegacy) {
      try {
        const parsedLegacy = JSON.parse(savedLegacy);
        return {
          ...INITIAL_PRIVACY_SETTINGS_BY_PATIENT,
          'pat-known-01': {
            ...INITIAL_PRIVACY_SETTINGS_BY_PATIENT['pat-known-01'],
            ...parsedLegacy,
            patientId: 'pat-known-01',
          },
        };
      } catch {
        // ignore
      }
    }
    return INITIAL_PRIVACY_SETTINGS_BY_PATIENT;
  });

  const [allAccessAuditLogs, setAllAccessAuditLogs] = useState<AccessAuditRecord[]>(() => {
    const saved = localStorage.getItem('hr_access_audits');
    if (saved) {
      try {
        return normalizeAccessAuditRecords(JSON.parse(saved));
      } catch {
        return INITIAL_ACCESS_AUDIT_LOGS;
      }
    }
    return INITIAL_ACCESS_AUDIT_LOGS;
  });

  // Phase 5: Hospital Pharmacy Persistent Collections
  const [pharmacyMedicines, setPharmacyMedicines] = useState<PharmacyMedicine[]>(() => {
    const saved = localStorage.getItem('hr_pharmacy_medicines');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_PHARMACY_MEDICINES;
      }
    }
    return INITIAL_PHARMACY_MEDICINES;
  });

  const [pharmacyBatches, setPharmacyBatches] = useState<PharmacyBatch[]>(() => {
    const saved = localStorage.getItem('hr_pharmacy_batches');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_PHARMACY_BATCHES;
      }
    }
    return INITIAL_PHARMACY_BATCHES;
  });

  const [pharmacyTransactions, setPharmacyTransactions] = useState<PharmacyTransaction[]>(() => {
    const saved = localStorage.getItem('hr_pharmacy_transactions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_PHARMACY_TRANSACTIONS;
      }
    }
    return INITIAL_PHARMACY_TRANSACTIONS;
  });

  const [pharmacyDispensingRecords, setPharmacyDispensingRecords] = useState<PharmacyDispensingRecord[]>(() => {
    const saved = localStorage.getItem('hr_pharmacy_dispensing');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_PHARMACY_DISPENSING_RECORDS;
      }
    }
    return INITIAL_PHARMACY_DISPENSING_RECORDS;
  });

  const [pharmacyReorderRequests, setPharmacyReorderRequests] = useState<PharmacyReorderRequest[]>(() => {
    const saved = localStorage.getItem('hr_pharmacy_reorders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_PHARMACY_REORDER_REQUESTS;
      }
    }
    return INITIAL_PHARMACY_REORDER_REQUESTS;
  });

  // Patient Modals
  const [isPatientBookingModalOpen, setIsPatientBookingModalOpen] = useState(false);
  const [selectedBookingDoctor, setSelectedBookingDoctor] = useState<DoctorDirectoryItem | null>(null);
  const [isPatientUploadDocOpen, setIsPatientUploadDocOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<PatientDocument | null>(null);
  const [previewLabReport, setPreviewLabReport] = useState<DiagnosticLabReport | null>(null);
  const [previewEncounter, setPreviewEncounter] = useState<ClinicalEncounter | null>(null);

  const activePatient = patients.find((p) => p.id === activePatientId) || patients[0];

  const privacySettings = resolvePatientPrivacySettings(
    privacySettingsByPatient,
    legacyPrivacySettings,
    activePatientId,
    activePatient?.nextOfKin ? `${activePatient.nextOfKin.name} (${activePatient.nextOfKin.relation})` : undefined
  );

  const accessAuditLogs = filterAccessAuditsForPatient(allAccessAuditLogs, activePatientId);

  const setPortalMode = (mode: 'hospital' | 'patient') => {
    setPortalModeState(mode);
    try {
      localStorage.setItem('hr_portal_mode', mode);
    } catch {
      // ignore
    }
    if (mode === 'patient') {
      if (activeTab === 'overview' || !activeTab.startsWith('patient-')) {
        setActiveTab('patient-home');
      }
    } else {
      if (activeTab.startsWith('patient-')) {
        setActiveTab('overview');
      }
    }
  };

  // Save to local storage ONLY in isolated Demo Simulation Mode (never overwrite or bypass server authorization when authenticated)
  useEffect(() => {
    if (authMode !== 'demo_simulation') return;
    try {
      localStorage.setItem('hr_patients', JSON.stringify(patients));
      localStorage.setItem('hr_appointments', JSON.stringify(appointments));
      localStorage.setItem('hr_encounters', JSON.stringify(encounters));
      localStorage.setItem('hr_followups', JSON.stringify(followUps));
      localStorage.setItem('hr_labs', JSON.stringify(labReports));
      localStorage.setItem('hr_cases', JSON.stringify(cases));
      localStorage.setItem('hr_mlcs', JSON.stringify(mlcCases));
      localStorage.setItem('hr_poisons', JSON.stringify(poisonCases));
      localStorage.setItem('hr_transfers', JSON.stringify(transfers));
      localStorage.setItem('hr_docs', JSON.stringify(documents));
      localStorage.setItem('hr_audits', JSON.stringify(auditLogs));
      localStorage.setItem('hr_patient_docs', JSON.stringify(patientDocuments));
      localStorage.setItem('hr_conversations', JSON.stringify(conversations));
      localStorage.setItem('hr_patient_messages', JSON.stringify(patientMessages));
      localStorage.setItem('hr_patient_notifs', JSON.stringify(patientNotifications));
      localStorage.setItem('hr_privacy_settings_by_patient', JSON.stringify(privacySettingsByPatient));
      localStorage.setItem('hr_access_audits', JSON.stringify(allAccessAuditLogs));
      localStorage.setItem('hr_medication_activities', JSON.stringify(medicationActivities));
      localStorage.setItem('hr_pharmacy_medicines', JSON.stringify(pharmacyMedicines));
      localStorage.setItem('hr_pharmacy_batches', JSON.stringify(pharmacyBatches));
      localStorage.setItem('hr_pharmacy_transactions', JSON.stringify(pharmacyTransactions));
      localStorage.setItem('hr_pharmacy_dispensing', JSON.stringify(pharmacyDispensingRecords));
      localStorage.setItem('hr_pharmacy_reorders', JSON.stringify(pharmacyReorderRequests));
    } catch {
      // ignore
    }
  }, [
    authMode,
    patients,
    appointments,
    encounters,
    followUps,
    labReports,
    cases,
    mlcCases,
    poisonCases,
    transfers,
    documents,
    auditLogs,
    patientDocuments,
    conversations,
    patientMessages,
    patientNotifications,
    privacySettingsByPatient,
    allAccessAuditLogs,
    medicationActivities,
    pharmacyMedicines,
    pharmacyBatches,
    pharmacyTransactions,
    pharmacyDispensingRecords,
    pharmacyReorderRequests,
  ]);

  const persistDemoLocal = (key: string, value: unknown) => {
    if (authMode !== 'demo_simulation') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  };

  const persistToSupabase = (
    operationLabel: string,
    operation: (
      client: NonNullable<typeof supabase>
    ) => Promise<{ success: boolean; error?: string | { userFacingMessage?: string; message?: string } }>
  ) => {
    if (authMode !== 'authenticated_supabase' || !supabase) return;
    setDbSyncStatus('syncing');
    setDbSyncError(null);
    void operation(supabase)
      .then((res) => {
        if (!res.success) {
          const errText =
            typeof res.error === 'string'
              ? res.error
              : res.error?.userFacingMessage ||
                res.error?.message ||
                'Database persistence rejected by server/RLS.';
          setDbSyncStatus('error');
          setDbSyncError(`[${operationLabel}] ${errText}`);
        } else {
          setDbSyncStatus('synced');
          setLastDbSyncedAt(new Date().toISOString());
        }
      })
      .catch((err) => {
        setDbSyncStatus('error');
        setDbSyncError(
          `[${operationLabel}] ${err instanceof Error ? err.message : 'Unexpected database write error.'}`
        );
      });
  };

  const runLiveSchemaAudit = async (): Promise<SupabaseSchemaAuditReport | null> => {
    if (!supabase) return null;
    setIsSchemaAuditRunning(true);
    try {
      const report = await auditSupabaseSchemaStatus(supabase);
      setSchemaAuditReport(report);
      if (!report.allMigrationsApplied && authMode !== 'authenticated_supabase') {
        // Keep demo_sandbox when in demo mode, but record audit findings
      } else if (!report.allMigrationsApplied && authMode === 'authenticated_supabase') {
        setDbSyncStatus('schema_missing');
      }
      return report;
    } finally {
      setIsSchemaAuditRunning(false);
    }
  };

  const refreshDatabaseWorkspace = async (): Promise<void> => {
    if (!supabase || authMode !== 'authenticated_supabase' || !resolvedIdentity) {
      setDbSyncStatus('demo_sandbox');
      return;
    }
    setDbSyncStatus('loading');
    setDbSyncError(null);
    const { data, error } = await fetchAuthorizedHospitalWorkspace(supabase, resolvedIdentity);
    if (error || !data) {
      setDbSyncStatus(error?.isMissingSchema ? 'schema_missing' : 'error');
      setDbSyncError(
        error?.userFacingMessage || error?.message || 'Failed to load workspace from Supabase PostgreSQL.'
      );
      return;
    }
    if (data.allStaff.length > 0) setAllStaff(data.allStaff);
    setPatients(data.patients);
    setPrivacySettingsByPatient(data.privacySettingsByPatient);
    setAllAccessAuditLogs(data.accessAuditLogs);
    setAppointments(data.appointments);
    setEncounters(data.encounters);
    setMedicationActivities(data.medicationActivities);
    setFollowUps(data.followUps);
    setLabReports(data.labReports);
    setCases(data.cases);
    setMlcCases(data.mlcCases);
    setPoisonCases(data.poisonCases);
    setTransfers(data.transfers);
    setDocuments(data.documents);
    setPatientDocuments(data.patientDocuments);
    setConversations(data.conversations);
    setPatientMessages(data.patientMessages);
    setPatientNotifications(data.patientNotifications);
    setPharmacyMedicines(data.pharmacyMedicines);
    setPharmacyBatches(data.pharmacyBatches);
    setPharmacyTransactions(data.pharmacyTransactions);
    setPharmacyDispensingRecords(data.pharmacyDispensingRecords);
    setPharmacyReorderRequests(data.pharmacyReorderRequests);
    setAuditLogs(data.auditLogs);
    setDbSyncStatus('synced');
    setLastDbSyncedAt(new Date().toISOString());
  };

  const clearDbSyncError = () => setDbSyncError(null);

  // Run live schema audit automatically when an authenticated Supabase session is active
  useEffect(() => {
    if (!supabase || authMode !== 'authenticated_supabase') return;
    void runLiveSchemaAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(supabase), authMode]);

  const logAuditAction = (
    action: string,
    targetType: AuditLog['targetType'],
    targetId: string,
    details: string
  ) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      targetType,
      targetId,
      details,
      ipStation: `Terminal ${currentUser.station}`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    persistToSupabase('Audit Log Write', (client) => dbInsertAuditLog(client, newLog));
  };

  // Synchronize active identity and hydrate workspace when authenticated via Supabase PostgreSQL (Phase 6B & 6C)
  useEffect(() => {
    if (authMode !== 'authenticated_supabase' || !resolvedIdentity) {
      setDbSyncStatus('demo_sandbox');
      return;
    }

    if (resolvedIdentity.accountType === 'staff') {
      const matchedStaff = allStaff.find((s) => s.id === resolvedIdentity.id);
      if (matchedStaff) {
        setCurrentUser(matchedStaff);
      } else {
        setCurrentUser({
          id: resolvedIdentity.id,
          name: resolvedIdentity.name,
          role: resolvedIdentity.role,
          designation: resolvedIdentity.designation || 'Verified Hospital Clinician',
          department: resolvedIdentity.department || 'Clinical Services',
          employeeCode: resolvedIdentity.employeeCode || 'SUPA-VERIFIED',
          email: resolvedIdentity.email || '',
          phone: '',
          activeShift: 'Day (08:00 - 16:00)',
          onDuty: true,
          station: 'Verified Supabase Session',
        });
      }
      setPortalModeState('hospital');
    } else if (resolvedIdentity.accountType === 'patient') {
      setActivePatientId(resolvedIdentity.id);
      setPortalModeState('patient');
      setActiveTab((prev) => (prev.startsWith('patient-') ? prev : 'patient-home'));
    }

    void refreshDatabaseWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authMode, resolvedIdentity]);

  const switchRole = (role: UserRole) => {
    if (authMode === 'authenticated_supabase') {
      setIsAuthModalOpen(true);
      return;
    }
    if (role === 'patient') {
      setPortalMode('patient');
      setActiveTab('patient-home');
      logAuditAction('Session Role Switch', 'STAFF', activePatientId, 'Switched interface view to PATIENT PORTAL');
      return;
    }
    setPortalMode('hospital');
    const match = allStaff.find((s) => s.role === role);
    if (match) {
      setCurrentUser(match);
      logAuditAction('Session Role Switch', 'STAFF', match.id, `Switched interface view to role: ${role.toUpperCase()}`);
    }
  };

  const switchUser = (staffId: string) => {
    if (authMode === 'authenticated_supabase') {
      setIsAuthModalOpen(true);
      return;
    }
    const match = allStaff.find((s) => s.id === staffId);
    if (match) {
      setCurrentUser(match);
      logAuditAction('User Switch', 'STAFF', match.id, `Active session user changed to ${match.name} (${match.role})`);
    }
  };

  const requestPatientAppointment = (data: Partial<Appointment>): Appointment => {
    const nextSeq = appointments.length + 1;
    const aptDate = data.date || new Date().toISOString().split('T')[0];
    const aptSlot = data.timeSlot || '10:00 AM';
    const targetPat = activePatient;
    const targetDoc =
      doctorsDirectory.find((d) => d.id === data.doctorId || d.name === data.doctorName) || doctorsDirectory[0];
    const targetStaff = allStaff.find((s) => s.id === targetDoc.id);
    const resolvedRoom = targetStaff?.station?.split('&')[0]?.trim() || 'OPD Room 204';
    const resolvedComplaint = data.chiefComplaint?.trim() || 'General outpatient consultation';

    const newApt: Appointment = {
      id: `APT-2026-${String(nextSeq).padStart(3, '0')}`,
      patientId: targetPat.id,
      patientName: targetPat.name,
      patientAge: targetPat.age || 48,
      patientGender: targetPat.gender,
      patientPhone: targetPat.contactNumber || '+91 98860 00000',
      patientPhotoUrl: targetPat.photoUrl,
      doctorId: targetDoc.id,
      doctorName: targetDoc.name,
      doctorPhotoUrl: targetDoc.photoUrl || targetStaff?.photoUrl,
      department: targetDoc.department,
      date: aptDate,
      timeSlot: aptSlot,
      originalDate: aptDate,
      originalTimeSlot: aptSlot,
      tokenNumber: appointments.filter((a) => a.date === aptDate).length + 1,
      type: data.type || 'New Consultation',
      status: 'Requested',
      chiefComplaint: resolvedComplaint,
      consultationMode: data.consultationMode || 'In-Person OPD',
      hospitalName: targetDoc.hospitalAffiliation,
      roomNo: resolvedRoom,
      roomNumber: resolvedRoom,
      requestedByPatient: true,
      createdAt: new Date().toISOString(),
    };

    setAppointments((prev) => {
      const updated = [newApt, ...prev];
      persistDemoLocal('hr_appointments', updated);
      return updated;
    });

    const notif: PatientNotification = {
      id: `notif-${Date.now()}`,
      patientId: targetPat.id,
      doctorId: targetDoc.id,
      appointmentId: newApt.id,
      targetAudience: 'both',
      category: 'appointment',
      title: 'New Appointment Request Submitted',
      message: `Appointment request ${newApt.id} (${newApt.type}) for ${newApt.date} at ${newApt.timeSlot} with ${newApt.doctorName} is awaiting doctor review.`,
      timestamp: new Date().toISOString(),
      isRead: false,
      actionTab: 'patient-appointments',
      priority: 'high',
    };
    setPatientNotifications((prev) => {
      const updatedNotifs = [notif, ...prev];
      persistDemoLocal('hr_patient_notifs', updatedNotifs);
      return updatedNotifs;
    });

    persistToSupabase('Patient Appointment Request', async (client) => {
      const aptRes = await dbUpsertAppointment(client, newApt);
      if (!aptRes.success) return aptRes;
      return dbInsertNotification(client, notif);
    });

    logAuditAction(
      'Patient Appointment Requested',
      'PATIENT',
      targetPat.id,
      `Patient ${targetPat.name} requested appointment ${newApt.id} with ${newApt.doctorName} for ${newApt.date} (${newApt.timeSlot})`
    );

    return newApt;
  };

  const acceptPatientAppointmentRequest = (
    aptId: string
  ): { success: boolean; error?: string; appointment?: Appointment } => {
    const targetApt = appointments.find((a) => a.id === aptId);
    if (!targetApt) {
      return { success: false, error: 'Appointment request not found.' };
    }

    const result = acceptAppointmentRequest(targetApt, currentUser);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const updatedApt = result.appointment;
    setAppointments((prev) => {
      const updatedList = prev.map((a) => (a.id === aptId ? updatedApt : a));
      persistDemoLocal('hr_appointments', updatedList);
      return updatedList;
    });

    const notif: PatientNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId: updatedApt.patientId,
      doctorId: updatedApt.doctorId,
      appointmentId: updatedApt.id,
      targetAudience: 'both',
      category: 'appointment',
      title: 'Appointment Request Accepted',
      message: `${currentUser.name} accepted your ${updatedApt.type} request (${updatedApt.id}) for ${updatedApt.date} at ${updatedApt.timeSlot} (Token #${updatedApt.tokenNumber}).`,
      timestamp: new Date().toISOString(),
      isRead: false,
      actionTab: 'patient-appointments',
      priority: 'high',
    };

    setPatientNotifications((prev) => {
      const updatedNotifs = [notif, ...prev];
      persistDemoLocal('hr_patient_notifs', updatedNotifs);
      return updatedNotifs;
    });

    persistToSupabase('Accept Appointment Request', async (client) => {
      const aptRes = await dbUpsertAppointment(client, updatedApt);
      if (!aptRes.success) return aptRes;
      return dbInsertNotification(client, notif);
    });

    logAuditAction(
      'Appointment Request Accepted',
      'PATIENT',
      updatedApt.id,
      `${currentUser.name} accepted appointment request ${updatedApt.id} for ${updatedApt.patientName} on ${updatedApt.date} at ${updatedApt.timeSlot}`
    );

    return { success: true, appointment: updatedApt };
  };

  const declinePatientAppointmentRequest = (
    aptId: string,
    declineReason?: string
  ): { success: boolean; error?: string; appointment?: Appointment } => {
    const targetApt = appointments.find((a) => a.id === aptId);
    if (!targetApt) {
      return { success: false, error: 'Appointment request not found.' };
    }

    const result = declineAppointmentRequest(targetApt, currentUser, declineReason);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const updatedApt = result.appointment;
    setAppointments((prev) => {
      const updatedList = prev.map((a) => (a.id === aptId ? updatedApt : a));
      persistDemoLocal('hr_appointments', updatedList);
      return updatedList;
    });

    const notif: PatientNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId: updatedApt.patientId,
      doctorId: updatedApt.doctorId,
      appointmentId: updatedApt.id,
      targetAudience: 'both',
      category: 'appointment',
      title: 'Appointment Request Declined',
      message: `Your appointment request ${updatedApt.id} with ${updatedApt.doctorName} (${updatedApt.date} at ${updatedApt.timeSlot}) was declined. Reason: ${updatedApt.declineReason}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      actionTab: 'patient-appointments',
      priority: 'high',
    };

    setPatientNotifications((prev) => {
      const updatedNotifs = [notif, ...prev];
      persistDemoLocal('hr_patient_notifs', updatedNotifs);
      return updatedNotifs;
    });

    persistToSupabase('Decline Appointment Request', async (client) => {
      const aptRes = await dbUpsertAppointment(client, updatedApt);
      if (!aptRes.success) return aptRes;
      return dbInsertNotification(client, notif);
    });

    logAuditAction(
      'Appointment Request Declined',
      'PATIENT',
      updatedApt.id,
      `${currentUser.name} declined appointment request ${updatedApt.id}. Reason: ${updatedApt.declineReason}`
    );

    return { success: true, appointment: updatedApt };
  };

  const proposeDoctorReschedule = (
    aptId: string,
    proposedDate: string,
    proposedTimeSlot: string,
    reason?: string
  ): { success: boolean; error?: string; appointment?: Appointment } => {
    const targetApt = appointments.find((a) => a.id === aptId);
    if (!targetApt) {
      return { success: false, error: 'Appointment not found.' };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const result = proposeAppointmentReschedule(
      targetApt,
      currentUser,
      proposedDate,
      proposedTimeSlot,
      reason,
      todayStr
    );
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const updatedApt = result.appointment;
    setAppointments((prev) => {
      const updatedList = prev.map((a) => (a.id === aptId ? updatedApt : a));
      persistDemoLocal('hr_appointments', updatedList);
      return updatedList;
    });

    const notif: PatientNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId: updatedApt.patientId,
      doctorId: updatedApt.doctorId,
      appointmentId: updatedApt.id,
      targetAudience: 'both',
      category: 'appointment',
      title: 'Reschedule Proposed by Doctor — Action Required',
      message: `${currentUser.name} proposed a new schedule for ${updatedApt.id}: ${updatedApt.proposedDate} at ${updatedApt.proposedTimeSlot} (Originally requested: ${updatedApt.originalDate} at ${updatedApt.originalTimeSlot}). Reason: ${updatedApt.rescheduleReason}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      actionTab: 'patient-appointments',
      priority: 'high',
    };

    setPatientNotifications((prev) => {
      const updatedNotifs = [notif, ...prev];
      persistDemoLocal('hr_patient_notifs', updatedNotifs);
      return updatedNotifs;
    });

    persistToSupabase('Propose Doctor Reschedule', async (client) => {
      const aptRes = await dbUpsertAppointment(client, updatedApt);
      if (!aptRes.success) return aptRes;
      return dbInsertNotification(client, notif);
    });

    logAuditAction(
      'Doctor Proposed Reschedule',
      'PATIENT',
      updatedApt.id,
      `${currentUser.name} proposed rescheduling ${updatedApt.id} from ${updatedApt.originalDate} ${updatedApt.originalTimeSlot} to ${updatedApt.proposedDate} ${updatedApt.proposedTimeSlot}`
    );

    return { success: true, appointment: updatedApt };
  };

  const respondToDoctorRescheduleProposal = (
    aptId: string,
    decision: 'accept' | 'reject',
    patientNote?: string
  ): { success: boolean; error?: string; appointment?: Appointment } => {
    const targetApt = appointments.find((a) => a.id === aptId);
    if (!targetApt) {
      return { success: false, error: 'Appointment not found.' };
    }

    const result = respondToRescheduleProposal(targetApt, decision, patientNote);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const updatedApt = result.appointment;
    setAppointments((prev) => {
      const updatedList = prev.map((a) => (a.id === aptId ? updatedApt : a));
      persistDemoLocal('hr_appointments', updatedList);
      return updatedList;
    });

    const notif: PatientNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId: updatedApt.patientId,
      doctorId: updatedApt.doctorId,
      appointmentId: updatedApt.id,
      targetAudience: 'both',
      category: 'appointment',
      title:
        decision === 'accept'
          ? 'Rescheduled Appointment Confirmed'
          : 'Proposed Reschedule Declined by Patient',
      message:
        decision === 'accept'
          ? `${updatedApt.patientName} accepted the proposed schedule for ${updatedApt.id} with ${updatedApt.doctorName} on ${updatedApt.date} at ${updatedApt.timeSlot}.`
          : `${updatedApt.patientName} rejected the proposed schedule (${updatedApt.proposedDate} at ${updatedApt.proposedTimeSlot}) for ${updatedApt.id} with ${updatedApt.doctorName}. Original slot (${updatedApt.originalDate} at ${updatedApt.originalTimeSlot}) retained.`,
      timestamp: new Date().toISOString(),
      isRead: false,
      actionTab: 'patient-appointments',
      priority: 'high',
    };

    setPatientNotifications((prev) => {
      const updatedNotifs = [notif, ...prev];
      persistDemoLocal('hr_patient_notifs', updatedNotifs);
      return updatedNotifs;
    });

    persistToSupabase('Respond to Reschedule Proposal', async (client) => {
      const aptRes = await dbUpsertAppointment(client, updatedApt);
      if (!aptRes.success) return aptRes;
      return dbInsertNotification(client, notif);
    });

    logAuditAction(
      decision === 'accept' ? 'Patient Accepted Reschedule Proposal' : 'Patient Rejected Reschedule Proposal',
      'PATIENT',
      updatedApt.id,
      `Patient ${updatedApt.patientName} ${decision}ed proposed slot (${updatedApt.proposedDate} ${updatedApt.proposedTimeSlot}) for ${updatedApt.id}`
    );

    return { success: true, appointment: updatedApt };
  };

  const rescheduleAppointment = (aptId: string, newDate: string, newTimeSlot: string, reason?: string) => {
    let updatedTarget: Appointment | null = null;
    setAppointments((prev) => {
      const updatedList = prev.map((a) => {
        if (a.id === aptId) {
          updatedTarget = {
            ...a,
            originalDate: a.originalDate || a.date,
            originalTimeSlot: a.originalTimeSlot || a.timeSlot,
            date: newDate,
            timeSlot: newTimeSlot,
            proposedDate: undefined,
            proposedTimeSlot: undefined,
            rescheduleResponseStatus: undefined,
            status: 'Requested' as const,
            notes: reason ? `${a.notes ? a.notes + ' | ' : ''}Patient Requested New Slot: ${reason}` : a.notes,
          };
          return updatedTarget;
        }
        return a;
      });
      persistDemoLocal('hr_appointments', updatedList);
      return updatedList;
    });

    const targetApt = appointments.find((a) => a.id === aptId);
    const notif: PatientNotification = {
      id: `notif-${Date.now()}`,
      patientId: activePatientId,
      doctorId: targetApt?.doctorId,
      appointmentId: aptId,
      targetAudience: 'both',
      category: 'appointment',
      title: 'New Appointment Slot Requested by Patient',
      message: `Appointment ${aptId} with ${targetApt?.doctorName || 'specialist'} was updated to ${newDate} at ${newTimeSlot} and sent for confirmation.`,
      timestamp: new Date().toISOString(),
      isRead: false,
      actionTab: 'patient-appointments',
      priority: 'normal',
    };
    setPatientNotifications((prev) => {
      const updatedNotifs = [notif, ...prev];
      persistDemoLocal('hr_patient_notifs', updatedNotifs);
      return updatedNotifs;
    });

    if (updatedTarget) {
      const snap = updatedTarget;
      persistToSupabase('Reschedule Appointment', async (client) => {
        const aptRes = await dbUpsertAppointment(client, snap);
        if (!aptRes.success) return aptRes;
        return dbInsertNotification(client, notif);
      });
    }

    logAuditAction('Appointment Rescheduled by Patient', 'PATIENT', aptId, `Patient requested new slot ${newDate} at ${newTimeSlot}. Reason: ${reason || 'Patient request'}`);
  };

  const cancelAppointment = (aptId: string, reason: string) => {
    const targetApt = appointments.find((a) => a.id === aptId);
    setAppointments((prev) => {
      const updatedList = prev.map((a) =>
        a.id === aptId ? { ...a, status: 'Cancelled' as const, cancellationReason: reason } : a
      );
      persistDemoLocal('hr_appointments', updatedList);
      return updatedList;
    });

    const notif: PatientNotification = {
      id: `notif-${Date.now()}`,
      patientId: activePatientId,
      doctorId: targetApt?.doctorId,
      appointmentId: aptId,
      targetAudience: 'both',
      category: 'appointment',
      title: 'Appointment Cancelled',
      message: `Appointment ${aptId} with ${targetApt?.doctorName || 'specialist'} was cancelled. Reason: ${reason}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      actionTab: 'patient-appointments',
      priority: 'normal',
    };
    setPatientNotifications((prev) => {
      const updatedNotifs = [notif, ...prev];
      persistDemoLocal('hr_patient_notifs', updatedNotifs);
      return updatedNotifs;
    });

    persistToSupabase('Cancel Appointment', async (client) => {
      const aptRes = await dbUpdateAppointmentFields(client, aptId, {
        status: 'Cancelled',
        cancellationReason: reason,
      });
      if (!aptRes.success) return aptRes;
      return dbInsertNotification(client, notif);
    });

    logAuditAction('Appointment Cancelled', 'PATIENT', aptId, `Cancelled by patient. Reason: ${reason}`);
  };

  const uploadPatientDocument = (doc: {
    title: string;
    category: PatientDocument['category'];
    source: string;
    fileType: PatientDocument['fileType'];
    fileSize: string;
    summary: string;
    tags: string[];
  }): PatientDocument => {
    const newDoc: PatientDocument = {
      id: `pdoc-${Date.now()}`,
      patientId: activePatientId,
      title: doc.title,
      category: doc.category,
      source: doc.source || 'Self-Uploaded by Patient',
      date: new Date().toISOString().split('T')[0],
      isVerified: false,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      summary: doc.summary,
      tags: doc.tags,
    };

    setPatientDocuments((prev) => [newDoc, ...prev]);

    const notif: PatientNotification = {
      id: `notif-${Date.now()}`,
      patientId: activePatientId,
      category: 'report',
      title: 'Medical Document Uploaded',
      message: `"${newDoc.title}" successfully added to your health records file. Available for clinician review.`,
      timestamp: new Date().toISOString(),
      isRead: false,
      actionTab: 'patient-reports',
      priority: 'normal',
    };
    setPatientNotifications((prev) => [notif, ...prev]);

    persistToSupabase('Upload Patient Document', async (client) => {
      const docRes = await dbInsertPatientPortalDocument(client, newDoc);
      if (!docRes.success) return docRes;
      return dbInsertNotification(client, notif);
    });

    logAuditAction('Patient Document Uploaded', 'PATIENT', newDoc.id, `Uploaded: ${newDoc.title} (${newDoc.category})`);
    return newDoc;
  };

  const startOrSelectConversation = (
    doctorId: string,
    relatedAppointmentId?: string
  ): MessageConversation | null => {
    const docItem =
      doctorsDirectory.find((d) => d.id === doctorId) ||
      allStaff.find((s) => s.id === doctorId);
    if (!docItem || !activePatient) return null;

    const convId = buildConversationId(activePatient.id, docItem.id);
    const existing = conversations.find((c) => c.id === convId);
    const nowIso = new Date().toISOString();

    if (existing) {
      const updatedExisting: MessageConversation = {
        ...existing,
        relatedAppointmentId: relatedAppointmentId || existing.relatedAppointmentId,
        status: 'Active',
      };
      const nextConvs = conversations.map((c) => (c.id === convId ? updatedExisting : c));
      setConversations(nextConvs);
      persistDemoLocal('hr_conversations', nextConvs);
      persistToSupabase('Update Conversation', (client) => dbUpsertConversation(client, updatedExisting));
      setSelectedConversationId(convId);
      return updatedExisting;
    }

    const newConv: MessageConversation = {
      id: convId,
      patientId: activePatient.id,
      patientName: activePatient.name,
      patientPhotoUrl: activePatient.photoUrl,
      doctorId: docItem.id,
      doctorName: formatDoctorDisplayName(docItem.name),
      doctorSpecialty: docItem.specialty || 'Consultant Specialist',
      doctorDepartment: docItem.department || 'Outpatient Department',
      doctorPhotoUrl: docItem.photoUrl,
      relatedAppointmentId,
      createdAt: nowIso,
      lastMessageAt: nowIso,
      status: 'Active',
    };

    const nextConvs = [newConv, ...conversations];
    setConversations(nextConvs);
    persistDemoLocal('hr_conversations', nextConvs);
    persistToSupabase('Create Conversation', (client) => dbUpsertConversation(client, newConv));
    setSelectedConversationId(convId);
    return newConv;
  };

  const sendPatientMessage = (
    text: string,
    doctorId: string,
    doctorName: string,
    category?: MessageCategory,
    relatedAppointmentId?: string,
    attachment?: MessageAttachment
  ): PatientMessage | null => {
    const docItem =
      doctorsDirectory.find((d) => d.id === doctorId) ||
      allStaff.find((s) => s.id === doctorId);
    const resolvedDocId = docItem?.id || doctorId;
    const resolvedDocName = formatDoctorDisplayName(docItem?.name || doctorName);
    const nowIso = new Date().toISOString();

    const result = createOrUpdateConversationAndMessage(conversations, patientMessages, {
      patientId: activePatient.id,
      patientName: activePatient.name,
      patientPhotoUrl: activePatient.photoUrl,
      doctorId: resolvedDocId,
      doctorName: resolvedDocName,
      doctorSpecialty: docItem?.specialty || 'Consultant Specialist',
      doctorDepartment: docItem?.department || 'Outpatient Department',
      doctorPhotoUrl: docItem?.photoUrl,
      senderId: activePatient.id,
      senderRole: 'Patient',
      text,
      category: category || 'General Query',
      relatedAppointmentId,
      attachment,
      nowIso,
    });

    if (!result.success || !result.message || !result.conversation) {
      return null;
    }

    setConversations(result.updatedConversations);
    setPatientMessages(result.updatedMessages);
    setSelectedConversationId(result.conversation.id);

    persistDemoLocal('hr_conversations', result.updatedConversations);
    persistDemoLocal('hr_patient_messages', result.updatedMessages);

    const doctorNotif: PatientNotification = {
      id: `notif-msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId: activePatient.id,
      doctorId: resolvedDocId,
      conversationId: result.conversation.id,
      messageId: result.message.id,
      targetAudience: 'doctor',
      category: 'message',
      title: `New Patient Message from ${activePatient.name}`,
      message: `${activePatient.name} sent a message (${result.message.category || 'General Query'}) to ${resolvedDocName}: "${result.message.text.slice(0, 80)}${result.message.text.length > 80 ? '...' : ''}"`,
      timestamp: nowIso,
      isRead: false,
      actionTab: 'patient-messages',
      priority: 'normal',
    };

    setPatientNotifications((prev) => {
      const updatedNotifs = [doctorNotif, ...prev];
      persistDemoLocal('hr_patient_notifs', updatedNotifs);
      return updatedNotifs;
    });

    const convSnap = result.conversation;
    const msgSnap = result.message;
    persistToSupabase('Send Patient Message', async (client) => {
      const convRes = await dbUpsertConversation(client, convSnap);
      if (!convRes.success) return convRes;
      const msgRes = await dbInsertPatientMessage(client, msgSnap);
      if (!msgRes.success) return msgRes;
      return dbInsertNotification(client, doctorNotif);
    });

    logAuditAction(
      'Patient Sent Clinical Message',
      'PATIENT',
      activePatient.id,
      `Patient ${activePatient.name} sent message to ${resolvedDocName} in ${result.conversation.id}: "${result.message.text.slice(0, 60)}"`
    );

    return result.message;
  };

  const sendDoctorReply = (
    conversationId: string,
    text: string,
    category?: MessageCategory
  ): { success: boolean; error?: string; message?: PatientMessage } => {
    const targetConv = conversations.find((c) => c.id === conversationId);
    if (!targetConv) {
      return { success: false, error: 'Conversation not found.' };
    }

    if (!canDoctorReplyToConversation(currentUser, targetConv)) {
      return {
        success: false,
        error: `Unauthorized: Only ${targetConv.doctorName} or an authorised hospital administrator can reply to this patient conversation.`,
      };
    }

    const nowIso = new Date().toISOString();
    // Mark unread patient messages in this conversation as read first
    const { updatedMessages: messagesMarkedRead } = markConversationMessagesAsRead(
      patientMessages,
      conversationId,
      'Doctor',
      nowIso
    );

    const result = createOrUpdateConversationAndMessage(conversations, messagesMarkedRead, {
      conversationId: targetConv.id,
      patientId: targetConv.patientId,
      patientName: targetConv.patientName,
      patientPhotoUrl: targetConv.patientPhotoUrl,
      doctorId: targetConv.doctorId,
      doctorName: targetConv.doctorName,
      doctorSpecialty: targetConv.doctorSpecialty,
      doctorDepartment: targetConv.doctorDepartment,
      doctorPhotoUrl: targetConv.doctorPhotoUrl,
      senderId: currentUser.id,
      senderRole: 'Doctor',
      text,
      category: category || 'Follow-up Coordination',
      relatedAppointmentId: targetConv.relatedAppointmentId,
      nowIso,
    });

    if (!result.success || !result.message || !result.conversation) {
      return { success: false, error: result.error || 'Could not send reply.' };
    }

    setConversations(result.updatedConversations);
    setPatientMessages(result.updatedMessages);

    persistDemoLocal('hr_conversations', result.updatedConversations);
    persistDemoLocal('hr_patient_messages', result.updatedMessages);

    const patientNotif: PatientNotification = {
      id: `notif-reply-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId: targetConv.patientId,
      doctorId: targetConv.doctorId,
      conversationId: targetConv.id,
      messageId: result.message.id,
      targetAudience: 'patient',
      category: 'message',
      title: `New Reply from ${targetConv.doctorName}`,
      message: `${targetConv.doctorName} replied to your conversation: "${result.message.text.slice(0, 80)}${result.message.text.length > 80 ? '...' : ''}"`,
      timestamp: nowIso,
      isRead: false,
      actionTab: 'patient-messages',
      priority: 'high',
    };

    setPatientNotifications((prev) => {
      // Mark doctor-targeted notifications for this conversation as read while adding the patient notification
      const updatedPrev = prev.map((n) =>
        n.conversationId === targetConv.id && n.targetAudience === 'doctor'
          ? { ...n, isRead: true }
          : n
      );
      const updatedNotifs = [patientNotif, ...updatedPrev];
      persistDemoLocal('hr_patient_notifs', updatedNotifs);
      return updatedNotifs;
    });

    const convSnap = result.conversation;
    const msgSnap = result.message;
    persistToSupabase('Send Doctor Reply', async (client) => {
      await dbMarkConversationMessagesRead(client, conversationId, 'Doctor', nowIso);
      const convRes = await dbUpsertConversation(client, convSnap);
      if (!convRes.success) return convRes;
      const msgRes = await dbInsertPatientMessage(client, msgSnap);
      if (!msgRes.success) return msgRes;
      return dbInsertNotification(client, patientNotif);
    });

    logAuditAction(
      'Doctor Sent Message Reply',
      'PATIENT',
      targetConv.patientId,
      `${currentUser.name} replied to ${targetConv.patientName} in ${targetConv.id}: "${result.message.text.slice(0, 60)}"`
    );

    return { success: true, message: result.message };
  };

  const markConversationRead = (conversationId: string, viewerRole: MessageSenderRole) => {
    const targetConv = conversations.find((c) => c.id === conversationId);
    if (!targetConv) return;

    if (viewerRole === 'Patient') {
      if (!canAccessConversation({ type: 'patient', id: activePatient.id }, targetConv)) return;
    } else {
      if (!canAccessConversation({ type: 'staff', id: currentUser.id, role: currentUser.role }, targetConv)) return;
    }

    const nowIso = new Date().toISOString();
    const { updatedMessages, markedCount } = markConversationMessagesAsRead(
      patientMessages,
      conversationId,
      viewerRole,
      nowIso
    );

    if (markedCount > 0) {
      setPatientMessages(updatedMessages);
      persistDemoLocal('hr_patient_messages', updatedMessages);
      persistToSupabase('Mark Conversation Messages Read', (client) =>
        dbMarkConversationMessagesRead(client, conversationId, viewerRole, nowIso)
      );
    }

    // Also mark corresponding unread notifications for this conversation as read
    const expectedAudience = viewerRole === 'Patient' ? 'patient' : 'doctor';
    setPatientNotifications((prev) => {
      let notifChanged = false;
      const updatedNotifs = prev.map((n) => {
        if (
          !n.isRead &&
          (n.conversationId === conversationId ||
            (n.actionTab === 'patient-messages' &&
              n.patientId === targetConv.patientId &&
              (!n.doctorId || n.doctorId === targetConv.doctorId))) &&
          (!n.targetAudience || n.targetAudience === expectedAudience || n.targetAudience === 'both')
        ) {
          notifChanged = true;
          return { ...n, isRead: true };
        }
        return n;
      });
      if (!notifChanged) return prev;
      persistDemoLocal('hr_patient_notifs', updatedNotifs);
      return updatedNotifs;
    });
  };

  const updateConversationStatus = (
    conversationId: string,
    status: ConversationStatus
  ): { success: boolean; error?: string } => {
    const targetConv = conversations.find((c) => c.id === conversationId);
    if (!targetConv) {
      return { success: false, error: 'Conversation not found.' };
    }

    const isAllowed =
      portalMode === 'patient'
        ? canAccessConversation({ type: 'patient', id: activePatient.id }, targetConv)
        : canAccessConversation({ type: 'staff', id: currentUser.id, role: currentUser.role }, targetConv);

    if (!isAllowed) {
      return {
        success: false,
        error: 'You are not authorized to modify this conversation.',
      };
    }

    const updatedConv: MessageConversation = { ...targetConv, status };
    const nextConvs = conversations.map((c) => (c.id === conversationId ? updatedConv : c));
    setConversations(nextConvs);
    persistDemoLocal('hr_conversations', nextConvs);
    persistToSupabase('Update Conversation Status', (client) => dbUpsertConversation(client, updatedConv));

    logAuditAction(
      status === 'Archived' ? 'Conversation Archived' : 'Conversation Restored to Active',
      'PATIENT',
      targetConv.patientId,
      `Conversation ${conversationId} (${targetConv.patientName} ↔ ${targetConv.doctorName}) marked as ${status}`
    );

    return { success: true };
  };

  const markNotificationRead = (notifId: string) => {
    setPatientNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n)));
    persistToSupabase('Mark Notification Read', (client) => dbMarkNotificationRead(client, notifId));
  };

  const markAllNotificationsRead = () => {
    setPatientNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (resolvedIdentity) {
      persistToSupabase('Mark All Notifications Read', (client) =>
        dbMarkAllNotificationsRead(client, resolvedIdentity)
      );
    }
  };

  const updatePatientProfile = (patientId: string, updates: Partial<Patient>) => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === patientId) {
          return {
            ...p,
            contactNumber: updates.contactNumber || p.contactNumber,
            address: updates.address || p.address,
            selfReportedNotes: updates.selfReportedNotes !== undefined ? updates.selfReportedNotes : p.selfReportedNotes,
            emergencyContact: updates.emergencyContact || p.emergencyContact,
            nextOfKin: updates.nextOfKin || p.nextOfKin,
          };
        }
        return p;
      })
    );
    persistToSupabase('Update Patient Profile', (client) => dbUpdatePatientFields(client, patientId, updates));
    logAuditAction('Patient Profile Updated', 'PATIENT', patientId, 'Updated self-reported contact, address, and emergency details');
  };

  const updatePrivacySettings = (updates: Partial<PrivacyConsentSettings>) => {
    setPrivacySettingsByPatient((prev) => {
      const next = updatePatientPrivacySettingsMap(prev, activePatientId, updates);
      persistDemoLocal('hr_privacy_settings_by_patient', next);
      const updatedForPatient = next[activePatientId];
      if (updatedForPatient) {
        persistToSupabase('Update Patient Privacy Settings', (client) =>
          dbUpsertPatientPrivacySettings(client, activePatientId, updatedForPatient)
        );
      }
      return next;
    });
    logAuditAction('Privacy & Consent Updated', 'PATIENT', activePatientId, 'Patient modified consent and information sharing permissions');
  };

  const recordEmergencyAccess = (purpose: string) => {
    const accessRec: AccessAuditRecord = {
      id: `acc-${Date.now()}`,
      patientId: activePatientId,
      accessorStaffId: currentUser.id,
      accessorName: currentUser.name,
      accessorRole: currentUser.designation,
      department: currentUser.department,
      timestamp: new Date().toISOString(),
      purpose,
      action: 'Accessed Emergency Health Summary & Critical Allergies Card',
    };
    setAllAccessAuditLogs((prev) => [accessRec, ...prev]);
    persistToSupabase('Record Patient Access Audit', (client) =>
      dbRecordPatientAccessAudit(client, activePatientId, purpose, accessRec.action)
    );
    logAuditAction('Emergency Information Access', 'PATIENT', activePatientId, `Emergency summary accessed. Purpose: ${purpose}`);
  };

  const registerPatient = (data: Partial<Patient>): { patient: Patient; tempId?: string } => {
    const nextSeq = patients.length + 844;
    const isUnknown = !!data.isUnidentified;
    const tempId = isUnknown ? generateTempPatientId(nextSeq) : undefined;
    const permanentMrn = !isUnknown ? `AC-BLR-2026-${nextSeq}` : undefined;

    const newPatient: Patient = {
      id: `pat-${Date.now()}`,
      isUnidentified: isUnknown,
      tempId,
      permanentMrn,
      name: isUnknown ? (data.name || `Unidentified Patient #${patients.filter((p) => p.isUnidentified).length + 27}`) : (data.name || 'Emergency Patient'),
      ageEstimated: isUnknown ? true : data.ageEstimated,
      age: data.age || (isUnknown ? 30 : 40),
      gender: data.gender || 'Unknown',
      bloodGroup: data.bloodGroup || 'Unknown',
      allergies: data.allergies || ['Pending Screening'],
      contactNumber: data.contactNumber,
      address: data.address,
      nextOfKin: data.nextOfKin,
      abhaId: data.abhaId,
      nationalIdPlaceholder: data.nationalIdPlaceholder,
      physicalIdentification: data.physicalIdentification,
      registrationTimestamp: new Date().toISOString(),
      registeredBy: currentUser.name,
      photoUrl: data.photoUrl,
    };

    setPatients((prev) => [newPatient, ...prev]);
    persistToSupabase('Register Patient', (client) => dbRegisterPatient(client, newPatient, currentUser.id));
    logAuditAction(
      isUnknown ? 'Registered Unidentified Patient' : 'Registered Emergency Patient',
      'PATIENT',
      tempId || newPatient.id,
      `Intake performed by ${currentUser.name}. Assigned identifier: ${tempId || permanentMrn}`
    );

    return { patient: newPatient, tempId };
  };

  const reconcilePatient = (
    patientId: string,
    permanentDetails: { name: string; contactNumber: string; address?: string; nationalId?: string; abhaId?: string }
  ) => {
    const newMrn = `AC-BLR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();
    let updatedPatientObj: Patient | null = null;

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === patientId) {
          const reconciledEntry = {
            previousTempId: p.tempId,
            previousName: p.name,
            verifiedName: permanentDetails.name,
            permanentMrn: newMrn,
            reconciledByStaffId: currentUser.id,
            reconciledByName: currentUser.name,
            reconciledAt: nowIso,
          };
          updatedPatientObj = {
            ...p,
            isUnidentified: false,
            name: permanentDetails.name,
            contactNumber: permanentDetails.contactNumber,
            address: permanentDetails.address || p.address,
            nationalIdPlaceholder: permanentDetails.nationalId,
            abhaId: permanentDetails.abhaId,
            permanentMrn: newMrn,
            reconciledToPatientId: p.id,
            reconciliationHistory: [...(p.reconciliationHistory || []), reconciledEntry],
          };
          return updatedPatientObj;
        }
        return p;
      })
    );

    // Synchronize snapshot in active emergency cases (Phase 6A Fix #7)
    setCases((prev) => {
      if (updatedPatientObj) {
        return synchronizeReconciledPatientSnapshots(prev, updatedPatientObj, nowIso);
      }
      return prev.map((c) => {
        if (c.patientId === patientId) {
          return {
            ...c,
            patientSnapshot: {
              ...c.patientSnapshot,
              isUnidentified: false,
              name: permanentDetails.name,
              contactNumber: permanentDetails.contactNumber,
              permanentMrn: newMrn,
            },
            updatedAt: nowIso,
          };
        }
        return c;
      });
    });

    persistToSupabase('Reconcile Patient Identity', (client) =>
      dbReconcileUnidentifiedPatient(client, {
        patientId,
        verifiedName: permanentDetails.name,
        contactNumber: permanentDetails.contactNumber,
        address: permanentDetails.address,
        nationalId: permanentDetails.nationalId,
      })
    );

    logAuditAction(
      'Reconciled Patient Identity',
      'PATIENT',
      patientId,
      `Unidentified record resolved to permanent patient: ${permanentDetails.name} (MRN: ${newMrn})`
    );
  };

  const updatePatientPhoto = (patientId: string, photoUrl: string) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, photoUrl } : p))
    );
    setAppointments((prev) =>
      prev.map((a) => (a.patientId === patientId ? { ...a, patientPhotoUrl: photoUrl } : a))
    );
    setCases((prev) =>
      prev.map((c) =>
        c.patientId === patientId
          ? { ...c, patientSnapshot: { ...c.patientSnapshot, photoUrl } }
          : c
      )
    );
    persistToSupabase('Update Patient Photo', (client) =>
      dbUpdatePatientFields(client, patientId, { photoUrl })
    );
    logAuditAction(
      'Updated Patient Profile Photo',
      'PATIENT',
      patientId,
      'Updated official photographic identity record in clinical registry'
    );
  };

  const bookAppointment = (data: Partial<Appointment>): Appointment => {
    const nextSeq = appointments.length + 1;
    const aptDate = data.date || new Date().toISOString().split('T')[0];
    const todayCount = appointments.filter((a) => a.date === aptDate).length;
    const matchedPat = patients.find((p) => p.id === data.patientId);
    const matchedDoc =
      doctorsDirectory.find((d) => d.id === data.doctorId || d.name === data.doctorName) ||
      doctorsDirectory.find((d) => d.id === currentUser.id) ||
      doctorsDirectory[0];
    const matchedStaff = allStaff.find((s) => s.id === (data.doctorId || matchedDoc.id));
    const resolvedRoom = data.roomNumber || data.roomNo || matchedStaff?.station?.split('&')[0]?.trim() || 'OPD Room 204';

    const newApt: Appointment = {
      id: `APT-2026-${String(nextSeq).padStart(3, '0')}`,
      patientId: data.patientId || 'pat-known-01',
      patientName: data.patientName || matchedPat?.name || 'Consultation Patient',
      patientAge: data.patientAge || matchedPat?.age || 42,
      patientGender: data.patientGender || matchedPat?.gender || 'Other',
      patientPhone: data.patientPhone || matchedPat?.contactNumber || '+91 98860 00000',
      patientPhotoUrl: data.patientPhotoUrl || matchedPat?.photoUrl,
      doctorId: data.doctorId || matchedDoc.id,
      doctorName: data.doctorName || matchedDoc.name,
      doctorPhotoUrl: data.doctorPhotoUrl || matchedDoc.photoUrl || matchedStaff?.photoUrl,
      department: data.department || matchedDoc.department,
      date: aptDate,
      timeSlot: data.timeSlot || '10:00 AM',
      tokenNumber: todayCount + 1,
      type: data.type || 'New Consultation',
      status: 'Scheduled',
      chiefComplaint: data.chiefComplaint || 'General clinical review & health assessment',
      hospitalName: matchedDoc.hospitalAffiliation,
      roomNo: resolvedRoom,
      roomNumber: resolvedRoom,
      vitalsSnapshot: data.vitalsSnapshot,
      createdAt: new Date().toISOString(),
    };

    setAppointments((prev) => [newApt, ...prev]);
    persistToSupabase('Book Appointment', (client) => dbUpsertAppointment(client, newApt));
    logAuditAction(
      'Appointment Scheduled',
      'PATIENT',
      newApt.patientId,
      `Booked ${newApt.type} token #${newApt.tokenNumber} at ${newApt.timeSlot} for ${newApt.patientName} with ${newApt.doctorName}`
    );
    return newApt;
  };

  const updateAppointmentStatus = (aptId: string, status: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === aptId ? { ...a, status } : a))
    );
    persistToSupabase('Update Appointment Status', (client) =>
      dbUpdateAppointmentFields(client, aptId, { status })
    );
    logAuditAction('Appointment Status Transition', 'PATIENT', aptId, `Status transitioned to: ${status}`);
  };

  const updateAppointmentTriageStatus = (aptId: string, triageStatus: PatientTriageStatus) => {
    setAppointments((prev) => {
      const updated = prev.map((a) => (a.id === aptId ? { ...a, triageStatus } : a));
      persistDemoLocal('hr_appointments', updated);
      return updated;
    });
    persistToSupabase('Update Appointment Triage Status', (client) =>
      dbUpdateAppointmentFields(client, aptId, { triageStatus })
    );
    const targetApt = appointments.find((a) => a.id === aptId);
    logAuditAction(
      `Triage Acuity Assessment (${triageStatus})`,
      'PATIENT',
      targetApt?.patientId || aptId,
      `Clinical Nurse ${currentUser.name} updated triage acuity for ${targetApt?.patientName || 'patient'} to ${triageStatus}`
    );
  };

  const startConsultation = (aptId: string) => {
    setSelectedAppointmentId(aptId);
    setEditingEncounter(null);
    setAppointments((prev) =>
      prev.map((a) => (a.id === aptId ? { ...a, status: 'In Consultation' } : a))
    );
    persistToSupabase('Start Consultation', (client) =>
      dbUpdateAppointmentFields(client, aptId, { status: 'In Consultation' })
    );
    setIsConsultationModalOpen(true);
    logAuditAction('Consultation Started', 'PATIENT', aptId, `Started active clinical consultation for appointment ${aptId}`);
  };

  const syncPatientMedicationStrings = (targetPatientId: string, nextEncounters: ClinicalEncounter[]) => {
    setPatients((prevPatients) => {
      const updatedPatients = prevPatients.map((p) => {
        if (p.id === targetPatientId) {
          const regimen = derivePatientMedicationRegimen(p, nextEncounters);
          return {
            ...p,
            currentMedications: regimen.currentMedicationStrings,
          };
        }
        return p;
      });
      persistDemoLocal('hr_patients', updatedPatients);
      return updatedPatients;
    });
  };

  const saveClinicalEncounter = (enc: Partial<ClinicalEncounter>): ClinicalEncounter => {
    const existingIndex = enc.id ? encounters.findIndex((e) => e.id === enc.id) : -1;
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.split('T')[0];

    const resolvedEncounterStatus = enc.status || 'Signed';
    const resolvedPrescriptionStatus: PrescriptionStatus =
      enc.prescriptionStatus || (resolvedEncounterStatus === 'Draft' ? 'Draft' : 'Active');

    const encounterId =
      existingIndex >= 0
        ? encounters[existingIndex].id
        : enc.id || `ENC-2026-${String(encounters.length + 1).padStart(3, '0')}`;

    const patientId =
      enc.patientId || (existingIndex >= 0 ? encounters[existingIndex].patientId : 'pat-known-01');
    const patientName =
      enc.patientName ||
      (existingIndex >= 0 ? encounters[existingIndex].patientName : patients.find((p) => p.id === patientId)?.name || 'Consultation Patient');
    const doctorId = enc.doctorId || currentUser.id;
    const doctorName = formatDoctorDisplayName(enc.doctorName || currentUser.name);
    const createdDate = enc.date || (existingIndex >= 0 ? encounters[existingIndex].date : todayDate);

    const normalizedPrescriptions = normalizePrescriptionItems(
      enc.prescriptions || (existingIndex >= 0 ? encounters[existingIndex].prescriptions : []),
      {
        encounterId,
        patientId,
        doctorId,
        doctorName,
        createdDate,
        defaultStatus: resolvedPrescriptionStatus,
      }
    );

    let saved: ClinicalEncounter;

    if (existingIndex >= 0) {
      saved = {
        ...encounters[existingIndex],
        ...enc,
        id: encounterId,
        patientId,
        patientName,
        doctorId,
        doctorName,
        date: createdDate,
        prescriptions: normalizedPrescriptions,
        prescriptionStatus: resolvedPrescriptionStatus,
        status: resolvedEncounterStatus,
        updatedAt: nowIso,
      } as ClinicalEncounter;
    } else {
      saved = {
        id: encounterId,
        appointmentId: enc.appointmentId,
        patientId,
        patientName,
        doctorId,
        doctorName,
        department: enc.department || currentUser.department,
        date: createdDate,
        encounterType: enc.encounterType || 'OPD Consultation',
        chiefComplaint: enc.chiefComplaint || 'Clinical Consultation',
        subjectiveHistory: enc.subjectiveHistory || '',
        physicalExamination: enc.physicalExamination || '',
        vitals: enc.vitals || {
          bp: '120/80',
          pulse: 76,
          spo2: 98,
          temp: 98.4,
          rr: 16,
          gcs: 15,
          recordedAt: nowIso,
        },
        assessmentDiagnosis: enc.assessmentDiagnosis || 'Clinical Assessment Completed',
        prescriptions: normalizedPrescriptions,
        prescriptionStatus: resolvedPrescriptionStatus,
        orderedInvestigations: enc.orderedInvestigations || [],
        followUpDate: enc.followUpDate,
        clinicalAdvice: enc.clinicalAdvice || '',
        status: resolvedEncounterStatus,
        updatedAt: nowIso,
      };
    }

    const nextEncounters =
      existingIndex >= 0
        ? encounters.map((e, idx) => (idx === existingIndex ? saved : e))
        : [saved, ...encounters];

    setEncounters(nextEncounters);
    persistDemoLocal('hr_encounters', nextEncounters);

    // Keep patient's currentMedications synchronized with Active prescriptions
    syncPatientMedicationStrings(saved.patientId, nextEncounters);

    // If an appointment was linked and the encounter is finalized/signed (not draft), mark it completed
    if (saved.appointmentId && saved.status !== 'Draft') {
      updateAppointmentStatus(saved.appointmentId, 'Completed');
    }

    const newNotificationsToPersist: PatientNotification[] = [];

    // Emit notification when a doctor saves a prescription
    if (saved.prescriptions.length > 0) {
      const medSummary = saved.prescriptions
        .slice(0, 3)
        .map((m) => m.drugName)
        .join(', ');
      const isDraft = saved.prescriptionStatus === 'Draft' || saved.status === 'Draft';

      const notif: PatientNotification = {
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        patientId: saved.patientId,
        doctorId: saved.doctorId,
        targetAudience: isDraft ? 'doctor' : 'both',
        category: 'prescription',
        title: isDraft
          ? `Draft Prescription Saved (${saved.id})`
          : `New Prescription Issued by ${saved.doctorName}`,
        message: isDraft
          ? `Draft prescription ${saved.id} for ${saved.patientName} (${saved.prescriptions.length} medicine(s): ${medSummary}) saved for clinical review.`
          : `${saved.doctorName} prescribed ${saved.prescriptions.length} medication(s) (${medSummary}) on ${saved.date}. View dosage instructions in Prescriptions & Medications.`,
        timestamp: nowIso,
        isRead: false,
        actionTab: 'patient-prescriptions',
        priority: isDraft ? 'normal' : 'high',
      };
      newNotificationsToPersist.push(notif);

      setPatientNotifications((prev) => {
        let updatedNotifs = [notif, ...prev];
        if (!isDraft) {
          const pharmacyReviewNotif: PatientNotification = {
            id: `notif-pharm-rx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            patientId: saved.patientId,
            doctorId: saved.doctorId,
            encounterId: saved.id,
            dedupKey: `rx-pharmacy-ready-${saved.id}`,
            targetAudience: 'pharmacy',
            category: 'pharmacy',
            title: `Prescription Ready for Pharmacy Review (${saved.id})`,
            message: `${saved.doctorName} issued an Active prescription for ${saved.patientName} (${saved.prescriptions.length} medicine(s): ${medSummary}). Ready for dispensary review.`,
            timestamp: nowIso,
            isRead: false,
            priority: 'high',
          };
          updatedNotifs = appendDeduplicatedNotification(updatedNotifs, pharmacyReviewNotif);
          newNotificationsToPersist.push(pharmacyReviewNotif);
        }
        persistDemoLocal('hr_patient_notifs', updatedNotifs);
        return updatedNotifs;
      });
    }

    persistToSupabase('Save Clinical Encounter & Prescription', async (client) => {
      const encRes = await dbUpsertClinicalEncounter(client, saved);
      if (!encRes.success) return encRes;
      for (const n of newNotificationsToPersist) {
        await dbInsertNotification(client, n);
      }
      return { success: true };
    });

    logAuditAction(
      saved.prescriptionStatus === 'Draft' ? 'Draft Prescription Saved' : 'Clinical Encounter & Prescription Saved',
      'PATIENT',
      saved.patientId,
      `Encounter ${saved.id} (${saved.prescriptionStatus}). Diagnosis: ${saved.assessmentDiagnosis}. Prescriptions: ${saved.prescriptions.length} items.`
    );

    return saved;
  };

  const activateDraftPrescription = (encounterId: string): ClinicalEncounter | null => {
    const target = encounters.find((e) => e.id === encounterId);
    if (!target) return null;

    return saveClinicalEncounter({
      ...target,
      status: 'Signed',
      prescriptionStatus: 'Active',
      prescriptions: target.prescriptions.map((p) => ({
        ...p,
        status: p.status === 'Discontinued' ? 'Discontinued' : 'Active',
      })),
    });
  };

  const discontinuePrescription = (
    encounterId: string,
    prescriptionItemId?: string,
    reason?: string
  ): ClinicalEncounter | null => {
    const target = encounters.find((e) => e.id === encounterId);
    if (!target) return null;

    const nowIso = new Date().toISOString();
    const { updatedEncounter, discontinuedItems } = discontinuePrescriptionInEncounter(
      target,
      { id: currentUser.id, name: currentUser.name },
      { prescriptionItemId, reason, nowIso }
    );

    if (discontinuedItems.length === 0) return target;

    const nextEncounters = encounters.map((e) => (e.id === encounterId ? updatedEncounter : e));
    setEncounters(nextEncounters);
    persistDemoLocal('hr_encounters', nextEncounters);

    if (previewEncounter && previewEncounter.id === encounterId) {
      setPreviewEncounter(updatedEncounter);
    }

    // Update patient's active currentMedications list immediately so discontinued meds no longer appear as active
    syncPatientMedicationStrings(updatedEncounter.patientId, nextEncounters);

    const discontinuedNames = discontinuedItems.map((i) => i.drugName).join(', ');
    const resolvedReason = reason?.trim() || 'Discontinued by prescribing clinician';

    const notif: PatientNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId: updatedEncounter.patientId,
      doctorId: updatedEncounter.doctorId,
      targetAudience: 'both',
      category: 'prescription',
      title: `Medication Discontinued: ${discontinuedNames}`,
      message: `${formatDoctorDisplayName(currentUser.name)} discontinued ${discontinuedNames} from prescription ${updatedEncounter.id} for ${updatedEncounter.patientName}. Reason: ${resolvedReason}. Historical record retained.`,
      timestamp: nowIso,
      isRead: false,
      actionTab: 'patient-prescriptions',
      priority: 'high',
    };

    setPatientNotifications((prev) => {
      const updatedNotifs = [notif, ...prev];
      persistDemoLocal('hr_patient_notifs', updatedNotifs);
      return updatedNotifs;
    });

    persistToSupabase('Discontinue Prescription Item', async (client) => {
      const encRes = await dbUpsertClinicalEncounter(client, updatedEncounter);
      if (!encRes.success) return encRes;
      return dbInsertNotification(client, notif);
    });

    logAuditAction(
      'Prescription Medication Discontinued',
      'PATIENT',
      updatedEncounter.patientId,
      `${currentUser.name} discontinued ${discontinuedNames} in ${updatedEncounter.id}. Reason: ${resolvedReason}`
    );

    return updatedEncounter;
  };

  const recordPatientMedicationActivity = (input: {
    encounterId: string;
    prescriptionItemId: string;
    medicineName: string;
    status: MedicationActivityStatus;
    note?: string;
  }): PatientMedicationActivity => {
    const nowIso = new Date().toISOString();
    const targetEnc = encounters.find((e) => e.id === input.encounterId);
    const activity = createPatientMedicationActivity(
      {
        patientId: activePatient.id,
        patientName: activePatient.name,
        encounterId: input.encounterId,
        prescriptionItemId: input.prescriptionItemId,
        medicineName: input.medicineName,
        status: input.status,
        note: input.note,
      },
      nowIso
    );

    setMedicationActivities((prev) => {
      const filtered = prev.filter(
        (a) =>
          !(
            a.patientId === activePatient.id &&
            a.encounterId === input.encounterId &&
            a.prescriptionItemId === input.prescriptionItemId &&
            a.recordedAt.split('T')[0] === nowIso.split('T')[0]
          )
      );
      const updated = [activity, ...filtered];
      persistDemoLocal('hr_medication_activities', updated);
      return updated;
    });

    const notif: PatientNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId: activePatient.id,
      doctorId: targetEnc?.doctorId || 'staff-doc-1',
      targetAudience: 'both',
      category: 'prescription',
      title: `Patient-Reported Medication Update: ${input.medicineName}`,
      message: `${activePatient.name} recorded "${input.status}" (Patient-Reported) for ${input.medicineName}${input.note ? ` — Note: "${input.note}"` : ''}.`,
      timestamp: nowIso,
      isRead: false,
      actionTab: 'patient-prescriptions',
      priority: input.status === 'Skipped' ? 'high' : 'normal',
    };

    setPatientNotifications((prev) => {
      const updatedNotifs = [notif, ...prev];
      persistDemoLocal('hr_patient_notifs', updatedNotifs);
      return updatedNotifs;
    });

    persistToSupabase('Record Medication Activity', async (client) => {
      const actRes = await dbUpsertMedicationActivity(client, activity);
      if (!actRes.success) return actRes;
      return dbInsertNotification(client, notif);
    });

    logAuditAction(
      'Patient-Reported Medication Activity Recorded',
      'PATIENT',
      activePatient.id,
      `Patient ${activePatient.name} self-reported "${input.status}" for ${input.medicineName} (${input.encounterId})`
    );

    return activity;
  };

  const completeFollowUp = (fuId: string) => {
    setFollowUps((prev) =>
      prev.map((f) => (f.id === fuId ? { ...f, status: 'completed', completed: true } : f))
    );
    persistToSupabase('Complete Follow-Up Reminder', (client) => dbCompleteFollowUpReminder(client, fuId));
    logAuditAction('Follow-up Reminder Completed', 'PATIENT', fuId, `Marked reminder as completed by ${currentUser.name}`);
  };

  const acknowledgeLabReport = (reportId: string) => {
    const targetReport = labReports.find((r) => r.id === reportId);
    setLabReports((prev) => {
      const updated = prev.map((r) =>
        r.id === reportId
          ? { ...r, status: 'Reviewed' as const, reviewedBy: currentUser.name }
          : r
      );
      persistDemoLocal('hr_labs', updated);
      return updated;
    });
    if (previewLabReport && previewLabReport.id === reportId) {
      setPreviewLabReport((prev) =>
        prev ? { ...prev, status: 'Reviewed', reviewedBy: currentUser.name } : null
      );
    }
    persistToSupabase('Acknowledge Lab Report', (client) =>
      dbAcknowledgeLabReport(client, reportId, currentUser.id, currentUser.name)
    );
    logAuditAction(
      'Diagnostic Lab Report Acknowledged',
      'PATIENT',
      targetReport?.patientId || reportId,
      `${currentUser.name} reviewed & acknowledged report ${reportId} (${targetReport?.testName || 'Diagnostic Lab'})`
    );
  };

  const createEmergencyCase = (
    caseInput: Partial<EmergencyCase>,
    patientInput: Partial<Patient>
  ): EmergencyCase => {
    let patient: Patient;
    if (patientInput.id) {
      const existing = patients.find((p) => p.id === patientInput.id);
      patient = existing || registerPatient(patientInput).patient;
    } else {
      patient = registerPatient(patientInput).patient;
    }

    const caseSeq = cases.length + 847;
    const caseId = `CASE-2026-0${caseSeq}`;

    const newCase: EmergencyCase = {
      id: caseId,
      patientId: patient.id,
      patientSnapshot: patient,
      triageLevel: caseInput.triageLevel || 'YELLOW',
      esiScore: caseInput.esiScore || 3,
      chiefComplaint: caseInput.chiefComplaint || 'Emergency Acute Intake',
      incidentType: caseInput.incidentType || 'General Medical Acute',
      incidentDetails: caseInput.incidentDetails || {
        broughtBy: '108 EMRI / Walk-in',
      },
      vitals: caseInput.vitals || {
        bp: '120/80',
        pulse: 80,
        spo2: 98,
        temp: 98.6,
        rr: 18,
        gcs: 15,
        recordedAt: new Date().toISOString(),
      },
      bedBay: caseInput.bedBay || 'Acute ER Bed 05',
      assignedPhysician: caseInput.assignedPhysician || currentUser.name,
      assignedNurse: caseInput.assignedNurse || 'Sister Rekha Varma',
      status: caseInput.status || 'Active Triage',
      isMlc: !!caseInput.isMlc,
      isPoisoning: !!caseInput.isPoisoning,
      clinicalNotes: caseInput.clinicalNotes || [
        {
          id: `note-${Date.now()}`,
          timestamp: new Date().toISOString(),
          author: currentUser.name,
          role: currentUser.designation,
          note: `Case registered. Initial triage category: ${caseInput.triageLevel || 'YELLOW'} (ESI ${caseInput.esiScore || 3}). Allocated ${caseInput.bedBay || 'Acute ER Bed 05'}.`,
          category: 'assessment',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCases((prev) => [newCase, ...prev]);

    let createdMlc: MedicoLegalCase | undefined;
    let createdTox: PoisoningCase | undefined;

    // Automatically create drafted MLC if flagged
    if (newCase.isMlc) {
      const mlcId = generateMlcId(mlcCases.length + 421);
      newCase.mlcId = mlcId;
      const initialMlc: MedicoLegalCase = {
        id: mlcId,
        caseId: newCase.id,
        patientId: patient.id,
        patientName: patient.name,
        isUnidentified: patient.isUnidentified,
        policeStation: 'Wilson Garden Police Station, Bengaluru',
        intimationSentToPolice: false,
        broughtByName: newCase.incidentDetails.broughtBy || '108 EMRI Crew',
        broughtByDesignation: 'Ambulance Crew / Police Officer',
        injuryClassification: 'Under Observation',
        wounds: [
          {
            id: `w-${Date.now()}`,
            location: 'Examination pending / provisional observation',
            type: 'Abrasion',
            dimensions: '3cm x 2cm',
            margins: 'Irregular',
            ageOfInjuryProvisional: 'Fresh',
          },
        ],
        weaponOrAgentSuspected: newCase.incidentType,
        intoxicationSuspected: false,
        smellOfAlcoholOrAgent: 'Nil specific odor',
        clothingSealedAndHandedOver: false,
        sealedArticlesDescription: 'Articles retained in secure emergency locker',
        cmoName: 'Dr. Ananya Deshmukh',
        reviewStatus: 'Draft',
        remarks: 'Automated MLC draft generated on triage. Medical officer examination pending.',
        legalDisclaimerAcknowledged: true,
        updatedAt: new Date().toISOString(),
      };
      createdMlc = initialMlc;
      setMlcCases((prev) => [initialMlc, ...prev]);
    }

    // Automatically create drafted Poison protocol if flagged
    if (newCase.isPoisoning) {
      const toxId = generatePoisonCaseId(poisonCases.length + 84);
      newCase.poisonCaseId = toxId;
      const initialTox: PoisoningCase = {
        id: toxId,
        caseId: newCase.id,
        patientId: patient.id,
        patientName: patient.name,
        suspectedAgent: 'Organophosphate',
        estimatedTimeOfIngestion: 'Estimated within 1-2 hours',
        routeOfExposure: 'Oral Ingestion',
        containerBrought: false,
        clinicalPresentation: {
          sludgeSigns: true,
          pupils: 'Pinpoint',
          secretions: 'Moderate',
          fasciculations: false,
          convulsions: false,
          respiratoryDepression: false,
          characteristicOdor: 'Pungent chemical odor',
        },
        decontaminationActions: {
          gastricLavageDone: false,
          activatedCharcoalAdministered: false,
          bodyDecontaminationWash: true,
        },
        antidotesAdministered: [],
        atropinizationStatus: {
          isAtropinized: false,
          pulseTargetAchieved: false,
          dryAxillae: false,
          pupilsDilated: false,
          chestClearOfRhonchi: false,
          systolicBpAdequate: false,
        },
        toxicologySamplesCollected: true,
        samplePreservative: 'Gastric aspirate in saturated salt solution',
        supervisingToxicologistOrCMO: currentUser.name,
        updatedAt: new Date().toISOString(),
      };
      createdTox = initialTox;
      setPoisonCases((prev) => [initialTox, ...prev]);
    }

    persistToSupabase('Create Emergency Case', (client) =>
      dbCreateEmergencyCaseBundle(client, newCase, currentUser.id, createdMlc, createdTox)
    );

    logAuditAction(
      'Emergency Case Created',
      'CASE',
      newCase.id,
      `Triage ${newCase.triageLevel} case registered for patient ${patient.name}. Bed: ${newCase.bedBay}`
    );

    return newCase;
  };

  const updateCaseStatus = (caseId: string, newStatus: CaseStatus) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          return {
            ...c,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      })
    );
    persistToSupabase('Update Emergency Case Status', (client) =>
      dbUpdateEmergencyCaseFields(client, caseId, { status: newStatus })
    );
    logAuditAction('Case Status Transition', 'CASE', caseId, `Status transitioned to: ${newStatus}`);
  };

  const updateCaseVitals = (caseId: string, vitals: CaseVitals) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          return {
            ...c,
            vitals,
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      })
    );
    persistToSupabase('Update Emergency Case Vitals', (client) =>
      dbUpdateEmergencyCaseFields(client, caseId, { vitals })
    );
    logAuditAction('Emergency Vitals Updated', 'CASE', caseId, `BP: ${vitals.bp}, HR: ${vitals.pulse}, SpO2: ${vitals.spo2}%, GCS: ${vitals.gcs}`);
  };

  const addClinicalNote = (caseId: string, noteText: string, category: ClinicalNote['category']) => {
    const newNote: ClinicalNote = {
      id: `note-${Date.now()}`,
      timestamp: new Date().toISOString(),
      author: currentUser.name,
      role: currentUser.designation,
      note: noteText,
      category,
    };

    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          return {
            ...c,
            clinicalNotes: [newNote, ...c.clinicalNotes],
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      })
    );
    persistToSupabase('Add Emergency Clinical Note', (client) =>
      dbInsertEmergencyTimelineNote(client, caseId, newNote, currentUser.id)
    );
    logAuditAction('Clinical Note Added', 'CASE', caseId, `Category [${category}]: ${noteText.slice(0, 60)}...`);
  };

  const saveMlcDraft = (mlc: Partial<MedicoLegalCase>): MedicoLegalCase => {
    let savedMlc: MedicoLegalCase;
    const existingIndex = mlcCases.findIndex((m) => m.id === mlc.id);

    if (existingIndex >= 0) {
      savedMlc = {
        ...mlcCases[existingIndex],
        ...mlc,
        updatedAt: new Date().toISOString(),
      } as MedicoLegalCase;

      setMlcCases((prev) => {
        const next = [...prev];
        next[existingIndex] = savedMlc;
        return next;
      });
    } else {
      const mlcId = mlc.id || generateMlcId(mlcCases.length + 421);
      savedMlc = {
        id: mlcId,
        caseId: mlc.caseId || 'CASE-2026-UNKNOWN',
        patientId: mlc.patientId || 'pat-unknown',
        patientName: mlc.patientName || 'Emergency Patient',
        isUnidentified: !!mlc.isUnidentified,
        policeStation: mlc.policeStation || 'Jurisdiction Police Station',
        intimationSentToPolice: !!mlc.intimationSentToPolice,
        broughtByName: mlc.broughtByName || '108 EMRI / Police',
        broughtByDesignation: mlc.broughtByDesignation || 'Duty Officer',
        injuryClassification: mlc.injuryClassification || 'Simple',
        wounds: mlc.wounds || [],
        weaponOrAgentSuspected: mlc.weaponOrAgentSuspected || 'Blunt weapon / impact',
        intoxicationSuspected: !!mlc.intoxicationSuspected,
        smellOfAlcoholOrAgent: mlc.smellOfAlcoholOrAgent || 'Nil',
        clothingSealedAndHandedOver: !!mlc.clothingSealedAndHandedOver,
        sealedArticlesDescription: mlc.sealedArticlesDescription || 'Retained in custody',
        cmoName: currentUser.name,
        reviewStatus: 'Draft',
        remarks: mlc.remarks || '',
        legalDisclaimerAcknowledged: true,
        updatedAt: new Date().toISOString(),
      };
      setMlcCases((prev) => [savedMlc, ...prev]);
    }

    persistToSupabase('Save MLC Draft', (client) => dbUpsertMlcCase(client, savedMlc, currentUser.id));
    logAuditAction('MLC Record Saved', 'MLC', savedMlc.id, `Status: ${savedMlc.reviewStatus}. PS: ${savedMlc.policeStation}`);
    return savedMlc;
  };

  const signAndSealMlc = (mlcId: string): boolean => {
    if (currentUser.role !== 'cmo' && currentUser.role !== 'doctor' && currentUser.role !== 'admin') {
      alert('Unauthorized: Only a Casualty Medical Officer (CMO) or Consultant Physician may sign and seal official MLC documents.');
      return false;
    }

    const nowIso = new Date().toISOString();
    let updatedMlc: MedicoLegalCase | null = null;
    setMlcCases((prev) =>
      prev.map((m) => {
        if (m.id === mlcId) {
          updatedMlc = {
            ...m,
            reviewStatus: 'Signed & Sealed',
            cmoName: currentUser.name,
            cmoSignedAt: nowIso,
            updatedAt: nowIso,
          };
          return updatedMlc;
        }
        return m;
      })
    );

    if (updatedMlc) {
      const snap = updatedMlc;
      persistToSupabase('Sign and Seal MLC', (client) => dbUpsertMlcCase(client, snap, currentUser.id));
    }

    logAuditAction(
      'MLC Signed and Sealed',
      'MLC',
      mlcId,
      `Formally validated, signed and hospital wax-seal authenticated by ${currentUser.name} (${currentUser.designation})`
    );
    return true;
  };

  const markPoliceIntimation = (mlcId: string, stationDiaryNo?: string) => {
    const nowIso = new Date().toISOString();
    let updatedMlc: MedicoLegalCase | null = null;
    setMlcCases((prev) =>
      prev.map((m) => {
        if (m.id === mlcId) {
          updatedMlc = {
            ...m,
            intimationSentToPolice: true,
            policeIntimationDate: nowIso,
            firOrGdNumber: stationDiaryNo || m.firOrGdNumber || 'Station Diary Ack Pending',
            updatedAt: nowIso,
          };
          return updatedMlc;
        }
        return m;
      })
    );
    if (updatedMlc) {
      const snap = updatedMlc;
      persistToSupabase('Dispatch Police Intimation', (client) => dbUpsertMlcCase(client, snap, currentUser.id));
    }
    logAuditAction('Police Intimation Dispatched', 'MLC', mlcId, `Intimation dispatched to police chowki. Ack/GD: ${stationDiaryNo || 'Pending receipt'}`);
  };

  const savePoisonCase = (poison: Partial<PoisoningCase>): PoisoningCase => {
    let savedPoison: PoisoningCase;
    const existingIndex = poisonCases.findIndex((p) => p.id === poison.id);

    if (existingIndex >= 0) {
      savedPoison = {
        ...poisonCases[existingIndex],
        ...poison,
        updatedAt: new Date().toISOString(),
      } as PoisoningCase;
      setPoisonCases((prev) => {
        const next = [...prev];
        next[existingIndex] = savedPoison;
        return next;
      });
    } else {
      const toxId = poison.id || generatePoisonCaseId(poisonCases.length + 84);
      savedPoison = {
        id: toxId,
        caseId: poison.caseId || 'CASE-2026-UNKNOWN',
        patientId: poison.patientId || 'pat-unknown',
        patientName: poison.patientName || 'Emergency Patient',
        suspectedAgent: poison.suspectedAgent || 'Organophosphate',
        estimatedTimeOfIngestion: poison.estimatedTimeOfIngestion || 'Recent',
        routeOfExposure: poison.routeOfExposure || 'Oral Ingestion',
        containerBrought: !!poison.containerBrought,
        clinicalPresentation: poison.clinicalPresentation || {
          sludgeSigns: true,
          pupils: 'Pinpoint',
          secretions: 'Moderate',
          fasciculations: false,
          convulsions: false,
          respiratoryDepression: false,
          characteristicOdor: 'Pungent',
        },
        decontaminationActions: poison.decontaminationActions || {
          gastricLavageDone: false,
          activatedCharcoalAdministered: false,
          bodyDecontaminationWash: true,
        },
        antidotesAdministered: poison.antidotesAdministered || [],
        atropinizationStatus: poison.atropinizationStatus || {
          isAtropinized: false,
          pulseTargetAchieved: false,
          dryAxillae: false,
          pupilsDilated: false,
          chestClearOfRhonchi: false,
          systolicBpAdequate: false,
        },
        toxicologySamplesCollected: !!poison.toxicologySamplesCollected,
        samplePreservative: poison.samplePreservative || 'Saturated salt solution',
        supervisingToxicologistOrCMO: currentUser.name,
        updatedAt: new Date().toISOString(),
      };
      setPoisonCases((prev) => [savedPoison, ...prev]);
    }

    persistToSupabase('Save Toxicology Case', (client) => dbUpsertPoisonCase(client, savedPoison));
    logAuditAction('Poisoning Protocol Updated', 'POISON', savedPoison.id, `Agent: ${savedPoison.suspectedAgent}. Lavage: ${savedPoison.decontaminationActions.gastricLavageDone}`);
    return savedPoison;
  };

  const administerAntidote = (
    poisonCaseId: string,
    antidote: Omit<PoisonAntidoteAdmin, 'id' | 'administeredAt' | 'administeredBy'>
  ) => {
    const adminRecord: PoisonAntidoteAdmin = {
      id: `ant-${Date.now()}`,
      drugName: antidote.drugName,
      dose: antidote.dose,
      route: antidote.route,
      patientResponse: antidote.patientResponse,
      administeredAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      administeredBy: currentUser.name,
    };

    let updatedTox: PoisoningCase | null = null;
    setPoisonCases((prev) =>
      prev.map((p) => {
        if (p.id === poisonCaseId) {
          updatedTox = {
            ...p,
            antidotesAdministered: [adminRecord, ...p.antidotesAdministered],
            updatedAt: new Date().toISOString(),
          };
          return updatedTox;
        }
        return p;
      })
    );

    if (updatedTox) {
      const snap = updatedTox;
      persistToSupabase('Administer Antidote', (client) => dbUpsertPoisonCase(client, snap));
    }

    logAuditAction(
      'Antidote Administered',
      'POISON',
      poisonCaseId,
      `Given: ${adminRecord.drugName} ${adminRecord.dose} by ${currentUser.name}`
    );
  };

  const updateAtropinization = (poisonCaseId: string, status: PoisoningCase['atropinizationStatus']) => {
    let updatedTox: PoisoningCase | null = null;
    setPoisonCases((prev) =>
      prev.map((p) => {
        if (p.id === poisonCaseId) {
          updatedTox = {
            ...p,
            atropinizationStatus: status,
            updatedAt: new Date().toISOString(),
          };
          return updatedTox;
        }
        return p;
      })
    );

    if (updatedTox) {
      const snap = updatedTox;
      persistToSupabase('Update Atropinization Check', (client) => dbUpsertPoisonCase(client, snap));
    }

    logAuditAction(
      'Atropinization Check Updated',
      'POISON',
      poisonCaseId,
      `Pulse: ${status.pulseTargetAchieved}, Dry Axillae: ${status.dryAxillae}, Pupils: ${status.pupilsDilated}, Lungs Clear: ${status.chestClearOfRhonchi}`
    );
  };

  const initiateTransfer = (transferInput: Partial<PatientTransfer>): PatientTransfer => {
    const trfId = generateTransferId(transfers.length + 46);
    const newTransfer: PatientTransfer = {
      id: trfId,
      caseId: transferInput.caseId || 'CASE-2026-UNKNOWN',
      patientId: transferInput.patientId || 'pat-unknown',
      patientName: transferInput.patientName || 'Emergency Patient',
      originatingHospital: 'Apex City Emergency Medical Centre (ER)',
      receivingHospital: transferInput.receivingHospital || 'Tertiary Specialty Centre',
      receivingDepartment: transferInput.receivingDepartment || 'Intensive Care Directorate',
      receivingDoctorOrCoordinator: transferInput.receivingDoctorOrCoordinator || 'Duty Medical Officer',
      acceptanceConfirmed: !!transferInput.acceptanceConfirmed,
      acceptanceReferenceCode: transferInput.acceptanceReferenceCode || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      clinicalReason: transferInput.clinicalReason || 'Specialized Neuro-trauma / CT Surgery Intervention',
      summaryAtTransfer: transferInput.summaryAtTransfer || {
        triageCategory: 'ESI 1 - Resuscitation',
        gcsScore: '10/15',
        currentVitals: 'BP 110/70, HR 88, SpO2 96%',
        interventionsGiven: 'Primary emergency stabilization, IV lines, fluid resuscitation',
        airwayStatus: 'Room Air',
        ongoingInfusions: 'IV Normal Saline',
      },
      transportDetails: transferInput.transportDetails || {
        ambulanceType: 'Advanced Life Support (ALS)',
        vehicleRegNumber: 'KA-01-G-9901',
        driverOrEMTName: 'EMT Duty Crew',
        contactPhone: '+91 98800 00000',
        accompanyingStaff: currentUser.name,
        departureTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        estimatedArrival: 'In 25 minutes',
        transitChecklistPassed: true,
      },
      status: 'Initiated',
      handoverNotes: transferInput.handoverNotes || '',
      updatedAt: new Date().toISOString(),
    };

    setTransfers((prev) => [newTransfer, ...prev]);
    persistToSupabase('Initiate Patient Transfer', (client) => dbUpsertTransfer(client, newTransfer));

    // Update case status to Transferred
    if (transferInput.caseId) {
      updateCaseStatus(transferInput.caseId, 'Transferred');
    }

    logAuditAction(
      'Patient Transfer Initiated',
      'TRANSFER',
      newTransfer.id,
      `Transfer arranged to ${newTransfer.receivingHospital} via ${newTransfer.transportDetails.ambulanceType}`
    );

    return newTransfer;
  };

  const updateTransferStatus = (transferId: string, status: PatientTransfer['status'], notes?: string) => {
    let updatedTrf: PatientTransfer | null = null;
    setTransfers((prev) =>
      prev.map((t) => {
        if (t.id === transferId) {
          updatedTrf = {
            ...t,
            status,
            handoverNotes: notes ? `${t.handoverNotes || ''}\n${notes}` : t.handoverNotes,
            updatedAt: new Date().toISOString(),
          };
          return updatedTrf;
        }
        return t;
      })
    );
    if (updatedTrf) {
      const snap = updatedTrf;
      persistToSupabase('Update Transfer Status', (client) => dbUpsertTransfer(client, snap));
    }
    logAuditAction('Transfer Status Changed', 'TRANSFER', transferId, `Transfer status updated to: ${status}`);
  };

  const acknowledgeAmbulance = (ambulanceId: string) => {
    setIncomingAmbulances((prev) =>
      prev.map((a) => {
        if (a.id === ambulanceId) {
          return { ...a, acknowledgedByHospital: true, preAlertStatus: 'Arriving Soon' };
        }
        return a;
      })
    );
    logAuditAction('Ambulance Pre-Alert Acknowledged', 'SYSTEM', ambulanceId, `Incoming ambulance dispatch acknowledged by ${currentUser.name}`);
  };

  const reserveBayForAmbulance = (ambulanceId: string, bayName: string) => {
    setIncomingAmbulances((prev) =>
      prev.map((a) => {
        if (a.id === ambulanceId) {
          return { ...a, receivingBayReserved: bayName, acknowledgedByHospital: true };
        }
        return a;
      })
    );
    logAuditAction('Emergency Bay Reserved', 'SYSTEM', ambulanceId, `Reserved ${bayName} for incoming ambulance`);
  };

  const generateDocument = (docType: HospitalDocument['docType'], caseId: string): HospitalDocument => {
    const targetCase = cases.find((c) => c.id === caseId);
    const patientName = targetCase ? targetCase.patientSnapshot.name : 'Unknown Patient';
    const isUnidentified = targetCase ? targetCase.patientSnapshot.isUnidentified : false;
    const tempId = targetCase ? targetCase.patientSnapshot.tempId : undefined;

    const titles: Record<HospitalDocument['docType'], string> = {
      EMERGENCY_CASE_SHEET: `Emergency Resuscitation & Case Sheet - ${caseId}`,
      MLC_CERTIFICATE: `Provisional Medico-Legal Injury Certificate - ${caseId}`,
      POISON_PROTOCOL: `Toxicology & Poisoning Management Protocol - ${caseId}`,
      TRANSFER_SUMMARY: `Emergency Inter-Hospital Transfer Summary - ${caseId}`,
      TRIAGE_SLIP: `Acute Fast-Track Triage Summary - ${caseId}`,
      DAMA_RECORD: `Discharge Against Medical Advice (DAMA/LAMA) Legal Undertaking - ${caseId}`,
    };

    const newDoc: HospitalDocument = {
      id: `DOC-2026-${String(documents.length + 6).padStart(3, '0')}`,
      title: titles[docType],
      docType,
      caseId,
      patientId: targetCase ? targetCase.patientId : 'pat-temp',
      patientName,
      isUnidentified,
      tempId,
      author: currentUser.name,
      generatedAt: new Date().toISOString(),
      status: 'Finalized',
      summaryExcerpt: `Official medical record compiled by ${currentUser.name} (${currentUser.designation}) for ${patientName}. Contains verified clinical audit stamp.`,
    };

    setDocuments((prev) => [newDoc, ...prev]);
    persistToSupabase('Generate Clinical Document', (client) =>
      dbInsertClinicalDocument(client, newDoc, currentUser.id)
    );
    logAuditAction('Medical Document Generated', 'SYSTEM', newDoc.id, `Generated ${docType} for case ${caseId}`);
    return newDoc;
  };

  // ==========================================
  // PHASE 5: PHARMACY INVENTORY & DISPENSING ACTIONS
  // ==========================================

  const syncInventoryAlerts = (nextCatalogue: PharmacyMedicine[], nextBatches: PharmacyBatch[], todayDate: string, nowIso: string) => {
    setPatientNotifications((prev) => {
      let nextNotifs = [...prev];
      for (const med of nextCatalogue) {
        if (med.status !== 'Active') continue;
        const summary = getMedicineStockSummary(med, nextBatches, todayDate);
        if (summary.stockStatus === 'Low Stock' || summary.stockStatus === 'Out of Stock') {
          nextNotifs = appendDeduplicatedNotification(nextNotifs, {
            id: `notif-pharm-low-${med.id}-${Date.now()}`,
            patientId: 'HOSPITAL-PHARMACY',
            dedupKey: `low-stock-${med.id}-${summary.stockStatus}`,
            targetAudience: 'pharmacy',
            category: 'pharmacy',
            title:
              summary.stockStatus === 'Out of Stock'
                ? `Out of Stock Alert: ${med.genericName} ${med.strength}`
                : `Low Stock Alert: ${med.genericName} ${med.strength}`,
            message: `${med.genericName} ${med.strength} (${med.dosageForm}) has ${summary.usableQuantity} usable ${med.unitOfMeasurement.toLowerCase()} remaining (threshold: ${med.minimumStockThreshold}).`,
            timestamp: nowIso,
            isRead: false,
            priority: 'high',
          });
        }
        for (const batch of summary.nearExpiryBatches) {
          if (isBatchNearExpiry(batch.expiryDate, todayDate, 60)) {
            nextNotifs = appendDeduplicatedNotification(nextNotifs, {
              id: `notif-pharm-exp-${batch.id}-${Date.now()}`,
              patientId: 'HOSPITAL-PHARMACY',
              dedupKey: `near-expiry-${batch.id}`,
              targetAudience: 'pharmacy',
              category: 'pharmacy',
              title: `Near-Expiry Warning: ${med.genericName} (Batch ${batch.batchNumber})`,
              message: `Batch ${batch.batchNumber} of ${med.genericName} ${med.strength} (${batch.availableQuantity} ${med.unitOfMeasurement.toLowerCase()}) expires on ${batch.expiryDate}.`,
              timestamp: nowIso,
              isRead: false,
              priority: 'normal',
            });
          }
        }
      }
      persistDemoLocal('hr_patient_notifs', nextNotifs);
      return nextNotifs;
    });
  };

  const addPharmacyMedicine: AppContextType['addPharmacyMedicine'] = (input) => {
    if (!canManagePharmacyInventory(currentUser.role)) {
      return {
        success: false,
        error: 'Access Denied: Only authorised Pharmacy Staff or Hospital Administrators can add catalogue medicines.',
      };
    }
    const nowIso = new Date().toISOString();
    const res = addCatalogueMedicine(pharmacyMedicines, input, nowIso);
    if (!res.success || !res.medicine) {
      return { success: false, error: res.error };
    }
    setPharmacyMedicines(res.updatedCatalogue);
    const tx: PharmacyTransaction = {
      id: `ptx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      medicineId: res.medicine.id,
      medicineName: `${res.medicine.genericName} ${res.medicine.strength} (${res.medicine.dosageForm})`,
      transactionType: 'Catalogue Update',
      quantityDelta: 0,
      previousQuantity: 0,
      newQuantity: 0,
      timestamp: nowIso,
      staffId: currentUser.id,
      staffName: currentUser.name,
      staffRole: currentUser.role,
      reason: `Added ${res.medicine.genericName} ${res.medicine.strength} (${res.medicine.dosageForm}) to hospital formulary`,
    };
    setPharmacyTransactions((prev) => [tx, ...prev]);
    persistDemoLocal('hr_pharmacy_medicines', res.updatedCatalogue);
    const addedMed = res.medicine;
    persistToSupabase('Add Pharmacy Catalogue Medicine', (client) =>
      dbUpsertPharmacyMedicine(client, addedMed, tx)
    );
    logAuditAction(
      'Pharmacy Catalogue Medicine Added',
      'PHARMACY',
      res.medicine.id,
      `${currentUser.name} added ${res.medicine.genericName} ${res.medicine.strength} (${res.medicine.dosageForm}) [Threshold: ${res.medicine.minimumStockThreshold}]`
    );
    return { success: true, medicine: res.medicine };
  };

  const togglePharmacyMedicineStatus: AppContextType['togglePharmacyMedicineStatus'] = (medicineId) => {
    if (!canManagePharmacyInventory(currentUser.role)) {
      return {
        success: false,
        error: 'Access Denied: Only authorised Pharmacy Staff or Administrators can change formulary status.',
      };
    }
    const target = pharmacyMedicines.find((m) => m.id === medicineId);
    if (!target) return { success: false, error: 'Medicine not found.' };
    const nextStatus: PharmacyMedicine['status'] = target.status === 'Active' ? 'Inactive' : 'Active';
    const nowIso = new Date().toISOString();
    const updatedMed: PharmacyMedicine = { ...target, status: nextStatus, updatedAt: nowIso };
    const updated: PharmacyMedicine[] = pharmacyMedicines.map((m) =>
      m.id === medicineId ? updatedMed : m
    );
    setPharmacyMedicines(updated);
    const tx: PharmacyTransaction = {
      id: `ptx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      medicineId: target.id,
      medicineName: `${target.genericName} ${target.strength} (${target.dosageForm})`,
      transactionType: 'Catalogue Update',
      quantityDelta: 0,
      previousQuantity: 0,
      newQuantity: 0,
      timestamp: nowIso,
      staffId: currentUser.id,
      staffName: currentUser.name,
      staffRole: currentUser.role,
      reason: `Changed formulary status to ${nextStatus}`,
    };
    setPharmacyTransactions((prev) => [tx, ...prev]);
    persistToSupabase('Toggle Pharmacy Medicine Status', (client) =>
      dbUpsertPharmacyMedicine(client, updatedMed, tx)
    );
    logAuditAction(
      `Pharmacy Medicine Marked ${nextStatus}`,
      'PHARMACY',
      target.id,
      `${currentUser.name} updated ${target.genericName} ${target.strength} status to ${nextStatus}`
    );
    return { success: true };
  };

  const updatePharmacyMedicineThreshold: AppContextType['updatePharmacyMedicineThreshold'] = (
    medicineId,
    threshold
  ) => {
    if (!canManagePharmacyInventory(currentUser.role)) {
      return {
        success: false,
        error: 'Access Denied: Only authorised Pharmacy Staff or Administrators can update stock thresholds.',
      };
    }
    if (!Number.isFinite(threshold) || threshold < 0) {
      return { success: false, error: 'Minimum stock threshold must be zero or positive.' };
    }
    const target = pharmacyMedicines.find((m) => m.id === medicineId);
    if (!target) return { success: false, error: 'Medicine not found.' };
    const nowIso = new Date().toISOString();
    const cleanThreshold = Math.round(threshold);
    const updatedMed: PharmacyMedicine = { ...target, minimumStockThreshold: cleanThreshold, updatedAt: nowIso };
    const nextCatalogue = pharmacyMedicines.map((m) =>
      m.id === medicineId ? updatedMed : m
    );
    setPharmacyMedicines(nextCatalogue);
    syncInventoryAlerts(nextCatalogue, pharmacyBatches, nowIso.split('T')[0], nowIso);
    persistToSupabase('Update Pharmacy Stock Threshold', (client) =>
      dbUpsertPharmacyMedicine(client, updatedMed)
    );
    logAuditAction(
      'Pharmacy Minimum Threshold Updated',
      'PHARMACY',
      target.id,
      `${currentUser.name} updated low-stock threshold for ${target.genericName} ${target.strength} from ${target.minimumStockThreshold} to ${cleanThreshold}`
    );
    return { success: true };
  };

  const receivePharmacyBatchStock: AppContextType['receivePharmacyBatchStock'] = (input) => {
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.split('T')[0];
    const res = receiveNewPharmacyBatch(
      pharmacyBatches,
      pharmacyMedicines,
      input,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role },
      todayDate,
      nowIso
    );
    if (!res.success || !res.batch || !res.transaction) {
      return { success: false, error: res.error };
    }
    setPharmacyBatches(res.updatedBatches);
    setPharmacyTransactions((prev) => [res.transaction!, ...prev]);
    syncInventoryAlerts(pharmacyMedicines, res.updatedBatches, todayDate, nowIso);
    const newBatch = res.batch;
    persistToSupabase('Receive Pharmacy Batch Stock', (client) =>
      dbReceivePharmacyBatchStock(client, newBatch.id, input)
    );
    logAuditAction(
      'Pharmacy Stock Batch Received',
      'PHARMACY',
      res.batch.id,
      `${currentUser.name} received ${res.batch.availableQuantity} ${res.batch.unitOfMeasurement} of ${res.transaction.medicineName} (Batch ${res.batch.batchNumber}, Exp: ${res.batch.expiryDate})`
    );
    return { success: true, batch: res.batch };
  };

  const adjustPharmacyBatchStock: AppContextType['adjustPharmacyBatchStock'] = (input) => {
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.split('T')[0];
    const res = adjustPharmacyBatchStockRule(
      pharmacyBatches,
      pharmacyMedicines,
      input,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role },
      nowIso
    );
    if (!res.success || !res.batch || !res.transaction) {
      return { success: false, error: res.error };
    }
    setPharmacyBatches(res.updatedBatches);
    setPharmacyTransactions((prev) => [res.transaction!, ...prev]);
    syncInventoryAlerts(pharmacyMedicines, res.updatedBatches, todayDate, nowIso);
    persistToSupabase('Adjust Pharmacy Batch Stock', (client) =>
      dbAdjustPharmacyBatchStock(client, input)
    );
    logAuditAction(
      `Pharmacy ${res.transaction.transactionType}`,
      'PHARMACY',
      res.batch.id,
      `${currentUser.name} adjusted batch ${res.batch.batchNumber} (${res.transaction.medicineName}) by ${res.transaction.quantityDelta} (New Qty: ${res.transaction.newQuantity}). Reason: ${res.transaction.reason}`
    );
    return { success: true };
  };

  const dispensePrescription: AppContextType['dispensePrescription'] = (encounterId, lineInputs, notes) => {
    const targetEncounter = encounters.find((e) => e.id === encounterId);
    if (!targetEncounter) {
      return { success: false, error: 'Prescription / Clinical Encounter not found.' };
    }
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.split('T')[0];

    const res = confirmPharmacyDispensing(
      targetEncounter,
      lineInputs,
      {
        catalogue: pharmacyMedicines,
        batches: pharmacyBatches,
        dispensingRecords: pharmacyDispensingRecords,
      },
      { id: currentUser.id, name: currentUser.name, role: currentUser.role },
      todayDate,
      notes,
      nowIso
    );

    if (!res.success || !res.record) {
      return { success: false, error: res.error };
    }

    setPharmacyBatches(res.updatedBatches);
    setPharmacyDispensingRecords(res.updatedDispensingRecords);
    if (res.newTransactions.length > 0) {
      setPharmacyTransactions((prev) => [...res.newTransactions, ...prev]);
    }

    persistDemoLocal('hr_pharmacy_batches', res.updatedBatches);
    persistDemoLocal('hr_pharmacy_dispensing', res.updatedDispensingRecords);

    // Emit patient & doctor notifications based on dispensing outcome
    const unavailableItems = res.record.items.filter((it) => it.status === 'Unavailable');
    const dispensedItems = res.record.items.filter((it) => it.dispensedQuantity > 0);
    const dispensedSummary = dispensedItems
      .map((it) => `${it.requestedMedicineName} (${it.dispensedQuantity} units, Batch ${it.batchNumber})`)
      .join(', ');

    setPatientNotifications((prev) => {
      let nextNotifs = [...prev];

      if (res.record!.status === 'Fully Dispensed') {
        nextNotifs = appendDeduplicatedNotification(nextNotifs, {
          id: `notif-disp-full-${res.record!.id}`,
          patientId: targetEncounter.patientId,
          doctorId: targetEncounter.doctorId,
          encounterId: targetEncounter.id,
          dedupKey: `dispensed-full-${targetEncounter.id}-${res.record!.id}`,
          targetAudience: 'patient',
          category: 'pharmacy',
          title: `Prescription Fully Dispensed (${targetEncounter.id})`,
          message: `Hospital Pharmacy (${currentUser.name}) has dispensed your prescribed medications: ${dispensedSummary}.`,
          timestamp: nowIso,
          isRead: false,
          actionTab: 'patient-prescriptions',
          priority: 'high',
        });
      } else if (res.record!.status === 'Partially Dispensed') {
        nextNotifs = appendDeduplicatedNotification(nextNotifs, {
          id: `notif-disp-part-${res.record!.id}`,
          patientId: targetEncounter.patientId,
          doctorId: targetEncounter.doctorId,
          encounterId: targetEncounter.id,
          dedupKey: `dispensed-partial-${targetEncounter.id}-${res.record!.id}`,
          targetAudience: 'patient',
          category: 'pharmacy',
          title: `Prescription Partially Dispensed (${targetEncounter.id})`,
          message: `Hospital Pharmacy partially dispensed ${targetEncounter.id}: ${
            dispensedSummary || 'Partial items issued'
          }. Check remaining balance in Prescriptions.`,
          timestamp: nowIso,
          isRead: false,
          actionTab: 'patient-prescriptions',
          priority: 'high',
        });
      }

      if (unavailableItems.length > 0) {
        const unavailList = unavailableItems.map((it) => it.requestedMedicineName).join(', ');
        nextNotifs = appendDeduplicatedNotification(nextNotifs, {
          id: `notif-disp-unavail-${res.record!.id}`,
          patientId: targetEncounter.patientId,
          doctorId: targetEncounter.doctorId,
          encounterId: targetEncounter.id,
          dedupKey: `dispensed-unavail-${targetEncounter.id}-${res.record!.id}`,
          targetAudience: 'both',
          category: 'pharmacy',
          title: `Medicine Unavailable During Dispensing (${targetEncounter.id})`,
          message: `Pharmacy marked ${unavailList} as Unavailable for ${targetEncounter.patientName} (Prescription ${targetEncounter.id}). Please review clinical alternatives or external fulfillment.`,
          timestamp: nowIso,
          isRead: false,
          actionTab: 'patient-prescriptions',
          priority: 'high',
        });
      }

      persistDemoLocal('hr_patient_notifs', nextNotifs);
      return nextNotifs;
    });

    syncInventoryAlerts(pharmacyMedicines, res.updatedBatches, todayDate, nowIso);

    const recordSnap = res.record;
    persistToSupabase('Dispense Prescription (Transactional RPC)', (client) =>
      dbDispensePrescription(client, recordSnap.id, encounterId, lineInputs, notes)
    );

    logAuditAction(
      `Pharmacy Prescription ${res.record.status}`,
      'PHARMACY',
      targetEncounter.id,
      `${currentUser.name} recorded ${res.record.status} (${res.record.id}) for ${targetEncounter.patientName}. Items processed: ${res.record.items.length}`
    );

    return { success: true, record: res.record };
  };

  const createPharmacyReorderRequest: AppContextType['createPharmacyReorderRequest'] = (input) => {
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.split('T')[0];
    const res = createLocalReorderRequest(
      pharmacyMedicines,
      pharmacyBatches,
      input,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role },
      todayDate,
      nowIso
    );
    if (!res.success || !res.request) {
      return { success: false, error: res.error };
    }
    setPharmacyReorderRequests((prev) => [res.request!, ...prev]);
    const reqSnap = res.request;
    persistToSupabase('Create Pharmacy Reorder Request', (client) =>
      dbUpsertPharmacyReorderRequest(client, reqSnap)
    );
    logAuditAction(
      'Pharmacy Local Reorder Request Created',
      'PHARMACY',
      res.request.id,
      `${currentUser.name} created local ${res.request.status} for ${res.request.genericName} ${res.request.strength} (${res.request.requestedQuantity} units, Supplier: ${res.request.supplierName})`
    );
    return { success: true, request: res.request };
  };

  const updatePharmacyReorderStatus: AppContextType['updatePharmacyReorderStatus'] = (requestId, status) => {
    if (!canManagePharmacyInventory(currentUser.role)) {
      return {
        success: false,
        error: 'Access Denied: Only authorised Pharmacy Staff or Administrators can update purchase requests.',
      };
    }
    const target = pharmacyReorderRequests.find((r) => r.id === requestId);
    if (!target) return { success: false, error: 'Reorder request not found.' };
    const updatedReq: PharmacyReorderRequest = { ...target, status };
    setPharmacyReorderRequests((prev) =>
      prev.map((r) => (r.id === requestId ? updatedReq : r))
    );
    persistToSupabase('Update Pharmacy Reorder Status', (client) =>
      dbUpsertPharmacyReorderRequest(client, updatedReq)
    );
    logAuditAction(
      'Pharmacy Reorder Request Status Updated',
      'PHARMACY',
      requestId,
      `${currentUser.name} updated local purchase request ${requestId} (${target.genericName}) to ${status}`
    );
    return { success: true };
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        allStaff,
        activeTab,
        setActiveTab,
        switchRole,
        switchUser,

        patients,
        cases,
        mlcCases,
        poisonCases,
        transfers,
        documents,
        auditLogs,
        incomingAmbulances,

        appointments,
        encounters,
        followUps,
        labReports,
        medicationActivities,

        registerPatient,
        reconcilePatient,
        updatePatientPhoto,

        bookAppointment,
        updateAppointmentStatus,
        updateAppointmentTriageStatus,
        startConsultation,
        saveClinicalEncounter,
        activateDraftPrescription,
        discontinuePrescription,
        recordPatientMedicationActivity,
        completeFollowUp,
        acknowledgeLabReport,

        createEmergencyCase,
        updateCaseStatus,
        updateCaseVitals,
        addClinicalNote,

        saveMlcDraft,
        signAndSealMlc,
        markPoliceIntimation,

        savePoisonCase,
        administerAntidote,
        updateAtropinization,

        initiateTransfer,
        updateTransferStatus,

        acknowledgeAmbulance,
        reserveBayForAmbulance,

        generateDocument,

        selectedCaseId,
        setSelectedCaseId,
        selectedMlcId,
        setSelectedMlcId,
        selectedPoisonId,
        setSelectedPoisonId,
        selectedTransferId,
        setSelectedTransferId,
        selectedDocId,
        setSelectedDocId,
        selectedAppointmentId,
        setSelectedAppointmentId,
        editingEncounter,
        setEditingEncounter,

        isNewRegistrationOpen,
        setIsNewRegistrationOpen,
        isNewCaseOpen,
        setIsNewCaseOpen,
        isNewAppointmentOpen,
        setIsNewAppointmentOpen,
        isConsultationModalOpen,
        setIsConsultationModalOpen,
        isFirebaseArchitectureOpen,
        setIsFirebaseArchitectureOpen,

        // Patient Portal State
        portalMode,
        setPortalMode,
        activePatientId,
        setActivePatientId,
        activePatient,

        // Patient Portal Collections
        doctorsDirectory,
        patientDocuments,
        conversations,
        patientMessages,
        patientNotifications,
        privacySettings,
        accessAuditLogs,
        selectedConversationId,
        setSelectedConversationId,

        // Patient Portal Actions
        requestPatientAppointment,
        acceptPatientAppointmentRequest,
        declinePatientAppointmentRequest,
        proposeDoctorReschedule,
        respondToDoctorRescheduleProposal,
        rescheduleAppointment,
        cancelAppointment,
        uploadPatientDocument,
        startOrSelectConversation,
        sendPatientMessage,
        sendDoctorReply,
        markConversationRead,
        updateConversationStatus,
        markNotificationRead,
        markAllNotificationsRead,
        updatePatientProfile,
        updatePrivacySettings,
        recordEmergencyAccess,

        // Patient Portal Modals
        isPatientBookingModalOpen,
        setIsPatientBookingModalOpen,
        selectedBookingDoctor,
        setSelectedBookingDoctor,
        isPatientUploadDocOpen,
        setIsPatientUploadDocOpen,
        previewDocument,
        setPreviewDocument,
        previewLabReport,
        setPreviewLabReport,
        previewEncounter,
        setPreviewEncounter,

        pharmacyMedicines,
        pharmacyBatches,
        pharmacyTransactions,
        pharmacyDispensingRecords,
        pharmacyReorderRequests,
        addPharmacyMedicine,
        togglePharmacyMedicineStatus,
        updatePharmacyMedicineThreshold,
        receivePharmacyBatchStock,
        adjustPharmacyBatchStock,
        dispensePrescription,
        createPharmacyReorderRequest,
        updatePharmacyReorderStatus,

        logAuditAction,

        dbSyncStatus,
        dbSyncError,
        lastDbSyncedAt,
        schemaAuditReport,
        isSchemaAuditRunning,
        runLiveSchemaAudit,
        refreshDatabaseWorkspace,
        clearDbSyncError,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
