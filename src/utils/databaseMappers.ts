import {
  StaffUser,
  UserRole,
  Patient,
  EmergencyCase,
  ClinicalNote,
  MedicoLegalCase,
  PoisoningCase,
  PatientTransfer,
  HospitalDocument,
  AuditLog,
  Appointment,
  ClinicalEncounter,
  PrescriptionItem,
  FollowUpReminder,
  DiagnosticLabReport,
  LabParameter,
  DoctorDirectoryItem,
  PatientDocument,
  MessageConversation,
  PatientMessage,
  PatientNotification,
  PrivacyConsentSettings,
  AccessAuditRecord,
  PatientMedicationActivity,
  PharmacyMedicine,
  PharmacyBatch,
  PharmacyTransaction,
  PharmacyDispensingRecord,
  PharmacyDispensingItem,
  PharmacyReorderRequest,
} from '../types';

export const ALL_SUPABASE_TABLES = [
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
  'pharmacy_medicines',
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
  'pharmacy_batches',
  'pharmacy_dispensing_records',
  'pharmacy_dispensing_items',
  'pharmacy_transactions',
  'pharmacy_reorder_requests',
  'audit_logs',
] as const;

export type SupabaseTableName = (typeof ALL_SUPABASE_TABLES)[number];

export const ALL_SUPABASE_RPCS = [
  'rpc_dispense_prescription',
  'rpc_receive_pharmacy_batch_stock',
  'rpc_adjust_pharmacy_batch_stock',
  'rpc_reconcile_unidentified_patient',
  'rpc_record_patient_access_audit',
  'rpc_verify_phase6_schema_status',
] as const;

export type SupabaseRpcName = (typeof ALL_SUPABASE_RPCS)[number];

export type DatabaseErrorCategory =
  | 'SCHEMA_NOT_MIGRATED'
  | 'RLS_PERMISSION_DENIED'
  | 'CONSTRAINT_VIOLATION'
  | 'INVALID_PATH_CONFIG'
  | 'NETWORK_OR_UNKNOWN';

export interface ClassifiedDatabaseError {
  category: DatabaseErrorCategory;
  code: string;
  message: string;
  userFacingMessage: string;
  isUnauthorized: boolean;
  isMissingSchema: boolean;
}

/**
 * Pure classifier for PostgREST / PostgreSQL errors so the UI and AppContext
 * can distinguish missing SQL migrations (`PGRST205`), RLS permission denials (`42501`),
 * business constraint violations (`OVER_DISPENSE_PREVENTED`), and network failures.
 */
export function classifySupabaseError(err: unknown): ClassifiedDatabaseError {
  const rawObj = (typeof err === 'object' && err !== null ? err : {}) as Record<string, unknown>;
  const code = String(rawObj.code || '').trim();
  const message = String(
    rawObj.message || rawObj.error_description || (err instanceof Error ? err.message : err || 'Unknown database error')
  ).trim();
  const upperMsg = message.toUpperCase();

  if (
    code === 'PGRST205' ||
    code === 'PGRST202' ||
    code === '42P01' ||
    code === '42883' ||
    upperMsg.includes('COULD NOT FIND THE TABLE') ||
    upperMsg.includes('COULD NOT FIND THE FUNCTION') ||
    upperMsg.includes('SCHEMA CACHE')
  ) {
    return {
      category: 'SCHEMA_NOT_MIGRATED',
      code: code || 'PGRST205',
      message,
      userFacingMessage:
        'Supabase PostgreSQL schema migrations have not yet been executed in the Supabase SQL Editor. Run /supabase/FULL_PHASE6_SUPABASE_SETUP.sql in your Supabase Dashboard SQL Editor.',
      isUnauthorized: false,
      isMissingSchema: true,
    };
  }

  if (
    code === '42501' ||
    code === 'PGRST301' ||
    upperMsg.includes('ROW-LEVEL SECURITY') ||
    upperMsg.includes('INSUFFICIENT PRIVILEGE') ||
    upperMsg.includes('PERMISSION DENIED') ||
    upperMsg.includes('UNAUTHORIZED_')
  ) {
    return {
      category: 'RLS_PERMISSION_DENIED',
      code: code || '42501',
      message,
      userFacingMessage: `Access Denied by PostgreSQL Row Level Security: ${message}`,
      isUnauthorized: true,
      isMissingSchema: false,
    };
  }

  if (
    code === '23505' ||
    code === '23503' ||
    code === '23514' ||
    upperMsg.includes('OVER_DISPENSE_PREVENTED') ||
    upperMsg.includes('EXPIRED_BATCH_BLOCKED') ||
    upperMsg.includes('INSUFFICIENT_BATCH_STOCK') ||
    upperMsg.includes('NEGATIVE_STOCK_BLOCKED') ||
    upperMsg.includes('EXPIRED_STOCK_RECEIPT_BLOCKED')
  ) {
    return {
      category: 'CONSTRAINT_VIOLATION',
      code: code || '23514',
      message,
      userFacingMessage: `Database Integrity Constraint Enforced: ${message}`,
      isUnauthorized: false,
      isMissingSchema: false,
    };
  }

  if (code === 'PGRST125' || upperMsg.includes('INVALID PATH SPECIFIED')) {
    return {
      category: 'INVALID_PATH_CONFIG',
      code: code || 'PGRST125',
      message,
      userFacingMessage:
        'Supabase URL contains an extra path segment (such as /rest/v1/). Use the root project origin https://<project-ref>.supabase.co.',
      isUnauthorized: false,
      isMissingSchema: false,
    };
  }

  return {
    category: 'NETWORK_OR_UNKNOWN',
    code: code || 'DB_ERR',
    message,
    userFacingMessage: `Database operation failed: ${message}`,
    isUnauthorized: false,
    isMissingSchema: false,
  };
}

// =============================================================================
// 1. STAFF & DOCTOR DIRECTORY MAPPERS
// =============================================================================

export function mapStaffRowToStaffUser(row: Record<string, any>): StaffUser {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    role: (row.role as UserRole) || 'doctor',
    designation: String(row.designation || ''),
    department: String(row.department || ''),
    employeeCode: String(row.employee_code || ''),
    email: String(row.email || ''),
    phone: String(row.phone || ''),
    activeShift: (row.active_shift as StaffUser['activeShift']) || 'Day (08:00 - 16:00)',
    onDuty: row.on_duty !== false,
    station: String(row.station || 'OPD Station'),
    photoUrl: row.photo_url || undefined,
    specialty: row.specialty || undefined,
    qualifications: row.qualifications || undefined,
    experienceYears: typeof row.experience_years === 'number' ? row.experience_years : undefined,
    hospitalAffiliation: row.hospital_affiliation || undefined,
    availability: row.availability || undefined,
    gender: row.gender === 'Male' || row.gender === 'Female' ? row.gender : undefined,
  };
}

