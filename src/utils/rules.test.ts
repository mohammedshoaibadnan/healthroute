import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateTempPatientId,
  generateMlcId,
  evaluateTriageLevel,
  validateMLCRequirements,
  evaluateAtropinizationProgress,
  filterEmergencyCases,
  resolvePatientTriageStatus,
  getTriageBadgeConfig,
  filterPatientAppointments,
  filterHospitalAppointments,
  getAppointmentStatusBadge,
  filterPatientDocuments,
  filterDoctorDirectory,
  isClinicianVerifiedRecord,
  validateAppointmentRequestInput,
  canManageAppointmentRequest,
  acceptAppointmentRequest,
  declineAppointmentRequest,
  proposeAppointmentReschedule,
  respondToRescheduleProposal,
  normalizePrescriptionItems,
  getPatientPrescriptions,
  derivePatientMedicationRegimen,
  discontinuePrescriptionInEncounter,
  createPatientMedicationActivity,
  buildConversationId,
  canAccessConversation,
  canDoctorReplyToConversation,
  getVisibleConversationsForPatient,
  getVisibleConversationsForStaff,
  getConversationMessages,
  isConversationAwaitingDoctorReply,
  getUnreadMessageCountForConversation,
  markConversationMessagesAsRead,
  createOrUpdateConversationAndMessage,
  getPatientConnectedDoctors,
  canViewPharmacyDashboard,
  canManagePharmacyInventory,
  canDispenseMedications,
  matchPrescriptionItemToCatalogue,
  getMedicineStockSummary,
  addCatalogueMedicine,
  receiveNewPharmacyBatch,
  adjustPharmacyBatchStock,
  checkMedicineAvailabilityForDoctor,
  getPrescriptionDispensingSummary,
  confirmPharmacyDispensing,
  createLocalReorderRequest,
  appendDeduplicatedNotification,
  resolvePatientPrivacySettings,
  updatePatientPrivacySettingsMap,
  normalizeAccessAuditRecords,
  filterAccessAuditsForPatient,
  validateSupabaseEnvSecurity,
  resolveServerAuthenticatedIdentity,
  enforceSessionAuthorityBoundary,
  planDeterministicBatchLockOrder,
  synchronizeReconciledPatientSnapshots,
} from './rules';
import fs from 'node:fs';
import path from 'node:path';
import {
  EmergencyCase,
  MedicoLegalCase,
  AppointmentStatus,
  Appointment,
  ClinicalEncounter,
  PatientNotification,
} from '../types';
import {
  INITIAL_STAFF,
  INITIAL_DOCTORS_DIRECTORY,
  INITIAL_APPOINTMENTS,
  INITIAL_CONVERSATIONS,
  INITIAL_PATIENT_MESSAGES,
  INITIAL_PHARMACY_MEDICINES,
  INITIAL_PHARMACY_BATCHES,
  INITIAL_ENCOUNTERS,
  INITIAL_PHARMACY_DISPENSING_RECORDS,
  INITIAL_PRIVACY_SETTINGS,
  INITIAL_PRIVACY_SETTINGS_BY_PATIENT,
  INITIAL_ACCESS_AUDIT_LOGS,
  INITIAL_PATIENTS,
  INITIAL_CASES,
  INITIAL_MLCS as INITIAL_MLC_CASES,
  INITIAL_POISON_CASES,
  INITIAL_TRANSFERS,
  INITIAL_DOCUMENTS,
  INITIAL_PATIENT_DOCUMENTS as INITIAL_PATIENT_PORTAL_DOCUMENTS,
  INITIAL_PATIENT_NOTIFICATIONS as INITIAL_NOTIFICATIONS,
  INITIAL_PHARMACY_TRANSACTIONS,
  INITIAL_PHARMACY_REORDER_REQUESTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_MEDICATION_ACTIVITIES,
  INITIAL_FOLLOWUPS as INITIAL_FOLLOW_UPS,
  INITIAL_LAB_REPORTS,
} from '../data/mockData';
import {
  ALL_SUPABASE_TABLES,
  ALL_SUPABASE_RPCS,
  classifySupabaseError,
  mapStaffRowToStaffUser,
  mapStaffRowToDoctorDirectoryItem,
  mapPatientRowToPatient,
  mapPatientToDbRow,
  mapPrivacyRowToSettings,
  mapPrivacySettingsToDbRow,
  mapAccessAuditRowToRecord,
  mapAppointmentRowToAppointment,
  mapAppointmentToDbRow,
  mapEncounterRowToClinicalEncounter,
  mapClinicalEncounterToDbRows,
  mapMedicationActivityRow,
  mapMedicationActivityToDbRow,
  mapFollowUpRow,
  mapLabReportRow,
  mapEmergencyCaseRow,
  mapEmergencyCaseToDbRow,
  mapMlcRow,
  mapMlcToDbRow,
  mapPoisonCaseRow,
  mapPoisonCaseToDbRow,
  mapTransferRow,
  mapTransferToDbRow,
  mapClinicalDocumentRow,
  mapClinicalDocumentToDbRow,
  mapPatientPortalDocumentRow,
  mapPatientPortalDocumentToDbRow,
  mapConversationRow,
  mapConversationToDbRow,
  mapPatientMessageRow,
  mapPatientMessageToDbRow,
  mapNotificationRow,
  mapNotificationToDbRow,
  mapPharmacyMedicineRow,
  mapPharmacyMedicineToDbRow,
  mapPharmacyBatchRow,
  mapPharmacyDispensingRow,
  mapPharmacyTransactionRow,
  mapPharmacyReorderRow,
  mapPharmacyReorderToDbRow,
  mapAuditLogRow,
  mapAuditLogToDbRow,
} from './databaseMappers';

test('generateTempPatientId formats properly with zero-padded sequences', () => {
  assert.equal(generateTempPatientId(1, 2026), 'TEMP-ER-2026-0001');
  assert.equal(generateTempPatientId(842, 2026), 'TEMP-ER-2026-0842');
  assert.equal(generateMlcId(15, 2026), 'MLC-2026-0015');
});

test('evaluateTriageLevel assigns RED level for critical physiological values', () => {
  // Severe hypoxia
  const criticalSpo2 = evaluateTriageLevel({ spo2: 82, gcs: 14, pulse: 80, rr: 20 }, 'Breathlessness');
  assert.equal(criticalSpo2.triageLevel, 'RED');
  assert.equal(criticalSpo2.esiScore, 1);

  // Severe altered sensorium (GCS 7)
  const lowGcs = evaluateTriageLevel({ spo2: 98, gcs: 7, pulse: 70, rr: 14 }, 'Unconscious');
  assert.equal(lowGcs.triageLevel, 'RED');
  assert.equal(lowGcs.esiScore, 1);

  // Cardiac arrest flag
  const arrest = evaluateTriageLevel({}, 'Cardiac Arrest', true);
  assert.equal(arrest.triageLevel, 'RED');
  assert.equal(arrest.esiScore, 1);
});

test('evaluateTriageLevel assigns YELLOW for urgent distress', () => {
  const urgent = evaluateTriageLevel({ spo2: 96, gcs: 15, pulse: 110, painScore: 8, rr: 22 }, 'Severe abdominal pain');
  assert.equal(urgent.triageLevel, 'YELLOW');
  assert.equal(urgent.esiScore, 3);
});

test('evaluateTriageLevel assigns GREEN for stable vital parameters', () => {
  const green = evaluateTriageLevel({ spo2: 99, gcs: 15, pulse: 72, painScore: 2, rr: 16 }, 'Minor wrist sprain');
  assert.equal(green.triageLevel, 'GREEN');
  assert.equal(green.esiScore, 4);
});

test('validateMLCRequirements detects missing police station and disclaimer', () => {
  const incompleteMLC: Partial<MedicoLegalCase> = {
    policeStation: '',
    broughtByName: 'Constable Sharma',
    injuryClassification: 'Grievous',
    wounds: [
      {
        id: 'w1',
        location: 'Right Forehead',
        type: 'Laceration',
        dimensions: '4cm x 1cm',
        margins: 'Irregular',
        ageOfInjuryProvisional: 'Fresh',
      },
    ],
    legalDisclaimerAcknowledged: false,
  };

  const validation = validateMLCRequirements(incompleteMLC);
  assert.equal(validation.isValid, false);
  assert.ok(validation.missingFields.some((f) => f.includes('Police Station')));
  assert.ok(validation.missingFields.some((f) => f.includes('Legal Disclaimer')));
});

test('evaluateAtropinizationProgress calculates completion score accurately', () => {
  const partial = {
    isAtropinized: false,
    pulseTargetAchieved: true,
    dryAxillae: true,
    pupilsDilated: true,
    chestClearOfRhonchi: false,
    systolicBpAdequate: true,
  };

  const result = evaluateAtropinizationProgress(partial);
  assert.equal(result.isFullyAtropinized, false);
  assert.equal(result.satisfiedCount, 4);
  assert.equal(result.totalCriteria, 5);
  assert.equal(result.percentage, 80);

  const full = { ...partial, chestClearOfRhonchi: true, isAtropinized: true };
  const fullResult = evaluateAtropinizationProgress(full);
  assert.equal(fullResult.isFullyAtropinized, true);
  assert.equal(fullResult.percentage, 100);
});

test('filterEmergencyCases filters by search text and unidentified state', () => {
  const mockCases: EmergencyCase[] = [
    {
      id: 'CASE-2026-0001',
      patientId: 'p1',
      patientSnapshot: {
        id: 'p1',
        isUnidentified: true,
        tempId: 'TEMP-ER-2026-0842',
        name: 'Unidentified Male #14',
        gender: 'Male',
        registrationTimestamp: '2026-11-11T09:00:00Z',
        registeredBy: 'Nurse R. Mary',
      },
      triageLevel: 'RED',
      esiScore: 1,
      chiefComplaint: 'Unresponsive road accident',
      incidentType: 'RTA (Road Traffic Accident)',
      incidentDetails: { broughtBy: '108 EMRI' },
      vitals: { bp: '80/50', pulse: 130, spo2: 88, temp: 98.4, rr: 28, gcs: 6, recordedAt: '2026-11-11T09:05:00Z' },
      bedBay: 'Resus Bay 1',
      assignedPhysician: 'Dr. Vikram Malhotra',
      assignedNurse: 'Sister Rekha',
      status: 'Under Resuscitation',
      isMlc: true,
      isPoisoning: false,
      clinicalNotes: [],
      createdAt: '2026-11-11T09:00:00Z',
      updatedAt: '2026-11-11T09:05:00Z',
    },
    {
      id: 'CASE-2026-0002',
      patientId: 'p2',
      patientSnapshot: {
        id: 'p2',
        isUnidentified: false,
        name: 'Anita Roy',
        gender: 'Female',
        registrationTimestamp: '2026-11-11T09:10:00Z',
        registeredBy: 'Staff John',
      },
      triageLevel: 'GREEN',
      esiScore: 4,
      chiefComplaint: 'Superficial kitchen burn',
      incidentType: 'Severe Burn',
      incidentDetails: { broughtBy: 'Self' },
      vitals: { bp: '120/80', pulse: 78, spo2: 99, temp: 98.6, rr: 16, gcs: 15, recordedAt: '2026-11-11T09:10:00Z' },
      bedBay: 'Ambulatory Bay 3',
      assignedPhysician: 'Dr. Vikram Malhotra',
      assignedNurse: 'Staff John',
      status: 'Under Evaluation',
      isMlc: false,
      isPoisoning: false,
      clinicalNotes: [],
      createdAt: '2026-11-11T09:10:00Z',
      updatedAt: '2026-11-11T09:10:00Z',
    },
  ];

  const onlyUnidentified = filterEmergencyCases(mockCases, { onlyUnidentified: true });
  assert.equal(onlyUnidentified.length, 1);
  assert.equal(onlyUnidentified[0].id, 'CASE-2026-0001');

  const searchHit = filterEmergencyCases(mockCases, { search: 'Anita' });
  assert.equal(searchHit.length, 1);
  assert.equal(searchHit[0].id, 'CASE-2026-0002');
});

test('resolvePatientTriageStatus prioritizes explicit status, then vitals, then complaint', () => {
  // Explicit override
  const explicit = resolvePatientTriageStatus({ triageStatus: 'Critical', chiefComplaint: 'Minor cold' });
  assert.equal(explicit, 'Critical');

  // Vitals hypoxia
  const hypoxic = resolvePatientTriageStatus({ vitalsSnapshot: { spo2: 89, pulse: 110 } });
  assert.equal(hypoxic, 'Critical');

  // Complaint with chest pain
  const chestPain = resolvePatientTriageStatus({ chiefComplaint: 'Acute chest pain radiating to jaw' });
  assert.equal(chestPain, 'Critical');

  // Waiting appointment
  const waiting = resolvePatientTriageStatus({ status: 'Waiting', chiefComplaint: 'Rash review' });
  assert.equal(waiting, 'Waiting');

  // Completed appointment
  const completed = resolvePatientTriageStatus({ status: 'Completed', chiefComplaint: 'General checkup' });
  assert.equal(completed, 'Stable');
});

