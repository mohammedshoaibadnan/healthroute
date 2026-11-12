import React, { createContext, useContext, useState, useEffect } from 'react';
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
  INITIAL_PATIENT_MESSAGES,
  INITIAL_PATIENT_NOTIFICATIONS,
  INITIAL_PRIVACY_SETTINGS,
  INITIAL_ACCESS_AUDIT_LOGS,
} from '../data/mockData';
import {
  generateTempPatientId,
  generateMlcId,
  generatePoisonCaseId,
  generateTransferId,
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
  PatientMessage,
  PatientNotification,
  PrivacyConsentSettings,
  AccessAuditRecord,
} from '../types';

export type NavigationTab = 
  | 'overview'
  | 'patients'
  | 'appointments'
  | 'clinical'
  | 'records'
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
  completeFollowUp: (fuId: string) => void;

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

  // Patient Portal Collections
  doctorsDirectory: DoctorDirectoryItem[];
  patientDocuments: PatientDocument[];
  patientMessages: PatientMessage[];
  patientNotifications: PatientNotification[];
  privacySettings: PrivacyConsentSettings;
  accessAuditLogs: AccessAuditRecord[];

  // Patient Portal Actions
  requestPatientAppointment: (data: Partial<Appointment>) => Appointment;
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
  sendPatientMessage: (text: string, doctorId: string, doctorName: string, category?: PatientMessage['category']) => void;
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

  // Audit
  logAuditAction: (action: string, targetType: AuditLog['targetType'], targetId: string, details: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<StaffUser>(INITIAL_STAFF[0]);
  const [allStaff, setAllStaff] = useState<StaffUser[]>(INITIAL_STAFF);
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');

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
            return {
              ...a,
              patientPhotoUrl: a.patientPhotoUrl || init?.patientPhotoUrl,
              doctorPhotoUrl: a.doctorPhotoUrl || init?.doctorPhotoUrl,
              triageStatus: a.triageStatus || init?.triageStatus,
              vitalsSnapshot: a.vitalsSnapshot || init?.vitalsSnapshot,
            };
          });
          // Append any missing initial appointments (such as newly added APT-2026-007)
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
    return saved ? JSON.parse(saved) : INITIAL_ENCOUNTERS;
  });

  const [followUps, setFollowUps] = useState<FollowUpReminder[]>(() => {
    const saved = localStorage.getItem('hr_followups');
    return saved ? JSON.parse(saved) : INITIAL_FOLLOWUPS;
  });

  const [labReports, setLabReports] = useState<DiagnosticLabReport[]>(() => {
    const saved = localStorage.getItem('hr_labs');
    return saved ? JSON.parse(saved) : INITIAL_LAB_REPORTS;
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

  const [patientMessages, setPatientMessages] = useState<PatientMessage[]>(() => {
    const saved = localStorage.getItem('hr_patient_messages');
    return saved ? JSON.parse(saved) : INITIAL_PATIENT_MESSAGES;
  });

  const [patientNotifications, setPatientNotifications] = useState<PatientNotification[]>(() => {
    const saved = localStorage.getItem('hr_patient_notifs');
    return saved ? JSON.parse(saved) : INITIAL_PATIENT_NOTIFICATIONS;
  });

  const [privacySettings, setPrivacySettings] = useState<PrivacyConsentSettings>(() => {
    const saved = localStorage.getItem('hr_privacy_settings');
    return saved ? JSON.parse(saved) : INITIAL_PRIVACY_SETTINGS;
  });

  const [accessAuditLogs, setAccessAuditLogs] = useState<AccessAuditRecord[]>(() => {
    const saved = localStorage.getItem('hr_access_audits');
    return saved ? JSON.parse(saved) : INITIAL_ACCESS_AUDIT_LOGS;
  });

  // Patient Modals
  const [isPatientBookingModalOpen, setIsPatientBookingModalOpen] = useState(false);
  const [selectedBookingDoctor, setSelectedBookingDoctor] = useState<DoctorDirectoryItem | null>(null);
  const [isPatientUploadDocOpen, setIsPatientUploadDocOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<PatientDocument | null>(null);
  const [previewLabReport, setPreviewLabReport] = useState<DiagnosticLabReport | null>(null);
  const [previewEncounter, setPreviewEncounter] = useState<ClinicalEncounter | null>(null);

  const activePatient = patients.find((p) => p.id === activePatientId) || patients[0];

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

  // Save to local storage for realistic state retention
  useEffect(() => {
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
      localStorage.setItem('hr_patient_messages', JSON.stringify(patientMessages));
      localStorage.setItem('hr_patient_notifs', JSON.stringify(patientNotifications));
      localStorage.setItem('hr_privacy_settings', JSON.stringify(privacySettings));
      localStorage.setItem('hr_access_audits', JSON.stringify(accessAuditLogs));
    } catch {
      // ignore
    }
  }, [
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
    patientMessages,
    patientNotifications,
    privacySettings,
    accessAuditLogs,
  ]);

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
  };

  const switchRole = (role: UserRole) => {
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
    const match = allStaff.find((s) => s.id === staffId);
    if (match) {
      setCurrentUser(match);
      logAuditAction('User Switch', 'STAFF', match.id, `Active session user changed to ${match.name} (${match.role})`);
    }
  };

  const requestPatientAppointment = (data: Partial<Appointment>): Appointment => {
    const nextSeq = appointments.length + 1;
    const aptDate = data.date || new Date().toISOString().split('T')[0];
    const targetPat = activePatient;
    const targetDoc = doctorsDirectory.find((d) => d.id === data.doctorId) || doctorsDirectory[0];

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
      doctorPhotoUrl: targetDoc.photoUrl,
      department: targetDoc.department,
      date: aptDate,
      timeSlot: data.timeSlot || '10:00 AM',
      tokenNumber: appointments.filter((a) => a.date === aptDate).length + 1,
      type: data.type || 'New Consultation',
      status: 'Requested',
      chiefComplaint: data.chiefComplaint || 'Consultation request via patient portal',
      consultationMode: data.consultationMode || 'In-Person OPD',
      hospitalName: targetDoc.hospitalAffiliation,
      roomNo: 'OPD Consultation Room',
      requestedByPatient: true,
      createdAt: new Date().toISOString(),
    };

    setAppointments((prev) => [newApt, ...prev]);

    // Add notification to patient
    const notif: PatientNotification = {
      id: `notif-${Date.now()}`,
      patientId: targetPat.id,
      category: 'appointment',
      title: 'Appointment Request Submitted',
      message: `Your appointment request for ${newApt.date} at ${newApt.timeSlot} with ${newApt.doctorName} has been submitted for hospital confirmation.`,
      timestamp: new Date().toISOString(),
      isRead: false,
      actionTab: 'patient-appointments',
      priority: 'high',
    };
    setPatientNotifications((prev) => [notif, ...prev]);

    logAuditAction(
      'Patient Appointment Requested',
      'PATIENT',
      targetPat.id,
      `Patient requested appointment ${newApt.id} with ${newApt.doctorName} for ${newApt.date} (${newApt.timeSlot})`
    );

    return newApt;
  };

  const rescheduleAppointment = (aptId: string, newDate: string, newTimeSlot: string, reason?: string) => {
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === aptId
          ? {
              ...a,
              date: newDate,
              timeSlot: newTimeSlot,
              status: 'Rescheduled',
              notes: reason ? `${a.notes ? a.notes + ' | ' : ''}Rescheduled: ${reason}` : a.notes,
            }
          : a
      )
    );

    const notif: PatientNotification = {
      id: `notif-${Date.now()}`,
      patientId: activePatientId,
      category: 'appointment',
      title: 'Appointment Rescheduled',
      message: `Appointment ${aptId} has been rescheduled to ${newDate} at ${newTimeSlot}.`,
      timestamp: new Date().toISOString(),
      isRead: false,
      actionTab: 'patient-appointments',
      priority: 'normal',
    };
    setPatientNotifications((prev) => [notif, ...prev]);

    logAuditAction('Appointment Rescheduled', 'PATIENT', aptId, `Rescheduled to ${newDate} at ${newTimeSlot}. Reason: ${reason || 'Patient request'}`);
  };

  const cancelAppointment = (aptId: string, reason: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === aptId ? { ...a, status: 'Cancelled', cancellationReason: reason } : a))
    );

    const notif: PatientNotification = {
      id: `notif-${Date.now()}`,
      patientId: activePatientId,
      category: 'appointment',
      title: 'Appointment Cancelled',
      message: `Appointment ${aptId} was cancelled. Reason: ${reason}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      actionTab: 'patient-appointments',
      priority: 'normal',
    };
    setPatientNotifications((prev) => [notif, ...prev]);

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

    logAuditAction('Patient Document Uploaded', 'PATIENT', newDoc.id, `Uploaded: ${newDoc.title} (${newDoc.category})`);
    return newDoc;
  };

  const sendPatientMessage = (text: string, doctorId: string, doctorName: string, category?: PatientMessage['category']) => {
    const docItem = doctorsDirectory.find((d) => d.id === doctorId);
    const userMsg: PatientMessage = {
      id: `msg-${Date.now()}`,
      patientId: activePatientId,
      doctorId,
      doctorName,
      doctorSpecialty: docItem?.specialty || 'Consultant Physician',
      doctorPhotoUrl: docItem?.photoUrl,
      sender: 'patient',
      text,
      timestamp: new Date().toISOString(),
      isRead: true,
      category: category || 'General Query',
    };

    setPatientMessages((prev) => [...prev, userMsg]);
    logAuditAction('Patient Sent Clinical Message', 'PATIENT', activePatientId, `Message sent to ${doctorName}: "${text.slice(0, 50)}..."`);

    // Simulated doctor response after 2 seconds
    setTimeout(() => {
      const replyMsg: PatientMessage = {
        id: `msg-${Date.now() + 1}`,
        patientId: activePatientId,
        doctorId,
        doctorName,
        doctorSpecialty: docItem?.specialty || 'Consultant Physician',
        doctorPhotoUrl: docItem?.photoUrl,
        sender: 'doctor',
        text: `Thank you for the update, Mr. ${activePatient.name.split(' ')[0]}. I have reviewed your message regarding "${text.slice(0, 35)}...". Please continue your prescribed dosage and keep monitoring your morning vitals. We will review this during your upcoming consultation.`,
        timestamp: new Date().toISOString(),
        isRead: false,
        category: category || 'General Query',
      };
      setPatientMessages((prev) => [...prev, replyMsg]);
      setPatientNotifications((prev) => [
        {
          id: `notif-${Date.now() + 2}`,
          patientId: activePatientId,
          category: 'reminder',
          title: `New Message from ${doctorName}`,
          message: `${doctorName} replied to your query.`,
          timestamp: new Date().toISOString(),
          isRead: false,
          actionTab: 'patient-messages',
          priority: 'normal',
        },
        ...prev,
      ]);
    }, 2000);
  };

  const markNotificationRead = (notifId: string) => {
    setPatientNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setPatientNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
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
    logAuditAction('Patient Profile Updated', 'PATIENT', patientId, 'Updated self-reported contact, address, and emergency details');
  };

  const updatePrivacySettings = (updates: Partial<PrivacyConsentSettings>) => {
    setPrivacySettings((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('hr_privacy_settings', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    logAuditAction('Privacy & Consent Updated', 'PATIENT', activePatientId, 'Patient modified consent and information sharing permissions');
  };

  const recordEmergencyAccess = (purpose: string) => {
    const accessRec: AccessAuditRecord = {
      id: `acc-${Date.now()}`,
      accessorName: currentUser.name,
      accessorRole: currentUser.designation,
      department: currentUser.department,
      timestamp: new Date().toLocaleString(),
      purpose,
      action: 'Accessed Emergency Health Summary & Critical Allergies Card',
    };
    setAccessAuditLogs((prev) => [accessRec, ...prev]);
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

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === patientId) {
          return {
            ...p,
            isUnidentified: false,
            name: permanentDetails.name,
            contactNumber: permanentDetails.contactNumber,
            address: permanentDetails.address || p.address,
            nationalIdPlaceholder: permanentDetails.nationalId,
            abhaId: permanentDetails.abhaId,
            permanentMrn: newMrn,
          };
        }
        return p;
      })
    );

    // Also update snapshot in active cases
    setCases((prev) =>
      prev.map((c) => {
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
          };
        }
        return c;
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

    const newApt: Appointment = {
      id: `APT-2026-${String(nextSeq).padStart(3, '0')}`,
      patientId: data.patientId || 'pat-known-01',
      patientName: data.patientName || 'Consultation Patient',
      patientAge: data.patientAge || 42,
      patientGender: data.patientGender || 'Other',
      patientPhone: data.patientPhone || '+91 98860 00000',
      patientPhotoUrl: data.patientPhotoUrl || matchedPat?.photoUrl,
      doctorId: data.doctorId || currentUser.id,
      doctorName: data.doctorName || currentUser.name,
      doctorPhotoUrl: data.doctorPhotoUrl || currentUser.photoUrl,
      department: data.department || currentUser.department,
      date: aptDate,
      timeSlot: data.timeSlot || '10:00 AM',
      tokenNumber: todayCount + 1,
      type: data.type || 'New Consultation',
      status: 'Scheduled',
      chiefComplaint: data.chiefComplaint || 'General clinical review & health assessment',
      roomNo: data.roomNo || 'OPD Room 204',
      vitalsSnapshot: data.vitalsSnapshot,
      createdAt: new Date().toISOString(),
    };

    setAppointments((prev) => [newApt, ...prev]);
    logAuditAction(
      'Appointment Scheduled',
      'PATIENT',
      newApt.patientId,
      `Booked ${newApt.type} token #${newApt.tokenNumber} at ${newApt.timeSlot} for ${newApt.patientName}`
    );
    return newApt;
  };

  const updateAppointmentStatus = (aptId: string, status: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === aptId ? { ...a, status } : a))
    );
    logAuditAction('Appointment Status Transition', 'PATIENT', aptId, `Status transitioned to: ${status}`);
  };

  const updateAppointmentTriageStatus = (aptId: string, triageStatus: PatientTriageStatus) => {
    setAppointments((prev) => {
      const updated = prev.map((a) => (a.id === aptId ? { ...a, triageStatus } : a));
      localStorage.setItem('hr_appointments', JSON.stringify(updated));
      return updated;
    });
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
    setAppointments((prev) =>
      prev.map((a) => (a.id === aptId ? { ...a, status: 'In Consultation' } : a))
    );
    setIsConsultationModalOpen(true);
    logAuditAction('Consultation Started', 'PATIENT', aptId, `Started active clinical consultation for appointment ${aptId}`);
  };

  const saveClinicalEncounter = (enc: Partial<ClinicalEncounter>): ClinicalEncounter => {
    const existingIndex = encounters.findIndex((e) => e.id === enc.id);
    let saved: ClinicalEncounter;

    if (existingIndex >= 0) {
      saved = {
        ...encounters[existingIndex],
        ...enc,
        updatedAt: new Date().toISOString(),
      } as ClinicalEncounter;

      setEncounters((prev) => {
        const next = [...prev];
        next[existingIndex] = saved;
        return next;
      });
    } else {
      const nextSeq = encounters.length + 1;
      saved = {
        id: enc.id || `ENC-2026-${String(nextSeq).padStart(3, '0')}`,
        appointmentId: enc.appointmentId,
        patientId: enc.patientId || 'pat-known-01',
        patientName: enc.patientName || 'Consultation Patient',
        doctorId: currentUser.id,
        doctorName: currentUser.name,
        department: currentUser.department,
        date: enc.date || new Date().toISOString().split('T')[0],
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
          recordedAt: new Date().toISOString(),
        },
        assessmentDiagnosis: enc.assessmentDiagnosis || 'Clinical Assessment Completed',
        prescriptions: enc.prescriptions || [],
        orderedInvestigations: enc.orderedInvestigations || [],
        followUpDate: enc.followUpDate,
        clinicalAdvice: enc.clinicalAdvice || '',
        status: enc.status || 'Finalized',
        updatedAt: new Date().toISOString(),
      };
      setEncounters((prev) => [saved, ...prev]);
    }

    // If an appointment was linked, mark it completed
    if (saved.appointmentId) {
      updateAppointmentStatus(saved.appointmentId, 'Completed');
    }

    logAuditAction(
      'Clinical Encounter Recorded',
      'PATIENT',
      saved.patientId,
      `Diagnosis: ${saved.assessmentDiagnosis}. Prescriptions: ${saved.prescriptions.length} items.`
    );

    return saved;
  };

  const completeFollowUp = (fuId: string) => {
    setFollowUps((prev) =>
      prev.map((f) => (f.id === fuId ? { ...f, status: 'completed' } : f))
    );
    logAuditAction('Follow-up Reminder Completed', 'PATIENT', fuId, `Marked reminder as completed by ${currentUser.name}`);
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
      setPoisonCases((prev) => [initialTox, ...prev]);
    }

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

    logAuditAction('MLC Record Saved', 'MLC', savedMlc.id, `Status: ${savedMlc.reviewStatus}. PS: ${savedMlc.policeStation}`);
    return savedMlc;
  };

  const signAndSealMlc = (mlcId: string): boolean => {
    if (currentUser.role !== 'cmo' && currentUser.role !== 'doctor' && currentUser.role !== 'admin') {
      alert('Unauthorized: Only a Casualty Medical Officer (CMO) or Consultant Physician may sign and seal official MLC documents.');
      return false;
    }

    setMlcCases((prev) =>
      prev.map((m) => {
        if (m.id === mlcId) {
          return {
            ...m,
            reviewStatus: 'Signed & Sealed',
            cmoName: currentUser.name,
            cmoSignedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
        return m;
      })
    );

    logAuditAction(
      'MLC Signed and Sealed',
      'MLC',
      mlcId,
      `Formally validated, signed and hospital wax-seal authenticated by ${currentUser.name} (${currentUser.designation})`
    );
    return true;
  };

  const markPoliceIntimation = (mlcId: string, stationDiaryNo?: string) => {
    setMlcCases((prev) =>
      prev.map((m) => {
        if (m.id === mlcId) {
          return {
            ...m,
            intimationSentToPolice: true,
            policeIntimationDate: new Date().toISOString(),
            firOrGdNumber: stationDiaryNo || m.firOrGdNumber || 'Station Diary Ack Pending',
            updatedAt: new Date().toISOString(),
          };
        }
        return m;
      })
    );
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

    setPoisonCases((prev) =>
      prev.map((p) => {
        if (p.id === poisonCaseId) {
          return {
            ...p,
            antidotesAdministered: [adminRecord, ...p.antidotesAdministered],
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );

    logAuditAction(
      'Antidote Administered',
      'POISON',
      poisonCaseId,
      `Given: ${adminRecord.drugName} ${adminRecord.dose} by ${currentUser.name}`
    );
  };

  const updateAtropinization = (poisonCaseId: string, status: PoisoningCase['atropinizationStatus']) => {
    setPoisonCases((prev) =>
      prev.map((p) => {
        if (p.id === poisonCaseId) {
          return {
            ...p,
            atropinizationStatus: status,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );

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
    setTransfers((prev) =>
      prev.map((t) => {
        if (t.id === transferId) {
          return {
            ...t,
            status,
            handoverNotes: notes ? `${t.handoverNotes || ''}\n${notes}` : t.handoverNotes,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );
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
    logAuditAction('Medical Document Generated', 'SYSTEM', newDoc.id, `Generated ${docType} for case ${caseId}`);
    return newDoc;
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

        registerPatient,
        reconcilePatient,
        updatePatientPhoto,

        bookAppointment,
        updateAppointmentStatus,
        updateAppointmentTriageStatus,
        startConsultation,
        saveClinicalEncounter,
        completeFollowUp,

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
        patientMessages,
        patientNotifications,
        privacySettings,
        accessAuditLogs,

        // Patient Portal Actions
        requestPatientAppointment,
        rescheduleAppointment,
        cancelAppointment,
        uploadPatientDocument,
        sendPatientMessage,
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

        logAuditAction,
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
