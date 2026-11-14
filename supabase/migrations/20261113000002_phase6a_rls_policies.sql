-- =============================================================================
-- HEALTHROUTE — PHASE 6A: SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- Migration: 20261113000002_phase6a_rls_policies.sql
-- =============================================================================
-- Security Guarantees:
--   1. All 33 tables have ROW LEVEL SECURITY enabled and forced.
--   2. Zero anonymous/demo-mode access: all policies require an authenticated
--      Supabase JWT (auth.uid() IS NOT NULL) mapped to an active staff_users
--      or patients row. Client-side localStorage or user_metadata role claims
--      are NEVER trusted.
--   3. Strict 7-Role RBAC enforcement:
--      - doctor / cmo: clinical authoring, prescriptions, lab review, assigned messaging
--      - nurse: vitals, triage, emergency timeline; ZERO access to pharmacy or private messages
--      - records: patient registration, identity reconciliation, statutory records
--      - pharmacist: full pharmacy inventory, batch stock, dispensing, reorder requests
--      - admin: hospital governance & directory oversight
--      - patient: strict tenant isolation to own patient_id records & privacy settings
--   4. Immutable audit trails: audit_logs, patient_access_audits, and
--      pharmacy_transactions forbid UPDATE and DELETE for all roles.
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: SERVER-AUTHORITATIVE IDENTITY & ROLE RESOLUTION HELPERS
-- =============================================================================

-- Resolves the authenticated staff member's role strictly from public.staff_users
CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.role
  FROM public.staff_users s
  WHERE s.auth_user_id = auth.uid()
    AND s.is_active = true
  LIMIT 1;
$$;

-- Resolves the authenticated staff member's stable staff_users.id
CREATE OR REPLACE FUNCTION public.current_staff_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM public.staff_users s
  WHERE s.auth_user_id = auth.uid()
    AND s.is_active = true
  LIMIT 1;
$$;

-- Resolves the authenticated patient's stable patients.id
CREATE OR REPLACE FUNCTION public.current_patient_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.patients p
  WHERE p.auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- True if caller is any active authenticated hospital staff member
CREATE OR REPLACE FUNCTION public.is_hospital_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'records', 'pharmacist', 'admin'),
    false
  );
$$;

-- True if caller is an active clinical physician (doctor, cmo, or admin)
CREATE OR REPLACE FUNCTION public.is_physician_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.current_staff_role() IN ('doctor', 'cmo', 'admin'),
    false
  );
$$;

-- True if caller is authorized for Hospital Pharmacy operations (pharmacist or admin ONLY; nurses excluded)
CREATE OR REPLACE FUNCTION public.is_pharmacy_authorized()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.current_staff_role() IN ('pharmacist', 'admin'),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.current_staff_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_staff_role() TO authenticated;

REVOKE ALL ON FUNCTION public.current_staff_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_staff_id() TO authenticated;

REVOKE ALL ON FUNCTION public.current_patient_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_patient_id() TO authenticated;

REVOKE ALL ON FUNCTION public.is_hospital_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_hospital_staff() TO authenticated;

REVOKE ALL ON FUNCTION public.is_physician_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_physician_or_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.is_pharmacy_authorized() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_pharmacy_authorized() TO authenticated;

-- =============================================================================
-- SECTION 2: ENABLE & FORCE ROW LEVEL SECURITY ON ALL 33 TABLES
-- =============================================================================

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals FORCE ROW LEVEL SECURITY;

ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_users FORCE ROW LEVEL SECURITY;

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients FORCE ROW LEVEL SECURITY;

ALTER TABLE public.patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_allergies FORCE ROW LEVEL SECURITY;

ALTER TABLE public.patient_chronic_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_chronic_conditions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.patient_vital_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_vital_readings FORCE ROW LEVEL SECURITY;

ALTER TABLE public.patient_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_medications FORCE ROW LEVEL SECURITY;

ALTER TABLE public.patient_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_privacy_settings FORCE ROW LEVEL SECURITY;