test('getTriageBadgeConfig returns proper color classes, labels, and beacons', () => {
  const critical = getTriageBadgeConfig('Critical');
  assert.equal(critical.label, 'Critical');
  assert.equal(critical.pingBeacon, true);
  assert.ok(critical.badgeClass.includes('rose'));

  const waiting = getTriageBadgeConfig('Waiting');
  assert.equal(waiting.label, 'Waiting');
  assert.equal(waiting.pingBeacon, false);
  assert.ok(waiting.badgeClass.includes('amber'));

  const stable = getTriageBadgeConfig('Stable');
  assert.equal(stable.label, 'Stable');
  assert.ok(stable.badgeClass.includes('emerald'));

  const obs = getTriageBadgeConfig('Under Observation');
  assert.equal(obs.label, 'Under Observation');
  assert.ok(obs.badgeClass.includes('sky'));
});

test('filterPatientAppointments correctly filters upcoming vs past vs requested', () => {
  const mockApts = [
    {
      id: 'apt-1',
      patientId: 'p1',
      patientName: 'Test Patient',
      patientAge: 45,
      patientGender: 'Male',
      patientPhone: '999',
      doctorName: 'Dr. Test',
      date: '2026-11-20',
      timeSlot: '10:00 AM',
      tokenNumber: 1,
      type: 'New Consultation' as const,
      status: 'Scheduled' as const,
      chiefComplaint: 'Checkup',
    },
    {
      id: 'apt-2',
      patientId: 'p1',
      patientName: 'Test Patient',
      patientAge: 45,
      patientGender: 'Male',
      patientPhone: '999',
      doctorName: 'Dr. Test',
      date: '2026-11-01',
      timeSlot: '11:00 AM',
      tokenNumber: 2,
      type: 'Follow-up Review' as const,
      status: 'Completed' as const,
      chiefComplaint: 'Old checkup',
    },
    {
      id: 'apt-3',
      patientId: 'p1',
      patientName: 'Test Patient',
      patientAge: 45,
      patientGender: 'Male',
      patientPhone: '999',
      doctorName: 'Dr. Test',
      date: '2026-11-25',
      timeSlot: '02:00 PM',
      tokenNumber: 3,
      type: 'Specialist Referral' as const,
      status: 'Requested' as const,
      chiefComplaint: 'Knee pain',
    },
  ];

  const upcoming = filterPatientAppointments(mockApts, 'p1', 'upcoming');
  assert.equal(upcoming.length, 2); // apt-1 and apt-3
  assert.ok(upcoming.some((a) => a.id === 'apt-1'));
  assert.ok(upcoming.some((a) => a.id === 'apt-3'));

  const past = filterPatientAppointments(mockApts, 'p1', 'past');
  assert.equal(past.length, 1);
  assert.equal(past[0].id, 'apt-2');

  const requested = filterPatientAppointments(mockApts, 'p1', 'requested');
  assert.equal(requested.length, 1);
  assert.equal(requested[0].id, 'apt-3');
});

test('filterPatientDocuments filters by category and search keywords', () => {
  const docs = [
    { title: 'Cath Lab Discharge Note', category: 'Discharge Summary', summary: 'LAD stent procedure', tags: ['Cardio'] },
    { title: 'Biomarkers Troponin Report', category: 'Laboratory', summary: 'Troponin-I elevated', tags: ['Blood'] },
    { title: 'Health Insurance Card', category: 'Patient Uploaded', summary: 'Star Health card', tags: ['TPA'] },
  ];

  const labsOnly = filterPatientDocuments(docs, 'Laboratory');
  assert.equal(labsOnly.length, 1);
  assert.equal(labsOnly[0].title, 'Biomarkers Troponin Report');

  const searchStent = filterPatientDocuments(docs, 'All', 'stent');
  assert.equal(searchStent.length, 1);
  assert.equal(searchStent[0].title, 'Cath Lab Discharge Note');
});

test('filterDoctorDirectory searches name, specialty, languages and filters by consultation type', () => {
  const doctors = [
    {
      name: 'Dr. Vikram Malhotra',
      specialty: 'Cardiology',
      qualifications: 'MD, DM',
      languages: ['English', 'Hindi', 'Kannada'],
      consultationTypes: ['In-Person OPD', 'Video Tele-Consult'],
      availability: 'Available Today',
    },
    {
      name: 'Dr. Rohan Iyer',
      specialty: 'Orthopedics',
      qualifications: 'MS Ortho',
      languages: ['English', 'Tamil'],
      consultationTypes: ['In-Person OPD'],
      availability: 'Next Available Tomorrow',
    },
  ];

  const cardio = filterDoctorDirectory(doctors, { specialty: 'Cardiology' });
  assert.equal(cardio.length, 1);
  assert.equal(cardio[0].name, 'Dr. Vikram Malhotra');

  const videoOnly = filterDoctorDirectory(doctors, { consultationType: 'Video Tele-Consult' });
  assert.equal(videoOnly.length, 1);
  assert.equal(videoOnly[0].name, 'Dr. Vikram Malhotra');

  const langSearch = filterDoctorDirectory(doctors, { query: 'tamil' });
  assert.equal(langSearch.length, 1);
  assert.equal(langSearch[0].name, 'Dr. Rohan Iyer');
});

test('isClinicianVerifiedRecord identifies verified medical records', () => {
  assert.equal(isClinicianVerifiedRecord('Prescription'), true);
  assert.equal(isClinicianVerifiedRecord('Discharge Summary'), true);
  assert.equal(isClinicianVerifiedRecord('Laboratory'), true);
  assert.equal(isClinicianVerifiedRecord('Patient Uploaded'), false);
  assert.equal(isClinicianVerifiedRecord('Self Reported'), false);
});

test('getAppointmentStatusBadge returns valid non-empty badge classes for all required appointment statuses', () => {
  const requiredStatuses: AppointmentStatus[] = [
    'Requested',
    'Scheduled',
    'Rescheduled',
    'Waiting',
    'In Consultation',
    'Completed',
    'Cancelled',
    'No Show',
  ];

  for (const status of requiredStatuses) {
    const badgeClass = getAppointmentStatusBadge(status);
    assert.ok(badgeClass && badgeClass.trim().length > 0, `Status ${status} must have a visible badge class`);
    assert.ok(badgeClass.includes('bg-'), `Status ${status} badge class must include background utility`);
    assert.ok(badgeClass.includes('text-'), `Status ${status} badge class must include text color utility`);
  }
});

test('filterHospitalAppointments separates today, upcoming, and requested appointments properly', () => {
  const today = '2026-11-12';
  const mockApts = [
    {
      id: 'apt-today-1',
      patientId: 'p1',
      patientName: 'Today Patient',
      patientAge: 40,
      patientGender: 'Male',
      patientPhone: '111',
      doctorId: 'staff-doc-1',
      doctorName: 'Dr. Vikram Malhotra',
      date: '2026-11-12',
      timeSlot: '09:00 AM',
      tokenNumber: 1,
      type: 'New Consultation' as const,
      status: 'Waiting' as const,
      chiefComplaint: 'Fever',
    },
    {
      id: 'apt-upcoming-2',
      patientId: 'p2',
      patientName: 'Upcoming Patient',
      patientAge: 50,
      patientGender: 'Female',
      patientPhone: '222',
      doctorId: 'doc-neuro-2',
      doctorName: 'Dr. Priya Nair',
      date: '2026-11-15',
      timeSlot: '10:00 AM',
      tokenNumber: 2,
      type: 'Specialist Referral' as const,
      status: 'Scheduled' as const,
      chiefComplaint: 'Migraine',
    },
    {
      id: 'apt-req-3',
      patientId: 'p3',
      patientName: 'Requesting Patient',
      patientAge: 35,
      patientGender: 'Male',
      patientPhone: '333',
      doctorId: 'staff-doc-1',
      doctorName: 'Dr. Vikram Malhotra',
      date: '2026-11-18',
      timeSlot: '02:30 PM',
      tokenNumber: 3,
      type: 'Follow-up Review' as const,
      status: 'Requested' as const,
      chiefComplaint: 'Lipid review',
    },
  ];

  const todayOnly = filterHospitalAppointments(mockApts, 'today', today);
  assert.equal(todayOnly.length, 1);
  assert.equal(todayOnly[0].id, 'apt-today-1');

  const upcomingOnly = filterHospitalAppointments(mockApts, 'upcoming', today);
  assert.equal(upcomingOnly.length, 2); // apt-upcoming-2 and apt-req-3 are both > today and not cancelled/completed

  const requestedOnly = filterHospitalAppointments(mockApts, 'requested', today);
  assert.equal(requestedOnly.length, 1);
  assert.equal(requestedOnly[0].id, 'apt-req-3');
});

test('all 6 doctors in INITIAL_DOCTORS_DIRECTORY are aligned 1:1 with INITIAL_STAFF with no duplicates', () => {
  assert.equal(INITIAL_DOCTORS_DIRECTORY.length, 6);

  // Verify unique IDs in INITIAL_DOCTORS_DIRECTORY and INITIAL_STAFF
  const dirIds = INITIAL_DOCTORS_DIRECTORY.map((d) => d.id);
  assert.equal(new Set(dirIds).size, 6, 'Doctor directory must have 6 unique IDs');

  const staffIds = INITIAL_STAFF.map((s) => s.id);
  assert.equal(new Set(staffIds).size, INITIAL_STAFF.length, 'Staff list must have unique IDs without duplicates');

  for (const doc of INITIAL_DOCTORS_DIRECTORY) {
    const staffMatch = INITIAL_STAFF.find((s) => s.id === doc.id);
    assert.ok(staffMatch, `Doctor ${doc.name} (${doc.id}) must exist in INITIAL_STAFF`);
    assert.equal(staffMatch.name, doc.name);
    assert.equal(staffMatch.specialty, doc.specialty);
    assert.equal(staffMatch.qualifications, doc.qualifications);
    assert.equal(staffMatch.experienceYears, doc.experienceYears);
    assert.equal(staffMatch.hospitalAffiliation, doc.hospitalAffiliation);
    assert.equal(staffMatch.department, doc.department);
    assert.equal(staffMatch.availability, doc.availability);
  }

  // Verify all initial appointments reference valid doctor IDs in INITIAL_DOCTORS_DIRECTORY
  for (const apt of INITIAL_APPOINTMENTS) {
    assert.ok(apt.doctorId, `Appointment ${apt.id} must have a doctorId`);
    const docMatch = INITIAL_DOCTORS_DIRECTORY.find((d) => d.id === apt.doctorId);
    assert.ok(docMatch, `Appointment ${apt.id} doctorId ${apt.doctorId} must match a valid doctor`);
    assert.equal(apt.doctorName, docMatch.name);
  }
});

test('validateAppointmentRequestInput blocks past dates and duplicate active requests', () => {
  const today = '2026-11-12';
  const existing: Appointment[] = [
    {
      id: 'APT-2026-009',
      patientId: 'pat-known-01',
      patientName: 'Rameshwar Reddy',
      patientAge: 48,
      patientGender: 'Male',
      patientPhone: '+91 98860 34120',
      doctorId: 'staff-doc-1',
      doctorName: 'Dr. Vikram Malhotra',
      date: '2026-11-15',
      timeSlot: '02:30 PM',
      tokenNumber: 9,
      type: 'Follow-up Review',
      status: 'Requested',
      chiefComplaint: 'Lipid review',
    },
  ];

  // Valid future booking
  const valid = validateAppointmentRequestInput(
    { doctorId: 'doc-neuro-2', date: '2026-11-14', timeSlot: '10:30 AM', todayDate: today },
    existing,
    'pat-known-01'
  );
  assert.equal(valid.isValid, true);

  // Past date blocked
  const past = validateAppointmentRequestInput(
    { doctorId: 'doc-neuro-2', date: '2026-11-10', timeSlot: '10:30 AM', todayDate: today },
    existing,
    'pat-known-01'
  );
  assert.equal(past.isValid, false);
  assert.ok(past.error?.toLowerCase().includes('past'));

  // Duplicate active booking blocked
  const dup = validateAppointmentRequestInput(
    { doctorId: 'staff-doc-1', date: '2026-11-15', timeSlot: '02:30 PM', todayDate: today },
    existing,
    'pat-known-01'
  );
  assert.equal(dup.isValid, false);
  assert.ok(dup.error?.toLowerCase().includes('already have an active'));
});