export function mapStaffRowToDoctorDirectoryItem(row: Record<string, any>): DoctorDirectoryItem | null {
  if (row.role !== 'doctor' && row.role !== 'cmo') return null;
  return {
    id: String(row.id),
    staffId: String(row.id),
    name: String(row.name || ''),
    designation: row.designation || undefined,
    station: row.station || undefined,
    employeeCode: row.employee_code || undefined,
    specialty: String(row.specialty || row.department || 'General Medicine'),
    subSpecialty: row.sub_specialty || undefined,
    qualifications: String(row.qualifications || 'MBBS, MD'),
    experienceYears: typeof row.experience_years === 'number' ? row.experience_years : 10,
    hospitalAffiliation: String(row.hospital_affiliation || 'Apex City Hospital, Bengaluru (Main Campus)'),
    department: String(row.department || 'Outpatient Department'),
    languages: Array.isArray(row.languages) && row.languages.length > 0 ? row.languages : ['English', 'Hindi', 'Kannada'],
    consultationFee: Number(row.consultation_fee ?? 1000),
    availability: row.availability || 'Available Today',
    availableSlots:
      Array.isArray(row.available_slots) && row.available_slots.length > 0
        ? row.available_slots
        : ['09:30 AM', '11:00 AM', '02:30 PM', '04:00 PM'],
    consultationTypes:
      Array.isArray(row.consultation_types) && row.consultation_types.length > 0
        ? row.consultation_types
        : ['In-Person OPD', 'Video Tele-Consult'],
    rating: Number(row.rating ?? 4.8),
    reviewsCount: Number(row.reviews_count ?? 120),
    about: String(row.about || `${row.designation || 'Specialist'} at ${row.department || 'Apex City Hospital'}.`),
    photoUrl: row.photo_url || undefined,
  };
}

// =============================================================================
// 2. PATIENT, PRIVACY & ACCESS AUDIT MAPPERS
// =============================================================================

export function mapPatientRowToPatient(row: Record<string, any>): Patient {
  return {
    id: String(row.id),
    isUnidentified: Boolean(row.is_unidentified),
    tempId: row.temp_id || undefined,
    permanentMrn: row.permanent_mrn || undefined,
    name: String(row.name || 'Patient'),
    ageEstimated: Boolean(row.age_estimated),
    age: typeof row.age === 'number' ? row.age : undefined,
    dateOfBirth: row.date_of_birth ? String(row.date_of_birth) : undefined,
    gender: (row.gender as Patient['gender']) || 'Unknown',
    bloodGroup: (row.blood_group as Patient['bloodGroup']) || undefined,
    allergies: Array.isArray(row.allergies) ? row.allergies : [],
    contactNumber: row.contact_number || undefined,
    address: row.address || undefined,
    existingConditions: Array.isArray(row.existing_conditions) ? row.existing_conditions : [],
    currentMedications: Array.isArray(row.current_medications) ? row.current_medications : [],
    verifiedMedicalHistory: Array.isArray(row.verified_medical_history) ? row.verified_medical_history : [],
    selfReportedNotes: row.self_reported_notes || undefined,
    nextOfKin: row.next_of_kin || undefined,
    emergencyContact: row.emergency_contact || undefined,
    primaryPhysicianId: row.primary_physician_id || undefined,
    primaryPhysician: row.primary_physician_name || undefined,
    abhaId: row.abha_id || undefined,
    nationalIdPlaceholder: row.national_id_placeholder || undefined,
    physicalIdentification: row.physical_identification || undefined,
    reconciledToPatientId: row.reconciled_to_patient_id || undefined,
    reconciliationHistory: Array.isArray(row.reconciliation_history) ? row.reconciliation_history : [],
    registrationTimestamp: String(row.registration_timestamp || new Date().toISOString()),
    registeredBy: String(row.registered_by_name || 'System'),
    photoUrl: row.photo_url || undefined,
    triageStatus: row.triage_status || undefined,
  };
}

export function mapPatientToDbRow(patient: Patient, registeredByStaffId?: string): Record<string, any> {
  return {
    id: patient.id,
    is_unidentified: Boolean(patient.isUnidentified),
    temp_id: patient.tempId || null,
    permanent_mrn: patient.permanentMrn || null,
    name: patient.name,
    age_estimated: Boolean(patient.ageEstimated),
    age: typeof patient.age === 'number' ? patient.age : null,
    date_of_birth: patient.dateOfBirth || null,
    gender: patient.gender || 'Unknown',
    blood_group: patient.bloodGroup || null,
    contact_number: patient.contactNumber || null,
    address: patient.address || null,
    abha_id: patient.abhaId || null,
    national_id_placeholder: patient.nationalIdPlaceholder || null,
    primary_physician_id: patient.primaryPhysicianId || null,
    primary_physician_name: patient.primaryPhysician || null,
    self_reported_notes: patient.selfReportedNotes || null,
    triage_status: patient.triageStatus || null,
    photo_url: patient.photoUrl || null,
    next_of_kin: patient.nextOfKin || null,
    emergency_contact: patient.emergencyContact || null,
    physical_identification: patient.physicalIdentification || null,
    allergies: Array.isArray(patient.allergies) ? patient.allergies : [],
    existing_conditions: Array.isArray(patient.existingConditions) ? patient.existingConditions : [],
    current_medications: Array.isArray(patient.currentMedications) ? patient.currentMedications : [],
    verified_medical_history: Array.isArray(patient.verifiedMedicalHistory) ? patient.verifiedMedicalHistory : [],
    reconciled_to_patient_id: patient.reconciledToPatientId || null,
    reconciliation_history: Array.isArray(patient.reconciliationHistory) ? patient.reconciliationHistory : [],
    registered_by_staff_id: registeredByStaffId || null,
    registered_by_name: patient.registeredBy || 'System',
    registration_timestamp: patient.registrationTimestamp || new Date().toISOString(),
  };
}

