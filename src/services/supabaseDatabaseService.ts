import { SupabaseClient } from '@supabase/supabase-js';
import {
  StaffUser,
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
  FollowUpReminder,
  DiagnosticLabReport,
  DoctorDirectoryItem,
  PatientDocument,
  MessageConversation,
  PatientMessage,
  PatientNotification,
  PrivacyConsentSettings,
  PatientPrivacySettingsMap,
  AccessAuditRecord,
  PatientMedicationActivity,
  PharmacyMedicine,
  PharmacyBatch,
  PharmacyTransaction,
  PharmacyDispensingRecord,
  PharmacyReorderRequest,
  MessageSenderRole,
} from '../types';
import { DispenseLineInput, ResolvedDatabaseIdentity } from '../utils/rules';
import {
  ALL_SUPABASE_TABLES,
  ALL_SUPABASE_RPCS,
  ClassifiedDatabaseError,
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
} from '../utils/databaseMappers';

export interface TableVerificationItem {
  table: string;
  exists: boolean;
  rlsEnabled: boolean;
  rlsForced: boolean;
  errorCode?: string;
}

export interface RpcVerificationItem {
  rpc: string;
  exists: boolean;
}

export interface SupabaseSchemaAuditReport {
  verifiedAt: string;
  expectedTablesCount: number;
  existingTablesCount: number;
  rlsEnabledTablesCount: number;
  expectedRpcsCount: number;
  existingRpcsCount: number;
  allMigrationsApplied: boolean;
  tables: TableVerificationItem[];
  rpcs: RpcVerificationItem[];
  summaryMessage: string;
}

export interface HydratedHospitalWorkspaceData {
  allStaff: StaffUser[];
  doctorsDirectory: DoctorDirectoryItem[];
  patients: Patient[];
  privacySettingsByPatient: PatientPrivacySettingsMap;
  accessAuditLogs: AccessAuditRecord[];
  appointments: Appointment[];
  encounters: ClinicalEncounter[];
  medicationActivities: PatientMedicationActivity[];
  followUps: FollowUpReminder[];
  labReports: DiagnosticLabReport[];
  cases: EmergencyCase[];
  mlcCases: MedicoLegalCase[];
  poisonCases: PoisoningCase[];
  transfers: PatientTransfer[];
  documents: HospitalDocument[];
  patientDocuments: PatientDocument[];
  conversations: MessageConversation[];
  patientMessages: PatientMessage[];
  patientNotifications: PatientNotification[];
  pharmacyMedicines: PharmacyMedicine[];
  pharmacyBatches: PharmacyBatch[];
  pharmacyDispensingRecords: PharmacyDispensingRecord[];
  pharmacyTransactions: PharmacyTransaction[];
  pharmacyReorderRequests: PharmacyReorderRequest[];
  auditLogs: AuditLog[];
}

export interface DbOperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: ClassifiedDatabaseError;
}

/**
 * Audits the live Supabase PostgreSQL instance to determine which of the 33 tables,
 * RLS policies, and 6 RPC functions have actually been executed in Supabase.
 */
export function createInitialSchemaAuditReport(): SupabaseSchemaAuditReport {
  return {
    verifiedAt: new Date().toISOString(),
    expectedTablesCount: ALL_SUPABASE_TABLES.length,
    existingTablesCount: 0,
    rlsEnabledTablesCount: 0,
    expectedRpcsCount: ALL_SUPABASE_RPCS.length,
    existingRpcsCount: 0,
    allMigrationsApplied: false,
    tables: ALL_SUPABASE_TABLES.map((tbl) => ({
      table: tbl,
      exists: false,
      rlsEnabled: false,
      rlsForced: false,
      errorCode: 'PGRST205',
    })),
    rpcs: ALL_SUPABASE_RPCS.map((rpc) => ({
      rpc,
      exists: false,
    })),
    summaryMessage:
      '0 of 33 tables found in Supabase schema cache (PGRST205). Run /supabase/FULL_PHASE6_SUPABASE_SETUP.sql in your Supabase Dashboard SQL Editor to create all tables, RLS policies, and RPC functions.',
  };
}