test('canManageAppointmentRequest enforces assigned doctor or admin authorization', () => {
  const apt = { doctorId: 'staff-doc-1' };

  assert.equal(canManageAppointmentRequest({ id: 'staff-doc-1', role: 'doctor' }, apt), true);
  assert.equal(canManageAppointmentRequest({ id: 'doc-neuro-2', role: 'doctor' }, apt), false);
  assert.equal(canManageAppointmentRequest({ id: 'staff-cmo-1', role: 'cmo' }, apt), false);
  assert.equal(canManageAppointmentRequest({ id: 'staff-nurse-1', role: 'nurse' }, apt), false);
  assert.equal(canManageAppointmentRequest({ id: 'staff-admin-1', role: 'admin' }, apt), true);
});

test('acceptAppointmentRequest and declineAppointmentRequest transition state and enforce doctor authorization', () => {
  const baseReq: Appointment = {
    id: 'APT-2026-009',
    patientId: 'pat-known-01',
    patientName: 'Rameshwar Reddy',
    patientAge: 48,
    patientGender: 'Male',
    patientPhone: '+91 98860 34120',
    doctorId: 'staff-doc-1',
    doctorName: 'Dr. Vikram Malhotra',
    date: '2026-11-15',
    timeSlot: '02:30 PM',
    tokenNumber: 9,
    type: 'Follow-up Review',
    status: 'Requested',
    chiefComplaint: 'Lipid review',
    consultationMode: 'In-Person OPD',
  };

  // Unauthorized doctor cannot accept
  const unauthorizedAccept = acceptAppointmentRequest(baseReq, {
    id: 'doc-neuro-2',
    name: 'Dr. Priya Nair',
    role: 'doctor',
  });
  assert.equal(unauthorizedAccept.success, false);
  assert.equal(unauthorizedAccept.appointment.status, 'Requested');

  // Assigned doctor accepts
  const accepted = acceptAppointmentRequest(
    baseReq,
    { id: 'staff-doc-1', name: 'Dr. Vikram Malhotra', role: 'doctor' },
    '2026-11-12T10:00:00Z'
  );
  assert.equal(accepted.success, true);
  assert.equal(accepted.appointment.status, 'Scheduled');
  assert.equal(accepted.appointment.date, '2026-11-15');
  assert.equal(accepted.appointment.timeSlot, '02:30 PM');
  assert.equal(accepted.appointment.type, 'Follow-up Review');
  assert.equal(accepted.appointment.chiefComplaint, 'Lipid review');
  assert.equal(accepted.appointment.acceptedByDoctorId, 'staff-doc-1');
  assert.equal(accepted.appointment.acceptedByDoctorName, 'Dr. Vikram Malhotra');

  // Unauthorized doctor cannot decline
  const unauthorizedDecline = declineAppointmentRequest(
    baseReq,
    { id: 'doc-ortho-3', name: 'Dr. Rohan Iyer', role: 'doctor' },
    'Busy'
  );
  assert.equal(unauthorizedDecline.success, false);
  assert.equal(unauthorizedDecline.appointment.status, 'Requested');

  // Assigned doctor declines with reason
  const declined = declineAppointmentRequest(
    baseReq,
    { id: 'staff-doc-1', name: 'Dr. Vikram Malhotra', role: 'doctor' },
    'Emergency cath lab procedure scheduled at 02:30 PM',
    '2026-11-12T10:05:00Z'
  );
  assert.equal(declined.success, true);
  assert.equal(declined.appointment.status, 'Cancelled');
  assert.equal(declined.appointment.declineReason, 'Emergency cath lab procedure scheduled at 02:30 PM');
  assert.equal(declined.appointment.cancellationReason, 'Emergency cath lab procedure scheduled at 02:30 PM');
  assert.equal(declined.appointment.declinedByDoctorId, 'staff-doc-1');
});

test('proposeAppointmentReschedule and respondToRescheduleProposal preserve original details and handle patient accept/reject', () => {
  const baseReq: Appointment = {
    id: 'APT-2026-010',
    patientId: 'pat-known-01',
    patientName: 'Rameshwar Reddy',
    patientAge: 48,
    patientGender: 'Male',
    patientPhone: '+91 98860 34120',
    doctorId: 'staff-doc-1',
    doctorName: 'Dr. Vikram Malhotra',
    date: '2026-11-15',
    timeSlot: '02:30 PM',
    tokenNumber: 9,
    type: 'Follow-up Review',
    status: 'Requested',
    chiefComplaint: 'Lipid review',
    consultationMode: 'In-Person OPD',
  };

  // Doctor proposes reschedule
  const proposal = proposeAppointmentReschedule(
    baseReq,
    { id: 'staff-doc-1', name: 'Dr. Vikram Malhotra', role: 'doctor' },
    '2026-11-16',
    '10:15 AM',
    'Cath lab case at 02:30 PM on 15 Nov',
    '2026-11-12',
    '2026-11-12T10:10:00Z'
  );
  assert.equal(proposal.success, true);
  assert.equal(proposal.appointment.status, 'Rescheduled');
  // Original requested date/time must NOT be overwritten
  assert.equal(proposal.appointment.date, '2026-11-15');
  assert.equal(proposal.appointment.timeSlot, '02:30 PM');
  assert.equal(proposal.appointment.originalDate, '2026-11-15');
  assert.equal(proposal.appointment.originalTimeSlot, '02:30 PM');
  // Proposed date/time stored separately
  assert.equal(proposal.appointment.proposedDate, '2026-11-16');
  assert.equal(proposal.appointment.proposedTimeSlot, '10:15 AM');
  assert.equal(proposal.appointment.rescheduleResponseStatus, 'Pending');

  // Patient accepts proposed schedule
  const acceptedProposal = respondToRescheduleProposal(
    proposal.appointment,
    'accept',
    'New time works for me',
    '2026-11-12T11:00:00Z'
  );
  assert.equal(acceptedProposal.success, true);
  assert.equal(acceptedProposal.appointment.status, 'Scheduled');
  assert.equal(acceptedProposal.appointment.date, '2026-11-16');
  assert.equal(acceptedProposal.appointment.timeSlot, '10:15 AM');
  assert.equal(acceptedProposal.appointment.originalDate, '2026-11-15');
  assert.equal(acceptedProposal.appointment.originalTimeSlot, '02:30 PM');
  assert.equal(acceptedProposal.appointment.rescheduleResponseStatus, 'Accepted');

  // Patient rejects proposed schedule
  const rejectedProposal = respondToRescheduleProposal(
    proposal.appointment,
    'reject',
    'Cannot make morning slot',
    '2026-11-12T11:05:00Z'
  );
  assert.equal(rejectedProposal.success, true);
  assert.equal(rejectedProposal.appointment.status, 'Rescheduled');
  // Original date/time retained
  assert.equal(rejectedProposal.appointment.date, '2026-11-15');
  assert.equal(rejectedProposal.appointment.timeSlot, '02:30 PM');
  assert.equal(rejectedProposal.appointment.originalDate, '2026-11-15');
  assert.equal(rejectedProposal.appointment.originalTimeSlot, '02:30 PM');
  assert.equal(rejectedProposal.appointment.rescheduleResponseStatus, 'Rejected');
  assert.equal(rejectedProposal.appointment.reschedulePatientNote, 'Cannot make morning slot');
});

test('normalizePrescriptionItems populates patient, doctor, strength, route, createdDate, and status for multiple medicines', () => {
  const rawItems = [
    {
      id: 'rx-a',
      medicineName: 'Tab. Rosuvastatin',
      drugName: 'Tab. Rosuvastatin',
      strength: '20 mg',
      dosage: '1 tablet',
      frequency: '0-0-1 (Bedtime)',
      duration: '60 Days',
      route: 'Oral' as const,
      timing: 'After Food' as const,
      instructions: 'Take after dinner',
    },
    {
      id: 'rx-b',
      medicineName: 'Tab. Ramipril',
      drugName: 'Tab. Ramipril 5 mg',
      strength: '5 mg',
      dosage: '1 tablet morning',
      frequency: '1-0-0 (Morning)',
      duration: '60 Days',
      route: 'Oral' as const,
      timing: 'Before Food' as const,
    },
  ];

  const normalized = normalizePrescriptionItems(rawItems, {
    encounterId: 'ENC-2026-999',
    patientId: 'pat-known-01',
    doctorId: 'staff-doc-1',
    doctorName: 'Dr. Vikram Malhotra',
    createdDate: '2026-11-12',
    defaultStatus: 'Active',
  });

  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].patientId, 'pat-known-01');
  assert.equal(normalized[0].prescribingDoctorId, 'staff-doc-1');
  assert.equal(normalized[0].prescribingDoctorName, 'Dr. Vikram Malhotra');
  assert.equal(normalized[0].drugName, 'Tab. Rosuvastatin 20 mg');
  assert.equal(normalized[0].strength, '20 mg');
  assert.equal(normalized[0].route, 'Oral');
  assert.equal(normalized[0].createdDate, '2026-11-12');
  assert.equal(normalized[0].status, 'Active');
  assert.equal(normalized[1].medicineName, 'Tab. Ramipril');
  assert.equal(normalized[1].status, 'Active');
});

test('derivePatientMedicationRegimen separates Active, Discontinued, and Draft prescriptions while avoiding duplicates and preserving unrelated baseline meds', () => {
  const mockPatient = {
    id: 'pat-known-01',
    name: 'Rameshwar Reddy',
    currentMedications: ['Metformin 500mg BD', 'Tab. Ticagrelor 90 mg (1-0-1)'],
  };

  const mockEncounters: ClinicalEncounter[] = [
    {
      id: 'ENC-OLD',
      patientId: 'pat-known-01',
      patientName: 'Rameshwar Reddy',
      doctorId: 'staff-doc-1',
      doctorName: 'Dr. Vikram Malhotra',
      department: 'Cardiology',
      date: '2026-11-10',
      encounterType: 'OPD Consultation',
      chiefComplaint: 'Checkup',
      subjectiveHistory: 'Stable',
      physicalExamination: 'NAD',
      vitals: { bp: '130/80', pulse: 72, spo2: 98, temp: 98.4, rr: 16, gcs: 15, recordedAt: '2026-11-10T09:00:00Z' },
      assessmentDiagnosis: 'CAD',
      prescriptions: [
        {
          id: 'rx-1',
          medicineName: 'Tab. Ticagrelor',
          drugName: 'Tab. Ticagrelor 90 mg',
          strength: '90 mg',
          dosage: '1 tablet twice daily',
          frequency: '1-0-1',
          duration: '30 Days',
          route: 'Oral',
          timing: 'After Food',
          status: 'Active',
          createdDate: '2026-11-10',
        },
        {
          id: 'rx-2',
          medicineName: 'Tab. Clopidogrel',
          drugName: 'Tab. Clopidogrel 75 mg',
          strength: '75 mg',
          dosage: '1 tablet',
          frequency: '0-1-0',
          duration: '30 Days',
          route: 'Oral',
          timing: 'After Food',
          status: 'Discontinued',
          createdDate: '2026-11-10',
          discontinuedReason: 'Switched to Ticagrelor',
        },
      ],
      prescriptionStatus: 'Active',
      orderedInvestigations: [],
      clinicalAdvice: 'Follow up',
      status: 'Signed',
      updatedAt: '2026-11-10T09:30:00Z',
    },
    {
      id: 'ENC-DRAFT',
      patientId: 'pat-known-01',
      patientName: 'Rameshwar Reddy',
      doctorId: 'staff-doc-1',
      doctorName: 'Dr. Vikram Malhotra',
      department: 'Cardiology',
      date: '2026-11-12',
      encounterType: 'Follow-up Review',
      chiefComplaint: 'Draft note',
      subjectiveHistory: '',
      physicalExamination: '',
      vitals: { bp: '128/80', pulse: 74, spo2: 98, temp: 98.4, rr: 16, gcs: 15, recordedAt: '2026-11-12T09:00:00Z' },
      assessmentDiagnosis: 'CAD review',
      prescriptions: [
        {
          id: 'rx-draft-1',
          medicineName: 'Tab. Ivabradine',
          drugName: 'Tab. Ivabradine 5 mg',
          strength: '5 mg',
          dosage: '1 tablet',
          frequency: '1-0-1',
          duration: '14 Days',
          route: 'Oral',
          timing: 'After Food',
          status: 'Draft',
          createdDate: '2026-11-12',
        },
      ],
      prescriptionStatus: 'Draft',
      orderedInvestigations: [],
      clinicalAdvice: '',
      status: 'Draft',
      updatedAt: '2026-11-12T09:30:00Z',
    },
  ];

  const patientPrescriptions = getPatientPrescriptions(mockEncounters, 'pat-known-01');
  assert.equal(patientPrescriptions.length, 2);

  const regimen = derivePatientMedicationRegimen(mockPatient, mockEncounters);
  // Active should only contain Ticagrelor (not Clopidogrel which is Discontinued, nor Ivabradine which is Draft)
  assert.equal(regimen.activeMedications.length, 1);
  assert.equal(regimen.activeMedications[0].drugName, 'Tab. Ticagrelor 90 mg');
  assert.equal(regimen.activeMedications[0].encounterId, 'ENC-OLD');

  // Discontinued contains Clopidogrel
  assert.equal(regimen.discontinuedMedications.length, 1);
  assert.equal(regimen.discontinuedMedications[0].drugName, 'Tab. Clopidogrel 75 mg');

  // Draft contains Ivabradine
  assert.equal(regimen.draftMedications.length, 1);
  assert.equal(regimen.draftMedications[0].drugName, 'Tab. Ivabradine 5 mg');

  // Unrelated baseline medication 'Metformin 500mg BD' is preserved without duplicating Ticagrelor
  assert.ok(regimen.currentMedicationStrings.some((m) => m.includes('Metformin 500mg BD')));
  assert.equal(
    regimen.currentMedicationStrings.filter((m) => m.toLowerCase().includes('ticagrelor')).length,
    1
  );
});