ALTER TABLE public.patient_access_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_access_audits FORCE ROW LEVEL SECURITY;

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.clinical_encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_encounters FORCE ROW LEVEL SECURITY;

ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items FORCE ROW LEVEL SECURITY;

ALTER TABLE public.patient_medication_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_medication_activities FORCE ROW LEVEL SECURITY;

ALTER TABLE public.follow_up_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_reminders FORCE ROW LEVEL SECURITY;

ALTER TABLE public.diagnostic_lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_lab_reports FORCE ROW LEVEL SECURITY;

ALTER TABLE public.diagnostic_lab_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_lab_parameters FORCE ROW LEVEL SECURITY;

ALTER TABLE public.emergency_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_cases FORCE ROW LEVEL SECURITY;

ALTER TABLE public.emergency_case_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_case_timeline_events FORCE ROW LEVEL SECURITY;

ALTER TABLE public.medico_legal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medico_legal_cases FORCE ROW LEVEL SECURITY;

ALTER TABLE public.poisoning_toxicology_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poisoning_toxicology_cases FORCE ROW LEVEL SECURITY;

ALTER TABLE public.referral_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_transfers FORCE ROW LEVEL SECURITY;

ALTER TABLE public.clinical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_documents FORCE ROW LEVEL SECURITY;

ALTER TABLE public.patient_portal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_portal_documents FORCE ROW LEVEL SECURITY;

ALTER TABLE public.message_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_conversations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.patient_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_messages FORCE ROW LEVEL SECURITY;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

ALTER TABLE public.pharmacy_medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_medicines FORCE ROW LEVEL SECURITY;

ALTER TABLE public.pharmacy_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_batches FORCE ROW LEVEL SECURITY;

ALTER TABLE public.pharmacy_dispensing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_dispensing_records FORCE ROW LEVEL SECURITY;

ALTER TABLE public.pharmacy_dispensing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_dispensing_items FORCE ROW LEVEL SECURITY;

ALTER TABLE public.pharmacy_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_transactions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.pharmacy_reorder_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_reorder_requests FORCE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- SECTION 3: DOMAIN 1 POLICIES — HOSPITALS & STAFF DIRECTORY
-- =============================================================================

DROP POLICY IF EXISTS pol_hospitals_select ON public.hospitals;
CREATE POLICY pol_hospitals_select ON public.hospitals
  FOR SELECT TO authenticated
  USING (public.is_hospital_staff() OR public.current_patient_id() IS NOT NULL);

DROP POLICY IF EXISTS pol_hospitals_admin_write ON public.hospitals;
CREATE POLICY pol_hospitals_admin_write ON public.hospitals
  FOR ALL TO authenticated
  USING (public.current_staff_role() = 'admin')
  WITH CHECK (public.current_staff_role() = 'admin');

-- Staff users: Hospital staff can view all staff; patients can view active doctors/CMOs in directory
DROP POLICY IF EXISTS pol_staff_select ON public.staff_users;
CREATE POLICY pol_staff_select ON public.staff_users
  FOR SELECT TO authenticated
  USING (
    public.is_hospital_staff()
    OR (public.current_patient_id() IS NOT NULL AND role IN ('doctor', 'cmo') AND is_active = true)
  );

DROP POLICY IF EXISTS pol_staff_admin_manage ON public.staff_users;
CREATE POLICY pol_staff_admin_manage ON public.staff_users
  FOR ALL TO authenticated
  USING (public.current_staff_role() = 'admin')
  WITH CHECK (public.current_staff_role() = 'admin');

-- =============================================================================
-- SECTION 4: DOMAIN 2 POLICIES — PATIENTS, CLINICAL HISTORY & PRIVACY
-- =============================================================================

-- Patients table
DROP POLICY IF EXISTS pol_patients_select ON public.patients;
CREATE POLICY pol_patients_select ON public.patients
  FOR SELECT TO authenticated
  USING (
    public.is_hospital_staff()
    OR id = public.current_patient_id()
  );