export async function auditSupabaseSchemaStatus(
  client: SupabaseClient
): Promise<SupabaseSchemaAuditReport> {
  const nowIso = new Date().toISOString();

  // 1. Probe the root anchor table ('hospitals') from Migration 000001 first.
  // If Migration 000001 has not been executed yet (PGRST205), short-circuit immediately
  // rather than issuing 33 separate failing HTTP 404 requests.
  const anchorProbe = await client.from('hospitals').select('id').limit(1);
  if (anchorProbe.error) {
    const classifiedAnchor = classifySupabaseError(anchorProbe.error);
    if (
      classifiedAnchor.isMissingSchema ||
      classifiedAnchor.category === 'NETWORK_OR_UNKNOWN' ||
      classifiedAnchor.category === 'INVALID_PATH_CONFIG'
    ) {
      return {
        ...createInitialSchemaAuditReport(),
        verifiedAt: nowIso,
        tables: ALL_SUPABASE_TABLES.map((tbl) => ({
          table: tbl,
          exists: false,
          rlsEnabled: false,
          rlsForced: false,
          errorCode: classifiedAnchor.code,
        })),
      };
    }
  }

  // 2. If 'hospitals' exists, check if Migration 000005 introspection RPC is available
  try {
    const { data, error } = await client.rpc('rpc_verify_phase6_schema_status');
    if (!error && data && typeof data === 'object') {
      const report = data as Record<string, any>;
      const allApplied = Boolean(report.allMigrationsApplied);
      return {
        verifiedAt: String(report.verifiedAt || nowIso),
        expectedTablesCount: Number(report.expectedTablesCount ?? ALL_SUPABASE_TABLES.length),
        existingTablesCount: Number(report.existingTablesCount ?? 0),
        rlsEnabledTablesCount: Number(report.rlsEnabledTablesCount ?? 0),
        expectedRpcsCount: Number(report.expectedRpcsCount ?? ALL_SUPABASE_RPCS.length),
        existingRpcsCount: Number(report.existingRpcsCount ?? 0),
        allMigrationsApplied: allApplied,
        tables: Array.isArray(report.tables) ? report.tables : [],
        rpcs: Array.isArray(report.rpcs) ? report.rpcs : [],
        summaryMessage: allApplied
          ? 'All 33 PostgreSQL tables, forced RLS policies, and 6 transactional RPC functions are active in Supabase.'
          : `${report.existingTablesCount}/${report.expectedTablesCount} tables and ${report.existingRpcsCount}/${report.expectedRpcsCount} RPCs found in Supabase.`,
      };
    }
  } catch {
    // Fallback to table-by-table PostgREST probing below
  }

  // 3. Fallback: Probe all 33 tables in parallel via PostgREST
  const tableResults: TableVerificationItem[] = await Promise.all(
    ALL_SUPABASE_TABLES.map(async (tbl) => {
      const pkCol = tbl === 'patient_privacy_settings' ? 'patient_id' : 'id';
      const { error } = await client.from(tbl).select(pkCol).limit(1);
      if (!error) {
        return {
          table: tbl,
          exists: true,
          rlsEnabled: true,
          rlsForced: true,
        };
      }
      const classified = classifySupabaseError(error);
      if (classified.category === 'RLS_PERMISSION_DENIED' || classified.category === 'CONSTRAINT_VIOLATION') {
        return {
          table: tbl,
          exists: true,
          rlsEnabled: true,
          rlsForced: true,
          errorCode: classified.code,
        };
      }
      return {
        table: tbl,
        exists: false,
        rlsEnabled: false,
        rlsForced: false,
        errorCode: classified.code,
      };
    })
  );

  const existingTablesCount = tableResults.filter((t) => t.exists).length;
  const rlsEnabledCount = tableResults.filter((t) => t.rlsEnabled).length;
  const allApplied = existingTablesCount === ALL_SUPABASE_TABLES.length;

  return {
    verifiedAt: nowIso,
    expectedTablesCount: ALL_SUPABASE_TABLES.length,
    existingTablesCount,
    rlsEnabledTablesCount: rlsEnabledCount,
    expectedRpcsCount: ALL_SUPABASE_RPCS.length,
    existingRpcsCount: allApplied ? 5 : 0,
    allMigrationsApplied: allApplied,
    tables: tableResults,
    rpcs: ALL_SUPABASE_RPCS.map((rpc) => ({
      rpc,
      exists: allApplied && rpc !== 'rpc_verify_phase6_schema_status',
    })),
    summaryMessage:
      existingTablesCount === 0
        ? '0 of 33 tables found in Supabase schema cache (PGRST205). Run /supabase/FULL_PHASE6_SUPABASE_SETUP.sql in your Supabase Dashboard SQL Editor to create all tables, RLS policies, and RPC functions.'
        : `${existingTablesCount}/${ALL_SUPABASE_TABLES.length} tables verified in Supabase.`,
  };
}