test('discontinuePrescriptionInEncounter discontinues individual medicine or entire prescription while preserving history', () => {
  const enc: ClinicalEncounter = {
    id: 'ENC-2026-100',
    patientId: 'pat-known-01',
    patientName: 'Rameshwar Reddy',
    doctorId: 'staff-doc-1',
    doctorName: 'Dr. Vikram Malhotra',
    department: 'Cardiology',
    date: '2026-11-12',
    encounterType: 'OPD Consultation',
    chiefComplaint: 'Review',
    subjectiveHistory: '',
    physicalExamination: '',
    vitals: { bp: '120/80', pulse: 72, spo2: 98, temp: 98.4, rr: 16, gcs: 15, recordedAt: '2026-11-12T10:00:00Z' },
    assessmentDiagnosis: 'HTN',
    prescriptions: [
      {
        id: 'item-1',
        medicineName: 'Tab. Amlodipine',
        drugName: 'Tab. Amlodipine 5 mg',
        strength: '5 mg',
        dosage: '1 tablet',
        frequency: '1-0-0',
        duration: '30 Days',
        timing: 'After Food',
        status: 'Active',
      },
      {
        id: 'item-2',
        medicineName: 'Tab. Telmisartan',
        drugName: 'Tab. Telmisartan 40 mg',
        strength: '40 mg',
        dosage: '1 tablet',
        frequency: '1-0-0',
        duration: '30 Days',
        timing: 'Before Food',
        status: 'Active',
      },
    ],
    prescriptionStatus: 'Active',
    orderedInvestigations: [],
    clinicalAdvice: '',
    status: 'Signed',
    updatedAt: '2026-11-12T10:00:00Z',
  };

  // Discontinue only item-1
  const singleResult = discontinuePrescriptionInEncounter(
    enc,
    { id: 'staff-doc-1', name: 'Dr. Vikram Malhotra' },
    { prescriptionItemId: 'item-1', reason: 'Ankle edema noted', nowIso: '2026-11-12T11:00:00Z' }
  );

  assert.equal(singleResult.discontinuedItems.length, 1);
  assert.equal(singleResult.updatedEncounter.prescriptionStatus, 'Active'); // item-2 is still Active
  assert.equal(singleResult.updatedEncounter.prescriptions[0].status, 'Discontinued');
  assert.equal(singleResult.updatedEncounter.prescriptions[0].discontinuedReason, 'Ankle edema noted');
  assert.equal(singleResult.updatedEncounter.prescriptions[1].status, 'Active');

  // Discontinue entire encounter
  const fullResult = discontinuePrescriptionInEncounter(
    singleResult.updatedEncounter,
    { id: 'staff-doc-1', name: 'Dr. Vikram Malhotra' },
    { reason: 'Regimen completed', nowIso: '2026-11-12T12:00:00Z' }
  );
  assert.equal(fullResult.updatedEncounter.prescriptionStatus, 'Discontinued');
  assert.ok(fullResult.updatedEncounter.prescriptions.every((p) => p.status === 'Discontinued'));
});

test('createPatientMedicationActivity records Taken, Skipped, or Not yet recorded and strictly sets reportedBy to patient', () => {
  const takenEntry = createPatientMedicationActivity(
    {
      patientId: 'pat-known-01',
      patientName: 'Rameshwar Reddy',
      encounterId: 'ENC-2026-002',
      prescriptionItemId: 'rx-ram-1',
      medicineName: 'Tab. Ticagrelor 90 mg',
      status: 'Taken',
      note: 'Taken after breakfast',
    },
    '2026-11-12T08:30:00Z'
  );

  assert.equal(takenEntry.status, 'Taken');
  assert.equal(takenEntry.reportedBy, 'patient');
  assert.equal(takenEntry.recordedAt, '2026-11-12T08:30:00Z');
  assert.equal(takenEntry.note, 'Taken after breakfast');

  const skippedEntry = createPatientMedicationActivity(
    {
      patientId: 'pat-known-01',
      patientName: 'Rameshwar Reddy',
      encounterId: 'ENC-2026-002',
      prescriptionItemId: 'rx-ram-3',
      medicineName: 'Tab. Atorvastatin 40 mg',
      status: 'Skipped',
      note: 'Forgot bedtime dose while travelling',
    },
    '2026-11-12T22:15:00Z'
  );

  assert.equal(skippedEntry.status, 'Skipped');
  assert.equal(skippedEntry.reportedBy, 'patient');
});

test('Phase 4: canAccessConversation and getVisibleConversationsForStaff enforce strict doctor and patient isolation', () => {
  const convMalhotra = INITIAL_CONVERSATIONS.find((c) => c.id === 'conv-pat-known-01-staff-doc-1')!;
  const convRohan = INITIAL_CONVERSATIONS.find((c) => c.id === 'conv-pat-known-03-doc-ortho-3')!;

  // Patient pat-known-01 can access their own conversation, but NOT pat-known-03's conversation
  assert.equal(canAccessConversation({ type: 'patient', id: 'pat-known-01' }, convMalhotra), true);
  assert.equal(canAccessConversation({ type: 'patient', id: 'pat-known-01' }, convRohan), false);

  // Dr. Vikram Malhotra (staff-doc-1) can access and reply to his own conversation, but NOT Dr. Rohan Iyer's
  assert.equal(
    canAccessConversation({ type: 'staff', id: 'staff-doc-1', role: 'doctor' }, convMalhotra),
    true
  );
  assert.equal(
    canDoctorReplyToConversation({ id: 'staff-doc-1', role: 'doctor' }, convMalhotra),
    true
  );
  assert.equal(
    canAccessConversation({ type: 'staff', id: 'staff-doc-1', role: 'doctor' }, convRohan),
    false
  );
  assert.equal(
    canDoctorReplyToConversation({ id: 'staff-doc-1', role: 'doctor' }, convRohan),
    false
  );

  // Dr. Priya Nair (doc-neuro-2) cannot access Dr. Vikram Malhotra's conversation
  assert.equal(
    canAccessConversation({ type: 'staff', id: 'doc-neuro-2', role: 'doctor' }, convMalhotra),
    false
  );

  // Nurse (staff-nurse-1) cannot access private doctor-patient conversations
  assert.equal(
    canAccessConversation({ type: 'staff', id: 'staff-nurse-1', role: 'nurse' }, convMalhotra),
    false
  );

  // Hospital Administrator ('admin') can view across hospital for oversight
  assert.equal(
    canAccessConversation({ type: 'staff', id: 'staff-admin-1', role: 'admin' }, convMalhotra),
    true
  );
  assert.equal(
    canAccessConversation({ type: 'staff', id: 'staff-admin-1', role: 'admin' }, convRohan),
    true
  );

  const visibleForMalhotra = getVisibleConversationsForStaff(
    INITIAL_CONVERSATIONS,
    { id: 'staff-doc-1', role: 'doctor' },
    'All'
  );
  assert.ok(visibleForMalhotra.every((c) => c.doctorId === 'staff-doc-1'));
  assert.equal(visibleForMalhotra.length, 2);

  const visibleForRameshwar = getVisibleConversationsForPatient(
    INITIAL_CONVERSATIONS,
    'pat-known-01',
    'All'
  );
  assert.ok(visibleForRameshwar.every((c) => c.patientId === 'pat-known-01'));
  assert.equal(visibleForRameshwar.length, 2);
});

test('Phase 4: createOrUpdateConversationAndMessage creates chronological two-way messages and tracks awaiting-reply and read/unread status', () => {
  const convId = buildConversationId('pat-known-01', 'doc-pulm-4');

  // 1. Patient starts a new conversation with Dr. Amitava Mukherjee (doc-pulm-4)
  const step1 = createOrUpdateConversationAndMessage([], [], {
    patientId: 'pat-known-01',
    patientName: 'Rameshwar Reddy',
    doctorId: 'doc-pulm-4',
    doctorName: 'Dr. Amitava Mukherjee',
    doctorSpecialty: 'Pulmonology & Respiratory Medicine',
    senderId: 'pat-known-01',
    senderRole: 'Patient',
    text: 'Good morning Doctor, I wanted to ask if I should bring my previous PFT report for next week.',
    category: 'Appointment',
    relatedAppointmentId: 'APT-2026-005',
    nowIso: '2026-11-12T09:00:00Z',
  });

  assert.equal(step1.success, true);
  assert.equal(step1.updatedConversations.length, 1);
  assert.equal(step1.updatedConversations[0].id, convId);
  assert.equal(step1.updatedConversations[0].status, 'Active');
  assert.equal(step1.updatedMessages.length, 1);
  assert.equal(step1.updatedMessages[0].senderRole, 'Patient');
  assert.equal(step1.updatedMessages[0].isRead, false);

  // Conversation is awaiting doctor reply and has 1 unread message for Doctor, 0 for Patient
  assert.equal(isConversationAwaitingDoctorReply(step1.updatedMessages, convId), true);
  assert.equal(getUnreadMessageCountForConversation(step1.updatedMessages, convId, 'Doctor'), 1);
  assert.equal(getUnreadMessageCountForConversation(step1.updatedMessages, convId, 'Patient'), 0);

  // 2. Doctor opens conversation -> marks patient message as read
  const readByDoc = markConversationMessagesAsRead(
    step1.updatedMessages,
    convId,
    'Doctor',
    '2026-11-12T09:10:00Z'
  );
  assert.equal(readByDoc.markedCount, 1);
  assert.equal(getUnreadMessageCountForConversation(readByDoc.updatedMessages, convId, 'Doctor'), 0);
  // Still awaiting doctor reply until doctor actually sends a message
  assert.equal(isConversationAwaitingDoctorReply(readByDoc.updatedMessages, convId), true);

  // 3. Doctor replies to patient
  const step2 = createOrUpdateConversationAndMessage(
    step1.updatedConversations,
    readByDoc.updatedMessages,
    {
      conversationId: convId,
      patientId: 'pat-known-01',
      patientName: 'Rameshwar Reddy',
      doctorId: 'doc-pulm-4',
      doctorName: 'Dr. Amitava Mukherjee',
      senderId: 'doc-pulm-4',
      senderRole: 'Doctor',
      text: 'Yes Mr. Reddy, please bring your previous PFT report and current cardiac medication list.',
      category: 'Appointment',
      nowIso: '2026-11-12T09:15:00Z',
    }
  );

  assert.equal(step2.success, true);
  assert.equal(step2.updatedMessages.length, 2);
  // No longer awaiting doctor reply
  assert.equal(isConversationAwaitingDoctorReply(step2.updatedMessages, convId), false);
  // Patient now has 1 unread message from Doctor
  assert.equal(getUnreadMessageCountForConversation(step2.updatedMessages, convId, 'Patient'), 1);

  // Messages are returned in chronological order
  const ordered = getConversationMessages(step2.updatedMessages, convId);
  assert.equal(ordered[0].senderRole, 'Patient');
  assert.equal(ordered[1].senderRole, 'Doctor');

  // 4. Patient opens conversation -> marks doctor reply as read
  const readByPat = markConversationMessagesAsRead(
    step2.updatedMessages,
    convId,
    'Patient',
    '2026-11-12T09:20:00Z'
  );
  assert.equal(readByPat.markedCount, 1);
  assert.equal(getUnreadMessageCountForConversation(readByPat.updatedMessages, convId, 'Patient'), 0);
});

test('Phase 4: getPatientConnectedDoctors prioritizes doctors connected via appointments, prescriptions, or primary physician', () => {
  const connected = getPatientConnectedDoctors(
    { id: 'pat-known-01', primaryPhysician: 'Dr. Vikram Malhotra' },
    INITIAL_DOCTORS_DIRECTORY,
    INITIAL_APPOINTMENTS,
    []
  );

  assert.equal(connected.length, INITIAL_DOCTORS_DIRECTORY.length);
  // Connected doctors (Dr. Vikram Malhotra and Dr. Priya Nair) come first
  assert.equal(connected[0].isConnected, true);
  assert.equal(connected[1].isConnected, true);
  const malhotraEntry = connected.find((c) => c.doctor.id === 'staff-doc-1')!;
  assert.ok(malhotraEntry.relationshipLabels.includes('Primary Attending Physician'));
  assert.ok(malhotraEntry.relatedAppointments.length > 0);
});