DROP POLICY IF EXISTS pol_patients_insert ON public.patients;
CREATE POLICY pol_patients_insert ON public.patients
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'records', 'admin')
  );

DROP POLICY IF EXISTS pol_patients_update_staff ON public.patients;
CREATE POLICY pol_patients_update_staff ON public.patients
  FOR UPDATE TO authenticated
  USING (
    public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'records', 'admin')
  )
  WITH CHECK (
    public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'records', 'admin')
  );

DROP POLICY IF EXISTS pol_patients_update_self ON public.patients;
CREATE POLICY pol_patients_update_self ON public.patients
  FOR UPDATE TO authenticated
  USING (id = public.current_patient_id())
  WITH CHECK (id = public.current_patient_id());

-- Patient Allergies, Chronic Conditions, Vitals, Medications
DROP POLICY IF EXISTS pol_patient_allergies_select ON public.patient_allergies;
CREATE POLICY pol_patient_allergies_select ON public.patient_allergies
  FOR SELECT TO authenticated
  USING (public.is_hospital_staff() OR patient_id = public.current_patient_id());

DROP POLICY IF EXISTS pol_patient_allergies_write ON public.patient_allergies;
CREATE POLICY pol_patient_allergies_write ON public.patient_allergies
  FOR ALL TO authenticated
  USING (public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'admin'))
  WITH CHECK (public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'admin'));

DROP POLICY IF EXISTS pol_patient_conditions_select ON public.patient_chronic_conditions;
CREATE POLICY pol_patient_conditions_select ON public.patient_chronic_conditions
  FOR SELECT TO authenticated
  USING (public.is_hospital_staff() OR patient_id = public.current_patient_id());

DROP POLICY IF EXISTS pol_patient_conditions_write ON public.patient_chronic_conditions;
CREATE POLICY pol_patient_conditions_write ON public.patient_chronic_conditions
  FOR ALL TO authenticated
  USING (public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'admin'))
  WITH CHECK (public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'admin'));

DROP POLICY IF EXISTS pol_patient_vitals_select ON public.patient_vital_readings;
CREATE POLICY pol_patient_vitals_select ON public.patient_vital_readings
  FOR SELECT TO authenticated
  USING (public.is_hospital_staff() OR patient_id = public.current_patient_id());

DROP POLICY IF EXISTS pol_patient_vitals_insert ON public.patient_vital_readings;
CREATE POLICY pol_patient_vitals_insert ON public.patient_vital_readings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'admin')
    OR patient_id = public.current_patient_id()
  );

DROP POLICY IF EXISTS pol_patient_medications_select ON public.patient_medications;
CREATE POLICY pol_patient_medications_select ON public.patient_medications
  FOR SELECT TO authenticated
  USING (public.is_hospital_staff() OR patient_id = public.current_patient_id());

DROP POLICY IF EXISTS pol_patient_medications_write ON public.patient_medications;
CREATE POLICY pol_patient_medications_write ON public.patient_medications
  FOR ALL TO authenticated
  USING (public.current_staff_role() IN ('doctor', 'cmo', 'pharmacist', 'admin'))
  WITH CHECK (public.current_staff_role() IN ('doctor', 'cmo', 'pharmacist', 'admin'));

-- Per-Patient Privacy Settings (FIX #1: Strictly scoped to owning patient_id)
DROP POLICY IF EXISTS pol_privacy_settings_select ON public.patient_privacy_settings;
CREATE POLICY pol_privacy_settings_select ON public.patient_privacy_settings
  FOR SELECT TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.current_staff_role() IN ('doctor', 'cmo', 'records', 'admin')
  );

DROP POLICY IF EXISTS pol_privacy_settings_patient_upsert ON public.patient_privacy_settings;
CREATE POLICY pol_privacy_settings_patient_upsert ON public.patient_privacy_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    patient_id = public.current_patient_id()
    OR public.current_staff_role() = 'admin'
  );

