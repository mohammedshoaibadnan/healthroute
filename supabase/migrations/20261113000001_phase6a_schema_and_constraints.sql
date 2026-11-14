-- =============================================================================
-- HEALTHROUTE — PHASE 6A: SUPABASE POSTGRESQL SCHEMA, CONSTRAINTS & INDEXES
-- Migration: 20261113000001_phase6a_schema_and_constraints.sql
-- =============================================================================
-- Preserves all Phase 1–5 human-readable clinical & demonstration IDs (TEXT PKs)
-- and resolves all 8 identified data-integrity issues:
--   1. Per-patient privacy settings (patient_privacy_settings PK = patient_id)
--   2. Patient-owned access audit trail (patient_access_audits.patient_id NOT NULL FK)
--   3. Normalized staff foreign keys alongside display names on legacy Phase 1 models
--   4. Normalized prescription_items and pharmacy_dispensing_items relational tables
--   5. Nullable patient_id on notifications with audience-scoped CHECK constraint
--   6. Non-negative pharmacy batch stock CHECK (available_quantity >= 0) + unique batch per medicine
--   7. Reconciled patient identity tracking (reconciled_to_patient_id & reconciliation_history)
--   8. Row-level normalization replacing monolithic JSON array overwrites
-- =============================================================================

BEGIN;

-- Enable pgcrypto for UUID generation where needed
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- UTILITY: Automatic updated_at timestamp trigger function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- DOMAIN 1: IDENTITY, FACILITIES & STAFF DIRECTORY
-- =============================================================================

-- 1. hospitals
CREATE TABLE IF NOT EXISTS public.hospitals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  distance_km NUMERIC(6,2),
  icu_beds_available INTEGER NOT NULL DEFAULT 0 CHECK (icu_beds_available >= 0),
  ventilators_available INTEGER NOT NULL DEFAULT 0 CHECK (ventilators_available >= 0),
  trauma_bay_available BOOLEAN NOT NULL DEFAULT true,
  burn_unit_available BOOLEAN NOT NULL DEFAULT false,
  pci_lab_available BOOLEAN NOT NULL DEFAULT false,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  Emergency_Coordinator_Phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. staff_users (Unified Hospital Staff & 6 Aligned Specialist Doctors)
CREATE TABLE IF NOT EXISTS public.staff_users (
  id TEXT PRIMARY KEY,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('doctor', 'cmo', 'nurse', 'records', 'pharmacist', 'admin')),
  designation TEXT NOT NULL,
  department TEXT NOT NULL,
  employee_code TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  phone TEXT,
  active_shift TEXT NOT NULL DEFAULT 'Day (08:00 - 16:00)',
  on_duty BOOLEAN NOT NULL DEFAULT true,
  station TEXT NOT NULL,
  photo_url TEXT,
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
  specialty TEXT,
  sub_specialty TEXT,
  qualifications TEXT,
  experience_years INTEGER CHECK (experience_years IS NULL OR experience_years >= 0),
  hospital_id TEXT REFERENCES public.hospitals(id) ON DELETE SET NULL,
  hospital_affiliation TEXT,
  languages TEXT[] NOT NULL DEFAULT '{}',
  consultation_fee NUMERIC(10,2) CHECK (consultation_fee IS NULL OR consultation_fee >= 0),
  availability TEXT CHECK (availability IS NULL OR availability IN ('Available Today', 'Next Available Tomorrow', 'Available This Week')),
  available_slots TEXT[] NOT NULL DEFAULT '{}',
  consultation_types TEXT[] NOT NULL DEFAULT '{}',
  rating NUMERIC(3,2) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  reviews_count INTEGER NOT NULL DEFAULT 0 CHECK (reviews_count >= 0),
  about TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- DOMAIN 2: PATIENTS, MEDICAL HISTORY & PRIVACY GOVERNANCE
-- =============================================================================