// ==========================================
// PHASE 5: HOSPITAL PHARMACY MANAGEMENT TESTS
// ==========================================

test('Phase 5: Pharmacy role permissions allow Pharmacist and Admin writes, Doctor/CMO read-only view, and block Nurse/Records', () => {
  assert.equal(canViewPharmacyDashboard('pharmacist'), true);
  assert.equal(canManagePharmacyInventory('pharmacist'), true);
  assert.equal(canDispenseMedications('pharmacist'), true);

  assert.equal(canViewPharmacyDashboard('admin'), true);
  assert.equal(canManagePharmacyInventory('admin'), true);
  assert.equal(canDispenseMedications('admin'), true);

  assert.equal(canViewPharmacyDashboard('doctor'), true);
  assert.equal(canManagePharmacyInventory('doctor'), false);
  assert.equal(canDispenseMedications('doctor'), false);

  assert.equal(canViewPharmacyDashboard('cmo'), true);
  assert.equal(canManagePharmacyInventory('cmo'), false);

  assert.equal(canViewPharmacyDashboard('nurse'), false);
  assert.equal(canManagePharmacyInventory('nurse'), false);
  assert.equal(canDispenseMedications('records'), false);
});

test('Phase 5: matchPrescriptionItemToCatalogue strictly enforces generic/brand + strength + dosageForm without silent substitution', () => {
  const exactGeneric = matchPrescriptionItemToCatalogue(
    { medicineName: 'Tab. Telmisartan', strength: '40 mg', dosage: '1 tablet', route: 'Oral' },
    INITIAL_PHARMACY_MEDICINES
  );
  assert.equal(exactGeneric.matchStatus, 'EXACT_MATCH');
  assert.equal(exactGeneric.matchedMedicine?.id, 'med-telmisartan-40');

  const exactBrand = matchPrescriptionItemToCatalogue(
    { medicineName: 'Tab. Ecosprin', strength: '75 mg', dosage: '1 tablet', route: 'Oral' },
    INITIAL_PHARMACY_MEDICINES
  );
  assert.equal(exactBrand.matchStatus, 'EXACT_MATCH');
  assert.equal(exactBrand.matchedMedicine?.id, 'med-aspirin-75');

  const wrongStrength = matchPrescriptionItemToCatalogue(
    { medicineName: 'Tab. Telmisartan', strength: '20 mg', dosage: '1 tablet', route: 'Oral' },
    INITIAL_PHARMACY_MEDICINES
  );
  assert.equal(wrongStrength.matchStatus, 'NO_MATCH');
  assert.equal(wrongStrength.matchedMedicine, undefined);

  const wrongForm = matchPrescriptionItemToCatalogue(
    { medicineName: 'Inj. Paracetamol', strength: '650 mg', dosage: '1 vial', route: 'IV' },
    INITIAL_PHARMACY_MEDICINES
  );
  assert.equal(wrongForm.matchStatus, 'NO_MATCH');
});

test('Phase 5: addCatalogueMedicine and receiveNewPharmacyBatch enforce duplicate, invalid qty, and expired stock guards', () => {
  const pharmacist = { id: 'staff-pharm-1', name: 'Meera Krishnan', role: 'pharmacist' as const };
  const todayStr = new Date().toISOString().split('T')[0];

  const dupMed = addCatalogueMedicine(INITIAL_PHARMACY_MEDICINES, {
    genericName: 'Telmisartan',
    strength: '40mg',
    dosageForm: 'Tablet',
    manufacturer: 'Sun Pharma',
    category: 'Cardiovascular',
    minimumStockThreshold: 50,
  });
  assert.equal(dupMed.success, false);

  const addedMed = addCatalogueMedicine(INITIAL_PHARMACY_MEDICINES, {
    genericName: 'Amlodipine',
    brandName: 'Amlong',
    strength: '5 mg',
    dosageForm: 'Tablet',
    manufacturer: 'Micro Labs',
    category: 'Cardiovascular',
    minimumStockThreshold: 60,
  });
  assert.equal(addedMed.success, true);
  assert.ok(addedMed.medicine);

  const expiredReceipt = receiveNewPharmacyBatch(
    INITIAL_PHARMACY_BATCHES,
    addedMed.updatedCatalogue,
    {
      medicineId: addedMed.medicine!.id,
      batchNumber: 'AML-EXP-01',
      quantity: 100,
      expiryDate: '2020-01-01',
      purchaseDate: todayStr,
      supplierReference: 'PO-1',
      supplierName: 'MedCore',
      stockLocation: 'Rack A1',
    },
    pharmacist,
    todayStr
  );
  assert.equal(expiredReceipt.success, false);

  const validReceipt = receiveNewPharmacyBatch(
    INITIAL_PHARMACY_BATCHES,
    addedMed.updatedCatalogue,
    {
      medicineId: addedMed.medicine!.id,
      batchNumber: 'AML-2027-01',
      quantity: 120,
      expiryDate: '2028-06-30',
      purchaseDate: todayStr,
      supplierReference: 'PO-2',
      supplierName: 'MedCore',
      stockLocation: 'Rack A1',
    },
    pharmacist,
    todayStr
  );
  assert.equal(validReceipt.success, true);
  assert.equal(validReceipt.batch?.availableQuantity, 120);

  const dupBatch = receiveNewPharmacyBatch(
    validReceipt.updatedBatches,
    addedMed.updatedCatalogue,
    {
      medicineId: addedMed.medicine!.id,
      batchNumber: 'AML-2027-01',
      quantity: 50,
      expiryDate: '2028-06-30',
      purchaseDate: todayStr,
      supplierReference: 'PO-3',
      supplierName: 'MedCore',
      stockLocation: 'Rack A1',
    },
    pharmacist,
    todayStr
  );
  assert.equal(dupBatch.success, false);
});

test('Phase 5: adjustPharmacyBatchStock requires reason, prevents negative stock, and excludes expired stock from usableQuantity', () => {
  const pharmacist = { id: 'staff-pharm-1', name: 'Meera Krishnan', role: 'pharmacist' as const };
  const todayStr = new Date().toISOString().split('T')[0];

  const noReason = adjustPharmacyBatchStock(
    INITIAL_PHARMACY_BATCHES,
    INITIAL_PHARMACY_MEDICINES,
    { batchId: 'batch-tel-1', quantityDelta: -5, reason: '  ' },
    pharmacist
  );
  assert.equal(noReason.success, false);

  const negativeStock = adjustPharmacyBatchStock(
    INITIAL_PHARMACY_BATCHES,
    INITIAL_PHARMACY_MEDICINES,
    { batchId: 'batch-sal-1', quantityDelta: -999, reason: 'Cycle count adjustment' },
    pharmacist
  );
  assert.equal(negativeStock.success, false);

  const paraMed = INITIAL_PHARMACY_MEDICINES.find((m) => m.id === 'med-paracetamol-650')!;
  const paraSummary = getMedicineStockSummary(paraMed, INITIAL_PHARMACY_BATCHES, todayStr);
  assert.equal(paraSummary.usableQuantity, 620);
  assert.equal(paraSummary.expiredQuantity, 140);
  assert.equal(paraSummary.stockStatus, 'In Stock');
});

test('Phase 5: checkMedicineAvailabilityForDoctor reports Available, Low Stock, Out of Stock, and Not in Formulary cleanly', () => {
  const todayStr = new Date().toISOString().split('T')[0];

  const avail = checkMedicineAvailabilityForDoctor(
    { medicineName: 'Tab. Telmisartan', strength: '40 mg', dosage: '1 tablet', route: 'Oral' },
    INITIAL_PHARMACY_MEDICINES,
    INITIAL_PHARMACY_BATCHES,
    todayStr
  );
  assert.equal(avail.availabilityStatus, 'Available');
  assert.ok(avail.disclaimer.toLowerCase().includes('not reserved'));

  const low = checkMedicineAvailabilityForDoctor(
    { medicineName: 'Salbutamol Inhaler', strength: '100 mcg/puff', dosage: '2 puffs', route: 'Inhalation' },
    INITIAL_PHARMACY_MEDICINES,
    INITIAL_PHARMACY_BATCHES,
    todayStr
  );
  assert.equal(low.availabilityStatus, 'Low Stock');

  const outOfStock = checkMedicineAvailabilityForDoctor(
    { medicineName: 'Tab. Ramipril', strength: '5 mg', dosage: '1 tablet', route: 'Oral' },
    INITIAL_PHARMACY_MEDICINES,
    INITIAL_PHARMACY_BATCHES,
    todayStr
  );
  assert.equal(outOfStock.availabilityStatus, 'Out of Stock');

  const notListed = checkMedicineAvailabilityForDoctor(
    { medicineName: 'Tab. RareInvestigationalDrug', strength: '10 mg', dosage: '1 tablet', route: 'Oral' },
    INITIAL_PHARMACY_MEDICINES,
    INITIAL_PHARMACY_BATCHES,
    todayStr
  );
  assert.equal(notListed.availabilityStatus, 'Not in Formulary');
});

test('Phase 5: confirmPharmacyDispensing supports partial/full dispense, deducts stock, and enforces all clinical safety blocks', () => {
  const pharmacist = { id: 'staff-pharm-1', name: 'Meera Krishnan', role: 'pharmacist' as const };
  const nurse = { id: 'staff-nurse-1', name: 'Sister Rekha Varma', role: 'nurse' as const };
  const todayStr = new Date().toISOString().split('T')[0];

  // Use a focused 2-item encounter with ample batch stock to test partial -> full dispensing cleanly
  const testEnc: ClinicalEncounter = {
    ...INITIAL_ENCOUNTERS.find((e) => e.id === 'ENC-2026-003')!,
    id: 'ENC-TEST-DISP',
    prescriptions: [
      {
        id: 'rx-test-meb',
        medicineName: 'Cap. Mebeverine',
        drugName: 'Cap. Mebeverine 135 mg',
        strength: '135 mg',
        dosage: '1 capsule twice daily',
        frequency: '1-0-1',
        duration: '10 Days', // 20 capsules total; batch-meb-1 has 24
        route: 'Oral',
        status: 'Active',
      },
      {
        id: 'rx-test-sal',
        medicineName: 'Salbutamol Inhaler',
        drugName: 'Salbutamol Inhaler 100 mcg',
        strength: '100 mcg/puff',
        dosage: '2 puffs SOS',
        frequency: 'SOS',
        duration: '90 Days', // 1 inhaler total; batch-sal-1 has 5
        route: 'Inhalation',
        status: 'Active',
      },
    ],
  };

  const nurseBlocked = confirmPharmacyDispensing(
    testEnc,
    [{ prescriptionItemId: 'rx-test-meb', action: 'dispense', batchId: 'batch-meb-1', quantity: 10 }],
    {
      catalogue: INITIAL_PHARMACY_MEDICINES,
      batches: INITIAL_PHARMACY_BATCHES,
      dispensingRecords: INITIAL_PHARMACY_DISPENSING_RECORDS,
    },
    nurse,
    todayStr
  );
  assert.equal(nurseBlocked.success, false);

  const expiredBatchBlocked = confirmPharmacyDispensing(
    {
      ...testEnc,
      id: 'ENC-TEST-PARA',
      prescriptions: [
        {
          id: 'rx-para-test',
          medicineName: 'Tab. Paracetamol',
          strength: '650 mg',
          dosage: '1 tablet',
          frequency: '1-0-1',
          duration: '3 Days',
          route: 'Oral',
          status: 'Active',
        },
      ],
    },
    [{ prescriptionItemId: 'rx-para-test', action: 'dispense', batchId: 'batch-pcm-exp', quantity: 4 }],
    {
      catalogue: INITIAL_PHARMACY_MEDICINES,
      batches: INITIAL_PHARMACY_BATCHES,
      dispensingRecords: INITIAL_PHARMACY_DISPENSING_RECORDS,
    },
    pharmacist,
    todayStr
  );
  assert.equal(expiredBatchBlocked.success, false);
  assert.ok(expiredBatchBlocked.error?.toLowerCase().includes('expired'));

  const draftBlocked = confirmPharmacyDispensing(
    { ...testEnc, status: 'Draft', prescriptionStatus: 'Draft' },
    [{ prescriptionItemId: 'rx-test-meb', action: 'dispense', batchId: 'batch-meb-1', quantity: 10 }],
    {
      catalogue: INITIAL_PHARMACY_MEDICINES,
      batches: INITIAL_PHARMACY_BATCHES,
      dispensingRecords: INITIAL_PHARMACY_DISPENSING_RECORDS,
    },
    pharmacist,
    todayStr
  );
  assert.equal(draftBlocked.success, false);

  const partialRes = confirmPharmacyDispensing(
    testEnc,
    [
      { prescriptionItemId: 'rx-test-meb', action: 'dispense', batchId: 'batch-meb-1', quantity: 10 },
      { prescriptionItemId: 'rx-test-sal', action: 'dispense', batchId: 'batch-sal-1', quantity: 1 },
    ],
    {
      catalogue: INITIAL_PHARMACY_MEDICINES,
      batches: INITIAL_PHARMACY_BATCHES,
      dispensingRecords: INITIAL_PHARMACY_DISPENSING_RECORDS,
    },
    pharmacist,
    todayStr,
    'Partial dispense of Mebeverine'
  );
  assert.equal(partialRes.success, true);
  assert.equal(partialRes.record?.status, 'Partially Dispensed');
  assert.equal(partialRes.updatedBatches.find((b) => b.id === 'batch-meb-1')?.availableQuantity, 14);
  assert.equal(partialRes.updatedBatches.find((b) => b.id === 'batch-sal-1')?.availableQuantity, 4);

  const overDispense = confirmPharmacyDispensing(
    testEnc,
    [{ prescriptionItemId: 'rx-test-meb', action: 'dispense', batchId: 'batch-meb-1', quantity: 12 }],
    {
      catalogue: INITIAL_PHARMACY_MEDICINES,
      batches: partialRes.updatedBatches,
      dispensingRecords: partialRes.updatedDispensingRecords,
    },
    pharmacist,
    todayStr
  );
  assert.equal(overDispense.success, false);

  const fullRes = confirmPharmacyDispensing(
    testEnc,
    [{ prescriptionItemId: 'rx-test-meb', action: 'dispense', batchId: 'batch-meb-1', quantity: 10 }],
    {
      catalogue: INITIAL_PHARMACY_MEDICINES,
      batches: partialRes.updatedBatches,
      dispensingRecords: partialRes.updatedDispensingRecords,
    },
    pharmacist,
    todayStr
  );
  assert.equal(fullRes.success, true);
  assert.equal(fullRes.record?.status, 'Fully Dispensed');
  assert.equal(fullRes.updatedBatches.find((b) => b.id === 'batch-meb-1')?.availableQuantity, 4);

  const summaryAfter = getPrescriptionDispensingSummary(testEnc, fullRes.updatedDispensingRecords);
  assert.equal(summaryAfter.overallStatus, 'Fully Dispensed');
  assert.equal(summaryAfter.isEligibleForDispensing, false);

  const dupFull = confirmPharmacyDispensing(
    testEnc,
    [{ prescriptionItemId: 'rx-test-meb', action: 'dispense', batchId: 'batch-meb-1', quantity: 1 }],
    {
      catalogue: INITIAL_PHARMACY_MEDICINES,
      batches: fullRes.updatedBatches,
      dispensingRecords: fullRes.updatedDispensingRecords,
    },
    pharmacist,
    todayStr
  );
  assert.equal(dupFull.success, false);
});