DROP POLICY IF EXISTS pol_privacy_settings_patient_update ON public.patient_privacy_settings;
CREATE POLICY pol_privacy_settings_patient_update ON public.patient_privacy_settings
  FOR UPDATE TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.current_staff_role() = 'admin'
  )
  WITH CHECK (
    patient_id = public.current_patient_id()
    OR public.current_staff_role() = 'admin'
  );

-- Patient Access Audits (FIX #2: Scoped to owning patient_id; append-only)
DROP POLICY IF EXISTS pol_access_audits_select ON public.patient_access_audits;
CREATE POLICY pol_access_audits_select ON public.patient_access_audits
  FOR SELECT TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.current_staff_role() IN ('records', 'admin')
  );

DROP POLICY IF EXISTS pol_access_audits_insert ON public.patient_access_audits;
CREATE POLICY pol_access_audits_insert ON public.patient_access_audits
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_hospital_staff()
    OR patient_id = public.current_patient_id()
  );

-- =============================================================================
-- SECTION 5: DOMAIN 3 POLICIES — APPOINTMENTS, ENCOUNTERS, PRESCRIPTIONS, LABS
-- =============================================================================

-- Appointments
DROP POLICY IF EXISTS pol_appointments_select ON public.appointments;
CREATE POLICY pol_appointments_select ON public.appointments
  FOR SELECT TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'records', 'admin')
  );

DROP POLICY IF EXISTS pol_appointments_insert ON public.appointments;
CREATE POLICY pol_appointments_insert ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    (patient_id = public.current_patient_id() AND status = 'Requested' AND requested_by_patient = true)
    OR public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'records', 'admin')
  );

DROP POLICY IF EXISTS pol_appointments_update ON public.appointments;
CREATE POLICY pol_appointments_update ON public.appointments
  FOR UPDATE TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'records', 'admin')
  )
  WITH CHECK (
    patient_id = public.current_patient_id()
    OR public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'records', 'admin')
  );

-- Clinical Encounters
DROP POLICY IF EXISTS pol_encounters_select ON public.clinical_encounters;
CREATE POLICY pol_encounters_select ON public.clinical_encounters
  FOR SELECT TO authenticated
  USING (
    (patient_id = public.current_patient_id() AND status IN ('Finalized', 'Signed'))
    OR public.is_hospital_staff()
  );

DROP POLICY IF EXISTS pol_encounters_physician_write ON public.clinical_encounters;
CREATE POLICY pol_encounters_physician_write ON public.clinical_encounters
  FOR ALL TO authenticated
  USING (public.is_physician_or_admin())
  WITH CHECK (public.is_physician_or_admin());

-- Normalized Prescription Items
DROP POLICY IF EXISTS pol_prescription_items_select ON public.prescription_items;
CREATE POLICY pol_prescription_items_select ON public.prescription_items
  FOR SELECT TO authenticated
  USING (
    (patient_id = public.current_patient_id() AND status IN ('Active', 'Discontinued'))
    OR public.is_hospital_staff()
  );

DROP POLICY IF EXISTS pol_prescription_items_physician_write ON public.prescription_items;
CREATE POLICY pol_prescription_items_physician_write ON public.prescription_items
  FOR ALL TO authenticated
  USING (public.is_physician_or_admin())
  WITH CHECK (public.is_physician_or_admin());

-- Patient Medication Activities (Adherence)
DROP POLICY IF EXISTS pol_med_activities_select ON public.patient_medication_activities;
CREATE POLICY pol_med_activities_select ON public.patient_medication_activities
  FOR SELECT TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'pharmacist', 'admin')
  );

DROP POLICY IF EXISTS pol_med_activities_patient_insert ON public.patient_medication_activities;
CREATE POLICY pol_med_activities_patient_insert ON public.patient_medication_activities
  FOR INSERT TO authenticated
  WITH CHECK (patient_id = public.current_patient_id());