-- 3. patients
CREATE TABLE IF NOT EXISTS public.patients (
  id TEXT PRIMARY KEY,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  is_unidentified BOOLEAN NOT NULL DEFAULT false,
  temp_id TEXT UNIQUE,
  permanent_mrn TEXT UNIQUE,
  name TEXT NOT NULL,
  age_estimated BOOLEAN NOT NULL DEFAULT false,
  age INTEGER CHECK (age IS NULL OR (age >= 0 AND age <= 150)),
  date_of_birth DATE,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other', 'Unknown')),
  blood_group TEXT CHECK (blood_group IS NULL OR blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown')),
  contact_number TEXT,
  address TEXT,
  abha_id TEXT UNIQUE,
  national_id_placeholder TEXT,
  primary_physician_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  primary_physician_name TEXT,
  self_reported_notes TEXT,
  triage_status TEXT CHECK (triage_status IS NULL OR triage_status IN ('Stable', 'Critical', 'Waiting', 'Under Observation')),
  photo_url TEXT,
  next_of_kin JSONB,
  emergency_contact JSONB,
  physical_identification JSONB,
  allergies TEXT[] NOT NULL DEFAULT '{}',
  existing_conditions TEXT[] NOT NULL DEFAULT '{}',
  current_medications TEXT[] NOT NULL DEFAULT '{}',
  verified_medical_history TEXT[] NOT NULL DEFAULT '{}',
  reconciled_to_patient_id TEXT REFERENCES public.patients(id) ON DELETE SET NULL,
  reconciliation_history JSONB NOT NULL DEFAULT '[]'::JSONB,
  registered_by_staff_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  registered_by_name TEXT NOT NULL DEFAULT 'System',
  registration_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. patient_allergies
CREATE TABLE IF NOT EXISTS public.patient_allergies (
  id TEXT PRIMARY KEY DEFAULT ('alg-' || gen_random_uuid()::TEXT),
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  allergen TEXT NOT NULL,
  reaction_type TEXT,
  severity TEXT NOT NULL DEFAULT 'High' CHECK (severity IN ('Mild', 'Moderate', 'High', 'Life-Threatening')),
  recorded_by_staff_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, allergen)
);

-- 5. patient_chronic_conditions
CREATE TABLE IF NOT EXISTS public.patient_chronic_conditions (
  id TEXT PRIMARY KEY DEFAULT ('cond-' || gen_random_uuid()::TEXT),
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  condition_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'chronic' CHECK (category IN ('chronic', 'surgical_history', 'family_history')),
  is_verified BOOLEAN NOT NULL DEFAULT true,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, condition_name, category)
);