test('Phase 5: createLocalReorderRequest and appendDeduplicatedNotification behave deterministically', () => {
  const pharmacist = { id: 'staff-pharm-1', name: 'Meera Krishnan', role: 'pharmacist' as const };
  const todayStr = new Date().toISOString().split('T')[0];

  const req = createLocalReorderRequest(
    INITIAL_PHARMACY_MEDICINES,
    INITIAL_PHARMACY_BATCHES,
    {
      medicineId: 'med-ramipril-5',
      requestedQuantity: 300,
      supplierName: 'MedCore Institutional Distributors',
    },
    pharmacist,
    todayStr
  );
  assert.equal(req.success, true);
  assert.equal(req.request?.reason, 'Out of Stock');
  assert.equal(req.request?.status, 'Draft');

  const n1: PatientNotification = {
    id: 'n1',
    patientId: 'HOSPITAL-PHARMACY',
    dedupKey: 'low-stock-med-salbutamol-inh-Low Stock',
    targetAudience: 'pharmacy',
    category: 'pharmacy',
    title: 'Low Stock Alert',
    message: 'Salbutamol Inhaler low',
    timestamp: '2026-11-13T10:00:00Z',
    isRead: false,
    priority: 'high',
  };
  const n2: PatientNotification = { ...n1, id: 'n2' };

  const after1 = appendDeduplicatedNotification([], n1);
  const after2 = appendDeduplicatedNotification(after1, n2);
  assert.equal(after1.length, 1);
  assert.equal(after2.length, 1);
});

test('Phase 6A: resolvePatientPrivacySettings and updatePatientPrivacySettingsMap isolate consent per patient without overwriting other patients', () => {
  const ramSettings = resolvePatientPrivacySettings(
    INITIAL_PRIVACY_SETTINGS_BY_PATIENT,
    INITIAL_PRIVACY_SETTINGS,
    'pat-known-01'
  );
  const gopalSettings = resolvePatientPrivacySettings(
    INITIAL_PRIVACY_SETTINGS_BY_PATIENT,
    INITIAL_PRIVACY_SETTINGS,
    'pat-known-03'
  );

  assert.equal(ramSettings.patientId, 'pat-known-01');
  assert.equal(ramSettings.familyMemberName, 'Sunita Reddy (Spouse)');
  assert.equal(ramSettings.anonymizedResearchConsent, false);

  assert.equal(gopalSettings.patientId, 'pat-known-03');
  assert.equal(gopalSettings.familyMemberName, 'Arjun Krishnan (Son)');
  assert.equal(gopalSettings.anonymizedResearchConsent, true);

  // Updating Rameshwar's research consent does NOT mutate Gopal's settings
  const updatedMap = updatePatientPrivacySettingsMap(
    INITIAL_PRIVACY_SETTINGS_BY_PATIENT,
    'pat-known-01',
    { anonymizedResearchConsent: true, emergencyAccessGranted: false },
    '2026-11-13T12:00:00Z'
  );

  assert.equal(updatedMap['pat-known-01'].anonymizedResearchConsent, true);
  assert.equal(updatedMap['pat-known-01'].emergencyAccessGranted, false);
  assert.equal(updatedMap['pat-known-03'].emergencyAccessGranted, true);
  assert.equal(updatedMap['pat-known-03'].familyMemberName, 'Arjun Krishnan (Son)');
});

test('Phase 6A: normalizeAccessAuditRecords and filterAccessAuditsForPatient enforce patient-owned access audit trails', () => {
  const legacyLogs = [
    {
      id: 'legacy-acc-1',
      accessorName: 'Dr. Vikram Malhotra',
      accessorRole: 'Cardiologist',
      department: 'Cardiology',
      timestamp: '2026-11-11 08:35 AM',
      purpose: 'Chart review',
      action: 'Viewed chart',
    },
    ...INITIAL_ACCESS_AUDIT_LOGS,
  ];

  const normalized = normalizeAccessAuditRecords(legacyLogs);
  assert.ok(normalized.every((l) => Boolean(l.patientId)));
  assert.equal(normalized[0].patientId, 'pat-known-01');

  const ramLogs = filterAccessAuditsForPatient(INITIAL_ACCESS_AUDIT_LOGS, 'pat-known-01');
  const gopalLogs = filterAccessAuditsForPatient(INITIAL_ACCESS_AUDIT_LOGS, 'pat-known-03');

  assert.equal(ramLogs.length, 3);
  assert.ok(ramLogs.every((l) => l.patientId === 'pat-known-01'));

  assert.equal(gopalLogs.length, 1);
  assert.equal(gopalLogs[0].patientId, 'pat-known-03');
  assert.equal(gopalLogs[0].accessorName, 'Dr. Rohan Iyer');
});

test('Phase 6A: validateSupabaseEnvSecurity blocks service-role keys in frontend VITE_* variables and enforceSessionAuthorityBoundary prevents Demo/localStorage bypass', () => {
  // 1. Clean publishable anon configuration
  const fakeAnonPayload = Buffer.from(JSON.stringify({ role: 'anon', iss: 'supabase' })).toString('base64url');
  const fakeAnonJwt = `eyJhbGciOiJIUzI1NiJ9.${fakeAnonPayload}.signature`;

  const validCheck = validateSupabaseEnvSecurity({
    VITE_SUPABASE_URL: 'https://fictional-demo-project.supabase.co',
    VITE_SUPABASE_ANON_KEY: fakeAnonJwt,
  });
  assert.equal(validCheck.isValid, true);
  assert.equal(validCheck.isConfigured, true);
  assert.equal(validCheck.violations.length, 0);

  // 2. Reject VITE_SUPABASE_SERVICE_ROLE_KEY or service_role JWT in VITE_SUPABASE_ANON_KEY
  const fakeServicePayload = Buffer.from(JSON.stringify({ role: 'service_role', iss: 'supabase' })).toString('base64url');
  const fakeServiceJwt = `eyJhbGciOiJIUzI1NiJ9.${fakeServicePayload}.signature`;

  const leakedServiceRole = validateSupabaseEnvSecurity({
    VITE_SUPABASE_URL: 'https://fictional-demo-project.supabase.co',
    VITE_SUPABASE_ANON_KEY: fakeServiceJwt,
    VITE_SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_leaked_key',
  });
  assert.equal(leakedServiceRole.isValid, false);
  assert.equal(leakedServiceRole.isConfigured, false);
  assert.ok(leakedServiceRole.violations.length >= 2);

  // 3. Demo Simulation Mode cannot access Supabase database
  const demoAttemptDb = enforceSessionAuthorityBoundary({
    mode: 'demo_simulation',
    hasValidSupabaseSession: false,
    clientSimulatedRole: 'pharmacist',
    attemptedTarget: 'supabase_database',
  });
  assert.equal(demoAttemptDb.allowed, false);
  assert.equal(demoAttemptDb.storageTarget, 'blocked');

  // 4. Authenticated mode blocks localStorage fallback when server denies permission
  const bypassAttempt = enforceSessionAuthorityBoundary({
    mode: 'authenticated_supabase',
    hasValidSupabaseSession: true,
    serverAuthenticatedRole: 'nurse',
    clientSimulatedRole: 'pharmacist',
    attemptedTarget: 'supabase_database',
    serverReturnedUnauthorized: true,
  });
  assert.equal(bypassAttempt.allowed, false);
  assert.equal(bypassAttempt.storageTarget, 'blocked');
  assert.equal(bypassAttempt.effectiveRole, 'nurse');
});

test('Phase 6A: planDeterministicBatchLockOrder sorts batch locks deterministically and synchronizeReconciledPatientSnapshots updates emergency case snapshots', () => {
  const lockOrder = planDeterministicBatchLockOrder([
    { prescriptionItemId: 'rx-1', action: 'dispense', batchId: 'batch-tic-1', quantity: 30 },
    { prescriptionItemId: 'rx-2', action: 'dispense', batchId: 'batch-asp-1', quantity: 30 },
    { prescriptionItemId: 'rx-3', action: 'dispense', batchId: 'batch-tic-1', quantity: 10 },
    { prescriptionItemId: 'rx-4', action: 'unavailable', batchId: 'batch-pan-1', quantity: 0 },
  ]);
  assert.deepEqual(lockOrder, ['batch-asp-1', 'batch-tic-1']);

  const unkPatient = INITIAL_PATIENTS.find((p) => p.id === 'pat-unk-01')!;
  const reconciledPatient = {
    ...unkPatient,
    isUnidentified: false,
    name: 'Maheshwar Rao',
    permanentMrn: 'AC-BLR-2026-9901',
  };
  const syncedCases = synchronizeReconciledPatientSnapshots(INITIAL_CASES, reconciledPatient, '2026-11-13T12:30:00Z');
  const updatedUnkCase = syncedCases.find((c) => c.patientId === 'pat-unk-01');
  if (updatedUnkCase) {
    assert.equal(updatedUnkCase.patientSnapshot.isUnidentified, false);
    assert.equal(updatedUnkCase.patientSnapshot.name, 'Maheshwar Rao');
    assert.equal(updatedUnkCase.patientSnapshot.permanentMrn, 'AC-BLR-2026-9901');
  }
});