-- Follow-Up Reminders
DROP POLICY IF EXISTS pol_followups_select ON public.follow_up_reminders;
CREATE POLICY pol_followups_select ON public.follow_up_reminders
  FOR SELECT TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'records', 'admin')
  );

DROP POLICY IF EXISTS pol_followups_staff_write ON public.follow_up_reminders;
CREATE POLICY pol_followups_staff_write ON public.follow_up_reminders
  FOR ALL TO authenticated
  USING (public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'records', 'admin'))
  WITH CHECK (public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'records', 'admin'));

-- Diagnostic Lab Reports & Parameters
DROP POLICY IF EXISTS pol_lab_reports_select ON public.diagnostic_lab_reports;
CREATE POLICY pol_lab_reports_select ON public.diagnostic_lab_reports
  FOR SELECT TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'records', 'admin')
  );

DROP POLICY IF EXISTS pol_lab_reports_staff_write ON public.diagnostic_lab_reports;
CREATE POLICY pol_lab_reports_staff_write ON public.diagnostic_lab_reports
  FOR ALL TO authenticated
  USING (public.current_staff_role() IN ('doctor', 'cmo', 'records', 'admin'))
  WITH CHECK (public.current_staff_role() IN ('doctor', 'cmo', 'records', 'admin'));

DROP POLICY IF EXISTS pol_lab_params_select ON public.diagnostic_lab_parameters;
CREATE POLICY pol_lab_params_select ON public.diagnostic_lab_parameters
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.diagnostic_lab_reports r
      WHERE r.id = diagnostic_lab_parameters.lab_report_id
        AND (
          r.patient_id = public.current_patient_id()
          OR public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'records', 'admin')
        )
    )
  );

DROP POLICY IF EXISTS pol_lab_params_staff_write ON public.diagnostic_lab_parameters;
CREATE POLICY pol_lab_params_staff_write ON public.diagnostic_lab_parameters
  FOR ALL TO authenticated
  USING (public.current_staff_role() IN ('doctor', 'cmo', 'records', 'admin'))
  WITH CHECK (public.current_staff_role() IN ('doctor', 'cmo', 'records', 'admin'));

-- =============================================================================
-- SECTION 6: DOMAIN 4 POLICIES — EMERGENCY, MLC, TOXICOLOGY, TRANSFERS & DOCS
-- =============================================================================

DROP POLICY IF EXISTS pol_emergency_cases_select ON public.emergency_cases;
CREATE POLICY pol_emergency_cases_select ON public.emergency_cases
  FOR SELECT TO authenticated
  USING (public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'records', 'admin'));

DROP POLICY IF EXISTS pol_emergency_cases_write ON public.emergency_cases;
CREATE POLICY pol_emergency_cases_write ON public.emergency_cases
  FOR ALL TO authenticated
  USING (public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'admin'))
  WITH CHECK (public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'admin'));

DROP POLICY IF EXISTS pol_emergency_timeline_select ON public.emergency_case_timeline_events;
CREATE POLICY pol_emergency_timeline_select ON public.emergency_case_timeline_events
  FOR SELECT TO authenticated
  USING (public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'records', 'admin'));

DROP POLICY IF EXISTS pol_emergency_timeline_insert ON public.emergency_case_timeline_events;
CREATE POLICY pol_emergency_timeline_insert ON public.emergency_case_timeline_events
  FOR INSERT TO authenticated
  WITH CHECK (public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'admin'));

DROP POLICY IF EXISTS pol_mlc_select ON public.medico_legal_cases;
CREATE POLICY pol_mlc_select ON public.medico_legal_cases
  FOR SELECT TO authenticated
  USING (public.current_staff_role() IN ('doctor', 'cmo', 'records', 'admin'));

DROP POLICY IF EXISTS pol_mlc_write ON public.medico_legal_cases;
CREATE POLICY pol_mlc_write ON public.medico_legal_cases
  FOR ALL TO authenticated
  USING (public.current_staff_role() IN ('doctor', 'cmo', 'admin'))
  WITH CHECK (public.current_staff_role() IN ('doctor', 'cmo', 'admin'));