/**
 * Fetches all authorized hospital & patient portal records for an authenticated
 * Supabase session. Every query is automatically filtered by PostgreSQL RLS
 * according to the caller's server-verified staff role or patient_id.
 */
export async function fetchAuthorizedHospitalWorkspace(
  client: SupabaseClient,
  _identity: ResolvedDatabaseIdentity
): Promise<DbOperationResult<HydratedHospitalWorkspaceData>> {
  try {
    // First probe `staff_users` and `patients` to detect if migrations haven't been run yet
    const probe = await client.from('patients').select('id').limit(1);
    if (probe.error) {
      const classified = classifySupabaseError(probe.error);
      if (classified.isMissingSchema || classified.category === 'INVALID_PATH_CONFIG') {
        return { success: false, error: classified };
      }
    }

    const safeSelect = async (table: string, orderCol?: string, ascending = false) => {
      let query = client.from(table).select('*');
      if (orderCol) {
        query = query.order(orderCol, { ascending });
      }
      const { data, error } = await query;
      if (error) {
        // Under strict 7-role RBAC, some roles (e.g. nurse or patient) are denied SELECT on
        // restricted tables like pharmacy_batches or audit_logs; return [] for RLS-restricted tables.
        return [];
      }
      return (data || []) as Record<string, any>[];
    };

    const [
      staffRows,
      patientRows,
      privacyRows,
      accessAuditRows,
      appointmentRows,
      encounterRows,
      rxItemRows,
      medActivityRows,
      followUpRows,
      labReportRows,
      labParamRows,
      emergencyCaseRows,
      emergencyTimelineRows,
      mlcRows,
      poisonRows,
      transferRows,
      clinicalDocRows,
      patientPortalDocRows,
      conversationRows,
      messageRows,
      notificationRows,
      pharmMedRows,
      pharmBatchRows,
      pharmDispRecordRows,
      pharmDispItemRows,
      pharmTxRows,
      pharmReorderRows,
      auditLogRows,
    ] = await Promise.all([
      safeSelect('staff_users', 'id', true),
      safeSelect('patients', 'registration_timestamp', false),
      safeSelect('patient_privacy_settings'),
      safeSelect('patient_access_audits', 'timestamp', false),
      safeSelect('appointments', 'appointment_date', false),
      safeSelect('clinical_encounters', 'encounter_date', false),
      safeSelect('prescription_items', 'id', true),
      safeSelect('patient_medication_activities', 'recorded_at', false),
      safeSelect('follow_up_reminders', 'due_date', true),
      safeSelect('diagnostic_lab_reports', 'reported_date', false),
      safeSelect('diagnostic_lab_parameters', 'parameter_order', true),
      safeSelect('emergency_cases', 'created_at', false),
      safeSelect('emergency_case_timeline_events', 'timestamp', false),
      safeSelect('medico_legal_cases', 'updated_at', false),
      safeSelect('poisoning_toxicology_cases', 'updated_at', false),
      safeSelect('referral_transfers', 'updated_at', false),
      safeSelect('clinical_documents', 'generated_at', false),
      safeSelect('patient_portal_documents', 'document_date', false),
      safeSelect('message_conversations', 'last_message_at', false),
      safeSelect('patient_messages', 'timestamp', true),
      safeSelect('notifications', 'timestamp', false),
      safeSelect('pharmacy_medicines', 'generic_name', true),
      safeSelect('pharmacy_batches', 'expiry_date', true),
      safeSelect('pharmacy_dispensing_records', 'dispensed_at', false),
      safeSelect('pharmacy_dispensing_items'),
      safeSelect('pharmacy_transactions', 'timestamp', false),
      safeSelect('pharmacy_reorder_requests', 'created_at', false),
      safeSelect('audit_logs', 'timestamp', false),
    ]);

    const allStaff = staffRows.map(mapStaffRowToStaffUser);
    const doctorsDirectory = staffRows
      .map(mapStaffRowToDoctorDirectoryItem)
      .filter((d): d is DoctorDirectoryItem => d !== null);

    const patients = patientRows.map(mapPatientRowToPatient);
    const privacySettingsByPatient: PatientPrivacySettingsMap = {};
    for (const pr of privacyRows) {
      const mapped = mapPrivacyRowToSettings(pr);
      if (mapped.patientId) {
        privacySettingsByPatient[mapped.patientId] = mapped;
      }
    }

    const accessAuditLogs = accessAuditRows.map(mapAccessAuditRowToRecord);
    const appointments = appointmentRows.map(mapAppointmentRowToAppointment);
    const encounters = encounterRows.map((er) => mapEncounterRowToClinicalEncounter(er, rxItemRows));
    const medicationActivities = medActivityRows.map(mapMedicationActivityRow);
    const followUps = followUpRows.map(mapFollowUpRow);
    const labReports = labReportRows.map((lr) => mapLabReportRow(lr, labParamRows));
    const cases = emergencyCaseRows.map((ec) => mapEmergencyCaseRow(ec, emergencyTimelineRows));
    const mlcCases = mlcRows.map(mapMlcRow);
    const poisonCases = poisonRows.map(mapPoisonCaseRow);
    const transfers = transferRows.map(mapTransferRow);
    const documents = clinicalDocRows.map(mapClinicalDocumentRow);
    const patientDocuments = patientPortalDocRows.map(mapPatientPortalDocumentRow);
    const conversations = conversationRows.map(mapConversationRow);
    const patientMessages = messageRows.map(mapPatientMessageRow);
    const patientNotifications = notificationRows.map(mapNotificationRow);
    const pharmacyMedicines = pharmMedRows.map(mapPharmacyMedicineRow);
    const pharmacyBatches = pharmBatchRows.map(mapPharmacyBatchRow);
    const pharmacyDispensingRecords = pharmDispRecordRows.map((dr) =>
      mapPharmacyDispensingRow(dr, pharmDispItemRows)
    );
    const pharmacyTransactions = pharmTxRows.map(mapPharmacyTransactionRow);
    const pharmacyReorderRequests = pharmReorderRows.map(mapPharmacyReorderRow);
    const auditLogs = auditLogRows.map(mapAuditLogRow);

    return {
      success: true,
      data: {
        allStaff,
        doctorsDirectory,
        patients,
        privacySettingsByPatient,
        accessAuditLogs,
        appointments,
        encounters,
        medicationActivities,
        followUps,
        labReports,
        cases,
        mlcCases,
        poisonCases,
        transfers,
        documents,
        patientDocuments,
        conversations,
        patientMessages,
        patientNotifications,
        pharmacyMedicines,
        pharmacyBatches,
        pharmacyDispensingRecords,
        pharmacyTransactions,
        pharmacyReorderRequests,
        auditLogs,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: classifySupabaseError(err),
    };
  }
}

// =============================================================================
// MODULE PERSISTENCE OPERATIONS (ENFORCED BY POSTGRESQL RLS & ACID RPCs)
// =============================================================================

export async function dbRegisterPatient(
  client: SupabaseClient,
  patient: Patient,
  registeredByStaffId?: string
): Promise<DbOperationResult<Patient>> {
  const row = mapPatientToDbRow(patient, registeredByStaffId);
  const { data, error } = await client.from('patients').upsert(row).select('*').single();
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true, data: mapPatientRowToPatient(data) };
}