-- 6. patient_vital_readings
CREATE TABLE IF NOT EXISTS public.patient_vital_readings (
  id TEXT PRIMARY KEY DEFAULT ('vit-' || gen_random_uuid()::TEXT),
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  bp TEXT NOT NULL,
  pulse INTEGER NOT NULL CHECK (pulse > 0 AND pulse < 350),
  spo2 INTEGER NOT NULL CHECK (spo2 >= 0 AND spo2 <= 100),
  temp NUMERIC(5,2) NOT NULL,
  rr INTEGER NOT NULL CHECK (rr >= 0 AND rr <= 120),
  gcs INTEGER NOT NULL DEFAULT 15 CHECK (gcs >= 3 AND gcs <= 15),
  blood_sugar NUMERIC(6,2),
  pain_score INTEGER CHECK (pain_score IS NULL OR (pain_score >= 0 AND pain_score <= 10)),
  weight NUMERIC(6,2),
  source_type TEXT NOT NULL DEFAULT 'triage' CHECK (source_type IN ('triage', 'encounter', 'emergency_case', 'self_reported')),
  source_id TEXT,
  recorded_by_staff_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. patient_medications (Baseline / Historical Home Regimen)
CREATE TABLE IF NOT EXISTS public.patient_medications (
  id TEXT PRIMARY KEY DEFAULT ('pmed-' || gen_random_uuid()::TEXT),
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medication_label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'baseline' CHECK (source IN ('baseline', 'self_reported', 'external')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. patient_privacy_settings (FIX #1: Keyed per patient_id instead of global singleton)
CREATE TABLE IF NOT EXISTS public.patient_privacy_settings (
  patient_id TEXT PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
  emergency_access_granted BOOLEAN NOT NULL DEFAULT true,
  share_with_specialists BOOLEAN NOT NULL DEFAULT true,
  family_access_granted BOOLEAN NOT NULL DEFAULT false,
  family_member_name TEXT,
  anonymized_research_consent BOOLEAN NOT NULL DEFAULT false,
  download_records_permitted BOOLEAN NOT NULL DEFAULT true,
  sms_email_alerts BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. patient_access_audits (FIX #2: Explicit patient_id ownership + accessor_staff_id FK)
CREATE TABLE IF NOT EXISTS public.patient_access_audits (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  accessor_staff_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  accessor_name TEXT NOT NULL,
  accessor_role TEXT NOT NULL,
  department TEXT NOT NULL,
  purpose TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- DOMAIN 3: CONNECTED APPOINTMENTS, ENCOUNTERS, PRESCRIPTIONS & LABS
-- =============================================================================

-- 10. appointments (Phase 2 Connected Appointment Workflow)
CREATE TABLE IF NOT EXISTS public.appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  patient_name TEXT NOT NULL,
  patient_age INTEGER,
  patient_gender TEXT,
  patient_phone TEXT,
  doctor_id TEXT NOT NULL REFERENCES public.staff_users(id) ON DELETE RESTRICT,
  doctor_name TEXT NOT NULL,
  department TEXT,
  hospital_id TEXT REFERENCES public.hospitals(id) ON DELETE SET NULL,
  hospital_name TEXT,
  room_number TEXT,
  appointment_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  token_number INTEGER NOT NULL DEFAULT 1,
  type TEXT NOT NULL CHECK (type IN (
    'New Consultation',
    'Follow-up Review',
    'Chronic Care Review',
    'Post-Operative Check',
    'Preventive Health Assessment',
    'Specialist Referral'
  )),
  consultation_mode TEXT NOT NULL DEFAULT 'In-Person OPD' CHECK (consultation_mode IN ('In-Person OPD', 'Video Tele-Consult')),
  status TEXT NOT NULL CHECK (status IN (
    'Requested',
    'Confirmed',
    'Scheduled',
    'Checked In',
    'Waiting',
    'In Consultation',
    'Completed',
    'Cancelled',
    'Rescheduled',
    'No Show'
  )),
  chief_complaint TEXT NOT NULL,
  notes TEXT,
  vitals_snapshot JSONB,
  triage_status TEXT CHECK (triage_status IS NULL OR triage_status IN ('Stable', 'Critical', 'Waiting', 'Under Observation')),
  requested_by_patient BOOLEAN NOT NULL DEFAULT false,
  cancellation_reason TEXT,
  decline_reason TEXT,
  accepted_by_doctor_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  accepted_by_doctor_name TEXT,
  accepted_at TIMESTAMPTZ,
  declined_by_doctor_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  declined_by_doctor_name TEXT,
  declined_at TIMESTAMPTZ,
  original_date DATE,
  original_time_slot TEXT,
  proposed_date DATE,
  proposed_time_slot TEXT,
  reschedule_reason TEXT,
  reschedule_proposed_by_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  reschedule_proposed_by TEXT,
  reschedule_proposed_at TIMESTAMPTZ,
  reschedule_response_status TEXT CHECK (reschedule_response_status IS NULL OR reschedule_response_status IN ('Pending', 'Accepted', 'Rejected')),
  reschedule_patient_note TEXT,
  reschedule_responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. clinical_encounters (Phase 3 Clinical SOAP Notes)
CREATE TABLE IF NOT EXISTS public.clinical_encounters (
  id TEXT PRIMARY KEY,
  appointment_id TEXT REFERENCES public.appointments(id) ON DELETE SET NULL,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  patient_name TEXT NOT NULL,
  doctor_id TEXT NOT NULL REFERENCES public.staff_users(id) ON DELETE RESTRICT,
  doctor_name TEXT NOT NULL,
  doctor_designation TEXT,
  department TEXT,
  encounter_date DATE NOT NULL,
  encounter_type TEXT NOT NULL DEFAULT 'OPD Consultation',
  chief_complaint TEXT NOT NULL,
  subjective_history TEXT,
  physical_examination TEXT,
  vitals JSONB,
  assessment_diagnosis TEXT,
  prescription_status TEXT NOT NULL DEFAULT 'Active' CHECK (prescription_status IN ('Draft', 'Active', 'Discontinued')),
  prescription_created_date DATE,
  discontinued_at TIMESTAMPTZ,
  discontinued_by_doctor_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  discontinued_by_name TEXT,
  discontinued_reason TEXT,
  ordered_investigations TEXT[] NOT NULL DEFAULT '{}',
  follow_up_date DATE,
  clinical_advice TEXT,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Finalized', 'Signed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. pharmacy_medicines (Declared before prescription_items so medicine_id FK resolves cleanly)
CREATE TABLE IF NOT EXISTS public.pharmacy_medicines (
  id TEXT PRIMARY KEY,
  generic_name TEXT NOT NULL,
  brand_name TEXT,
  strength TEXT NOT NULL,
  dosage_form TEXT NOT NULL CHECK (dosage_form IN (
    'Tablet', 'Capsule', 'Inhaler', 'Injection', 'Syrup', 'Ointment', 'Drops', 'Powder', 'Solution'
  )),
  manufacturer TEXT NOT NULL,
  category TEXT NOT NULL,
  storage_requirements TEXT,
  unit_of_measurement TEXT NOT NULL DEFAULT 'Tablets',
  minimum_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (minimum_stock_threshold >= 0),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. prescription_items (FIX #4: First-class normalized prescription line items)
CREATE TABLE IF NOT EXISTS public.prescription_items (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  prescribing_doctor_id TEXT NOT NULL REFERENCES public.staff_users(id) ON DELETE RESTRICT,
  prescribing_doctor_name TEXT NOT NULL,
  medicine_id TEXT REFERENCES public.pharmacy_medicines(id) ON DELETE SET NULL,
  medicine_name TEXT NOT NULL,
  drug_name TEXT NOT NULL,
  generic_name TEXT,
  dosage_form TEXT CHECK (dosage_form IS NULL OR dosage_form IN (
    'Tablet', 'Capsule', 'Inhaler', 'Injection', 'Syrup', 'Ointment', 'Drops', 'Powder', 'Solution'
  )),
  strength TEXT NOT NULL DEFAULT '',
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  prescribed_quantity INTEGER CHECK (prescribed_quantity IS NULL OR prescribed_quantity > 0),
  route TEXT NOT NULL DEFAULT 'Oral',
  timing TEXT,
  instructions TEXT,
  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Draft', 'Active', 'Discontinued')),
  discontinued_at TIMESTAMPTZ,
  discontinued_by_doctor_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  discontinued_by_doctor_name TEXT,
  discontinued_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. patient_medication_activities (Phase 3 Adherence Tracking linked to normalized prescription_items)
CREATE TABLE IF NOT EXISTS public.patient_medication_activities (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  encounter_id TEXT NOT NULL REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  prescription_item_id TEXT NOT NULL REFERENCES public.prescription_items(id) ON DELETE CASCADE,
  medication_key TEXT,
  medicine_name TEXT NOT NULL,
  strength TEXT,
  dosage TEXT,
  status TEXT NOT NULL CHECK (status IN ('Taken', 'Skipped', 'Not yet recorded')),
  note TEXT,
  reported_by TEXT NOT NULL DEFAULT 'patient' CHECK (reported_by = 'patient'),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. follow_up_reminders (FIX #3: Includes attending_doctor_id FK alongside display name)
CREATE TABLE IF NOT EXISTS public.follow_up_reminders (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_phone TEXT,
  attending_doctor_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  attending_doctor_name TEXT NOT NULL,
  due_date DATE NOT NULL,
  reason TEXT NOT NULL,
  category TEXT CHECK (category IS NULL OR category IN (
    'Chronic Disease Review',
    'Post-Surgical Review',
    'Lab Result Check',
    'Medication Titration',
    'Immunization'
  )),
  urgency TEXT NOT NULL DEFAULT 'routine' CHECK (urgency IN ('routine', 'important', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. diagnostic_lab_reports (FIX #3: Includes ordering_doctor_id & reviewed_by_staff_id FKs)
CREATE TABLE IF NOT EXISTS public.diagnostic_lab_reports (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  patient_name TEXT NOT NULL,
  ordering_doctor_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  ordering_doctor_name TEXT NOT NULL,
  test_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'Biochemistry', 'Hematology', 'Microbiology', 'Cardiology', 'Radiology / Imaging'
  )),
  sample_date TIMESTAMPTZ,
  reported_date TIMESTAMPTZ,
  impression TEXT,
  clinical_notes TEXT,
  critical_panic_value BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'Finalized' CHECK (status IN (
    'Finalized', 'Pending Review', 'Critical Panic Alert', 'Reviewed'
  )),
  reviewed_by_staff_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. diagnostic_lab_parameters
CREATE TABLE IF NOT EXISTS public.diagnostic_lab_parameters (
  id TEXT PRIMARY KEY DEFAULT ('lparam-' || gen_random_uuid()::TEXT),
  lab_report_id TEXT NOT NULL REFERENCES public.diagnostic_lab_reports(id) ON DELETE CASCADE,
  parameter_order INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT NOT NULL,
  reference_range TEXT NOT NULL,
  flag TEXT NOT NULL DEFAULT 'Normal' CHECK (flag IN ('Normal', 'High', 'Low', 'Critical'))
);

-- =============================================================================
-- DOMAIN 4: EMERGENCY TRIAGE, MEDICO-LEGAL (MLC), TOXICOLOGY & TRANSFERS
-- =============================================================================

-- 18. emergency_cases (FIX #3: Explicit assigned_physician_id & assigned_nurse_id FKs)
CREATE TABLE IF NOT EXISTS public.emergency_cases (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  patient_snapshot JSONB NOT NULL,
  triage_level TEXT NOT NULL CHECK (triage_level IN ('RED', 'YELLOW', 'GREEN', 'BLACK')),
  esi_score INTEGER NOT NULL CHECK (esi_score >= 1 AND esi_score <= 5),
  chief_complaint TEXT NOT NULL,
  incident_type TEXT NOT NULL,
  incident_details JSONB NOT NULL DEFAULT '{}'::JSONB,
  vitals JSONB NOT NULL,
  bed_bay TEXT NOT NULL,
  assigned_physician_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  assigned_physician_name TEXT NOT NULL,
  assigned_nurse_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  assigned_nurse_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'Active Triage',
    'Under Resuscitation',
    'Under Evaluation',
    'Stabilized',
    'Admitted ICU',
    'Admitted Ward',
    'Transferred',
    'Discharged',
    'DAMA (Discharge Against Medical Advice)',
    'Brought Dead / Expired'
  )),
  is_mlc BOOLEAN NOT NULL DEFAULT false,
  mlc_id TEXT,
  is_poisoning BOOLEAN NOT NULL DEFAULT false,
  poison_case_id TEXT,
  transfer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. emergency_case_timeline_events
CREATE TABLE IF NOT EXISTS public.emergency_case_timeline_events (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES public.emergency_cases(id) ON DELETE CASCADE,
  author_staff_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('assessment', 'vitals', 'medication', 'procedure', 'handover')),
  note TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. medico_legal_cases (FIX #3: Explicit cmo_staff_id FK)
CREATE TABLE IF NOT EXISTS public.medico_legal_cases (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL UNIQUE REFERENCES public.emergency_cases(id) ON DELETE RESTRICT,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  patient_name TEXT NOT NULL,
  is_unidentified BOOLEAN NOT NULL DEFAULT false,
  police_station TEXT NOT NULL,
  fir_or_gd_number TEXT,
  intimation_sent_to_police BOOLEAN NOT NULL DEFAULT false,
  police_intimation_date TIMESTAMPTZ,
  brought_by_name TEXT NOT NULL,
  brought_by_designation TEXT NOT NULL,
  injury_classification TEXT NOT NULL CHECK (injury_classification IN (
    'Simple', 'Grievous', 'Dangerous to Life', 'Fatal', 'Under Observation'
  )),
  wounds JSONB NOT NULL DEFAULT '[]'::JSONB,
  weapon_or_agent_suspected TEXT NOT NULL,
  intoxication_suspected BOOLEAN NOT NULL DEFAULT false,
  smell_of_alcohol_or_agent TEXT,
  clothing_sealed_and_handed_over BOOLEAN NOT NULL DEFAULT false,
  sealed_articles_description TEXT,
  cmo_staff_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  cmo_name TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'Draft' CHECK (review_status IN (
    'Draft', 'Pending CMO Review', 'Signed & Sealed', 'Archived'
  )),
  cmo_signed_at TIMESTAMPTZ,
  remarks TEXT,
  legal_disclaimer_acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. poisoning_toxicology_cases
CREATE TABLE IF NOT EXISTS public.poisoning_toxicology_cases (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL UNIQUE REFERENCES public.emergency_cases(id) ON DELETE RESTRICT,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  patient_name TEXT NOT NULL,
  suspected_agent TEXT NOT NULL,
  commercial_brand_or_local_name TEXT,
  estimated_time_of_ingestion TEXT NOT NULL,
  route_of_exposure TEXT NOT NULL CHECK (route_of_exposure IN (
    'Oral Ingestion', 'Bite / Envenomation', 'Inhalation', 'Dermal Absorption'
  )),
  quantity_estimated TEXT,
  container_brought BOOLEAN NOT NULL DEFAULT false,
  vomitus_details TEXT,
  clinical_presentation JSONB NOT NULL,
  decontamination_actions JSONB NOT NULL,
  antidotes_administered JSONB NOT NULL DEFAULT '[]'::JSONB,
  atropinization_status JSONB NOT NULL,
  toxicology_samples_collected BOOLEAN NOT NULL DEFAULT false,
  sample_preservative TEXT,
  supervising_cmo_staff_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  supervising_toxicologist_or_cmo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. referral_transfers
CREATE TABLE IF NOT EXISTS public.referral_transfers (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES public.emergency_cases(id) ON DELETE RESTRICT,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  patient_name TEXT NOT NULL,
  originating_hospital TEXT NOT NULL,
  receiving_hospital_id TEXT REFERENCES public.hospitals(id) ON DELETE SET NULL,
  receiving_hospital TEXT NOT NULL,
  receiving_department TEXT NOT NULL,
  receiving_doctor_or_coordinator TEXT NOT NULL,
  acceptance_confirmed BOOLEAN NOT NULL DEFAULT false,
  acceptance_reference_code TEXT,
  clinical_reason TEXT NOT NULL,
  summary_at_transfer JSONB NOT NULL,
  transport_details JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'Initiated' CHECK (status IN (
    'Initiated', 'Acceptance Confirmed', 'Ambulance En-Route', 'Handover Completed', 'Cancelled'
  )),
  handover_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 23. clinical_documents (Hospital Statutory & Clinical Case Documents)
CREATE TABLE IF NOT EXISTS public.clinical_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN (
    'EMERGENCY_CASE_SHEET', 'MLC_CERTIFICATE', 'POISON_PROTOCOL', 'TRANSFER_SUMMARY', 'TRIAGE_SLIP', 'DAMA_RECORD'
  )),
  case_id TEXT REFERENCES public.emergency_cases(id) ON DELETE SET NULL,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  patient_name TEXT NOT NULL,
  is_unidentified BOOLEAN NOT NULL DEFAULT false,
  temp_id TEXT,
  author_staff_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Finalized', 'Verified')),
  summary_excerpt TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 24. patient_portal_documents (Patient Vault & Self-Uploaded Records)
CREATE TABLE IF NOT EXISTS public.patient_portal_documents (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'Medical History',
    'Consultation',
    'Prescription',
    'Laboratory',
    'Radiology / Imaging',
    'Discharge Summary',
    'Procedure / Surgery',
    'Patient Uploaded'
  )),
  source TEXT NOT NULL,
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  file_type TEXT NOT NULL CHECK (file_type IN ('PDF', 'IMAGE', 'DICOM')),
  file_size TEXT NOT NULL,
  summary TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  download_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- DOMAIN 5: TWO-WAY MESSAGING & NOTIFICATIONS (PHASE 4)
-- =============================================================================

-- 25. message_conversations
CREATE TABLE IF NOT EXISTS public.message_conversations (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_photo_url TEXT,
  doctor_id TEXT NOT NULL REFERENCES public.staff_users(id) ON DELETE RESTRICT,
  doctor_name TEXT NOT NULL,
  doctor_specialty TEXT,
  doctor_department TEXT,
  doctor_photo_url TEXT,
  related_appointment_id TEXT REFERENCES public.appointments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, doctor_id)
);

-- 26. patient_messages
CREATE TABLE IF NOT EXISTS public.patient_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES public.message_conversations(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT,
  doctor_id TEXT NOT NULL REFERENCES public.staff_users(id) ON DELETE RESTRICT,
  doctor_name TEXT NOT NULL,
  doctor_specialty TEXT,
  doctor_photo_url TEXT,
  sender_id TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('Patient', 'Doctor')),
  sender TEXT NOT NULL CHECK (sender IN ('patient', 'doctor', 'system')),
  text TEXT NOT NULL CHECK (char_length(btrim(text)) > 0),
  category TEXT CHECK (category IS NULL OR category IN (
    'General Query',
    'Medication Review',
    'Lab Follow-up',
    'Appointment',
    'Follow-up Coordination',
    'Administrative Query'
  )),
  related_appointment_id TEXT REFERENCES public.appointments(id) ON DELETE SET NULL,
  attachment JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 27. notifications (FIX #5: Nullable patient_id with target_audience CHECK + dedup_key index)
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id TEXT REFERENCES public.staff_users(id) ON DELETE CASCADE,
  appointment_id TEXT REFERENCES public.appointments(id) ON DELETE SET NULL,
  encounter_id TEXT REFERENCES public.clinical_encounters(id) ON DELETE SET NULL,
  conversation_id TEXT REFERENCES public.message_conversations(id) ON DELETE SET NULL,
  message_id TEXT REFERENCES public.patient_messages(id) ON DELETE SET NULL,
  dedup_key TEXT,
  target_audience TEXT NOT NULL DEFAULT 'patient' CHECK (target_audience IN ('patient', 'doctor', 'pharmacy', 'both')),
  category TEXT NOT NULL CHECK (category IN (
    'appointment', 'report', 'prescription', 'pharmacy', 'reminder', 'announcement', 'message'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_tab TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_notifications_audience_owner CHECK (
    target_audience = 'pharmacy' OR patient_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup_key_unique
  ON public.notifications(dedup_key)
  WHERE dedup_key IS NOT NULL;

-- =============================================================================
-- DOMAIN 6: HOSPITAL PHARMACY MANAGEMENT & SYSTEM AUDIT LOGS (PHASE 5)
-- =============================================================================

-- 28. pharmacy_batches (FIX #6: Non-negative available_quantity CHECK + unique batch per medicine)
CREATE TABLE IF NOT EXISTS public.pharmacy_batches (
  id TEXT PRIMARY KEY,
  medicine_id TEXT NOT NULL REFERENCES public.pharmacy_medicines(id) ON DELETE RESTRICT,
  batch_number TEXT NOT NULL,
  available_quantity INTEGER NOT NULL CHECK (available_quantity >= 0),
  expiry_date DATE NOT NULL,
  purchase_date DATE NOT NULL,
  supplier_reference TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  stock_location TEXT NOT NULL,
  unit_of_measurement TEXT NOT NULL DEFAULT 'Tablets',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (medicine_id, batch_number)
);

-- 29. pharmacy_dispensing_records
CREATE TABLE IF NOT EXISTS public.pharmacy_dispensing_records (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES public.clinical_encounters(id) ON DELETE RESTRICT,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  patient_name TEXT NOT NULL,
  prescribing_doctor_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  prescribing_doctor_name TEXT NOT NULL,
  prescription_date DATE NOT NULL,
  dispensed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dispensed_by_staff_id TEXT NOT NULL REFERENCES public.staff_users(id) ON DELETE RESTRICT,
  dispensed_by_staff_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'Fully Dispensed', 'Partially Dispensed', 'Unavailable', 'Not Yet Dispensed'
  )),
  notes TEXT
);

-- 30. pharmacy_dispensing_items (Normalized line items per dispensing event)
CREATE TABLE IF NOT EXISTS public.pharmacy_dispensing_items (
  id TEXT PRIMARY KEY DEFAULT ('ditem-' || gen_random_uuid()::TEXT),
  dispensing_record_id TEXT NOT NULL REFERENCES public.pharmacy_dispensing_records(id) ON DELETE CASCADE,
  prescription_item_id TEXT NOT NULL REFERENCES public.prescription_items(id) ON DELETE RESTRICT,
  medicine_id TEXT REFERENCES public.pharmacy_medicines(id) ON DELETE SET NULL,
  requested_medicine_name TEXT NOT NULL,
  requested_generic_name TEXT NOT NULL,
  requested_strength TEXT NOT NULL,
  requested_dosage_form TEXT NOT NULL CHECK (requested_dosage_form IN (
    'Tablet', 'Capsule', 'Inhaler', 'Injection', 'Syrup', 'Ointment', 'Drops', 'Powder', 'Solution'
  )),
  prescribed_quantity INTEGER NOT NULL CHECK (prescribed_quantity > 0),
  dispensed_quantity INTEGER NOT NULL CHECK (dispensed_quantity >= 0),
  previously_dispensed_quantity INTEGER NOT NULL DEFAULT 0 CHECK (previously_dispensed_quantity >= 0),
  remaining_quantity INTEGER NOT NULL CHECK (remaining_quantity >= 0),
  batch_id TEXT REFERENCES public.pharmacy_batches(id) ON DELETE SET NULL,
  batch_number TEXT,
  status TEXT NOT NULL CHECK (status IN (
    'Dispensed', 'Partially Dispensed', 'Unavailable', 'Not Yet Dispensed'
  )),
  note TEXT
);

-- 31. pharmacy_transactions (Immutable Stock Ledger)
CREATE TABLE IF NOT EXISTS public.pharmacy_transactions (
  id TEXT PRIMARY KEY,
  medicine_id TEXT NOT NULL REFERENCES public.pharmacy_medicines(id) ON DELETE RESTRICT,
  medicine_name TEXT NOT NULL,
  batch_id TEXT REFERENCES public.pharmacy_batches(id) ON DELETE SET NULL,
  batch_number TEXT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'Stock Receipt',
    'Batch Addition',
    'Stock Adjustment',
    'Dispense',
    'Partial Dispense',
    'Expiry Write-Off',
    'Catalogue Update'
  )),
  quantity_delta INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL CHECK (previous_quantity >= 0),
  new_quantity INTEGER NOT NULL CHECK (new_quantity >= 0),
  staff_id TEXT NOT NULL REFERENCES public.staff_users(id) ON DELETE RESTRICT,
  staff_name TEXT NOT NULL,
  staff_role TEXT NOT NULL,
  reason TEXT NOT NULL,
  related_prescription_id TEXT REFERENCES public.clinical_encounters(id) ON DELETE SET NULL,
  related_prescription_item_id TEXT REFERENCES public.prescription_items(id) ON DELETE SET NULL,
  related_dispensing_record_id TEXT REFERENCES public.pharmacy_dispensing_records(id) ON DELETE SET NULL,
  patient_id TEXT REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 32. pharmacy_reorder_requests
CREATE TABLE IF NOT EXISTS public.pharmacy_reorder_requests (
  id TEXT PRIMARY KEY,
  medicine_id TEXT NOT NULL REFERENCES public.pharmacy_medicines(id) ON DELETE RESTRICT,
  generic_name TEXT NOT NULL,
  brand_name TEXT,
  strength TEXT NOT NULL,
  dosage_form TEXT NOT NULL CHECK (dosage_form IN (
    'Tablet', 'Capsule', 'Inhaler', 'Injection', 'Syrup', 'Ointment', 'Drops', 'Powder', 'Solution'
  )),
  requested_quantity INTEGER NOT NULL CHECK (requested_quantity > 0),
  current_usable_stock INTEGER NOT NULL CHECK (current_usable_stock >= 0),
  minimum_threshold INTEGER NOT NULL CHECK (minimum_threshold >= 0),
  supplier_name TEXT NOT NULL,
  supplier_reference TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('Low Stock', 'Out of Stock', 'Near Expiry Replacement')),
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN (
    'Draft', 'Submitted Purchase Request', 'Approved', 'Cancelled'
  )),
  created_by_staff_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 33. audit_logs (Immutable System-Wide Governance & Clinical Audit Trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN (
    'PATIENT', 'CASE', 'MLC', 'POISON', 'TRANSFER', 'STAFF', 'PHARMACY', 'SYSTEM'
  )),
  target_id TEXT NOT NULL,
  details TEXT NOT NULL,
  ip_station TEXT NOT NULL DEFAULT 'HIS-TERMINAL',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PERFORMANCE & FOREIGN-KEY INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_staff_users_auth_uid ON public.staff_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_users_role ON public.staff_users(role);

CREATE INDEX IF NOT EXISTS idx_patients_auth_uid ON public.patients(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_patients_primary_physician ON public.patients(primary_physician_id);
CREATE INDEX IF NOT EXISTS idx_patients_triage_status ON public.patients(triage_status);

CREATE INDEX IF NOT EXISTS idx_patient_access_audits_patient_ts ON public.patient_access_audits(patient_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_date ON public.appointments(patient_id, appointment_date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON public.appointments(doctor_id, appointment_date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

CREATE INDEX IF NOT EXISTS idx_encounters_patient_date ON public.clinical_encounters(patient_id, encounter_date DESC);
CREATE INDEX IF NOT EXISTS idx_encounters_doctor_date ON public.clinical_encounters(doctor_id, encounter_date DESC);
CREATE INDEX IF NOT EXISTS idx_encounters_appointment ON public.clinical_encounters(appointment_id);
CREATE INDEX IF NOT EXISTS idx_encounters_status ON public.clinical_encounters(status, prescription_status);

CREATE INDEX IF NOT EXISTS idx_prescription_items_encounter ON public.prescription_items(encounter_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_patient ON public.prescription_items(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_medicine ON public.prescription_items(medicine_id);

CREATE INDEX IF NOT EXISTS idx_med_activities_patient_rec ON public.patient_medication_activities(patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_med_activities_rx_item ON public.patient_medication_activities(prescription_item_id);

CREATE INDEX IF NOT EXISTS idx_followups_patient_due ON public.follow_up_reminders(patient_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_followups_doctor ON public.follow_up_reminders(attending_doctor_id);

CREATE INDEX IF NOT EXISTS idx_lab_reports_patient_date ON public.diagnostic_lab_reports(patient_id, reported_date DESC);
CREATE INDEX IF NOT EXISTS idx_lab_params_report ON public.diagnostic_lab_parameters(lab_report_id, parameter_order);

CREATE INDEX IF NOT EXISTS idx_emergency_cases_patient ON public.emergency_cases(patient_id);
CREATE INDEX IF NOT EXISTS idx_emergency_cases_status ON public.emergency_cases(status, triage_level);
CREATE INDEX IF NOT EXISTS idx_emergency_timeline_case ON public.emergency_case_timeline_events(case_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_patient_last ON public.message_conversations(patient_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_doctor_last ON public.message_conversations(doctor_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_ts ON public.patient_messages(conversation_id, timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.patient_messages(conversation_id, is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_patient_ts ON public.notifications(patient_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_doctor_ts ON public.notifications(doctor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_audience_ts ON public.notifications(target_audience, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_pharmacy_batches_medicine_exp ON public.pharmacy_batches(medicine_id, expiry_date ASC);
CREATE INDEX IF NOT EXISTS idx_pharmacy_dispensing_encounter ON public.pharmacy_dispensing_records(encounter_id, dispensed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pharmacy_dispensing_patient ON public.pharmacy_dispensing_records(patient_id, dispensed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pharmacy_disp_items_record ON public.pharmacy_dispensing_items(dispensing_record_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_disp_items_rx_item ON public.pharmacy_dispensing_items(prescription_item_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_tx_medicine_ts ON public.pharmacy_transactions(medicine_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pharmacy_reorders_status ON public.pharmacy_reorder_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_ts ON public.audit_logs(target_type, target_id, timestamp DESC);

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS trg_hospitals_updated_at ON public.hospitals;
CREATE TRIGGER trg_hospitals_updated_at BEFORE UPDATE ON public.hospitals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_staff_users_updated_at ON public.staff_users;
CREATE TRIGGER trg_staff_users_updated_at BEFORE UPDATE ON public.staff_users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_patients_updated_at ON public.patients;
CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_patient_privacy_updated_at ON public.patient_privacy_settings;
CREATE TRIGGER trg_patient_privacy_updated_at BEFORE UPDATE ON public.patient_privacy_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON public.appointments;
CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_encounters_updated_at ON public.clinical_encounters;
CREATE TRIGGER trg_encounters_updated_at BEFORE UPDATE ON public.clinical_encounters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_prescription_items_updated_at ON public.prescription_items;
CREATE TRIGGER trg_prescription_items_updated_at BEFORE UPDATE ON public.prescription_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_followups_updated_at ON public.follow_up_reminders;
CREATE TRIGGER trg_followups_updated_at BEFORE UPDATE ON public.follow_up_reminders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_lab_reports_updated_at ON public.diagnostic_lab_reports;
CREATE TRIGGER trg_lab_reports_updated_at BEFORE UPDATE ON public.diagnostic_lab_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_emergency_cases_updated_at ON public.emergency_cases;
CREATE TRIGGER trg_emergency_cases_updated_at BEFORE UPDATE ON public.emergency_cases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_mlc_updated_at ON public.medico_legal_cases;
CREATE TRIGGER trg_mlc_updated_at BEFORE UPDATE ON public.medico_legal_cases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_poison_updated_at ON public.poisoning_toxicology_cases;
CREATE TRIGGER trg_poison_updated_at BEFORE UPDATE ON public.poisoning_toxicology_cases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_transfers_updated_at ON public.referral_transfers;
CREATE TRIGGER trg_transfers_updated_at BEFORE UPDATE ON public.referral_transfers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_clinical_docs_updated_at ON public.clinical_documents;
CREATE TRIGGER trg_clinical_docs_updated_at BEFORE UPDATE ON public.clinical_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_pharmacy_medicines_updated_at ON public.pharmacy_medicines;
CREATE TRIGGER trg_pharmacy_medicines_updated_at BEFORE UPDATE ON public.pharmacy_medicines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_pharmacy_batches_updated_at ON public.pharmacy_batches;
CREATE TRIGGER trg_pharmacy_batches_updated_at BEFORE UPDATE ON public.pharmacy_batches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_pharmacy_reorders_updated_at ON public.pharmacy_reorder_requests;
CREATE TRIGGER trg_pharmacy_reorders_updated_at BEFORE UPDATE ON public.pharmacy_reorder_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