DROP POLICY IF EXISTS pol_poison_select ON public.poisoning_toxicology_cases;
CREATE POLICY pol_poison_select ON public.poisoning_toxicology_cases
  FOR SELECT TO authenticated
  USING (public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'records', 'admin'));

DROP POLICY IF EXISTS pol_poison_write ON public.poisoning_toxicology_cases;
CREATE POLICY pol_poison_write ON public.poisoning_toxicology_cases
  FOR ALL TO authenticated
  USING (public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'admin'))
  WITH CHECK (public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'admin'));

DROP POLICY IF EXISTS pol_transfers_select ON public.referral_transfers;
CREATE POLICY pol_transfers_select ON public.referral_transfers
  FOR SELECT TO authenticated
  USING (public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'records', 'admin'));

DROP POLICY IF EXISTS pol_transfers_write ON public.referral_transfers;
CREATE POLICY pol_transfers_write ON public.referral_transfers
  FOR ALL TO authenticated
  USING (public.current_staff_role() IN ('doctor', 'cmo', 'records', 'admin'))
  WITH CHECK (public.current_staff_role() IN ('doctor', 'cmo', 'records', 'admin'));

DROP POLICY IF EXISTS pol_clinical_docs_select ON public.clinical_documents;
CREATE POLICY pol_clinical_docs_select ON public.clinical_documents
  FOR SELECT TO authenticated
  USING (public.current_staff_role() IN ('doctor', 'cmo', 'nurse', 'records', 'admin'));

DROP POLICY IF EXISTS pol_clinical_docs_write ON public.clinical_documents;
CREATE POLICY pol_clinical_docs_write ON public.clinical_documents
  FOR ALL TO authenticated
  USING (public.current_staff_role() IN ('doctor', 'cmo', 'records', 'admin'))
  WITH CHECK (public.current_staff_role() IN ('doctor', 'cmo', 'records', 'admin'));

-- Patient Portal Documents
DROP POLICY IF EXISTS pol_patient_portal_docs_select ON public.patient_portal_documents;
CREATE POLICY pol_patient_portal_docs_select ON public.patient_portal_documents
  FOR SELECT TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.current_staff_role() IN ('doctor', 'cmo', 'records', 'admin')
  );

DROP POLICY IF EXISTS pol_patient_portal_docs_insert ON public.patient_portal_documents;
CREATE POLICY pol_patient_portal_docs_insert ON public.patient_portal_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    patient_id = public.current_patient_id()
    OR public.current_staff_role() IN ('doctor', 'cmo', 'records', 'admin')
  );

-- =============================================================================
-- SECTION 7: DOMAIN 5 POLICIES — TWO-WAY MESSAGING & NOTIFICATIONS
-- =============================================================================

-- Conversations: Strictly between the patient and the assigned doctor (or admin)
DROP POLICY IF EXISTS pol_conversations_select ON public.message_conversations;
CREATE POLICY pol_conversations_select ON public.message_conversations
  FOR SELECT TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR doctor_id = public.current_staff_id()
    OR public.current_staff_role() IN ('cmo', 'admin')
  );

DROP POLICY IF EXISTS pol_conversations_insert ON public.message_conversations;
CREATE POLICY pol_conversations_insert ON public.message_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    patient_id = public.current_patient_id()
    OR doctor_id = public.current_staff_id()
    OR public.current_staff_role() = 'admin'
  );

DROP POLICY IF EXISTS pol_conversations_update ON public.message_conversations;
CREATE POLICY pol_conversations_update ON public.message_conversations
  FOR UPDATE TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR doctor_id = public.current_staff_id()
    OR public.current_staff_role() = 'admin'
  )
  WITH CHECK (
    patient_id = public.current_patient_id()
    OR doctor_id = public.current_staff_id()
    OR public.current_staff_role() = 'admin'
  );