export function mapPrivacyRowToSettings(row: Record<string, any>): PrivacyConsentSettings {
  return {
    patientId: String(row.patient_id),
    emergencyAccessGranted: row.emergency_access_granted !== false,
    shareWithSpecialists: row.share_with_specialists !== false,
    familyAccessGranted: Boolean(row.family_access_granted),
    familyMemberName: row.family_member_name || undefined,
    anonymizedResearchConsent: Boolean(row.anonymized_research_consent),
    downloadRecordsPermitted: row.download_records_permitted !== false,
    smsEmailAlerts: row.sms_email_alerts !== false,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export function mapPrivacySettingsToDbRow(patientId: string, settings: PrivacyConsentSettings): Record<string, any> {
  return {
    patient_id: patientId,
    emergency_access_granted: Boolean(settings.emergencyAccessGranted),
    share_with_specialists: Boolean(settings.shareWithSpecialists),
    family_access_granted: Boolean(settings.familyAccessGranted),
    family_member_name: settings.familyMemberName || null,
    anonymized_research_consent: Boolean(settings.anonymizedResearchConsent),
    download_records_permitted: Boolean(settings.downloadRecordsPermitted),
    sms_email_alerts: Boolean(settings.smsEmailAlerts),
    updated_at: new Date().toISOString(),
  };
}

export function mapAccessAuditRowToRecord(row: Record<string, any>): AccessAuditRecord {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    accessorStaffId: row.accessor_staff_id || undefined,
    accessorName: String(row.accessor_name || ''),
    accessorRole: String(row.accessor_role || ''),
    department: String(row.department || ''),
    purpose: String(row.purpose || ''),
    action: String(row.action || ''),
    timestamp: String(row.timestamp || new Date().toISOString()),
  };
}

// =============================================================================
// 3. APPOINTMENTS, CLINICAL ENCOUNTERS & PRESCRIPTIONS MAPPERS
// =============================================================================

export function mapAppointmentRowToAppointment(row: Record<string, any>): Appointment {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    patientName: String(row.patient_name || ''),
    patientAge: Number(row.patient_age ?? 40),
    patientGender: String(row.patient_gender || 'Unknown'),
    patientPhone: String(row.patient_phone || ''),
    patientPhotoUrl: row.patient_photo_url || undefined,
    doctorId: String(row.doctor_id),
    doctorName: String(row.doctor_name || ''),
    doctorPhotoUrl: row.doctor_photo_url || undefined,
    department: row.department || undefined,
    date: String(row.appointment_date),
    timeSlot: String(row.time_slot || '10:00 AM'),
    tokenNumber: Number(row.token_number ?? 1),
    type: (row.type as Appointment['type']) || 'New Consultation',
    consultationMode: (row.consultation_mode as Appointment['consultationMode']) || 'In-Person OPD',
    status: (row.status as Appointment['status']) || 'Scheduled',
    chiefComplaint: String(row.chief_complaint || ''),
    hospitalName: row.hospital_name || undefined,
    roomNo: row.room_number || undefined,
    roomNumber: row.room_number || undefined,
    notes: row.notes || undefined,
    vitalsSnapshot: row.vitals_snapshot || undefined,
    triageStatus: row.triage_status || undefined,
    requestedByPatient: Boolean(row.requested_by_patient),
    cancellationReason: row.cancellation_reason || undefined,
    declineReason: row.decline_reason || undefined,
    acceptedByDoctorId: row.accepted_by_doctor_id || undefined,
    acceptedByDoctorName: row.accepted_by_doctor_name || undefined,
    acceptedAt: row.accepted_at ? String(row.accepted_at) : undefined,
    declinedByDoctorId: row.declined_by_doctor_id || undefined,
    declinedByDoctorName: row.declined_by_doctor_name || undefined,
    declinedAt: row.declined_at ? String(row.declined_at) : undefined,
    originalDate: row.original_date ? String(row.original_date) : undefined,
    originalTimeSlot: row.original_time_slot || undefined,
    proposedDate: row.proposed_date ? String(row.proposed_date) : undefined,
    proposedTimeSlot: row.proposed_time_slot || undefined,
    rescheduleReason: row.reschedule_reason || undefined,
    rescheduleProposedById: row.reschedule_proposed_by_id || undefined,
    rescheduleProposedBy: row.reschedule_proposed_by || undefined,
    rescheduleProposedAt: row.reschedule_proposed_at ? String(row.reschedule_proposed_at) : undefined,
    rescheduleResponseStatus: row.reschedule_response_status || undefined,
    reschedulePatientNote: row.reschedule_patient_note || undefined,
    rescheduleRespondedAt: row.reschedule_responded_at ? String(row.reschedule_responded_at) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

export function mapAppointmentToDbRow(apt: Appointment): Record<string, any> {
  return {
    id: apt.id,
    patient_id: apt.patientId,
    patient_name: apt.patientName,
    patient_age: apt.patientAge ?? null,
    patient_gender: apt.patientGender || null,
    patient_phone: apt.patientPhone || null,
    doctor_id: apt.doctorId || 'staff-doc-1',
    doctor_name: apt.doctorName,
    department: apt.department || null,
    hospital_id: 'hosp-1',
    hospital_name: apt.hospitalName || 'Apex City Hospital, Bengaluru (Main Campus)',
    room_number: apt.roomNumber || apt.roomNo || null,
    appointment_date: apt.date,
    time_slot: apt.timeSlot,
    token_number: apt.tokenNumber || 1,
    type: apt.type || 'New Consultation',
    consultation_mode: apt.consultationMode || 'In-Person OPD',
    status: apt.status,
    chief_complaint: apt.chiefComplaint || 'Clinical Consultation',
    notes: apt.notes || null,
    vitals_snapshot: apt.vitalsSnapshot || null,
    triage_status: apt.triageStatus || null,
    requested_by_patient: Boolean(apt.requestedByPatient),
    cancellation_reason: apt.cancellationReason || null,
    decline_reason: apt.declineReason || null,
    accepted_by_doctor_id: apt.acceptedByDoctorId || null,
    accepted_by_doctor_name: apt.acceptedByDoctorName || null,
    accepted_at: apt.acceptedAt || null,
    declined_by_doctor_id: apt.declinedByDoctorId || null,
    declined_by_doctor_name: apt.declinedByDoctorName || null,
    declined_at: apt.declinedAt || null,
    original_date: apt.originalDate || null,
    original_time_slot: apt.originalTimeSlot || null,
    proposed_date: apt.proposedDate || null,
    proposed_time_slot: apt.proposedTimeSlot || null,
    reschedule_reason: apt.rescheduleReason || null,
    reschedule_proposed_by_id: apt.rescheduleProposedById || null,
    reschedule_proposed_by: apt.rescheduleProposedBy || null,
    reschedule_proposed_at: apt.rescheduleProposedAt || null,
    reschedule_response_status: apt.rescheduleResponseStatus || null,
    reschedule_patient_note: apt.reschedulePatientNote || null,
    reschedule_responded_at: apt.rescheduleRespondedAt || null,
  };
}

export function mapPrescriptionItemRow(row: Record<string, any>): PrescriptionItem {
  return {
    id: String(row.id),
    encounterId: String(row.encounter_id),
    patientId: String(row.patient_id),
    prescribingDoctorId: String(row.prescribing_doctor_id),
    prescribingDoctorName: String(row.prescribing_doctor_name || ''),
    medicineName: String(row.medicine_name || row.drug_name || ''),
    drugName: String(row.drug_name || row.medicine_name || ''),
    genericName: row.generic_name || undefined,
    dosageForm: row.dosage_form || undefined,
    strength: String(row.strength || ''),
    dosage: String(row.dosage || ''),
    frequency: String(row.frequency || ''),
    duration: String(row.duration || ''),
    prescribedQuantity: typeof row.prescribed_quantity === 'number' ? row.prescribed_quantity : undefined,
    route: String(row.route || 'Oral'),
    timing: row.timing || undefined,
    instructions: row.instructions || undefined,
    createdDate: row.created_date ? String(row.created_date) : undefined,
    status: (row.status as PrescriptionItem['status']) || 'Active',
    discontinuedAt: row.discontinued_at ? String(row.discontinued_at) : undefined,
    discontinuedByDoctorId: row.discontinued_by_doctor_id || undefined,
    discontinuedByDoctorName: row.discontinued_by_doctor_name || undefined,
    discontinuedBy: row.discontinued_by_doctor_name || undefined,
    discontinuedReason: row.discontinued_reason || undefined,
  };
}

export function mapEncounterRowToClinicalEncounter(
  row: Record<string, any>,
  itemRows: Record<string, any>[]
): ClinicalEncounter {
  const matchingItems = (itemRows || [])
    .filter((ir) => String(ir.encounter_id) === String(row.id))
    .map(mapPrescriptionItemRow);

  return {
    id: String(row.id),
    appointmentId: row.appointment_id || undefined,
    patientId: String(row.patient_id),
    patientName: String(row.patient_name || ''),
    doctorId: String(row.doctor_id),
    doctorName: String(row.doctor_name || ''),
    doctorDesignation: row.doctor_designation || undefined,
    department: row.department || undefined,
    date: String(row.encounter_date),
    encounterType: (row.encounter_type as ClinicalEncounter['encounterType']) || 'OPD Consultation',
    chiefComplaint: String(row.chief_complaint || ''),
    subjectiveHistory: row.subjective_history || undefined,
    physicalExamination: row.physical_examination || undefined,
    vitals: row.vitals || undefined,
    assessmentDiagnosis: row.assessment_diagnosis || undefined,
    diagnosis: row.assessment_diagnosis || undefined,
    prescriptions: matchingItems,
    prescriptionStatus: (row.prescription_status as ClinicalEncounter['prescriptionStatus']) || 'Active',
    prescriptionCreatedDate: row.prescription_created_date ? String(row.prescription_created_date) : String(row.encounter_date),
    discontinuedAt: row.discontinued_at ? String(row.discontinued_at) : undefined,
    discontinuedBy: row.discontinued_by_name || undefined,
    discontinuedReason: row.discontinued_reason || undefined,
    orderedInvestigations: Array.isArray(row.ordered_investigations) ? row.ordered_investigations : [],
    followUpDate: row.follow_up_date ? String(row.follow_up_date) : undefined,
    clinicalAdvice: row.clinical_advice || undefined,
    status: (row.status as ClinicalEncounter['status']) || 'Signed',
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export function mapClinicalEncounterToDbRows(enc: ClinicalEncounter): {
  encounterRow: Record<string, any>;
  itemRows: Record<string, any>[];
} {
  const encounterRow: Record<string, any> = {
    id: enc.id,
    appointment_id: enc.appointmentId || null,
    patient_id: enc.patientId,
    patient_name: enc.patientName,
    doctor_id: enc.doctorId || 'staff-doc-1',
    doctor_name: enc.doctorName,
    doctor_designation: enc.doctorDesignation || null,
    department: enc.department || null,
    encounter_date: enc.date,
    encounter_type: enc.encounterType || 'OPD Consultation',
    chief_complaint: enc.chiefComplaint || 'Clinical Consultation',
    subjective_history: enc.subjectiveHistory || null,
    physical_examination: enc.physicalExamination || null,
    vitals: enc.vitals || null,
    assessment_diagnosis: enc.assessmentDiagnosis || enc.diagnosis || null,
    prescription_status: enc.prescriptionStatus || (enc.status === 'Draft' ? 'Draft' : 'Active'),
    prescription_created_date: enc.prescriptionCreatedDate || enc.date,
    discontinued_at: enc.discontinuedAt || null,
    discontinued_by_name: enc.discontinuedBy || null,
    discontinued_reason: enc.discontinuedReason || null,
    ordered_investigations: Array.isArray(enc.orderedInvestigations) ? enc.orderedInvestigations : [],
    follow_up_date: enc.followUpDate || null,
    clinical_advice: enc.clinicalAdvice || null,
    status: enc.status || 'Signed',
    updated_at: new Date().toISOString(),
  };

  const itemRows = (enc.prescriptions || []).map((rx, index) => ({
    id: rx.id || `${enc.id}-rx-${index + 1}`,
    encounter_id: enc.id,
    patient_id: rx.patientId || enc.patientId,
    prescribing_doctor_id: rx.prescribingDoctorId || enc.doctorId || 'staff-doc-1',
    prescribing_doctor_name: rx.prescribingDoctorName || enc.doctorName,
    medicine_name: rx.medicineName || rx.drugName || 'Prescribed Medication',
    drug_name: rx.drugName || rx.medicineName || 'Prescribed Medication',
    generic_name: rx.genericName || null,
    dosage_form: rx.dosageForm || 'Tablet',
    strength: rx.strength || '',
    dosage: rx.dosage || '1 tablet',
    frequency: rx.frequency || 'Once daily',
    duration: rx.duration || '5 days',
    prescribed_quantity: typeof rx.prescribedQuantity === 'number' && rx.prescribedQuantity > 0 ? rx.prescribedQuantity : null,
    route: rx.route || 'Oral',
    timing: rx.timing || null,
    instructions: rx.instructions || null,
    created_date: rx.createdDate || enc.date,
    status: rx.status || enc.prescriptionStatus || 'Active',
    discontinued_at: rx.discontinuedAt || null,
    discontinued_by_doctor_id: rx.discontinuedByDoctorId || null,
    discontinued_by_doctor_name: rx.discontinuedByDoctorName || rx.discontinuedBy || null,
    discontinued_reason: rx.discontinuedReason || null,
  }));

  return { encounterRow, itemRows };
}

export function mapMedicationActivityRow(row: Record<string, any>): PatientMedicationActivity {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    patientName: String(row.patient_name || ''),
    encounterId: String(row.encounter_id),
    prescriptionItemId: String(row.prescription_item_id),
    medicationKey: row.medication_key || `${row.encounter_id}::${row.prescription_item_id}`,
    medicineName: String(row.medicine_name || ''),
    strength: row.strength || undefined,
    dosage: row.dosage || undefined,
    status: (row.status as PatientMedicationActivity['status']) || 'Taken',
    note: row.note || undefined,
    reportedBy: 'patient',
    recordedAt: String(row.recorded_at || new Date().toISOString()),
  };
}

export function mapMedicationActivityToDbRow(act: PatientMedicationActivity): Record<string, any> {
  return {
    id: act.id,
    patient_id: act.patientId,
    patient_name: act.patientName,
    encounter_id: act.encounterId,
    prescription_item_id: act.prescriptionItemId,
    medication_key: act.medicationKey || `${act.encounterId}::${act.prescriptionItemId}`,
    medicine_name: act.medicineName,
    strength: act.strength || null,
    dosage: act.dosage || null,
    status: act.status,
    note: act.note || null,
    reported_by: 'patient',
    recorded_at: act.recordedAt,
  };
}

export function mapFollowUpRow(row: Record<string, any>): FollowUpReminder {
  const status = (row.status as FollowUpReminder['status']) || 'pending';
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    patientName: String(row.patient_name || ''),
    patientPhone: String(row.patient_phone || ''),
    attendingDoctorId: row.attending_doctor_id || undefined,
    attendingDoctor: String(row.attending_doctor_name || ''),
    dueDate: String(row.due_date),
    reason: String(row.reason || ''),
    condition: row.condition || row.category || undefined,
    category: row.category || undefined,
    urgency: (row.urgency as FollowUpReminder['urgency']) || 'routine',
    status,
    completed: status === 'completed',
  };
}

export function mapLabReportRow(
  row: Record<string, any>,
  paramRows: Record<string, any>[]
): DiagnosticLabReport {
  const params: LabParameter[] = (paramRows || [])
    .filter((p) => String(p.lab_report_id) === String(row.id))
    .sort((a, b) => Number(a.parameter_order ?? 1) - Number(b.parameter_order ?? 1))
    .map((p) => ({
      name: String(p.name || ''),
      value: String(p.value || ''),
      unit: String(p.unit || ''),
      referenceRange: String(p.reference_range || ''),
      flag: (p.flag as LabParameter['flag']) || 'Normal',
    }));

  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    patientName: String(row.patient_name || ''),
    orderingDoctorId: row.ordering_doctor_id || undefined,
    orderingDoctor: String(row.ordering_doctor_name || ''),
    testName: String(row.test_name || ''),
    category: (row.category as DiagnosticLabReport['category']) || 'Biochemistry',
    sampleDate: row.sample_date ? String(row.sample_date) : undefined,
    collectedAt: row.sample_date ? String(row.sample_date) : undefined,
    reportedDate: row.reported_date ? String(row.reported_date) : undefined,
    parameters: params,
    impression: row.impression || undefined,
    clinicalNotes: row.clinical_notes || undefined,
    criticalPanicValue: Boolean(row.critical_panic_value),
    reviewedByStaffId: row.reviewed_by_staff_id || undefined,
    reviewedBy: row.reviewed_by_name || undefined,
    status: (row.status as DiagnosticLabReport['status']) || 'Finalized',
  };
}

// =============================================================================
// 4. EMERGENCY, MLC, TOXICOLOGY, TRANSFERS & DOCUMENTS MAPPERS
// =============================================================================

export function mapEmergencyCaseRow(
  row: Record<string, any>,
  timelineRows: Record<string, any>[]
): EmergencyCase {
  const notes: ClinicalNote[] = (timelineRows || [])
    .filter((t) => String(t.case_id) === String(row.id))
    .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
    .map((t) => ({
      id: String(t.id),
      timestamp: String(t.timestamp || new Date().toISOString()),
      author: String(t.author_name || ''),
      role: String(t.author_role || ''),
      note: String(t.note || ''),
      category: (t.category as ClinicalNote['category']) || 'assessment',
    }));

  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    patientSnapshot: (row.patient_snapshot as Patient) || {
      id: String(row.patient_id),
      isUnidentified: false,
      name: 'Emergency Patient',
      gender: 'Unknown',
      registrationTimestamp: String(row.created_at || new Date().toISOString()),
      registeredBy: 'ER Staff',
    },
    triageLevel: (row.triage_level as EmergencyCase['triageLevel']) || 'YELLOW',
    esiScore: Number(row.esi_score ?? 3),
    chiefComplaint: String(row.chief_complaint || ''),
    incidentType: (row.incident_type as EmergencyCase['incidentType']) || 'General Medical Acute',
    incidentDetails: row.incident_details || { broughtBy: 'Walk-in' },
    vitals: row.vitals || {
      bp: '120/80',
      pulse: 80,
      spo2: 98,
      temp: 98.4,
      rr: 16,
      gcs: 15,
      recordedAt: String(row.created_at || new Date().toISOString()),
    },
    bedBay: String(row.bed_bay || 'Acute Bay'),
    assignedPhysicianId: row.assigned_physician_id || undefined,
    assignedPhysician: String(row.assigned_physician_name || ''),
    assignedNurseId: row.assigned_nurse_id || undefined,
    assignedNurse: String(row.assigned_nurse_name || ''),
    status: (row.status as EmergencyCase['status']) || 'Active Triage',
    isMlc: Boolean(row.is_mlc),
    mlcId: row.mlc_id || undefined,
    isPoisoning: Boolean(row.is_poisoning),
    poisonCaseId: row.poison_case_id || undefined,
    transferId: row.transfer_id || undefined,
    clinicalNotes: notes,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

export function mapEmergencyCaseToDbRow(ec: EmergencyCase): Record<string, any> {
  return {
    id: ec.id,
    patient_id: ec.patientId,
    patient_snapshot: ec.patientSnapshot,
    triage_level: ec.triageLevel,
    esi_score: ec.esiScore,
    chief_complaint: ec.chiefComplaint,
    incident_type: ec.incidentType,
    incident_details: ec.incidentDetails || { broughtBy: 'Walk-in' },
    vitals: ec.vitals,
    bed_bay: ec.bedBay,
    assigned_physician_id: ec.assignedPhysicianId || null,
    assigned_physician_name: ec.assignedPhysician,
    assigned_nurse_id: ec.assignedNurseId || null,
    assigned_nurse_name: ec.assignedNurse,
    status: ec.status,
    is_mlc: Boolean(ec.isMlc),
    mlc_id: ec.mlcId || null,
    is_poisoning: Boolean(ec.isPoisoning),
    poison_case_id: ec.poisonCaseId || null,
    transfer_id: ec.transferId || null,
    created_at: ec.createdAt,
    updated_at: ec.updatedAt || new Date().toISOString(),
  };
}

export function mapMlcRow(row: Record<string, any>): MedicoLegalCase {
  return {
    id: String(row.id),
    caseId: String(row.case_id),
    patientId: String(row.patient_id),
    patientName: String(row.patient_name || ''),
    isUnidentified: Boolean(row.is_unidentified),
    policeStation: String(row.police_station || ''),
    firOrGdNumber: row.fir_or_gd_number || undefined,
    intimationSentToPolice: Boolean(row.intimation_sent_to_police),
    policeIntimationDate: row.police_intimation_date ? String(row.police_intimation_date) : undefined,
    broughtByName: String(row.brought_by_name || ''),
    broughtByDesignation: String(row.brought_by_designation || ''),
    injuryClassification: (row.injury_classification as MedicoLegalCase['injuryClassification']) || 'Under Observation',
    wounds: Array.isArray(row.wounds) ? row.wounds : [],
    weaponOrAgentSuspected: String(row.weapon_or_agent_suspected || ''),
    intoxicationSuspected: Boolean(row.intoxication_suspected),
    smellOfAlcoholOrAgent: String(row.smell_of_alcohol_or_agent || ''),
    clothingSealedAndHandedOver: Boolean(row.clothing_sealed_and_handed_over),
    sealedArticlesDescription: String(row.sealed_articles_description || ''),
    cmoStaffId: row.cmo_staff_id || undefined,
    cmoName: String(row.cmo_name || ''),
    reviewStatus: (row.review_status as MedicoLegalCase['reviewStatus']) || 'Draft',
    cmoSignedAt: row.cmo_signed_at ? String(row.cmo_signed_at) : undefined,
    remarks: String(row.remarks || ''),
    legalDisclaimerAcknowledged: Boolean(row.legal_disclaimer_acknowledged),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

export function mapMlcToDbRow(mlc: MedicoLegalCase, cmoStaffId?: string): Record<string, any> {
  return {
    id: mlc.id,
    case_id: mlc.caseId,
    patient_id: mlc.patientId,
    patient_name: mlc.patientName,
    is_unidentified: Boolean(mlc.isUnidentified),
    police_station: mlc.policeStation,
    fir_or_gd_number: mlc.firOrGdNumber || null,
    intimation_sent_to_police: Boolean(mlc.intimationSentToPolice),
    police_intimation_date: mlc.policeIntimationDate || null,
    brought_by_name: mlc.broughtByName,
    brought_by_designation: mlc.broughtByDesignation,
    injury_classification: mlc.injuryClassification,
    wounds: Array.isArray(mlc.wounds) ? mlc.wounds : [],
    weapon_or_agent_suspected: mlc.weaponOrAgentSuspected,
    intoxication_suspected: Boolean(mlc.intoxicationSuspected),
    smell_of_alcohol_or_agent: mlc.smellOfAlcoholOrAgent || null,
    clothing_sealed_and_handed_over: Boolean(mlc.clothingSealedAndHandedOver),
    sealed_articles_description: mlc.sealedArticlesDescription || null,
    cmo_staff_id: mlc.cmoStaffId || cmoStaffId || null,
    cmo_name: mlc.cmoName,
    review_status: mlc.reviewStatus,
    cmo_signed_at: mlc.cmoSignedAt || null,
    remarks: mlc.remarks || null,
    legal_disclaimer_acknowledged: Boolean(mlc.legalDisclaimerAcknowledged),
    updated_at: mlc.updatedAt || new Date().toISOString(),
  };
}

export function mapPoisonCaseRow(row: Record<string, any>): PoisoningCase {
  return {
    id: String(row.id),
    caseId: String(row.case_id),
    patientId: String(row.patient_id),
    patientName: String(row.patient_name || ''),
    suspectedAgent: (row.suspected_agent as PoisoningCase['suspectedAgent']) || 'Unknown Chemical',
    commercialBrandOrLocalName: row.commercial_brand_or_local_name || undefined,
    estimatedTimeOfIngestion: String(row.estimated_time_of_ingestion || ''),
    routeOfExposure: (row.route_of_exposure as PoisoningCase['routeOfExposure']) || 'Oral Ingestion',
    quantityEstimated: row.quantity_estimated || undefined,
    containerBrought: Boolean(row.container_brought),
    vomitusDetails: row.vomitus_details || undefined,
    clinicalPresentation: row.clinical_presentation || {
      sludgeSigns: false,
      pupils: 'Normal',
      secretions: 'Dry',
      fasciculations: false,
      convulsions: false,
      respiratoryDepression: false,
      characteristicOdor: 'None',
    },
    decontaminationActions: row.decontamination_actions || {
      gastricLavageDone: false,
      activatedCharcoalAdministered: false,
      bodyDecontaminationWash: false,
    },
    antidotesAdministered: Array.isArray(row.antidotes_administered) ? row.antidotes_administered : [],
    atropinizationStatus: row.atropinization_status || {
      isAtropinized: false,
      pulseTargetAchieved: false,
      dryAxillae: false,
      pupilsDilated: false,
      chestClearOfRhonchi: false,
      systolicBpAdequate: false,
    },
    toxicologySamplesCollected: Boolean(row.toxicology_samples_collected),
    samplePreservative: String(row.sample_preservative || ''),
    supervisingToxicologistOrCMO: String(row.supervising_toxicologist_or_cmo || ''),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

export function mapPoisonCaseToDbRow(poison: PoisoningCase, cmoStaffId?: string): Record<string, any> {
  return {
    id: poison.id,
    case_id: poison.caseId,
    patient_id: poison.patientId,
    patient_name: poison.patientName,
    suspected_agent: poison.suspectedAgent,
    commercial_brand_or_local_name: poison.commercialBrandOrLocalName || null,
    estimated_time_of_ingestion: poison.estimatedTimeOfIngestion,
    route_of_exposure: poison.routeOfExposure,
    quantity_estimated: poison.quantityEstimated || null,
    container_brought: Boolean(poison.containerBrought),
    vomitus_details: poison.vomitusDetails || null,
    clinical_presentation: poison.clinicalPresentation,
    decontamination_actions: poison.decontaminationActions,
    antidotes_administered: Array.isArray(poison.antidotesAdministered) ? poison.antidotesAdministered : [],
    atropinization_status: poison.atropinizationStatus,
    toxicology_samples_collected: Boolean(poison.toxicologySamplesCollected),
    sample_preservative: poison.samplePreservative || null,
    supervising_cmo_staff_id: cmoStaffId || null,
    supervising_toxicologist_or_cmo: poison.supervisingToxicologistOrCMO,
    updated_at: poison.updatedAt || new Date().toISOString(),
  };
}

export function mapTransferRow(row: Record<string, any>): PatientTransfer {
  return {
    id: String(row.id),
    caseId: String(row.case_id),
    patientId: String(row.patient_id),
    patientName: String(row.patient_name || ''),
    originatingHospital: String(row.originating_hospital || ''),
    receivingHospital: String(row.receiving_hospital || ''),
    receivingDepartment: String(row.receiving_department || ''),
    receivingDoctorOrCoordinator: String(row.receiving_doctor_or_coordinator || ''),
    acceptanceConfirmed: Boolean(row.acceptance_confirmed),
    acceptanceReferenceCode: row.acceptance_reference_code || undefined,
    clinicalReason: (row.clinical_reason as PatientTransfer['clinicalReason']) || 'Specialized Neuro-trauma / CT Surgery Intervention',
    summaryAtTransfer: row.summary_at_transfer || {
      triageCategory: 'RED',
      gcsScore: '15/15',
      currentVitals: 'Stable',
      interventionsGiven: 'Primary stabilization',
      airwayStatus: 'Room Air',
      ongoingInfusions: 'NS',
    },
    transportDetails: row.transport_details || {
      ambulanceType: 'Advanced Life Support (ALS)',
      vehicleRegNumber: 'KA-01-G-108',
      driverOrEMTName: 'EMT Crew',
      contactPhone: '+91 98450 00000',
      accompanyingStaff: 'ER Team',
      departureTime: '00:00',
      estimatedArrival: '30 mins',
      transitChecklistPassed: true,
    },
    status: (row.status as PatientTransfer['status']) || 'Initiated',
    handoverNotes: row.handover_notes || undefined,
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

export function mapTransferToDbRow(trf: PatientTransfer): Record<string, any> {
  return {
    id: trf.id,
    case_id: trf.caseId,
    patient_id: trf.patientId,
    patient_name: trf.patientName,
    originating_hospital: trf.originatingHospital,
    receiving_hospital: trf.receivingHospital,
    receiving_department: trf.receivingDepartment,
    receiving_doctor_or_coordinator: trf.receivingDoctorOrCoordinator,
    acceptance_confirmed: Boolean(trf.acceptanceConfirmed),
    acceptance_reference_code: trf.acceptanceReferenceCode || null,
    clinical_reason: trf.clinicalReason,
    summary_at_transfer: trf.summaryAtTransfer,
    transport_details: trf.transportDetails,
    status: trf.status,
    handover_notes: trf.handoverNotes || null,
    updated_at: trf.updatedAt || new Date().toISOString(),
  };
}

export function mapClinicalDocumentRow(row: Record<string, any>): HospitalDocument {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    docType: (row.doc_type as HospitalDocument['docType']) || 'EMERGENCY_CASE_SHEET',
    caseId: String(row.case_id || ''),
    patientId: String(row.patient_id),
    patientName: String(row.patient_name || ''),
    isUnidentified: Boolean(row.is_unidentified),
    tempId: row.temp_id || undefined,
    author: String(row.author_name || ''),
    generatedAt: String(row.generated_at || new Date().toISOString()),
    status: (row.status as HospitalDocument['status']) || 'Finalized',
    summaryExcerpt: String(row.summary_excerpt || ''),
  };
}

export function mapClinicalDocumentToDbRow(doc: HospitalDocument, authorStaffId?: string): Record<string, any> {
  return {
    id: doc.id,
    title: doc.title,
    doc_type: doc.docType,
    case_id: doc.caseId || null,
    patient_id: doc.patientId,
    patient_name: doc.patientName,
    is_unidentified: Boolean(doc.isUnidentified),
    temp_id: doc.tempId || null,
    author_staff_id: authorStaffId || null,
    author_name: doc.author,
    status: doc.status,
    summary_excerpt: doc.summaryExcerpt,
    generated_at: doc.generatedAt || new Date().toISOString(),
  };
}

export function mapPatientPortalDocumentRow(row: Record<string, any>): PatientDocument {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    title: String(row.title || ''),
    category: (row.category as PatientDocument['category']) || 'Patient Uploaded',
    source: String(row.source || ''),
    date: String(row.document_date || new Date().toISOString().split('T')[0]),
    isVerified: Boolean(row.is_verified),
    fileType: (row.file_type as PatientDocument['fileType']) || 'PDF',
    fileSize: String(row.file_size || '1.0 MB'),
    summary: String(row.summary || ''),
    tags: Array.isArray(row.tags) ? row.tags : [],
    downloadUrl: row.download_url || undefined,
  };
}

export function mapPatientPortalDocumentToDbRow(doc: PatientDocument): Record<string, any> {
  return {
    id: doc.id,
    patient_id: doc.patientId,
    title: doc.title,
    category: doc.category,
    source: doc.source,
    document_date: doc.date,
    is_verified: Boolean(doc.isVerified),
    file_type: doc.fileType,
    file_size: doc.fileSize,
    summary: doc.summary,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    download_url: doc.downloadUrl || null,
  };
}

// =============================================================================
// 5. TWO-WAY MESSAGING & NOTIFICATIONS MAPPERS
// =============================================================================

export function mapConversationRow(row: Record<string, any>): MessageConversation {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    patientName: String(row.patient_name || ''),
    patientPhotoUrl: row.patient_photo_url || undefined,
    doctorId: String(row.doctor_id),
    doctorName: String(row.doctor_name || ''),
    doctorSpecialty: row.doctor_specialty || undefined,
    doctorDepartment: row.doctor_department || undefined,
    doctorPhotoUrl: row.doctor_photo_url || undefined,
    relatedAppointmentId: row.related_appointment_id || undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
    lastMessageAt: String(row.last_message_at || new Date().toISOString()),
    status: (row.status as MessageConversation['status']) || 'Active',
  };
}

export function mapConversationToDbRow(conv: MessageConversation): Record<string, any> {
  return {
    id: conv.id,
    patient_id: conv.patientId,
    patient_name: conv.patientName,
    patient_photo_url: conv.patientPhotoUrl || null,
    doctor_id: conv.doctorId,
    doctor_name: conv.doctorName,
    doctor_specialty: conv.doctorSpecialty || null,
    doctor_department: conv.doctorDepartment || null,
    doctor_photo_url: conv.doctorPhotoUrl || null,
    related_appointment_id: conv.relatedAppointmentId || null,
    status: conv.status || 'Active',
    created_at: conv.createdAt,
    last_message_at: conv.lastMessageAt,
  };
}

export function mapPatientMessageRow(row: Record<string, any>): PatientMessage {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    patientId: String(row.patient_id),
    patientName: row.patient_name || undefined,
    doctorId: String(row.doctor_id),
    doctorName: String(row.doctor_name || ''),
    doctorSpecialty: row.doctor_specialty || undefined,
    doctorPhotoUrl: row.doctor_photo_url || undefined,
    senderId: String(row.sender_id),
    senderRole: (row.sender_role as PatientMessage['senderRole']) || 'Patient',
    sender: (row.sender as PatientMessage['sender']) || 'patient',
    text: String(row.text || ''),
    timestamp: String(row.timestamp || new Date().toISOString()),
    isRead: Boolean(row.is_read),
    readAt: row.read_at ? String(row.read_at) : undefined,
    category: row.category || undefined,
    relatedAppointmentId: row.related_appointment_id || undefined,
    attachment: row.attachment || undefined,
  };
}

export function mapPatientMessageToDbRow(msg: PatientMessage): Record<string, any> {
  return {
    id: msg.id,
    conversation_id: msg.conversationId,
    patient_id: msg.patientId,
    patient_name: msg.patientName || null,
    doctor_id: msg.doctorId,
    doctor_name: msg.doctorName,
    doctor_specialty: msg.doctorSpecialty || null,
    doctor_photo_url: msg.doctorPhotoUrl || null,
    sender_id: msg.senderId,
    sender_role: msg.senderRole,
    sender: msg.sender,
    text: msg.text,
    category: msg.category || null,
    related_appointment_id: msg.relatedAppointmentId || null,
    attachment: msg.attachment || null,
    is_read: Boolean(msg.isRead),
    read_at: msg.readAt || null,
    timestamp: msg.timestamp,
  };
}

export function mapNotificationRow(row: Record<string, any>): PatientNotification {
  return {
    id: String(row.id),
    patientId: String(row.patient_id || 'HOSPITAL-PHARMACY'),
    doctorId: row.doctor_id || undefined,
    appointmentId: row.appointment_id || undefined,
    encounterId: row.encounter_id || undefined,
    conversationId: row.conversation_id || undefined,
    messageId: row.message_id || undefined,
    dedupKey: row.dedup_key || undefined,
    targetAudience: (row.target_audience as PatientNotification['targetAudience']) || 'patient',
    category: (row.category as PatientNotification['category']) || 'announcement',
    title: String(row.title || ''),
    message: String(row.message || ''),
    timestamp: String(row.timestamp || new Date().toISOString()),
    isRead: Boolean(row.is_read),
    actionTab: row.action_tab || undefined,
    priority: (row.priority as PatientNotification['priority']) || 'normal',
  };
}

export function mapNotificationToDbRow(notif: PatientNotification): Record<string, any> {
  const isPharmacyTarget = notif.targetAudience === 'pharmacy';
  const normalizedPatientId =
    isPharmacyTarget && (!notif.patientId || notif.patientId === 'HOSPITAL-PHARMACY')
      ? null
      : notif.patientId;

  return {
    id: notif.id,
    patient_id: normalizedPatientId,
    doctor_id: notif.doctorId || null,
    appointment_id: notif.appointmentId || null,
    encounter_id: notif.encounterId || null,
    conversation_id: notif.conversationId || null,
    message_id: notif.messageId || null,
    dedup_key: notif.dedupKey || null,
    target_audience: notif.targetAudience || 'patient',
    category: notif.category,
    title: notif.title,
    message: notif.message,
    is_read: Boolean(notif.isRead),
    action_tab: notif.actionTab || null,
    priority: notif.priority || 'normal',
    timestamp: notif.timestamp,
  };
}

// =============================================================================
// 6. HOSPITAL PHARMACY & AUDIT LOG MAPPERS
// =============================================================================

export function mapPharmacyMedicineRow(row: Record<string, any>): PharmacyMedicine {
  return {
    id: String(row.id),
    genericName: String(row.generic_name || ''),
    brandName: row.brand_name || undefined,
    strength: String(row.strength || ''),
    dosageForm: (row.dosage_form as PharmacyMedicine['dosageForm']) || 'Tablet',
    manufacturer: String(row.manufacturer || ''),
    category: String(row.category || ''),
    storageRequirements: row.storage_requirements || undefined,
    unitOfMeasurement: String(row.unit_of_measurement || 'Tablets'),
    minimumStockThreshold: Number(row.minimum_stock_threshold ?? 10),
    status: (row.status as PharmacyMedicine['status']) || 'Active',
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

export function mapPharmacyMedicineToDbRow(med: PharmacyMedicine): Record<string, any> {
  return {
    id: med.id,
    generic_name: med.genericName,
    brand_name: med.brandName || null,
    strength: med.strength,
    dosage_form: med.dosageForm,
    manufacturer: med.manufacturer,
    category: med.category,
    storage_requirements: med.storageRequirements || null,
    unit_of_measurement: med.unitOfMeasurement,
    minimum_stock_threshold: med.minimumStockThreshold,
    status: med.status,
    created_at: med.createdAt,
    updated_at: med.updatedAt,
  };
}

export function mapPharmacyBatchRow(row: Record<string, any>): PharmacyBatch {
  return {
    id: String(row.id),
    medicineId: String(row.medicine_id),
    batchNumber: String(row.batch_number || ''),
    availableQuantity: Number(row.available_quantity ?? 0),
    expiryDate: String(row.expiry_date),
    purchaseDate: String(row.purchase_date),
    supplierReference: String(row.supplier_reference || ''),
    supplierName: String(row.supplier_name || ''),
    stockLocation: String(row.stock_location || ''),
    unitOfMeasurement: String(row.unit_of_measurement || 'Tablets'),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

export function mapPharmacyDispensingRow(
  row: Record<string, any>,
  itemRows: Record<string, any>[]
): PharmacyDispensingRecord {
  const items: PharmacyDispensingItem[] = (itemRows || [])
    .filter((ir) => String(ir.dispensing_record_id) === String(row.id))
    .map((ir) => ({
      prescriptionItemId: String(ir.prescription_item_id),
      medicineId: ir.medicine_id || undefined,
      requestedMedicineName: String(ir.requested_medicine_name || ''),
      requestedGenericName: String(ir.requested_generic_name || ''),
      requestedStrength: String(ir.requested_strength || ''),
      requestedDosageForm: (ir.requested_dosage_form as PharmacyDispensingItem['requestedDosageForm']) || 'Tablet',
      prescribedQuantity: Number(ir.prescribed_quantity ?? 1),
      dispensedQuantity: Number(ir.dispensed_quantity ?? 0),
      previouslyDispensedQuantity: Number(ir.previously_dispensed_quantity ?? 0),
      remainingQuantity: Number(ir.remaining_quantity ?? 0),
      batchId: ir.batch_id || undefined,
      batchNumber: ir.batch_number || undefined,
      status: (ir.status as PharmacyDispensingItem['status']) || 'Dispensed',
      note: ir.note || undefined,
    }));

  return {
    id: String(row.id),
    encounterId: String(row.encounter_id),
    patientId: String(row.patient_id),
    patientName: String(row.patient_name || ''),
    prescribingDoctorId: row.prescribing_doctor_id || undefined,
    prescribingDoctorName: String(row.prescribing_doctor_name || ''),
    prescriptionDate: String(row.prescription_date),
    dispensedAt: String(row.dispensed_at || new Date().toISOString()),
    dispensedByStaffId: String(row.dispensed_by_staff_id),
    dispensedByStaffName: String(row.dispensed_by_staff_name || ''),
    status: (row.status as PharmacyDispensingRecord['status']) || 'Fully Dispensed',
    items,
    notes: row.notes || undefined,
  };
}

export function mapPharmacyTransactionRow(row: Record<string, any>): PharmacyTransaction {
  return {
    id: String(row.id),
    medicineId: String(row.medicine_id),
    medicineName: String(row.medicine_name || ''),
    batchId: row.batch_id || undefined,
    batchNumber: row.batch_number || undefined,
    transactionType: (row.transaction_type as PharmacyTransaction['transactionType']) || 'Stock Adjustment',
    quantityDelta: Number(row.quantity_delta ?? 0),
    previousQuantity: Number(row.previous_quantity ?? 0),
    newQuantity: Number(row.new_quantity ?? 0),
    timestamp: String(row.timestamp || new Date().toISOString()),
    staffId: String(row.staff_id),
    staffName: String(row.staff_name || ''),
    staffRole: (row.staff_role as UserRole) || 'pharmacist',
    reason: String(row.reason || ''),
    relatedPrescriptionId: row.related_prescription_id || undefined,
    relatedPrescriptionItemId: row.related_prescription_item_id || undefined,
    relatedDispensingRecordId: row.related_dispensing_record_id || undefined,
    patientId: row.patient_id || undefined,
    patientName: row.patient_name || undefined,
  };
}

export function mapPharmacyReorderRow(row: Record<string, any>): PharmacyReorderRequest {
  return {
    id: String(row.id),
    medicineId: String(row.medicine_id),
    genericName: String(row.generic_name || ''),
    brandName: row.brand_name || undefined,
    strength: String(row.strength || ''),
    dosageForm: (row.dosage_form as PharmacyReorderRequest['dosageForm']) || 'Tablet',
    requestedQuantity: Number(row.requested_quantity ?? 0),
    currentUsableStock: Number(row.current_usable_stock ?? 0),
    minimumThreshold: Number(row.minimum_threshold ?? 0),
    supplierName: String(row.supplier_name || ''),
    supplierReference: row.supplier_reference || undefined,
    reason: (row.reason as PharmacyReorderRequest['reason']) || 'Low Stock',
    status: (row.status as PharmacyReorderRequest['status']) || 'Draft',
    createdAt: String(row.created_at || new Date().toISOString()),
    createdBy: String(row.created_by || ''),
    notes: row.notes || undefined,
  };
}

export function mapPharmacyReorderToDbRow(req: PharmacyReorderRequest, staffId?: string): Record<string, any> {
  return {
    id: req.id,
    medicine_id: req.medicineId,
    generic_name: req.genericName,
    brand_name: req.brandName || null,
    strength: req.strength,
    dosage_form: req.dosageForm,
    requested_quantity: req.requestedQuantity,
    current_usable_stock: req.currentUsableStock,
    minimum_threshold: req.minimumThreshold,
    supplier_name: req.supplierName,
    supplier_reference: req.supplierReference || null,
    reason: req.reason,
    status: req.status,
    created_by_staff_id: staffId || null,
    created_by: req.createdBy,
    notes: req.notes || null,
    created_at: req.createdAt,
  };
}

export function mapAuditLogRow(row: Record<string, any>): AuditLog {
  return {
    id: String(row.id),
    timestamp: String(row.timestamp || new Date().toISOString()),
    userId: String(row.user_id || ''),
    userName: String(row.user_name || ''),
    userRole: (row.user_role as UserRole) || 'doctor',
    action: String(row.action || ''),
    targetType: (row.target_type as AuditLog['targetType']) || 'SYSTEM',
    targetId: String(row.target_id || ''),
    details: String(row.details || ''),
    ipStation: String(row.ip_station || 'HIS-TERMINAL'),
  };
}

export function mapAuditLogToDbRow(log: AuditLog): Record<string, any> {
  return {
    id: log.id,
    user_id: log.userId,
    user_name: log.userName,
    user_role: log.userRole,
    action: log.action,
    target_type: log.targetType,
    target_id: log.targetId,
    details: log.details,
    ip_station: log.ipStation || 'HIS-TERMINAL',
    timestamp: log.timestamp,
  };
}