test('Phase 6A: Supabase SQL migrations define all 33 normalized tables, RLS policies, transactional RPCs, and stable fictional seed IDs', () => {
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
  const schemaSql = fs.readFileSync(path.join(migrationsDir, '20261113000001_phase6a_schema_and_constraints.sql'), 'utf8');
  const rlsSql = fs.readFileSync(path.join(migrationsDir, '20261113000002_phase6a_rls_policies.sql'), 'utf8');
  const rpcSql = fs.readFileSync(path.join(migrationsDir, '20261113000003_phase6a_transactional_functions.sql'), 'utf8');
  const seedSql = fs.readFileSync(path.join(migrationsDir, '20261113000004_phase6a_seed_fictional_demo_data.sql'), 'utf8');

  const requiredTables = [
    'hospitals',
    'staff_users',
    'patients',
    'patient_allergies',
    'patient_chronic_conditions',
    'patient_vital_readings',
    'patient_medications',
    'patient_privacy_settings',
    'patient_access_audits',
    'appointments',
    'clinical_encounters',
    'prescription_items',
    'patient_medication_activities',
    'follow_up_reminders',
    'diagnostic_lab_reports',
    'diagnostic_lab_parameters',
    'emergency_cases',
    'emergency_case_timeline_events',
    'medico_legal_cases',
    'poisoning_toxicology_cases',
    'referral_transfers',
    'clinical_documents',
    'patient_portal_documents',
    'message_conversations',
    'patient_messages',
    'notifications',
    'pharmacy_medicines',
    'pharmacy_batches',
    'pharmacy_dispensing_records',
    'pharmacy_dispensing_items',
    'pharmacy_transactions',
    'pharmacy_reorder_requests',
    'audit_logs',
  ];

  for (const tbl of requiredTables) {
    assert.ok(
      schemaSql.includes(`CREATE TABLE IF NOT EXISTS public.${tbl}`),
      `Missing table definition for public.${tbl}`
    );
    assert.ok(
      rlsSql.includes(`ALTER TABLE public.${tbl} ENABLE ROW LEVEL SECURITY;`),
      `Missing ENABLE ROW LEVEL SECURITY for public.${tbl}`
    );
    assert.ok(
      rlsSql.includes(`ALTER TABLE public.${tbl} FORCE ROW LEVEL SECURITY;`),
      `Missing FORCE ROW LEVEL SECURITY for public.${tbl}`
    );
  }

  // Verify transactional RPC functions and row locking (FOR UPDATE)
  assert.ok(rpcSql.includes('CREATE OR REPLACE FUNCTION public.rpc_dispense_prescription'));
  assert.ok(rpcSql.includes('CREATE OR REPLACE FUNCTION public.rpc_receive_pharmacy_batch_stock'));
  assert.ok(rpcSql.includes('CREATE OR REPLACE FUNCTION public.rpc_adjust_pharmacy_batch_stock'));
  assert.ok(rpcSql.includes('CREATE OR REPLACE FUNCTION public.rpc_reconcile_unidentified_patient'));
  assert.ok(rpcSql.includes('CREATE OR REPLACE FUNCTION public.rpc_record_patient_access_audit'));
  assert.ok(rpcSql.includes('FOR UPDATE'));

  // Verify stable demonstration IDs in seed script
  for (const stableId of [
    'staff-doc-1',
    'staff-cmo-1',
    'doc-neuro-2',
    'doc-ortho-3',
    'doc-gastro-4',
    'doc-pulmo-5',
    'staff-nurse-1',
    'staff-rec-1',
    'staff-pharm-1',
    'staff-admin-1',
    'pat-known-01',
    'pat-known-03',
    'APT-2026-001',
    'ENC-2026-002',
    'ENC-2026-004',
    'rx-ram-1',
    'rx-gopal-1',
    'med-ticagrelor-90',
    'batch-tic-1',
    'DISP-2026-001',
    'PRQ-2026-101',
  ]) {
    assert.ok(seedSql.includes(`'${stableId}'`), `Missing stable demonstration ID ${stableId} in seed SQL`);
  }
});

test('Phase 6B: resolveServerAuthenticatedIdentity maps server staff and patient records accurately and rejects unlinked or inactive accounts', () => {
  // 1. Active hospital staff resolution
  const docIdentity = resolveServerAuthenticatedIdentity(
    '550e8400-e29b-41d4-a716-446655440001',
    {
      id: 'staff-doc-1',
      auth_user_id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Dr. Vikram Malhotra',
      role: 'doctor',
      designation: 'Senior Consultant Cardiologist',
      department: 'Cardiology & Internal Medicine',
      employee_code: 'DOC-MED-104',
      email: 'v.malhotra@apexhospital.demo.org',
      is_active: true,
    },
    null
  );
  assert.equal(docIdentity.error, undefined);
  assert.equal(docIdentity.identity?.accountType, 'staff');
  assert.equal(docIdentity.identity?.id, 'staff-doc-1');
  assert.equal(docIdentity.identity?.role, 'doctor');

  // 2. Inactive staff rejected
  const inactiveStaff = resolveServerAuthenticatedIdentity(
    '550e8400-e29b-41d4-a716-446655440002',
    {
      id: 'staff-nurse-1',
      name: 'Sister Rekha Varma',
      role: 'nurse',
      designation: 'Triage Nurse',
      department: 'Emergency',
      employee_code: 'NRS-TRI-219',
      is_active: false,
    },
    null
  );
  assert.equal(inactiveStaff.identity, null);
  assert.ok(inactiveStaff.error?.includes('inactive'));

  // 3. Patient resolution
  const patientIdentity = resolveServerAuthenticatedIdentity(
    '550e8400-e29b-41d4-a716-446655440003',
    null,
    {
      id: 'pat-known-01',
      auth_user_id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'Rameshwar Reddy',
      permanent_mrn: 'AC-BLR-2026-0104',
    }
  );
  assert.equal(patientIdentity.error, undefined);
  assert.equal(patientIdentity.identity?.accountType, 'patient');
  assert.equal(patientIdentity.identity?.id, 'pat-known-01');
  assert.equal(patientIdentity.identity?.role, 'patient');

  // 4. Authenticated user not yet linked to staff_users or patients
  const unlinked = resolveServerAuthenticatedIdentity('550e8400-e29b-41d4-a716-446655440099', null, null);
  assert.equal(unlinked.identity, null);
  assert.ok(unlinked.error?.includes('not yet linked'));

  // 5. Publishable key (`sb_publishable_...`) accepted when paired with valid Supabase URL
  const publishableEnv = validateSupabaseEnvSecurity({
    VITE_SUPABASE_URL: 'https://fictional-demo-project.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_demo_key_1234567890',
  });
  assert.equal(publishableEnv.isValid, true);
  assert.equal(publishableEnv.isConfigured, true);
  assert.equal(publishableEnv.supabaseAnonKey, 'sb_publishable_demo_key_1234567890');

  // 6. Malformed URL with /rest/v1/ path suffix is normalized cleanly to base origin
  const normalizedUrlEnv = validateSupabaseEnvSecurity({
    VITE_SUPABASE_URL: 'https://kuogxcdnmutjdxknvtvk.supabase.co/rest/v1/',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_9z5k4fT-70B-X2o0v2v08A_xW38mX2R',
  });
  assert.equal(normalizedUrlEnv.isValid, true);
  assert.equal(normalizedUrlEnv.isConfigured, true);
  assert.equal(normalizedUrlEnv.supabaseUrl, 'https://kuogxcdnmutjdxknvtvk.supabase.co');
});

test('Phase 6C: classifySupabaseError accurately distinguishes PGRST205 schema missing, PGRST125 invalid path, 42501 RLS denial, and 23505 constraint violations', () => {
  const schemaMissing = classifySupabaseError({
    code: 'PGRST205',
    message: "Could not find the table 'public.patients' in the schema cache",
  });
  assert.equal(schemaMissing.category, 'SCHEMA_NOT_MIGRATED');
  assert.equal(schemaMissing.code, 'PGRST205');
  assert.equal(schemaMissing.isMissingSchema, true);
  assert.ok(schemaMissing.userFacingMessage.includes('FULL_PHASE6_SUPABASE_SETUP.sql'));

  const invalidPath = classifySupabaseError({
    code: 'PGRST125',
    message: 'Invalid path specified in request URL',
  });
  assert.equal(invalidPath.category, 'INVALID_PATH_CONFIG');
  assert.equal(invalidPath.code, 'PGRST125');

  const rlsDenied = classifySupabaseError({
    code: '42501',
    message: 'new row violates row-level security policy for table "pharmacy_batches"',
  });
  assert.equal(rlsDenied.category, 'RLS_PERMISSION_DENIED');
  assert.equal(rlsDenied.isUnauthorized, true);
  assert.ok(rlsDenied.userFacingMessage.includes('Access Denied by PostgreSQL Row Level Security'));

  const constraintError = classifySupabaseError({
    code: '23505',
    message: 'duplicate key value violates unique constraint "patients_permanent_mrn_key"',
  });
  assert.equal(constraintError.category, 'CONSTRAINT_VIOLATION');
  assert.ok(constraintError.userFacingMessage.includes('Database Integrity Constraint Enforced'));
});