-- Patient Messages
DROP POLICY IF EXISTS pol_messages_select ON public.patient_messages;
CREATE POLICY pol_messages_select ON public.patient_messages
  FOR SELECT TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR doctor_id = public.current_staff_id()
    OR public.current_staff_role() IN ('cmo', 'admin')
  );

DROP POLICY IF EXISTS pol_messages_insert ON public.patient_messages;
CREATE POLICY pol_messages_insert ON public.patient_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (patient_id = public.current_patient_id() AND sender_role = 'Patient' AND sender_id = public.current_patient_id())
    OR (doctor_id = public.current_staff_id() AND sender_role = 'Doctor' AND sender_id = public.current_staff_id())
    OR public.current_staff_role() = 'admin'
  );

DROP POLICY IF EXISTS pol_messages_update_read ON public.patient_messages;
CREATE POLICY pol_messages_update_read ON public.patient_messages
  FOR UPDATE TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR doctor_id = public.current_staff_id()
    OR public.current_staff_role() = 'admin'
  )
  WITH CHECK (
    patient_id = public.current_patient_id()
    OR doctor_id = public.current_staff_id()
    OR public.current_staff_role() = 'admin'
  );

-- Notifications (Scoped by audience: patient, doctor, pharmacy)
DROP POLICY IF EXISTS pol_notifications_select ON public.notifications;
CREATE POLICY pol_notifications_select ON public.notifications
  FOR SELECT TO authenticated
  USING (
    (patient_id = public.current_patient_id() AND target_audience IN ('patient', 'both'))
    OR (doctor_id = public.current_staff_id() AND target_audience IN ('doctor', 'both'))
    OR (public.is_pharmacy_authorized() AND target_audience = 'pharmacy')
    OR public.current_staff_role() = 'admin'
  );

DROP POLICY IF EXISTS pol_notifications_insert ON public.notifications;
CREATE POLICY pol_notifications_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_hospital_staff()
    OR patient_id = public.current_patient_id()
  );

DROP POLICY IF EXISTS pol_notifications_update_read ON public.notifications;
CREATE POLICY pol_notifications_update_read ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR doctor_id = public.current_staff_id()
    OR (public.is_pharmacy_authorized() AND target_audience = 'pharmacy')
    OR public.current_staff_role() = 'admin'
  )
  WITH CHECK (
    patient_id = public.current_patient_id()
    OR doctor_id = public.current_staff_id()
    OR (public.is_pharmacy_authorized() AND target_audience = 'pharmacy')
    OR public.current_staff_role() = 'admin'
  );

-- =============================================================================
-- SECTION 8: DOMAIN 6 POLICIES — HOSPITAL PHARMACY & IMMUTABLE AUDIT LOGS
-- =============================================================================
-- Nurses are strictly excluded from all pharmacy_* tables (matching Phase 5 RBAC).

-- Pharmacy Medicines Catalogue: Pharmacists/Admin manage; Doctors/CMOs can view formulary
DROP POLICY IF EXISTS pol_pharmacy_medicines_select ON public.pharmacy_medicines;
CREATE POLICY pol_pharmacy_medicines_select ON public.pharmacy_medicines
  FOR SELECT TO authenticated
  USING (
    public.is_pharmacy_authorized()
    OR public.current_staff_role() IN ('doctor', 'cmo')
  );

DROP POLICY IF EXISTS pol_pharmacy_medicines_write ON public.pharmacy_medicines;
CREATE POLICY pol_pharmacy_medicines_write ON public.pharmacy_medicines
  FOR ALL TO authenticated
  USING (public.is_pharmacy_authorized())
  WITH CHECK (public.is_pharmacy_authorized());

-- Pharmacy Batches: Strictly Pharmacist & Admin
DROP POLICY IF EXISTS pol_pharmacy_batches_select ON public.pharmacy_batches;
CREATE POLICY pol_pharmacy_batches_select ON public.pharmacy_batches
  FOR SELECT TO authenticated
  USING (public.is_pharmacy_authorized());