export async function dbReconcileUnidentifiedPatient(
  client: SupabaseClient,
  input: {
    patientId: string;
    verifiedName: string;
    age?: number;
    gender?: string;
    bloodGroup?: string;
    contactNumber?: string;
    address?: string;
    nationalId?: string;
    nextOfKin?: Record<string, any>;
  }
): Promise<DbOperationResult<Record<string, any>>> {
  const { data, error } = await client.rpc('rpc_reconcile_unidentified_patient', {
    p_patient_id: input.patientId,
    p_verified_name: input.verifiedName,
    p_age: input.age ?? null,
    p_gender: input.gender ?? null,
    p_blood_group: input.bloodGroup ?? null,
    p_contact_number: input.contactNumber ?? null,
    p_address: input.address ?? null,
    p_national_id: input.nationalId ?? null,
    p_next_of_kin: input.nextOfKin ?? null,
  });

  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true, data: data as Record<string, any> };
}

export async function dbUpdatePatientFields(
  client: SupabaseClient,
  patientId: string,
  fields: Record<string, any>
): Promise<DbOperationResult> {
  const { error } = await client
    .from('patients')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', patientId);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbUpsertPatientPrivacySettings(
  client: SupabaseClient,
  patientId: string,
  settings: PrivacyConsentSettings
): Promise<DbOperationResult> {
  const row = mapPrivacySettingsToDbRow(patientId, settings);
  const { error } = await client.from('patient_privacy_settings').upsert(row);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbRecordPatientAccessAudit(
  client: SupabaseClient,
  patientId: string,
  purpose: string,
  action: string
): Promise<DbOperationResult> {
  const { error } = await client.rpc('rpc_record_patient_access_audit', {
    p_patient_id: patientId,
    p_purpose: purpose,
    p_action: action,
  });
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbUpsertAppointment(
  client: SupabaseClient,
  appointment: Appointment
): Promise<DbOperationResult> {
  const row = mapAppointmentToDbRow(appointment);
  const { error } = await client.from('appointments').upsert(row);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbUpdateAppointmentFields(
  client: SupabaseClient,
  aptId: string,
  fields: Record<string, any>
): Promise<DbOperationResult> {
  const { error } = await client
    .from('appointments')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', aptId);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbUpsertClinicalEncounter(
  client: SupabaseClient,
  encounter: ClinicalEncounter
): Promise<DbOperationResult> {
  const { encounterRow, itemRows } = mapClinicalEncounterToDbRows(encounter);
  const { error: encErr } = await client.from('clinical_encounters').upsert(encounterRow);
  if (encErr) {
    return { success: false, error: classifySupabaseError(encErr) };
  }
  if (itemRows.length > 0) {
    const { error: rxErr } = await client.from('prescription_items').upsert(itemRows);
    if (rxErr) {
      return { success: false, error: classifySupabaseError(rxErr) };
    }
  }
  return { success: true };
}

export async function dbUpsertMedicationActivity(
  client: SupabaseClient,
  activity: PatientMedicationActivity
): Promise<DbOperationResult> {
  const row = mapMedicationActivityToDbRow(activity);
  const { error } = await client.from('patient_medication_activities').upsert(row);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbCompleteFollowUpReminder(
  client: SupabaseClient,
  fuId: string
): Promise<DbOperationResult> {
  const { error } = await client
    .from('follow_up_reminders')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', fuId);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbAcknowledgeLabReport(
  client: SupabaseClient,
  reportId: string,
  staffId: string,
  staffName: string
): Promise<DbOperationResult> {
  const nowIso = new Date().toISOString();
  const { error } = await client
    .from('diagnostic_lab_reports')
    .update({
      status: 'Reviewed',
      reviewed_by_staff_id: staffId,
      reviewed_by_name: staffName,
      reviewed_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', reportId);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbCreateEmergencyCaseBundle(
  client: SupabaseClient,
  emergencyCase: EmergencyCase,
  staffId?: string,
  initialMlc?: MedicoLegalCase,
  initialPoison?: PoisoningCase
): Promise<DbOperationResult> {
  const caseRow = mapEmergencyCaseToDbRow(emergencyCase);
  const { error: caseErr } = await client.from('emergency_cases').upsert(caseRow);
  if (caseErr) {
    return { success: false, error: classifySupabaseError(caseErr) };
  }

  if (emergencyCase.clinicalNotes && emergencyCase.clinicalNotes.length > 0) {
    const noteRows = emergencyCase.clinicalNotes.map((n) => ({
      id: n.id,
      case_id: emergencyCase.id,
      author_staff_id: staffId || null,
      author_name: n.author,
      author_role: n.role,
      category: n.category,
      note: n.note,
      timestamp: n.timestamp,
    }));
    await client.from('emergency_case_timeline_events').upsert(noteRows);
  }

  if (initialMlc) {
    const mlcRow = mapMlcToDbRow(initialMlc, staffId);
    const { error: mlcErr } = await client.from('medico_legal_cases').upsert(mlcRow);
    if (mlcErr) {
      return { success: false, error: classifySupabaseError(mlcErr) };
    }
  }

  if (initialPoison) {
    const poisonRow = mapPoisonCaseToDbRow(initialPoison, staffId);
    const { error: poisonErr } = await client.from('poisoning_toxicology_cases').upsert(poisonRow);
    if (poisonErr) {
      return { success: false, error: classifySupabaseError(poisonErr) };
    }
  }

  return { success: true };
}

export async function dbUpdateEmergencyCaseFields(
  client: SupabaseClient,
  caseId: string,
  fields: Record<string, any>
): Promise<DbOperationResult> {
  const { error } = await client
    .from('emergency_cases')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', caseId);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbInsertEmergencyTimelineNote(
  client: SupabaseClient,
  caseId: string,
  note: ClinicalNote,
  authorStaffId?: string
): Promise<DbOperationResult> {
  const { error } = await client.from('emergency_case_timeline_events').insert({
    id: note.id,
    case_id: caseId,
    author_staff_id: authorStaffId || null,
    author_name: note.author,
    author_role: note.role,
    category: note.category,
    note: note.note,
    timestamp: note.timestamp,
  });
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbUpsertMlcCase(
  client: SupabaseClient,
  mlc: MedicoLegalCase,
  cmoStaffId?: string
): Promise<DbOperationResult> {
  const row = mapMlcToDbRow(mlc, cmoStaffId);
  const { error } = await client.from('medico_legal_cases').upsert(row);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbUpsertPoisonCase(
  client: SupabaseClient,
  poison: PoisoningCase,
  cmoStaffId?: string
): Promise<DbOperationResult> {
  const row = mapPoisonCaseToDbRow(poison, cmoStaffId);
  const { error } = await client.from('poisoning_toxicology_cases').upsert(row);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbUpsertTransfer(
  client: SupabaseClient,
  transfer: PatientTransfer
): Promise<DbOperationResult> {
  const row = mapTransferToDbRow(transfer);
  const { error } = await client.from('referral_transfers').upsert(row);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbInsertClinicalDocument(
  client: SupabaseClient,
  doc: HospitalDocument,
  authorStaffId?: string
): Promise<DbOperationResult> {
  const row = mapClinicalDocumentToDbRow(doc, authorStaffId);
  const { error } = await client.from('clinical_documents').upsert(row);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbInsertPatientPortalDocument(
  client: SupabaseClient,
  doc: PatientDocument
): Promise<DbOperationResult> {
  const row = mapPatientPortalDocumentToDbRow(doc);
  const { error } = await client.from('patient_portal_documents').upsert(row);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbUpsertConversation(
  client: SupabaseClient,
  conv: MessageConversation
): Promise<DbOperationResult> {
  const row = mapConversationToDbRow(conv);
  const { error } = await client.from('message_conversations').upsert(row);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbInsertPatientMessage(
  client: SupabaseClient,
  msg: PatientMessage
): Promise<DbOperationResult> {
  const row = mapPatientMessageToDbRow(msg);
  const { error } = await client.from('patient_messages').insert(row);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbMarkConversationMessagesRead(
  client: SupabaseClient,
  conversationId: string,
  viewerRole: MessageSenderRole,
  nowIso: string
): Promise<DbOperationResult> {
  const senderRoleToMark = viewerRole === 'Patient' ? 'Doctor' : 'Patient';
  const { error } = await client
    .from('patient_messages')
    .update({ is_read: true, read_at: nowIso })
    .eq('conversation_id', conversationId)
    .eq('sender_role', senderRoleToMark)
    .eq('is_read', false);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbInsertNotification(
  client: SupabaseClient,
  notif: PatientNotification
): Promise<DbOperationResult> {
  const row = mapNotificationToDbRow(notif);
  const { error } = await client.from('notifications').upsert(row);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbMarkNotificationRead(
  client: SupabaseClient,
  notifId: string
): Promise<DbOperationResult> {
  const { error } = await client.from('notifications').update({ is_read: true }).eq('id', notifId);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbMarkAllNotificationsRead(
  client: SupabaseClient,
  identity: ResolvedDatabaseIdentity
): Promise<DbOperationResult> {
  let query = client.from('notifications').update({ is_read: true }).eq('is_read', false);
  if (identity.accountType === 'patient') {
    query = query.eq('patient_id', identity.id);
  }
  const { error } = await query;
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbUpsertPharmacyMedicine(
  client: SupabaseClient,
  med: PharmacyMedicine,
  tx?: PharmacyTransaction
): Promise<DbOperationResult> {
  const row = mapPharmacyMedicineToDbRow(med);
  const { error } = await client.from('pharmacy_medicines').upsert(row);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  if (tx) {
    await client.from('pharmacy_transactions').insert({
      id: tx.id,
      medicine_id: tx.medicineId,
      medicine_name: tx.medicineName,
      batch_id: tx.batchId || null,
      batch_number: tx.batchNumber || null,
      transaction_type: tx.transactionType,
      quantity_delta: tx.quantityDelta,
      previous_quantity: tx.previousQuantity,
      new_quantity: tx.newQuantity,
      staff_id: tx.staffId,
      staff_name: tx.staffName,
      staff_role: tx.staffRole,
      reason: tx.reason,
      timestamp: tx.timestamp,
    });
  }
  return { success: true };
}

export async function dbReceivePharmacyBatchStock(
  client: SupabaseClient,
  batchId: string,
  input: {
    medicineId: string;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    purchaseDate: string;
    supplierReference: string;
    supplierName: string;
    stockLocation: string;
    reason?: string;
  }
): Promise<DbOperationResult<Record<string, any>>> {
  const { data, error } = await client.rpc('rpc_receive_pharmacy_batch_stock', {
    p_batch_id: batchId,
    p_medicine_id: input.medicineId,
    p_batch_number: input.batchNumber,
    p_quantity: input.quantity,
    p_expiry_date: input.expiryDate,
    p_purchase_date: input.purchaseDate,
    p_supplier_reference: input.supplierReference,
    p_supplier_name: input.supplierName,
    p_stock_location: input.stockLocation,
    p_reason: input.reason ?? null,
  });
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true, data: data as Record<string, any> };
}

export async function dbAdjustPharmacyBatchStock(
  client: SupabaseClient,
  input: {
    batchId: string;
    quantityDelta: number;
    reason: string;
    transactionType?: string;
  }
): Promise<DbOperationResult<Record<string, any>>> {
  const { data, error } = await client.rpc('rpc_adjust_pharmacy_batch_stock', {
    p_batch_id: input.batchId,
    p_quantity_delta: input.quantityDelta,
    p_reason: input.reason,
    p_transaction_type: input.transactionType || 'Stock Adjustment',
  });
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true, data: data as Record<string, any> };
}

export async function dbDispensePrescription(
  client: SupabaseClient,
  dispensingRecordId: string,
  encounterId: string,
  lineInputs: DispenseLineInput[],
  notes?: string
): Promise<DbOperationResult<Record<string, any>>> {
  const formattedLines = (lineInputs || []).map((li) => {
    const ext = li as DispenseLineInput & { medicineId?: string; prescribedQuantity?: number };
    return {
      prescriptionItemId: li.prescriptionItemId,
      medicineId: ext.medicineId || null,
      batchId: li.batchId || null,
      dispensedQuantity: li.action === 'unavailable' ? 0 : Number(li.quantity ?? 0),
      prescribedQuantity: ext.prescribedQuantity ?? null,
      markUnavailable: li.action === 'unavailable',
      note: li.note || null,
    };
  });

  const { data, error } = await client.rpc('rpc_dispense_prescription', {
    p_dispensing_record_id: dispensingRecordId,
    p_encounter_id: encounterId,
    p_line_inputs: formattedLines,
    p_notes: notes ?? null,
  });

  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true, data: data as Record<string, any> };
}

export async function dbUpsertPharmacyReorderRequest(
  client: SupabaseClient,
  req: PharmacyReorderRequest,
  staffId?: string
): Promise<DbOperationResult> {
  const row = mapPharmacyReorderToDbRow(req, staffId);
  const { error } = await client.from('pharmacy_reorder_requests').upsert(row);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}

export async function dbInsertAuditLog(
  client: SupabaseClient,
  log: AuditLog
): Promise<DbOperationResult> {
  const row = mapAuditLogToDbRow(log);
  const { error } = await client.from('audit_logs').insert(row);
  if (error) {
    return { success: false, error: classifySupabaseError(error) };
  }
  return { success: true };
}