test('Phase 6C: Bidirectional databaseMappers round-trip all 9 HealthRoute modules across 33 tables accurately', () => {
  assert.equal(ALL_SUPABASE_TABLES.length, 33);
  assert.equal(ALL_SUPABASE_RPCS.length, 6);

  // 1. Staff & Doctor Directory mapping
  const sampleStaffDbRow = {
    id: 'staff-doc-1',
    hospital_id: 'HOSP-APEX-BLR-01',
    name: 'Dr. Vikram Malhotra',
    role: 'doctor',
    designation: 'Senior Consultant Cardiologist',
    department: 'Cardiology & Internal Medicine',
    specialty: 'Interventional Cardiology & Acute Coronary Care',
    qualifications: 'MBBS, MD (Internal Medicine), DM (Cardiology)',
    employee_code: 'DOC-MED-104',
    active_shift: 'Day (08:00 - 16:00)',
    phone: '+91 98450 11001',
    email: 'v.malhotra@apexhospital.demo.org',
    experience_years: 14,
    consultation_fee: 800,
    rating: 4.9,
    availability: 'Today, 10:30 AM',
    available_slots: ['09:30 AM', '10:30 AM'],
    on_duty: true,
  };
  const staffUser = mapStaffRowToStaffUser(sampleStaffDbRow);
  const docDirItem = mapStaffRowToDoctorDirectoryItem(sampleStaffDbRow);
  assert.equal(staffUser.id, 'staff-doc-1');
  assert.equal(staffUser.employeeCode, 'DOC-MED-104');
  assert.ok(docDirItem);
  assert.equal(docDirItem.id, 'staff-doc-1');

  // 2. Patient, Privacy & Access Audit round-trip
  const pat = INITIAL_PATIENTS[0];
  const patRow = mapPatientToDbRow(pat, 'staff-rec-1');
  const reconstructedPat = mapPatientRowToPatient(patRow);
  assert.equal(reconstructedPat.id, pat.id);
  assert.equal(reconstructedPat.permanentMrn, pat.permanentMrn);
  assert.deepEqual(reconstructedPat.allergies, pat.allergies);

  const privRow = mapPrivacySettingsToDbRow('pat-known-01', INITIAL_PRIVACY_SETTINGS);
  const mappedPriv = mapPrivacyRowToSettings(privRow);
  assert.equal(mappedPriv.patientId, 'pat-known-01');
  assert.equal(mappedPriv.emergencyAccessGranted, INITIAL_PRIVACY_SETTINGS.emergencyAccessGranted);

  const accAudit = INITIAL_ACCESS_AUDIT_LOGS[0];
  const mappedAccAudit = mapAccessAuditRowToRecord({
    id: accAudit.id,
    patient_id: accAudit.patientId,
    accessor_name: accAudit.accessorName,
    accessor_role: accAudit.accessorRole,
    department: accAudit.department,
    purpose: accAudit.purpose,
    action: accAudit.action,
    timestamp: accAudit.timestamp,
  });
  assert.equal(mappedAccAudit.id, accAudit.id);

  // 3. Appointments round-trip
  const apt = INITIAL_APPOINTMENTS[0];
  const aptRow = mapAppointmentToDbRow(apt);
  const mappedApt = mapAppointmentRowToAppointment(aptRow);
  assert.equal(mappedApt.id, apt.id);
  assert.equal(mappedApt.patientId, apt.patientId);
  assert.equal(mappedApt.doctorId, apt.doctorId);
  assert.equal(mappedApt.status, apt.status);

  // 4. Clinical Encounters & Prescription Items round-trip
  const enc = INITIAL_ENCOUNTERS[0];
  const { encounterRow, itemRows } = mapClinicalEncounterToDbRows(enc);
  const mappedEnc = mapEncounterRowToClinicalEncounter(encounterRow, itemRows);
  assert.equal(mappedEnc.id, enc.id);
  assert.equal(mappedEnc.prescriptions.length, enc.prescriptions.length);
  assert.equal(mappedEnc.prescriptions[0].medicineName, enc.prescriptions[0].medicineName);

  // 5. Emergency Cases, MLC, Poisoning, Referral Transfers round-trip
  const erCase = INITIAL_CASES[0];
  const erRow = mapEmergencyCaseToDbRow(erCase);
  const mappedEr = mapEmergencyCaseRow(
    erRow,
    erCase.clinicalNotes.map((t) => ({
      id: t.id,
      case_id: erCase.id,
      timestamp: t.timestamp,
      author_name: t.author,
      author_role: t.role,
      note: t.note,
      category: t.category,
    }))
  );
  assert.equal(mappedEr.id, erCase.id);
  assert.equal(mappedEr.triageLevel, erCase.triageLevel);
  assert.equal(mappedEr.clinicalNotes.length, erCase.clinicalNotes.length);

  const mlc = INITIAL_MLC_CASES[0];
  const mappedMlc = mapMlcRow(mapMlcToDbRow(mlc));
  assert.equal(mappedMlc.id, mlc.id);
  assert.equal(mappedMlc.reviewStatus, mlc.reviewStatus);

  const poison = INITIAL_POISON_CASES[0];
  const mappedPoison = mapPoisonCaseRow(mapPoisonCaseToDbRow(poison));
  assert.equal(mappedPoison.id, poison.id);
  assert.equal(mappedPoison.suspectedAgent, poison.suspectedAgent);

  const transfer = INITIAL_TRANSFERS[0];
  const mappedTransfer = mapTransferRow(mapTransferToDbRow(transfer));
  assert.equal(mappedTransfer.id, transfer.id);
  assert.equal(mappedTransfer.receivingHospital, transfer.receivingHospital);

  // 6. Clinical Documents, Patient Portal Documents, Conversations, Messages, Notifications
  const cDoc = INITIAL_DOCUMENTS[0];
  assert.equal(mapClinicalDocumentRow(mapClinicalDocumentToDbRow(cDoc)).id, cDoc.id);

  const pDoc = INITIAL_PATIENT_PORTAL_DOCUMENTS[0];
  assert.equal(mapPatientPortalDocumentRow(mapPatientPortalDocumentToDbRow(pDoc)).id, pDoc.id);

  const conv = INITIAL_CONVERSATIONS[0];
  assert.equal(mapConversationRow(mapConversationToDbRow(conv)).id, conv.id);

  const msg = INITIAL_PATIENT_MESSAGES[0];
  assert.equal(mapPatientMessageRow(mapPatientMessageToDbRow(msg)).id, msg.id);

  const notif = INITIAL_NOTIFICATIONS[0];
  assert.equal(mapNotificationRow(mapNotificationToDbRow(notif)).id, notif.id);

  // 7. Pharmacy Medicines, Batches, Dispensing, Transactions, Reorders
  const med = INITIAL_PHARMACY_MEDICINES[0];
  assert.equal(mapPharmacyMedicineRow(mapPharmacyMedicineToDbRow(med)).id, med.id);

  const batch = INITIAL_PHARMACY_BATCHES[0];
  assert.equal(
    mapPharmacyBatchRow({
      id: batch.id,
      medicine_id: batch.medicineId,
      batch_number: batch.batchNumber,
      available_quantity: batch.availableQuantity,
      expiry_date: batch.expiryDate,
      purchase_date: batch.purchaseDate,
      supplier_reference: batch.supplierReference,
      supplier_name: batch.supplierName,
      stock_location: batch.stockLocation,
      unit_of_measurement: batch.unitOfMeasurement,
      created_at: batch.createdAt,
      updated_at: batch.updatedAt,
    }).id,
    batch.id
  );

  const tx = INITIAL_PHARMACY_TRANSACTIONS[0];
  assert.equal(
    mapPharmacyTransactionRow({
      id: tx.id,
      medicine_id: tx.medicineId,
      medicine_name: tx.medicineName,
      batch_id: tx.batchId,
      batch_number: tx.batchNumber,
      transaction_type: tx.transactionType,
      quantity_delta: tx.quantityDelta,
      previous_quantity: tx.previousQuantity,
      new_quantity: tx.newQuantity,
      timestamp: tx.timestamp,
      staff_id: tx.staffId,
      staff_name: tx.staffName,
      staff_role: tx.staffRole,
      reason: tx.reason,
    }).id,
    tx.id
  );

  const reorder = INITIAL_PHARMACY_REORDER_REQUESTS[0];
  assert.equal(mapPharmacyReorderRow(mapPharmacyReorderToDbRow(reorder)).id, reorder.id);

  const disp = INITIAL_PHARMACY_DISPENSING_RECORDS[0];
  const mappedDisp = mapPharmacyDispensingRow(
    {
      id: disp.id,
      encounter_id: disp.encounterId,
      patient_id: disp.patientId,
      patient_name: disp.patientName,
      prescribing_doctor_id: disp.prescribingDoctorId,
      prescribing_doctor_name: disp.prescribingDoctorName,
      prescription_date: disp.prescriptionDate,
      dispensed_at: disp.dispensedAt,
      dispensed_by_staff_id: disp.dispensedByStaffId,
      dispensed_by_staff_name: disp.dispensedByStaffName,
      status: disp.status,
      notes: disp.notes,
    },
    disp.items.map((it, idx) => ({
      id: `${disp.id}-ITEM-${idx + 1}`,
      dispensing_record_id: disp.id,
      prescription_item_id: it.prescriptionItemId,
      medicine_id: it.medicineId,
      requested_medicine_name: it.requestedMedicineName,
      requested_generic_name: it.requestedGenericName,
      requested_strength: it.requestedStrength,
      requested_dosage_form: it.requestedDosageForm,
      prescribed_quantity: it.prescribedQuantity,
      dispensed_quantity: it.dispensedQuantity,
      previously_dispensed_quantity: it.previouslyDispensedQuantity,
      remaining_quantity: it.remainingQuantity,
      batch_id: it.batchId,
      batch_number: it.batchNumber,
      status: it.status,
      note: it.note,
    }))
  );
  assert.equal(mappedDisp.id, disp.id);
  assert.equal(mappedDisp.items.length, disp.items.length);

  // 8. Audit Logs, Medication Activities, Follow-Ups, Lab Reports
  const audit = INITIAL_AUDIT_LOGS[0];
  assert.equal(mapAuditLogRow(mapAuditLogToDbRow(audit)).id, audit.id);

  const act = INITIAL_MEDICATION_ACTIVITIES[0];
  assert.equal(mapMedicationActivityRow(mapMedicationActivityToDbRow(act)).id, act.id);

  const fu = INITIAL_FOLLOW_UPS[0];
  assert.equal(
    mapFollowUpRow({
      id: fu.id,
      patient_id: fu.patientId,
      patient_name: fu.patientName,
      patient_phone: fu.patientPhone,
      attending_doctor_id: fu.attendingDoctorId,
      attending_doctor_name: fu.attendingDoctor,
      due_date: fu.dueDate,
      reason: fu.reason,
      condition: fu.condition,
      category: fu.category,
      urgency: fu.urgency,
      status: fu.status,
    }).id,
    fu.id
  );

  const lab = INITIAL_LAB_REPORTS[0];
  const mappedLab = mapLabReportRow(
    {
      id: lab.id,
      patient_id: lab.patientId,
      patient_name: lab.patientName,
      ordering_doctor_id: lab.orderingDoctorId,
      ordering_doctor_name: lab.orderingDoctor,
      test_name: lab.testName,
      category: lab.category,
      sample_date: lab.sampleDate,
      reported_date: lab.reportedDate,
      impression: lab.impression,
      clinical_notes: lab.clinicalNotes,
      critical_panic_value: lab.criticalPanicValue,
      status: lab.status,
    },
    lab.parameters.map((p, idx) => ({
      id: `${lab.id}-P-${idx}`,
      lab_report_id: lab.id,
      parameter_order: idx + 1,
      name: p.name,
      value: p.value,
      unit: p.unit,
      reference_range: p.referenceRange,
      flag: p.flag,
    }))
  );
  assert.equal(mappedLab.id, lab.id);
  assert.equal(mappedLab.parameters.length, lab.parameters.length);
});

test('Phase 6C: Consolidated FULL_PHASE6_SUPABASE_SETUP.sql and migration 000005 contain complete 33-table schema, RLS policies, RPCs, and all 9 module seeds', () => {
  const fullSqlPath = path.resolve(process.cwd(), 'supabase/FULL_PHASE6_SUPABASE_SETUP.sql');
  const mig5Path = path.resolve(
    process.cwd(),
    'supabase/migrations/20261113000005_phase6c_complete_module_seed_and_enhancements.sql'
  );
  assert.ok(fs.existsSync(fullSqlPath), 'Missing consolidated FULL_PHASE6_SUPABASE_SETUP.sql');
  assert.ok(fs.existsSync(mig5Path), 'Missing Phase 6C migration 000005');

  const fullSql = fs.readFileSync(fullSqlPath, 'utf8');
  for (const tbl of ALL_SUPABASE_TABLES) {
    assert.ok(fullSql.includes(`CREATE TABLE IF NOT EXISTS public.${tbl}`), `Missing table ${tbl} in FULL_PHASE6_SUPABASE_SETUP.sql`);
    assert.ok(fullSql.includes(`INSERT INTO public.${tbl}`), `Missing seed INSERT for ${tbl} in FULL_PHASE6_SUPABASE_SETUP.sql`);
  }
  for (const rpc of ALL_SUPABASE_RPCS) {
    assert.ok(fullSql.includes(`CREATE OR REPLACE FUNCTION public.${rpc}`), `Missing RPC ${rpc} in FULL_PHASE6_SUPABASE_SETUP.sql`);
  }
  assert.ok(fullSql.includes('CREATE POLICY pol_med_activities_patient_update'));
});

test('Phase 6C: Seed data in 000004, 000005, and FULL_PHASE6_SUPABASE_SETUP.sql strictly satisfy patient_portal_documents_category_check and all table CHECK constraints with idempotent ON CONFLICT clauses', () => {
  const fullSqlPath = path.resolve(process.cwd(), 'supabase/FULL_PHASE6_SUPABASE_SETUP.sql');
  const mig4Path = path.resolve(
    process.cwd(),
    'supabase/migrations/20261113000004_phase6a_seed_fictional_demo_data.sql'
  );
  const mig5Path = path.resolve(
    process.cwd(),
    'supabase/migrations/20261113000005_phase6c_complete_module_seed_and_enhancements.sql'
  );

  const fullSql = fs.readFileSync(fullSqlPath, 'utf8');
  const mig4Sql = fs.readFileSync(mig4Path, 'utf8');
  const mig5Sql = fs.readFileSync(mig5Path, 'utf8');

  const allowedPortalDocCategories = new Set([
    'Medical History',
    'Consultation',
    'Prescription',
    'Laboratory',
    'Radiology / Imaging',
    'Discharge Summary',
    'Procedure / Surgery',
    'Patient Uploaded',
  ]);

  for (const [label, sqlContent] of [
    ['20261113000005_phase6c_complete_module_seed_and_enhancements.sql', mig5Sql],
    ['FULL_PHASE6_SUPABASE_SETUP.sql', fullSql],
  ] as const) {
    // Extract the INSERT INTO public.patient_portal_documents block
    const match = sqlContent.match(
      /INSERT INTO public\.patient_portal_documents[\s\S]*?ON CONFLICT[\s\S]*?;/
    );
    assert.ok(match, `Missing patient_portal_documents INSERT block in ${label}`);
    const block = match[0];

    // Verify pdoc-1 and pdoc-2 exist with preserved titles and valid categories
    assert.ok(
      block.includes("'pdoc-1'") && block.includes("'Discharge Summary'"),
      `pdoc-1 category invalid in ${label}`
    );
    assert.ok(
      block.includes("'pdoc-2'") &&
        block.includes("'Post-Procedure 12-Lead Resting ECG & 2D Echocardiogram'") &&
        block.includes("'Radiology / Imaging'"),
      `pdoc-2 must preserve title and use valid category 'Radiology / Imaging' in ${label}`
    );

    // Ensure every seeded row in patient_portal_documents uses an allowed category
    const rowCategoryRegex = /\(\s*'(pdoc-[^']+)'\s*,\s*'[^']+'\s*,\s*'[^']+'\s*,\s*'([^']+)'/g;
    let rowMatch: RegExpExecArray | null;
    let foundRows = 0;
    while ((rowMatch = rowCategoryRegex.exec(block)) !== null) {
      foundRows += 1;
      const docId = rowMatch[1];
      const category = rowMatch[2];
      assert.ok(
        allowedPortalDocCategories.has(category),
        `Row ${docId} in ${label} has invalid category '${category}' violating patient_portal_documents_category_check`
      );
    }
    assert.ok(foundRows >= 2, `Expected at least 2 patient_portal_documents seed rows in ${label}`);
  }

  // Verify every INSERT INTO public.<table_name> seed statement in 000004 and 000005 ends with an idempotent ON CONFLICT clause
  for (const [fileLabel, sqlText] of [
    ['000004', mig4Sql],
    ['000005', mig5Sql],
  ] as const) {
    const blocks = sqlText.split(/(?=\bINSERT INTO public\.[a-z_]+\b)/g).filter((b) => b.trimStart().startsWith('INSERT INTO public.'));
    assert.ok(blocks.length >= 10, `Expected at least 10 seed INSERT blocks in ${fileLabel}`);
    for (const blk of blocks) {
      assert.ok(
        /ON CONFLICT\s*(\([^)]+\))?\s*DO\s+(NOTHING|UPDATE)/i.test(blk),
        `Seed INSERT block in ${fileLabel} missing idempotent ON CONFLICT clause: ${blk.slice(0, 80)}...`
      );
    }
  }
});