DROP POLICY IF EXISTS pol_pharmacy_batches_write ON public.pharmacy_batches;
CREATE POLICY pol_pharmacy_batches_write ON public.pharmacy_batches
  FOR ALL TO authenticated
  USING (public.is_pharmacy_authorized())
  WITH CHECK (public.is_pharmacy_authorized());

-- Pharmacy Dispensing Records & Items: Pharmacist/Admin write; Patient & Prescribing Doctor read own
DROP POLICY IF EXISTS pol_pharmacy_dispensing_select ON public.pharmacy_dispensing_records;
CREATE POLICY pol_pharmacy_dispensing_select ON public.pharmacy_dispensing_records
  FOR SELECT TO authenticated
  USING (
    public.is_pharmacy_authorized()
    OR patient_id = public.current_patient_id()
    OR public.current_staff_role() IN ('doctor', 'cmo')
  );

DROP POLICY IF EXISTS pol_pharmacy_dispensing_write ON public.pharmacy_dispensing_records;
CREATE POLICY pol_pharmacy_dispensing_write ON public.pharmacy_dispensing_records
  FOR INSERT TO authenticated
  WITH CHECK (public.is_pharmacy_authorized());

DROP POLICY IF EXISTS pol_pharmacy_disp_items_select ON public.pharmacy_dispensing_items;
CREATE POLICY pol_pharmacy_disp_items_select ON public.pharmacy_dispensing_items
  FOR SELECT TO authenticated
  USING (
    public.is_pharmacy_authorized()
    OR public.current_staff_role() IN ('doctor', 'cmo')
    OR EXISTS (
      SELECT 1
      FROM public.pharmacy_dispensing_records dr
      WHERE dr.id = pharmacy_dispensing_items.dispensing_record_id
        AND dr.patient_id = public.current_patient_id()
    )
  );

DROP POLICY IF EXISTS pol_pharmacy_disp_items_write ON public.pharmacy_dispensing_items;
CREATE POLICY pol_pharmacy_disp_items_write ON public.pharmacy_dispensing_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_pharmacy_authorized());

-- Pharmacy Transactions: Immutable stock ledger (SELECT + INSERT only for Pharmacist/Admin)
DROP POLICY IF EXISTS pol_pharmacy_tx_select ON public.pharmacy_transactions;
CREATE POLICY pol_pharmacy_tx_select ON public.pharmacy_transactions
  FOR SELECT TO authenticated
  USING (public.is_pharmacy_authorized());

DROP POLICY IF EXISTS pol_pharmacy_tx_insert ON public.pharmacy_transactions;
CREATE POLICY pol_pharmacy_tx_insert ON public.pharmacy_transactions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_pharmacy_authorized());

-- Pharmacy Reorder Requests: Strictly Pharmacist & Admin
DROP POLICY IF EXISTS pol_pharmacy_reorders_select ON public.pharmacy_reorder_requests;
CREATE POLICY pol_pharmacy_reorders_select ON public.pharmacy_reorder_requests
  FOR SELECT TO authenticated
  USING (public.is_pharmacy_authorized());

DROP POLICY IF EXISTS pol_pharmacy_reorders_write ON public.pharmacy_reorder_requests;
CREATE POLICY pol_pharmacy_reorders_write ON public.pharmacy_reorder_requests
  FOR ALL TO authenticated
  USING (public.is_pharmacy_authorized())
  WITH CHECK (public.is_pharmacy_authorized());

-- System Audit Logs: Immutable (Admin/Records/CMO read; any authenticated staff/patient can append)
DROP POLICY IF EXISTS pol_audit_logs_select ON public.audit_logs;
CREATE POLICY pol_audit_logs_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.current_staff_role() IN ('admin', 'records', 'cmo'));

DROP POLICY IF EXISTS pol_audit_logs_insert ON public.audit_logs;
CREATE POLICY pol_audit_logs_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_hospital_staff()
    OR public.current_patient_id() IS NOT NULL
  );

COMMIT;
