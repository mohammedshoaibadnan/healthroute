-- =============================================================================
-- HEALTHROUTE — CONSOLIDATED PHASE 6A–6C SUPABASE POSTGRESQL SETUP SCRIPT
-- Generated from /supabase/migrations/ (000001 through 000005)
-- Paste this entire file into Supabase Dashboard -> SQL Editor -> Run
-- Fully idempotent and safely rerunnable on fresh or partially migrated databases.
-- =============================================================================

-- >>> FILE: 20261113000001_phase6a_schema_and_constraints.sql <<<
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


-- >>> FILE: 20261113000002_phase6a_rls_policies.sql <<<
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


-- >>> FILE: 20261113000003_phase6a_transactional_functions.sql <<<
-- =============================================================================
-- HEALTHROUTE — PHASE 6A: TRANSACTIONAL POSTGRESQL RPC FUNCTIONS
-- Migration: 20261113000003_phase6a_transactional_functions.sql
-- =============================================================================
-- Eliminates multi-table partial writes, TOCTOU pharmacy stock race conditions,
-- duplicate dispensing, and stale emergency patient snapshots using row-level
-- pessimistic locking (SELECT ... FOR UPDATE) inside single ACID transactions.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. ATOMIC PHARMACY PRESCRIPTION DISPENSING (FIXES RACE CONDITIONS & OVER-DISPENSE)
-- =============================================================================
-- Input p_line_inputs JSONB format:
-- [
--   {
--     "prescriptionItemId": "rx-ram-1",
--     "medicineId": "med-ticagrelor-90",
--     "batchId": "batch-tic-1",
--     "dispensedQuantity": 60,
--     "prescribedQuantity": 60,
--     "markUnavailable": false,
--     "note": "Dispensed 60 tablets"
--   }
-- ]
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_dispense_prescription(
  p_dispensing_record_id TEXT,
  p_encounter_id TEXT,
  p_line_inputs JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id TEXT;
  v_staff_name TEXT;
  v_staff_role TEXT;
  v_enc RECORD;
  v_rx RECORD;
  v_batch RECORD;
  v_med RECORD;
  v_line JSONB;
  v_disp_qty INTEGER;
  v_prescribed_qty INTEGER;
  v_prev_disp_qty INTEGER;
  v_remaining_before INTEGER;
  v_remaining_after INTEGER;
  v_mark_unavail BOOLEAN;
  v_line_note TEXT;
  v_batch_id TEXT;
  v_med_id TEXT;
  v_item_status TEXT;
  v_overall_status TEXT;
  v_total_dispensed_now INTEGER := 0;
  v_fully_satisfied_count INTEGER := 0;
  v_unavail_count INTEGER := 0;
  v_active_rx_count INTEGER := 0;
  v_new_batch_qty INTEGER;
  v_usable_stock INTEGER;
BEGIN
  -- 1. Strict server-side RBAC check
  SELECT s.id, s.name, s.role
  INTO v_staff_id, v_staff_name, v_staff_role
  FROM public.staff_users s
  WHERE s.auth_user_id = auth.uid()
    AND s.is_active = true
  LIMIT 1;

  IF v_staff_role IS NULL OR v_staff_role NOT IN ('pharmacist', 'admin') THEN
    RAISE EXCEPTION 'UNAUTHORIZED_PHARMACY_ACTION: Only authenticated pharmacists or hospital admins may dispense prescriptions.';
  END IF;

  IF p_line_inputs IS NULL OR jsonb_typeof(p_line_inputs) <> 'array' OR jsonb_array_length(p_line_inputs) = 0 THEN
    RAISE EXCEPTION 'INVALID_DISPENSE_INPUT: At least one prescription line input is required.';
  END IF;

  -- 2. Lock the target clinical encounter row FOR UPDATE to serialize concurrent dispenses for the same encounter
  SELECT *
  INTO v_enc
  FROM public.clinical_encounters ce
  WHERE ce.id = p_encounter_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ENCOUNTER_NOT_FOUND: Clinical encounter % does not exist.', p_encounter_id;
  END IF;

  IF v_enc.status NOT IN ('Finalized', 'Signed') OR v_enc.prescription_status = 'Discontinued' THEN
    RAISE EXCEPTION 'INVALID_PRESCRIPTION_STATE: Only active, finalized/signed prescriptions can be dispensed.';
  END IF;

  -- 3. Deterministically lock all referenced pharmacy_batches in ascending ID order to prevent deadlocks
  PERFORM 1
  FROM public.pharmacy_batches pb
  WHERE pb.id IN (
    SELECT DISTINCT (elem->>'batchId')
    FROM jsonb_array_elements(p_line_inputs) AS elem
    WHERE elem->>'batchId' IS NOT NULL AND btrim(elem->>'batchId') <> ''
  )
  ORDER BY pb.id
  FOR UPDATE;

  -- 4. Insert the dispensing record header initially as 'Partially Dispensed' (updated after line evaluation)
  INSERT INTO public.pharmacy_dispensing_records (
    id,
    encounter_id,
    patient_id,
    patient_name,
    prescribing_doctor_id,
    prescribing_doctor_name,
    prescription_date,
    dispensed_at,
    dispensed_by_staff_id,
    dispensed_by_staff_name,
    status,
    notes
  ) VALUES (
    p_dispensing_record_id,
    v_enc.id,
    v_enc.patient_id,
    v_enc.patient_name,
    v_enc.doctor_id,
    v_enc.doctor_name,
    COALESCE(v_enc.prescription_created_date, v_enc.encounter_date),
    NOW(),
    v_staff_id,
    v_staff_name,
    'Partially Dispensed',
    NULLIF(btrim(COALESCE(p_notes, '')), '')
  );

  -- 5. Iterate through every active prescription item in the encounter
  FOR v_rx IN
    SELECT *
    FROM public.prescription_items pi
    WHERE pi.encounter_id = v_enc.id
      AND pi.status = 'Active'
    ORDER BY pi.id
    FOR UPDATE
  LOOP
    v_active_rx_count := v_active_rx_count + 1;

    -- Calculate cumulative quantity already dispensed across prior dispensing records
    SELECT COALESCE(SUM(pdi.dispensed_quantity), 0)
    INTO v_prev_disp_qty
    FROM public.pharmacy_dispensing_items pdi
    JOIN public.pharmacy_dispensing_records pdr ON pdr.id = pdi.dispensing_record_id
    WHERE pdr.encounter_id = v_enc.id
      AND pdi.prescription_item_id = v_rx.id
      AND pdr.id <> p_dispensing_record_id;

    -- Find matching line input from caller
    SELECT elem
    INTO v_line
    FROM jsonb_array_elements(p_line_inputs) AS elem
    WHERE elem->>'prescriptionItemId' = v_rx.id
    LIMIT 1;

    v_prescribed_qty := COALESCE(
      NULLIF((v_line->>'prescribedQuantity')::INTEGER, 0),
      v_rx.prescribed_quantity,
      1
    );
    v_remaining_before := GREATEST(0, v_prescribed_qty - v_prev_disp_qty);

    IF v_remaining_before = 0 THEN
      -- Already fully dispensed in prior records
      v_fully_satisfied_count := v_fully_satisfied_count + 1;
      INSERT INTO public.pharmacy_dispensing_items (
        dispensing_record_id,
        prescription_item_id,
        medicine_id,
        requested_medicine_name,
        requested_generic_name,
        requested_strength,
        requested_dosage_form,
        prescribed_quantity,
        dispensed_quantity,
        previously_dispensed_quantity,
        remaining_quantity,
        status,
        note
      ) VALUES (
        p_dispensing_record_id,
        v_rx.id,
        v_rx.medicine_id,
        COALESCE(v_rx.drug_name, v_rx.medicine_name),
        COALESCE(v_rx.generic_name, lower(v_rx.medicine_name)),
        COALESCE(v_rx.strength, ''),
        COALESCE(v_rx.dosage_form, 'Tablet'),
        v_prescribed_qty,
        0,
        v_prev_disp_qty,
        0,
        'Dispensed',
        'Previously dispensed in full'
      );
      CONTINUE;
    END IF;

    v_disp_qty := COALESCE((v_line->>'dispensedQuantity')::INTEGER, 0);
    v_mark_unavail := COALESCE((v_line->>'markUnavailable')::BOOLEAN, false);
    v_line_note := NULLIF(btrim(COALESCE(v_line->>'note', '')), '');
    v_batch_id := NULLIF(btrim(COALESCE(v_line->>'batchId', '')), '');
    v_med_id := COALESCE(NULLIF(btrim(COALESCE(v_line->>'medicineId', '')), ''), v_rx.medicine_id);

    IF v_disp_qty < 0 THEN
      RAISE EXCEPTION 'NEGATIVE_DISPENSE_QUANTITY: Dispensed quantity cannot be negative for %.', v_rx.medicine_name;
    END IF;

    IF v_disp_qty > v_remaining_before THEN
      RAISE EXCEPTION 'OVER_DISPENSE_PREVENTED: Dispensed quantity (%) exceeds remaining prescribed quantity (%) for %.',
        v_disp_qty, v_remaining_before, v_rx.medicine_name;
    END IF;

    IF v_mark_unavail OR v_disp_qty = 0 THEN
      v_item_status := CASE WHEN v_mark_unavail THEN 'Unavailable' ELSE 'Not Yet Dispensed' END;
      IF v_mark_unavail THEN
        v_unavail_count := v_unavail_count + 1;
      END IF;

      INSERT INTO public.pharmacy_dispensing_items (
        dispensing_record_id,
        prescription_item_id,
        medicine_id,
        requested_medicine_name,
        requested_generic_name,
        requested_strength,
        requested_dosage_form,
        prescribed_quantity,
        dispensed_quantity,
        previously_dispensed_quantity,
        remaining_quantity,
        status,
        note
      ) VALUES (
        p_dispensing_record_id,
        v_rx.id,
        v_med_id,
        COALESCE(v_rx.drug_name, v_rx.medicine_name),
        COALESCE(v_rx.generic_name, lower(v_rx.medicine_name)),
        COALESCE(v_rx.strength, ''),
        COALESCE(v_rx.dosage_form, 'Tablet'),
        v_prescribed_qty,
        0,
        v_prev_disp_qty,
        v_remaining_before,
        v_item_status,
        v_line_note
      );
      CONTINUE;
    END IF;

    -- Validate batch & medicine for positive dispense quantity
    IF v_batch_id IS NULL THEN
      RAISE EXCEPTION 'BATCH_REQUIRED: A valid pharmacy batch must be selected for %.', v_rx.medicine_name;
    END IF;

    SELECT *
    INTO v_batch
    FROM public.pharmacy_batches pb
    WHERE pb.id = v_batch_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'BATCH_NOT_FOUND: Selected batch % does not exist.', v_batch_id;
    END IF;

    SELECT *
    INTO v_med
    FROM public.pharmacy_medicines pm
    WHERE pm.id = v_batch.medicine_id;

    IF NOT FOUND OR v_med.status <> 'Active' THEN
      RAISE EXCEPTION 'INACTIVE_MEDICINE: Medicine for batch % is inactive or missing.', v_batch.batch_number;
    END IF;

    IF v_batch.expiry_date < CURRENT_DATE THEN
      RAISE EXCEPTION 'EXPIRED_BATCH_BLOCKED: Batch % expired on % and cannot be dispensed.',
        v_batch.batch_number, v_batch.expiry_date;
    END IF;

    IF v_batch.available_quantity < v_disp_qty THEN
      RAISE EXCEPTION 'INSUFFICIENT_BATCH_STOCK: Batch % has only % units available (requested %).',
        v_batch.batch_number, v_batch.available_quantity, v_disp_qty;
    END IF;

    -- Deduct stock atomically
    v_new_batch_qty := v_batch.available_quantity - v_disp_qty;

    UPDATE public.pharmacy_batches
    SET available_quantity = v_new_batch_qty,
        updated_at = NOW()
    WHERE id = v_batch.id;

    v_remaining_after := GREATEST(0, v_remaining_before - v_disp_qty);
    v_total_dispensed_now := v_total_dispensed_now + v_disp_qty;

    IF v_remaining_after = 0 THEN
      v_item_status := 'Dispensed';
      v_fully_satisfied_count := v_fully_satisfied_count + 1;
    ELSE
      v_item_status := 'Partially Dispensed';
    END IF;

    -- Insert dispensing line item
    INSERT INTO public.pharmacy_dispensing_items (
      dispensing_record_id,
      prescription_item_id,
      medicine_id,
      requested_medicine_name,
      requested_generic_name,
      requested_strength,
      requested_dosage_form,
      prescribed_quantity,
      dispensed_quantity,
      previously_dispensed_quantity,
      remaining_quantity,
      batch_id,
      batch_number,
      status,
      note
    ) VALUES (
      p_dispensing_record_id,
      v_rx.id,
      v_med.id,
      COALESCE(v_rx.drug_name, v_rx.medicine_name),
      v_med.generic_name,
      v_med.strength,
      v_med.dosage_form,
      v_prescribed_qty,
      v_disp_qty,
      v_prev_disp_qty,
      v_remaining_after,
      v_batch.id,
      v_batch.batch_number,
      v_item_status,
      v_line_note
    );

    -- Append immutable stock ledger transaction
    INSERT INTO public.pharmacy_transactions (
      id,
      medicine_id,
      medicine_name,
      batch_id,
      batch_number,
      transaction_type,
      quantity_delta,
      previous_quantity,
      new_quantity,
      staff_id,
      staff_name,
      staff_role,
      reason,
      related_prescription_id,
      related_prescription_item_id,
      related_dispensing_record_id,
      patient_id,
      patient_name,
      timestamp
    ) VALUES (
      'ptx-' || gen_random_uuid()::TEXT,
      v_med.id,
      v_med.generic_name || ' ' || v_med.strength || ' (' || v_med.dosage_form || ')',
      v_batch.id,
      v_batch.batch_number,
      CASE WHEN v_remaining_after = 0 THEN 'Dispense' ELSE 'Partial Dispense' END,
      -v_disp_qty,
      v_batch.available_quantity,
      v_new_batch_qty,
      v_staff_id,
      v_staff_name,
      v_staff_role,
      'Dispensed for Prescription ' || v_enc.id || ' (' || v_enc.patient_name || ')',
      v_enc.id,
      v_rx.id,
      p_dispensing_record_id,
      v_enc.patient_id,
      v_enc.patient_name,
      NOW()
    );

    -- Check usable non-expired stock for low-stock / out-of-stock pharmacy alert
    SELECT COALESCE(SUM(pb2.available_quantity), 0)
    INTO v_usable_stock
    FROM public.pharmacy_batches pb2
    WHERE pb2.medicine_id = v_med.id
      AND pb2.expiry_date >= CURRENT_DATE;

    IF v_usable_stock <= v_med.minimum_stock_threshold THEN
      INSERT INTO public.notifications (
        id,
        patient_id,
        dedup_key,
        target_audience,
        category,
        title,
        message,
        priority,
        timestamp
      ) VALUES (
        'notif-stock-' || gen_random_uuid()::TEXT,
        NULL,
        'pharm-stock-alert:' || v_med.id || ':' || CASE WHEN v_usable_stock = 0 THEN 'out_of_stock' ELSE 'low_stock' END,
        'pharmacy',
        'pharmacy',
        CASE WHEN v_usable_stock = 0 THEN 'Critical Out-of-Stock Alert: ' ELSE 'Low Stock Threshold Alert: ' END || v_med.generic_name,
        v_med.generic_name || ' (' || v_med.strength || ') usable stock is ' || v_usable_stock || ' ' || v_med.unit_of_measurement || ' (minimum threshold: ' || v_med.minimum_stock_threshold || ').',
        CASE WHEN v_usable_stock = 0 THEN 'high' ELSE 'normal' END,
        NOW()
      )
      ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING;
    END IF;
  END LOOP;

  IF v_total_dispensed_now = 0 AND v_unavail_count = 0 THEN
    RAISE EXCEPTION 'EMPTY_DISPENSE_ACTION: Enter a positive dispense quantity or mark an item unavailable.';
  END IF;

  -- 6. Compute overall dispensing status and update header
  IF v_fully_satisfied_count = v_active_rx_count AND v_active_rx_count > 0 THEN
    v_overall_status := 'Fully Dispensed';
  ELSIF v_total_dispensed_now = 0 AND v_unavail_count > 0 THEN
    v_overall_status := 'Unavailable';
  ELSE
    v_overall_status := 'Partially Dispensed';
  END IF;

  UPDATE public.pharmacy_dispensing_records
  SET status = v_overall_status
  WHERE id = p_dispensing_record_id;

  -- 7. Emit connected Patient Portal notification
  INSERT INTO public.notifications (
    id,
    patient_id,
    doctor_id,
    encounter_id,
    dedup_key,
    target_audience,
    category,
    title,
    message,
    action_tab,
    priority,
    timestamp
  ) VALUES (
    'notif-disp-pt-' || gen_random_uuid()::TEXT,
    v_enc.patient_id,
    v_enc.doctor_id,
    v_enc.id,
    'rx-dispense:' || p_dispensing_record_id || ':patient',
    'patient',
    'pharmacy',
    CASE
      WHEN v_overall_status = 'Fully Dispensed' THEN 'Prescription Medicines Dispensed'
      WHEN v_overall_status = 'Partially Dispensed' THEN 'Prescription Partially Dispensed'
      ELSE 'Prescription Item Currently Unavailable'
    END,
    'Hospital Pharmacy (' || v_staff_name || ') processed prescription ' || v_enc.id || ' with status: ' || v_overall_status || '.',
    'patient-prescriptions',
    CASE WHEN v_overall_status = 'Unavailable' THEN 'high' ELSE 'normal' END,
    NOW()
  )
  ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING;

  -- 8. Append system audit log
  INSERT INTO public.audit_logs (
    id,
    user_id,
    user_name,
    user_role,
    action,
    target_type,
    target_id,
    details,
    ip_station,
    timestamp
  ) VALUES (
    'aud-' || gen_random_uuid()::TEXT,
    v_staff_id,
    v_staff_name,
    v_staff_role,
    'Prescription Dispensed (' || v_overall_status || ')',
    'PHARMACY',
    p_dispensing_record_id,
    'Encounter ' || v_enc.id || ' for ' || v_enc.patient_name || ' processed by ' || v_staff_name,
    'PHARMACY-DISPENSARY-01',
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'dispensingRecordId', p_dispensing_record_id,
    'encounterId', v_enc.id,
    'status', v_overall_status,
    'totalUnitsDispensed', v_total_dispensed_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_dispense_prescription(TEXT, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_dispense_prescription(TEXT, TEXT, JSONB, TEXT) TO authenticated;

-- =============================================================================
-- 2. ATOMIC PHARMACY BATCH STOCK RECEIPT / ADDITION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_receive_pharmacy_batch_stock(
  p_batch_id TEXT,
  p_medicine_id TEXT,
  p_batch_number TEXT,
  p_quantity INTEGER,
  p_expiry_date DATE,
  p_purchase_date DATE,
  p_supplier_reference TEXT,
  p_supplier_name TEXT,
  p_stock_location TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id TEXT;
  v_staff_name TEXT;
  v_staff_role TEXT;
  v_med RECORD;
  v_existing_batch RECORD;
  v_prev_qty INTEGER := 0;
  v_new_qty INTEGER;
  v_final_batch_id TEXT;
  v_tx_type TEXT;
BEGIN
  SELECT s.id, s.name, s.role
  INTO v_staff_id, v_staff_name, v_staff_role
  FROM public.staff_users s
  WHERE s.auth_user_id = auth.uid()
    AND s.is_active = true
  LIMIT 1;

  IF v_staff_role IS NULL OR v_staff_role NOT IN ('pharmacist', 'admin') THEN
    RAISE EXCEPTION 'UNAUTHORIZED_PHARMACY_ACTION: Only pharmacists or admins may receive batch stock.';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_STOCK_QUANTITY: Received quantity must be greater than zero.';
  END IF;

  IF p_expiry_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'EXPIRED_STOCK_RECEIPT_BLOCKED: Cannot receive already expired batch (%).', p_expiry_date;
  END IF;

  SELECT *
  INTO v_med
  FROM public.pharmacy_medicines pm
  WHERE pm.id = p_medicine_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MEDICINE_NOT_FOUND: Medicine % does not exist.', p_medicine_id;
  END IF;

  -- Check if batch already exists for this medicine + batch_number and lock it
  SELECT *
  INTO v_existing_batch
  FROM public.pharmacy_batches pb
  WHERE pb.medicine_id = p_medicine_id
    AND upper(pb.batch_number) = upper(btrim(p_batch_number))
  FOR UPDATE;

  IF FOUND THEN
    v_prev_qty := v_existing_batch.available_quantity;
    v_new_qty := v_prev_qty + p_quantity;
    v_final_batch_id := v_existing_batch.id;
    v_tx_type := 'Batch Addition';

    UPDATE public.pharmacy_batches
    SET available_quantity = v_new_qty,
        expiry_date = p_expiry_date,
        purchase_date = p_purchase_date,
        supplier_reference = btrim(p_supplier_reference),
        supplier_name = btrim(p_supplier_name),
        stock_location = btrim(p_stock_location),
        updated_at = NOW()
    WHERE id = v_final_batch_id;
  ELSE
    v_prev_qty := 0;
    v_new_qty := p_quantity;
    v_final_batch_id := COALESCE(NULLIF(btrim(p_batch_id), ''), 'batch-' || gen_random_uuid()::TEXT);
    v_tx_type := 'Stock Receipt';

    INSERT INTO public.pharmacy_batches (
      id,
      medicine_id,
      batch_number,
      available_quantity,
      expiry_date,
      purchase_date,
      supplier_reference,
      supplier_name,
      stock_location,
      unit_of_measurement
    ) VALUES (
      v_final_batch_id,
      p_medicine_id,
      upper(btrim(p_batch_number)),
      v_new_qty,
      p_expiry_date,
      p_purchase_date,
      btrim(p_supplier_reference),
      btrim(p_supplier_name),
      btrim(p_stock_location),
      v_med.unit_of_measurement
    );
  END IF;

  INSERT INTO public.pharmacy_transactions (
    id,
    medicine_id,
    medicine_name,
    batch_id,
    batch_number,
    transaction_type,
    quantity_delta,
    previous_quantity,
    new_quantity,
    staff_id,
    staff_name,
    staff_role,
    reason,
    timestamp
  ) VALUES (
    'ptx-' || gen_random_uuid()::TEXT,
    v_med.id,
    v_med.generic_name || ' ' || v_med.strength || ' (' || v_med.dosage_form || ')',
    v_final_batch_id,
    upper(btrim(p_batch_number)),
    v_tx_type,
    p_quantity,
    v_prev_qty,
    v_new_qty,
    v_staff_id,
    v_staff_name,
    v_staff_role,
    COALESCE(NULLIF(btrim(p_reason), ''), 'Received stock from ' || btrim(p_supplier_name) || ' (' || btrim(p_supplier_reference) || ')'),
    NOW()
  );

  INSERT INTO public.audit_logs (
    id, user_id, user_name, user_role, action, target_type, target_id, details, ip_station
  ) VALUES (
    'aud-' || gen_random_uuid()::TEXT,
    v_staff_id,
    v_staff_name,
    v_staff_role,
    'Pharmacy Stock Received',
    'PHARMACY',
    v_final_batch_id,
    v_tx_type || ': +' || p_quantity || ' ' || v_med.unit_of_measurement || ' for ' || v_med.generic_name || ' (Batch ' || upper(btrim(p_batch_number)) || ')',
    'PHARMACY-STORES-01'
  );

  RETURN jsonb_build_object(
    'success', true,
    'batchId', v_final_batch_id,
    'previousQuantity', v_prev_qty,
    'newQuantity', v_new_qty,
    'transactionType', v_tx_type
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_receive_pharmacy_batch_stock(TEXT, TEXT, TEXT, INTEGER, DATE, DATE, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_receive_pharmacy_batch_stock(TEXT, TEXT, TEXT, INTEGER, DATE, DATE, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =============================================================================
-- 3. ATOMIC PHARMACY BATCH STOCK ADJUSTMENT / EXPIRY WRITE-OFF
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_adjust_pharmacy_batch_stock(
  p_batch_id TEXT,
  p_quantity_delta INTEGER,
  p_reason TEXT,
  p_transaction_type TEXT DEFAULT 'Stock Adjustment'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id TEXT;
  v_staff_name TEXT;
  v_staff_role TEXT;
  v_batch RECORD;
  v_med RECORD;
  v_new_qty INTEGER;
BEGIN
  SELECT s.id, s.name, s.role
  INTO v_staff_id, v_staff_name, v_staff_role
  FROM public.staff_users s
  WHERE s.auth_user_id = auth.uid()
    AND s.is_active = true
  LIMIT 1;

  IF v_staff_role IS NULL OR v_staff_role NOT IN ('pharmacist', 'admin') THEN
    RAISE EXCEPTION 'UNAUTHORIZED_PHARMACY_ACTION: Only pharmacists or admins may adjust batch stock.';
  END IF;

  IF p_quantity_delta IS NULL OR p_quantity_delta = 0 THEN
    RAISE EXCEPTION 'ZERO_STOCK_DELTA: Stock adjustment delta cannot be zero.';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'REASON_REQUIRED: A clinical or inventory reason is required for stock adjustment.';
  END IF;

  SELECT *
  INTO v_batch
  FROM public.pharmacy_batches pb
  WHERE pb.id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BATCH_NOT_FOUND: Batch % does not exist.', p_batch_id;
  END IF;

  v_new_qty := v_batch.available_quantity + p_quantity_delta;
  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'NEGATIVE_STOCK_BLOCKED: Adjustment (%) would reduce batch % below zero (available: %).',
      p_quantity_delta, v_batch.batch_number, v_batch.available_quantity;
  END IF;

  SELECT *
  INTO v_med
  FROM public.pharmacy_medicines pm
  WHERE pm.id = v_batch.medicine_id;

  UPDATE public.pharmacy_batches
  SET available_quantity = v_new_qty,
      updated_at = NOW()
  WHERE id = v_batch.id;

  INSERT INTO public.pharmacy_transactions (
    id,
    medicine_id,
    medicine_name,
    batch_id,
    batch_number,
    transaction_type,
    quantity_delta,
    previous_quantity,
    new_quantity,
    staff_id,
    staff_name,
    staff_role,
    reason,
    timestamp
  ) VALUES (
    'ptx-' || gen_random_uuid()::TEXT,
    v_med.id,
    v_med.generic_name || ' ' || v_med.strength || ' (' || v_med.dosage_form || ')',
    v_batch.id,
    v_batch.batch_number,
    COALESCE(p_transaction_type, 'Stock Adjustment'),
    p_quantity_delta,
    v_batch.available_quantity,
    v_new_qty,
    v_staff_id,
    v_staff_name,
    v_staff_role,
    btrim(p_reason),
    NOW()
  );

  INSERT INTO public.audit_logs (
    id, user_id, user_name, user_role, action, target_type, target_id, details, ip_station
  ) VALUES (
    'aud-' || gen_random_uuid()::TEXT,
    v_staff_id,
    v_staff_name,
    v_staff_role,
    'Pharmacy Stock Adjusted',
    'PHARMACY',
    v_batch.id,
    p_transaction_type || ' (' || p_quantity_delta || ') on Batch ' || v_batch.batch_number || '. Reason: ' || btrim(p_reason),
    'PHARMACY-STORES-01'
  );

  RETURN jsonb_build_object(
    'success', true,
    'batchId', v_batch.id,
    'previousQuantity', v_batch.available_quantity,
    'newQuantity', v_new_qty
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_adjust_pharmacy_batch_stock(TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_adjust_pharmacy_batch_stock(TEXT, INTEGER, TEXT, TEXT) TO authenticated;

-- =============================================================================
-- 4. ATOMIC UNIDENTIFIED PATIENT IDENTITY RECONCILIATION (FIXES STALE SNAPSHOTS)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_reconcile_unidentified_patient(
  p_patient_id TEXT,
  p_verified_name TEXT,
  p_age INTEGER,
  p_gender TEXT,
  p_blood_group TEXT,
  p_contact_number TEXT,
  p_address TEXT,
  p_national_id TEXT,
  p_next_of_kin JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id TEXT;
  v_staff_name TEXT;
  v_staff_role TEXT;
  v_pat RECORD;
  v_new_mrn TEXT;
  v_reconcile_entry JSONB;
BEGIN
  SELECT s.id, s.name, s.role
  INTO v_staff_id, v_staff_name, v_staff_role
  FROM public.staff_users s
  WHERE s.auth_user_id = auth.uid()
    AND s.is_active = true
  LIMIT 1;

  IF v_staff_role IS NULL OR v_staff_role NOT IN ('records', 'doctor', 'cmo', 'admin') THEN
    RAISE EXCEPTION 'UNAUTHORIZED_RECONCILIATION: Only Medical Records, Physicians, CMOs, or Admins may reconcile unidentified patients.';
  END IF;

  SELECT *
  INTO v_pat
  FROM public.patients p
  WHERE p.id = p_patient_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PATIENT_NOT_FOUND: Patient % does not exist.', p_patient_id;
  END IF;

  v_new_mrn := COALESCE(v_pat.permanent_mrn, 'AC-BLR-2026-REC-' || floor(extract(epoch from NOW()))::TEXT);

  v_reconcile_entry := jsonb_build_object(
    'previousTempId', v_pat.temp_id,
    'previousName', v_pat.name,
    'verifiedName', btrim(p_verified_name),
    'permanentMrn', v_new_mrn,
    'reconciledByStaffId', v_staff_id,
    'reconciledByName', v_staff_name,
    'reconciledAt', NOW()
  );

  UPDATE public.patients
  SET is_unidentified = false,
      permanent_mrn = v_new_mrn,
      name = btrim(p_verified_name),
      age_estimated = false,
      age = COALESCE(p_age, v_pat.age),
      gender = COALESCE(p_gender, v_pat.gender),
      blood_group = COALESCE(p_blood_group, v_pat.blood_group),
      contact_number = COALESCE(NULLIF(btrim(p_contact_number), ''), v_pat.contact_number),
      address = COALESCE(NULLIF(btrim(p_address), ''), v_pat.address),
      national_id_placeholder = COALESCE(NULLIF(btrim(p_national_id), ''), v_pat.national_id_placeholder),
      next_of_kin = COALESCE(p_next_of_kin, v_pat.next_of_kin),
      reconciliation_history = COALESCE(v_pat.reconciliation_history, '[]'::JSONB) || jsonb_build_array(v_reconcile_entry),
      updated_at = NOW()
  WHERE id = p_patient_id;

  -- Synchronize embedded patient_snapshot in emergency_cases (FIX #7)
  UPDATE public.emergency_cases
  SET patient_snapshot = jsonb_set(
        jsonb_set(
          jsonb_set(
            patient_snapshot,
            '{name}',
            to_jsonb(btrim(p_verified_name))
          ),
          '{isUnidentified}',
          'false'::JSONB
        ),
        '{permanentMrn}',
        to_jsonb(v_new_mrn)
      ),
      updated_at = NOW()
  WHERE patient_id = p_patient_id;

  -- Synchronize medico_legal_cases & clinical_documents
  UPDATE public.medico_legal_cases
  SET patient_name = btrim(p_verified_name),
      is_unidentified = false,
      updated_at = NOW()
  WHERE patient_id = p_patient_id;

  UPDATE public.clinical_documents
  SET patient_name = btrim(p_verified_name),
      is_unidentified = false,
      updated_at = NOW()
  WHERE patient_id = p_patient_id;

  INSERT INTO public.audit_logs (
    id, user_id, user_name, user_role, action, target_type, target_id, details, ip_station
  ) VALUES (
    'aud-' || gen_random_uuid()::TEXT,
    v_staff_id,
    v_staff_name,
    v_staff_role,
    'Identity Reconciled',
    'PATIENT',
    p_patient_id,
    'Reconciled ' || COALESCE(v_pat.temp_id, p_patient_id) || ' to verified identity ' || btrim(p_verified_name) || ' (MRN: ' || v_new_mrn || ')',
    'CENTRAL-MRD-01'
  );

  RETURN jsonb_build_object(
    'success', true,
    'patientId', p_patient_id,
    'permanentMrn', v_new_mrn,
    'verifiedName', btrim(p_verified_name)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_reconcile_unidentified_patient(TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_reconcile_unidentified_patient(TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- =============================================================================
-- 5. SERVER-VERIFIED PATIENT ACCESS AUDIT LOGGER (FIXES UNOWNED ACCESS AUDITS)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_record_patient_access_audit(
  p_patient_id TEXT,
  p_purpose TEXT,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff RECORD;
  v_pat_id TEXT;
  v_accessor_name TEXT;
  v_accessor_role TEXT;
  v_department TEXT;
  v_audit_id TEXT := 'acc-' || gen_random_uuid()::TEXT;
BEGIN
  IF p_patient_id IS NULL OR btrim(p_patient_id) = '' THEN
    RAISE EXCEPTION 'PATIENT_ID_REQUIRED: Access audit must specify a target patient_id.';
  END IF;

  SELECT *
  INTO v_staff
  FROM public.staff_users s
  WHERE s.auth_user_id = auth.uid()
    AND s.is_active = true
  LIMIT 1;

  IF FOUND THEN
    v_accessor_name := v_staff.name;
    v_accessor_role := v_staff.designation;
    v_department := v_staff.department;
  ELSE
    v_pat_id := public.current_patient_id();
    IF v_pat_id IS NULL OR v_pat_id <> p_patient_id THEN
      RAISE EXCEPTION 'UNAUTHORIZED_ACCESS_AUDIT: Caller is neither hospital staff nor the target patient.';
    END IF;
    v_accessor_name := 'Patient Self-Access';
    v_accessor_role := 'Patient';
    v_department := 'Patient Portal';
  END IF;

  INSERT INTO public.patient_access_audits (
    id,
    patient_id,
    accessor_staff_id,
    accessor_name,
    accessor_role,
    department,
    purpose,
    action,
    timestamp
  ) VALUES (
    v_audit_id,
    p_patient_id,
    v_staff.id,
    v_accessor_name,
    v_accessor_role,
    v_department,
    btrim(p_purpose),
    btrim(p_action),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'accessAuditId', v_audit_id,
    'patientId', p_patient_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_record_patient_access_audit(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_record_patient_access_audit(TEXT, TEXT, TEXT) TO authenticated;

COMMIT;


-- >>> FILE: 20261113000004_phase6a_seed_fictional_demo_data.sql <<<
-- =============================================================================
-- HEALTHROUTE — PHASE 6A: FICTIONAL DEMONSTRATION SEED DATA (IDEMPOTENT)
-- Migration: 20261113000004_phase6a_seed_fictional_demo_data.sql
-- =============================================================================
-- Preserves all Phase 1–5 stable demonstration IDs and populates normalized
-- foreign keys, per-patient privacy settings, and patient-owned access audits.
-- All records are 100% fictional demonstration data.
-- =============================================================================

BEGIN;

-- 1. HOSPITALS
INSERT INTO public.hospitals (
  id, name, type, distance_km, icu_beds_available, ventilators_available,
  trauma_bay_available, burn_unit_available, pci_lab_available, specialties,
  Emergency_Coordinator_Phone, address
) VALUES
  ('hosp-1', 'Apex City Hospital, Bengaluru (Main Campus)', 'Tertiary Multi-Specialty & Level-1 Trauma', 0.0, 14, 9, true, true, true,
   ARRAY['Interventional Cardiology', 'Neuro-Trauma', 'Orthopedics', 'Gastroenterology', 'Pulmonology', 'Emergency & Toxicology'],
   '+91 80 4092 1000', 'Bannerghatta Main Road, Bengaluru 560076'),
  ('hosp-2', 'NIMHANS Neuro-Trauma & Stroke Referral Center', 'Apex Government Neuro-Specialty', 4.2, 8, 6, true, false, false,
   ARRAY['Neurosurgery', 'Acute Stroke Unit', 'Neuro-ICU'],
   '+91 80 2699 5000', 'Hosur Road, Bengaluru 560029'),
  ('hosp-3', 'Victoria Burn & Toxicology Institute', 'Government Tertiary Referral', 6.8, 11, 7, true, true, false,
   ARRAY['High-Tension Burn Care', 'Clinical Toxicology', 'Plastic Reconstruction'],
   '+91 80 2670 1150', 'Fort Road, K.R. Market, Bengaluru 560002'),
  ('hosp-4', 'Sri Jayadeva Institute of Cardiovascular Sciences', 'Apex Cardiac Tertiary Center', 2.9, 19, 12, false, false, true,
   ARRAY['Primary PCI', 'CTVS', 'Electrophysiology', 'Cardiac ICU'],
   '+91 80 2297 7400', 'Jayanagar 9th Block, Bengaluru 560069')
ON CONFLICT DO NOTHING;

-- 2. UNIFIED STAFF USERS & 6 ALIGNED SPECIALIST DOCTORS
INSERT INTO public.staff_users (
  id, name, role, designation, department, employee_code, email, phone,
  active_shift, on_duty, station, gender, specialty, sub_specialty,
  qualifications, experience_years, hospital_id, hospital_affiliation,
  languages, consultation_fee, availability, available_slots, consultation_types,
  rating, reviews_count, about
) VALUES
  ('staff-doc-1', 'Dr. Vikram Malhotra', 'doctor', 'Senior Consultant Physician & Interventional Cardiologist',
   'Cardiology & Internal Medicine', 'DOC-MED-104', 'v.malhotra@apexhospital.demo.org', '+91 98450 11203',
   'Day (08:00 - 16:00)', true, 'OPD Room 204 & Acute Ward', 'Male',
   'Cardiology & Internal Medicine', 'Interventional Cardiology & Preventive Angiology',
   'MBBS, MD (Medicine), DM (Cardiology), FACC', 18, 'hosp-1', 'Apex City Hospital, Bengaluru (Main Campus)',
   ARRAY['English', 'Hindi', 'Kannada'], 1200, 'Available Today',
   ARRAY['09:30 AM', '10:30 AM', '11:30 AM', '02:30 PM', '04:00 PM'],
   ARRAY['In-Person OPD', 'Video Tele-Consult'], 4.9, 412,
   'Senior interventional cardiologist specializing in complex coronary angioplasty (PCI), heart failure management, and post-STEMI secondary prevention.'),

  ('staff-cmo-1', 'Dr. Ananya Deshmukh', 'cmo', 'Chief Medical Officer (CMO) & Medico-Legal Authority',
   'Department of Emergency & Trauma Care', 'CMO-EMR-008', 'a.deshmukh@apexhospital.demo.org', '+91 98450 88219',
   'Day (08:00 - 16:00)', true, 'Trauma Resus Bay 1 & MLC Desk', 'Female',
   'Emergency Medicine & Clinical Toxicology', 'Polytrauma Resuscitation & Medico-Legal Jurisprudence',
   'MBBS, MD (Emergency Medicine), PGDMLS', 14, 'hosp-1', 'Apex City Hospital, Bengaluru (Main Campus)',
   ARRAY['English', 'Hindi', 'Marathi', 'Kannada'], 1000, 'Available Today',
   ARRAY['10:00 AM', '12:00 PM', '03:00 PM', '05:00 PM'],
   ARRAY['In-Person OPD'], 4.9, 289,
   'Chief Medical Officer leading emergency triage, toxicological resuscitation, and statutory medico-legal documentation.'),

  ('doc-neuro-2', 'Dr. Arvind Swaminathan', 'doctor', 'Senior Consultant Neurologist & Stroke Specialist',
   'Department of Neurology & Stroke Care', 'DOC-NEU-208', 'a.swaminathan@apexhospital.demo.org', '+91 98452 33104',
   'Day (08:00 - 16:00)', true, 'Neuro OPD Suite 302', 'Male',
   'Neurology & Stroke Care', 'Acute Thrombolysis, Epilepsy & Movement Disorders',
   'MBBS, MD, DM (Neurology - NIMHANS)', 16, 'hosp-1', 'Apex City Hospital, Bengaluru (Main Campus)',
   ARRAY['English', 'Tamil', 'Kannada', 'Hindi'], 1350, 'Available Today',
   ARRAY['10:00 AM', '11:15 AM', '02:00 PM', '04:15 PM'],
   ARRAY['In-Person OPD', 'Video Tele-Consult'], 4.8, 318,
   'NIMHANS-trained neurologist focusing on hyperacute stroke pathways, refractory migraine, and neuromuscular disorders.'),

  ('doc-ortho-3', 'Dr. Rohan Iyer', 'doctor', 'Lead Orthopedic & Trauma Reconstruction Surgeon',
   'Department of Orthopedics & Joint Replacement', 'DOC-ORT-312', 'r.iyer@apexhospital.demo.org', '+91 98453 44910',
   'Day (08:00 - 16:00)', true, 'Ortho Trauma Wing 105', 'Male',
   'Orthopedics & Joint Replacement', 'Complex Pelvi-Acetabular Trauma & Arthroscopy',
   'MBBS, MS (Orthopedics), DNB, Fellowship in Arthroplasty (Munich)', 13, 'hosp-1', 'Apex City Hospital, Bengaluru (Main Campus)',
   ARRAY['English', 'Kannada', 'Hindi', 'Tamil'], 1100, 'Available Today',
   ARRAY['09:00 AM', '11:00 AM', '01:30 PM', '03:45 PM'],
   ARRAY['In-Person OPD', 'Video Tele-Consult'], 4.8, 276,
   'Orthopedic trauma surgeon specializing in fracture fixation, sports ligament reconstruction, and post-immobilization rehabilitation.'),

  ('doc-gastro-4', 'Dr. Priya Nair', 'doctor', 'Consultant Gastroenterologist & Therapeutic Endoscopist',
   'Department of Gastroenterology & Hepatology', 'DOC-GAS-405', 'p.nair@apexhospital.demo.org', '+91 98454 66102',
   'Day (08:00 - 16:00)', true, 'Endoscopy & GI Suite 210', 'Female',
   'Gastroenterology & Hepatology', 'Motility Disorders, IBD & Therapeutic ERCP',
   'MBBS, MD (Internal Medicine), DM (Medical Gastroenterology)', 11, 'hosp-1', 'Apex City Hospital, Bengaluru (Main Campus)',
   ARRAY['English', 'Malayalam', 'Kannada', 'Hindi'], 1150, 'Next Available Tomorrow',
   ARRAY['10:30 AM', '12:15 PM', '03:00 PM', '04:45 PM'],
   ARRAY['In-Person OPD', 'Video Tele-Consult'], 4.9, 194,
   'Specialist in functional gastrointestinal disorders, hepatobiliary medicine, and diagnostic/therapeutic endoscopy.'),

  ('doc-pulmo-5', 'Dr. Siddharth Verma', 'doctor', 'Consultant Pulmonologist & Critical Care Specialist',
   'Department of Pulmonology & Sleep Medicine', 'DOC-PUL-519', 's.verma@apexhospital.demo.org', '+91 98455 77823',
   'Day (08:00 - 16:00)', true, 'Respiratory Clinic 118', 'Male',
   'Pulmonology & Sleep Medicine', 'Severe Asthma, COPD, Bronchoscopy & Sleep Apnea',
   'MBBS, MD (Pulmonary Medicine), EDARM (European Diploma)', 12, 'hosp-1', 'Apex City Hospital, Bengaluru (Main Campus)',
   ARRAY['English', 'Hindi', 'Kannada'], 1050, 'Available Today',
   ARRAY['09:45 AM', '11:45 AM', '02:30 PM', '05:00 PM'],
   ARRAY['In-Person OPD', 'Video Tele-Consult'], 4.7, 231,
   'Interventional pulmonologist managing airway diseases, bronchoscopy, and non-invasive ventilation therapy.'),

  ('staff-nurse-1', 'Sister Rekha Varma', 'nurse', 'Senior Trauma & Clinical Triage Nurse',
   'Emergency & Acute Care Triage', 'NRS-TRI-219', 'r.varma@apexhospital.demo.org', '+91 98450 55102',
   'Day (08:00 - 16:00)', true, 'Triage Desk & Acute Observation Bay', 'Female',
   NULL, NULL, 'B.Sc Nursing, Certified Emergency Nursing (CEN)', 9, 'hosp-1', 'Apex City Hospital, Bengaluru (Main Campus)',
   ARRAY['English', 'Kannada', 'Hindi'], NULL, NULL, '{}', '{}', NULL, 0, NULL),

  ('staff-rec-1', 'Suresh Kumar', 'records', 'Chief Medical Records & Statutory Officer',
   'Central Medical Records Department (MRD)', 'MRD-REG-042', 's.kumar@apexhospital.demo.org', '+91 98450 66301',
   'Day (08:00 - 16:00)', true, 'Central Registration & ABHA Desk', 'Male',
   NULL, NULL, 'B.Com, Post-Graduate Diploma in Health Information Management', 15, 'hosp-1', 'Apex City Hospital, Bengaluru (Main Campus)',
   ARRAY['English', 'Kannada', 'Hindi'], NULL, NULL, '{}', '{}', NULL, 0, NULL),

  ('staff-pharm-1', 'Meera Krishnan', 'pharmacist', 'Chief Hospital Pharmacist & Formulary Officer',
   'Central Hospital Pharmacy & Dispensary', 'PHM-401', 'm.krishnan@apexhospital.demo.org', '+91 98450 99412',
   'Day (08:00 - 16:00)', true, 'Inpatient & OPD Dispensary Counter 1', 'Female',
   NULL, NULL, 'M.Pharm (Clinical Pharmacy & Pharmaceutics), Registered Pharmacist', 11, 'hosp-1', 'Apex City Hospital, Bengaluru (Main Campus)',
   ARRAY['English', 'Tamil', 'Kannada', 'Hindi'], NULL, NULL, '{}', '{}', NULL, 0, NULL),

  ('staff-admin-1', 'Rajeshwari Rao', 'admin', 'Hospital Operations & Quality Administrator',
   'Hospital Administration & Clinical Governance', 'ADM-OPS-003', 'r.rao@apexhospital.demo.org', '+91 98450 77001',
   'Day (08:00 - 16:00)', true, 'Executive Governance Suite 401', 'Female',
   NULL, NULL, 'MHA (Master of Hospital Administration), NABH Assessor', 17, 'hosp-1', 'Apex City Hospital, Bengaluru (Main Campus)',
   ARRAY['English', 'Kannada', 'Hindi'], NULL, NULL, '{}', '{}', NULL, 0, NULL)
ON CONFLICT DO NOTHING;

-- 3. PATIENTS (Including Stable Demo IDs pat-known-01..pat-opd-06)
INSERT INTO public.patients (
  id, is_unidentified, temp_id, permanent_mrn, name, age_estimated, age, date_of_birth,
  gender, blood_group, contact_number, address, abha_id, national_id_placeholder,
  primary_physician_id, primary_physician_name, self_reported_notes, triage_status,
  next_of_kin, emergency_contact, allergies, existing_conditions, current_medications,
  verified_medical_history, registered_by_staff_id, registered_by_name, registration_timestamp
) VALUES
  ('pat-known-01', false, NULL, 'AC-BLR-2026-0104', 'Rameshwar Reddy', false, 58, '1968-04-14',
   'Male', 'B+', '+91 98860 34120', '42, 3rd Cross, Jayanagar 4th Block, Bengaluru 560011',
   '91-4829-1039-8472', 'XXXX-XXXX-4918', 'staff-doc-1', 'Dr. Vikram Malhotra',
   'Experiencing occasional mild fatigue in the late evening; monitoring home BP twice daily (avg 124/78 mmHg).',
   'Stable',
   '{"name": "Sunita Reddy", "relation": "Spouse", "phone": "+91 98860 34121"}'::JSONB,
   '{"name": "Sunita Reddy", "relation": "Spouse", "phone": "+91 98860 34121"}'::JSONB,
   ARRAY['Penicillin (Severe Urticaria & Bronchospasm)', 'Sulfonamide Antibiotics'],
   ARRAY['Post-PCI (DES to LAD - Nov 2026)', 'Essential Hypertension (10 yrs)', 'Dyslipidemia'],
   ARRAY['Tab. Ticagrelor 90 mg BD', 'Tab. Aspirin 75 mg OD', 'Tab. Atorvastatin 40 mg HS', 'Tab. Metoprolol Succinate XL 25 mg OD', 'Tab. Pantoprazole 40 mg OD'],
   ARRAY['2026-11-11: Primary PCI with Drug-Eluting Stent to proximal LAD following Acute Anterior Wall STEMI', '2018-06: Diagnosed with Essential Hypertension'],
   'staff-rec-1', 'Suresh Kumar', '2026-11-11T06:50:00Z'),

  ('pat-unk-01', true, 'TEMP-ER-2026-0841', NULL, 'Unidentified Male #0841', true, 35, NULL,
   'Male', 'O+', NULL, NULL, NULL, NULL, 'staff-cmo-1', 'Dr. Ananya Deshmukh', NULL, 'Critical',
   NULL, NULL, ARRAY[]::TEXT[], ARRAY['Suspected Severe Head Injury (RTA)'], ARRAY[]::TEXT[], ARRAY[]::TEXT[],
   'staff-nurse-1', 'Sister Rekha Varma', '2026-11-11T05:15:00Z'),

  ('pat-known-02', false, NULL, 'AC-BLR-2026-0219', 'Lakshmi Narayanan', false, 41, '1985-08-22',
   'Male', 'A+', '+91 97410 88210', 'Anekal Taluk, Bengaluru Urban District',
   '91-7712-4091-2218', 'XXXX-XXXX-8821', 'staff-cmo-1', 'Dr. Ananya Deshmukh', NULL, 'Critical',
   '{"name": "Kavitha Narayanan", "relation": "Spouse", "phone": "+91 97410 88215"}'::JSONB,
   '{"name": "Kavitha Narayanan", "relation": "Spouse", "phone": "+91 97410 88215"}'::JSONB,
   ARRAY['No Known Drug Allergies'], ARRAY['Acute Organophosphate Exposure'], ARRAY[]::TEXT[], ARRAY[]::TEXT[],
   'staff-nurse-1', 'Sister Rekha Varma', '2026-11-11T06:10:00Z'),

  ('pat-known-03', false, NULL, 'AC-BLR-2026-0305', 'Gopal Krishnan', false, 64, '1962-01-19',
   'Male', 'O+', '+91 94480 11928', '18, Temple Street, Malleshwaram, Bengaluru 560003',
   '91-3310-9921-6014', 'XXXX-XXXX-3019', 'doc-ortho-3', 'Dr. Rohan Iyer',
   'Right wrist mobility improving after cast removal.', 'Stable',
   '{"name": "Arjun Krishnan", "relation": "Son", "phone": "+91 94480 11930"}'::JSONB,
   '{"name": "Arjun Krishnan", "relation": "Son", "phone": "+91 94480 11930"}'::JSONB,
   ARRAY['NSAIDs (Gastric Irritation)'], ARRAY['Healed Right Distal Radius Colles Fracture', 'Osteopenia'],
   ARRAY['Tab. Calcium + Vitamin D3 OD', 'Tab. Paracetamol 650 mg SOS'],
   ARRAY['2026-09-28: Closed reduction & cast immobilization for right Colles fracture'],
   'staff-rec-1', 'Suresh Kumar', '2026-11-11T09:00:00Z'),

  ('pat-opd-04', false, NULL, 'AC-BLR-2026-0412', 'Meenakshi Sundaram', false, 52, '1974-03-09',
   'Female', 'B+', '+91 98451 90112', 'Indiranagar 2nd Stage, Bengaluru 560038',
   '91-5520-8834-1290', 'XXXX-XXXX-6642', 'staff-doc-1', 'Dr. Vikram Malhotra', NULL, 'Stable',
   '{"name": "Karthik Sundaram", "relation": "Spouse", "phone": "+91 98451 90115"}'::JSONB,
   '{"name": "Karthik Sundaram", "relation": "Spouse", "phone": "+91 98451 90115"}'::JSONB,
   ARRAY['Codeine'], ARRAY['Type 2 Diabetes Mellitus', 'Essential Hypertension'],
   ARRAY['Tab. Metformin SR 1000 mg BD', 'Tab. Telmisartan 40 mg OD'],
   ARRAY['Type 2 Diabetes Mellitus under regular metabolic follow-up'],
   'staff-rec-1', 'Suresh Kumar', '2026-11-10T08:00:00Z'),

  ('pat-opd-05', false, NULL, 'AC-BLR-2026-0518', 'Ananya Sharma', false, 29, '1997-07-15',
   'Female', 'A+', '+91 99001 44512', 'HSR Layout Sector 2, Bengaluru 560102',
   '91-6649-1120-9043', 'XXXX-XXXX-7731', 'doc-pulmo-5', 'Dr. Siddharth Verma', NULL, 'Waiting',
   '{"name": "Rohit Sharma", "relation": "Spouse", "phone": "+91 99001 44519"}'::JSONB,
   '{"name": "Rohit Sharma", "relation": "Spouse", "phone": "+91 99001 44519"}'::JSONB,
   ARRAY['Dust Mites', 'Aspirin'], ARRAY['Bronchial Asthma (Mild Persistent)'],
   ARRAY['Inhaler Salbutamol 100 mcg SOS'],
   ARRAY['Childhood-onset allergic rhinitis and episodic bronchospasm'],
   'staff-rec-1', 'Suresh Kumar', '2026-11-11T09:15:00Z'),

  ('pat-opd-06', false, NULL, 'AC-BLR-2026-0624', 'Farida Begum', false, 47, '1979-11-02',
   'Female', 'AB+', '+91 98802 77310', 'Frazer Town, Bengaluru 560005',
   '91-8841-2290-3317', 'XXXX-XXXX-9104', 'doc-gastro-4', 'Dr. Priya Nair', NULL, 'Under Observation',
   '{"name": "Imran Khan", "relation": "Spouse", "phone": "+91 98802 77318"}'::JSONB,
   '{"name": "Imran Khan", "relation": "Spouse", "phone": "+91 98802 77318"}'::JSONB,
   ARRAY['No Known Drug Allergies'], ARRAY['Irritable Bowel Syndrome (IBS-M)', 'Acid Peptic Disease'],
   ARRAY['Cap. Mebeverine 135 mg BD', 'Tab. Pantoprazole 40 mg OD'],
   ARRAY['2026-05: Upper GI Endoscopy — Mild Antral Gastritis'],
   'staff-rec-1', 'Suresh Kumar', '2026-11-11T09:30:00Z')
ON CONFLICT DO NOTHING;

-- 4. PER-PATIENT PRIVACY SETTINGS (FIX #1: Keyed by patient_id)
INSERT INTO public.patient_privacy_settings (
  patient_id, emergency_access_granted, share_with_specialists, family_access_granted,
  family_member_name, anonymized_research_consent, download_records_permitted, sms_email_alerts
) VALUES
  ('pat-known-01', true, true, true, 'Sunita Reddy (Spouse)', false, true, true),
  ('pat-known-02', true, true, true, 'Kavitha Narayanan (Spouse)', false, true, true),
  ('pat-known-03', true, true, true, 'Arjun Krishnan (Son)', true, true, true),
  ('pat-opd-04', true, true, false, 'Karthik Sundaram (Spouse)', false, true, true),
  ('pat-opd-05', true, false, false, 'Rohit Sharma (Spouse)', false, true, true),
  ('pat-opd-06', true, true, true, 'Imran Khan (Spouse)', false, true, true)
ON CONFLICT (patient_id) DO NOTHING;

-- 5. PATIENT-OWNED ACCESS AUDITS (FIX #2: Explicit patient_id & accessor_staff_id)
INSERT INTO public.patient_access_audits (
  id, patient_id, accessor_staff_id, accessor_name, accessor_role, department, purpose, action, timestamp
) VALUES
  ('acc-1', 'pat-known-01', 'staff-doc-1', 'Dr. Vikram Malhotra', 'Senior Consultant Cardiologist',
   'Cardiology & OPD Station 204', 'Routine Clinical Consultation & Post-PCI Chart Review',
   'Viewed Full Clinical History & Lab Biomarkers', '2026-11-11T08:35:00Z'),
  ('acc-2', 'pat-known-01', 'staff-nurse-1', 'Sister Rekha Varma', 'Clinical Nurse Specialist',
   'Emergency & Triage Suite', 'Emergency Intake & Rapid Vital Signs Assessment',
   'Recorded Physiological Vitals & Blood Screening', '2026-11-11T07:45:00Z'),
  ('acc-3', 'pat-known-01', 'staff-rec-1', 'Suresh Kumar', 'Medical Records Officer',
   'Central Registration & ABHA Desk', 'Patient Registration & Identity Verification',
   'Verified ABHA ID & Insurance Pre-Authorization', '2026-11-11T06:50:00Z'),
  ('acc-4', 'pat-known-03', 'doc-ortho-3', 'Dr. Rohan Iyer', 'Lead Orthopedic Surgeon',
   'Ortho Trauma Wing 105', 'Post-Cast Removal Wrist Assessment',
   'Reviewed X-Ray & Signed Rehabilitation Prescription', '2026-11-11T11:15:00Z')
ON CONFLICT DO NOTHING;

-- 6. APPOINTMENTS
INSERT INTO public.appointments (
  id, patient_id, patient_name, patient_age, patient_gender, patient_phone,
  doctor_id, doctor_name, department, hospital_id, hospital_name, room_number,
  appointment_date, time_slot, token_number, type, consultation_mode, status,
  chief_complaint, triage_status, requested_by_patient
) VALUES
  ('APT-2026-001', 'pat-known-01', 'Rameshwar Reddy', 58, 'Male', '+91 98860 34120',
   'staff-doc-1', 'Dr. Vikram Malhotra', 'Cardiology & Internal Medicine', 'hosp-1',
   'Apex City Hospital, Bengaluru (Main Campus)', 'OPD-204', '2026-11-11', '09:30 AM', 101,
   'Post-Operative Check', 'In-Person OPD', 'Completed',
   'Post-angioplasty (DES to LAD) 48-hour clinical review & antiplatelet titration', 'Stable', false),

  ('APT-2026-002', 'pat-opd-04', 'Meenakshi Sundaram', 52, 'Female', '+91 98451 90112',
   'staff-doc-1', 'Dr. Vikram Malhotra', 'Cardiology & Internal Medicine', 'hosp-1',
   'Apex City Hospital, Bengaluru (Main Campus)', 'OPD-204', '2026-11-11', '10:30 AM', 102,
   'Chronic Care Review', 'In-Person OPD', 'Scheduled',
   'Suboptimal HbA1c (7.8%) and morning blood pressure review', 'Stable', false),

  ('APT-2026-004', 'pat-known-03', 'Gopal Krishnan', 64, 'Male', '+91 94480 11928',
   'doc-ortho-3', 'Dr. Rohan Iyer', 'Department of Orthopedics & Joint Replacement', 'hosp-1',
   'Apex City Hospital, Bengaluru (Main Campus)', 'ORT-105', '2026-11-11', '11:00 AM', 104,
   'Post-Operative Check', 'In-Person OPD', 'Completed',
   'Post-cast removal right distal radius fracture mobilization & rehabilitation', 'Stable', false)
ON CONFLICT DO NOTHING;

-- 7. CLINICAL ENCOUNTERS
INSERT INTO public.clinical_encounters (
  id, appointment_id, patient_id, patient_name, doctor_id, doctor_name, department,
  encounter_date, encounter_type, chief_complaint, subjective_history, physical_examination,
  vitals, assessment_diagnosis, prescription_status, prescription_created_date,
  ordered_investigations, follow_up_date, clinical_advice, status, updated_at
) VALUES
  ('ENC-2026-002', 'APT-2026-001', 'pat-known-01', 'Rameshwar Reddy', 'staff-doc-1', 'Dr. Vikram Malhotra',
   'Cardiology & Internal Medicine', '2026-11-11', 'Post-Discharge Review',
   'Post-PCI (Drug-Eluting Stent to LAD) early review & dual antiplatelet adherence check',
   'Patient comfortable at rest. No recurrent retrosternal chest discomfort, orthopnea, or palpitations. Right radial access site clean and healed.',
   'CVS: S1 S2 normal, no murmur or pericardial rub. Chest: Bilaterally clear. Radial pulse well felt.',
   '{"bp": "122/76", "pulse": 68, "spo2": 99, "temp": 98.2, "rr": 14, "gcs": 15, "recordedAt": "2026-11-11T09:35:00Z"}'::JSONB,
   'Post-Primary PCI for Anterior Wall STEMI (Stable on DAPT & High-Intensity Statin)',
   'Active', '2026-11-11',
   ARRAY['Fasting Lipid Profile in 6 weeks', '2D Echocardiography at 30-day follow-up'],
   '2026-11-18',
   'Strict adherence to Dual Antiplatelet Therapy (Ticagrelor + Aspirin) — do not skip a single dose. Low-sodium cardiac diet (<2g/day).',
   'Signed', '2026-11-11T10:05:00Z'),

  ('ENC-2026-004', 'APT-2026-004', 'pat-known-03', 'Gopal Krishnan', 'doc-ortho-3', 'Dr. Rohan Iyer',
   'Department of Orthopedics & Joint Replacement', '2026-11-11', 'Post-Discharge Review',
   'Post-cast removal right distal radius fracture mobilization & rehabilitation',
   'Plaster cast removed after 6 weeks of immobilization. Mild wrist stiffness on dorsiflexion; minimal pain.',
   'Healed fracture alignment satisfactory. No localized tenderness over anatomical snuffbox or distal radius. Grip strength 4/5.',
   '{"bp": "128/80", "pulse": 72, "spo2": 98, "temp": 98.4, "rr": 16, "gcs": 15, "recordedAt": "2026-11-11T11:00:00Z"}'::JSONB,
   'Healed Right Distal Radius Fracture (Post-Cast Removal Rehabilitation)',
   'Active', '2026-11-11',
   ARRAY['Check X-Ray Right Wrist AP/Lateral'],
   '2026-12-11',
   'Perform warm water wrist flexion/extension exercises 3 times daily. Avoid lifting >3 kg with right hand for 2 weeks.',
   'Signed', '2026-11-11T11:20:00Z')
ON CONFLICT DO NOTHING;

-- 8. PHARMACY MEDICINES CATALOGUE
INSERT INTO public.pharmacy_medicines (
  id, generic_name, brand_name, strength, dosage_form, manufacturer, category,
  storage_requirements, unit_of_measurement, minimum_stock_threshold, status
) VALUES
  ('med-ticagrelor-90', 'Ticagrelor', 'Brilinta', '90 mg', 'Tablet', 'AstraZeneca Pharma India', 'Cardiovascular / Antiplatelet', 'Store below 30°C in original blister pack', 'Tablets', 120, 'Active'),
  ('med-aspirin-75', 'Aspirin', 'Ecosprin', '75 mg', 'Tablet', 'USV Private Limited', 'Cardiovascular / Antiplatelet', 'Store below 25°C away from moisture', 'Tablets', 150, 'Active'),
  ('med-atorvastatin-40', 'Atorvastatin', 'Atorva', '40 mg', 'Tablet', 'Zydus Cadila Healthcare', 'Cardiovascular / Lipid Lowering', 'Store at room temperature (15°C - 25°C)', 'Tablets', 100, 'Active'),
  ('med-metoprolol-25', 'Metoprolol Succinate XL', 'Betaloc', '25 mg', 'Tablet', 'AstraZeneca Pharma India', 'Cardiovascular / Beta Blocker', 'Store below 25°C; keep dry', 'Tablets', 90, 'Active'),
  ('med-pantoprazole-40', 'Pantoprazole', 'Pan-40', '40 mg', 'Tablet', 'Alkem Laboratories', 'Gastroenterology / PPI', 'Store in a cool, dry place below 25°C', 'Tablets', 120, 'Active'),
  ('med-telmisartan-40', 'Telmisartan', 'Telma', '40 mg', 'Tablet', 'Glenmark Pharmaceuticals', 'Cardiovascular / Antihypertensive', 'Keep in moisture-resistant foil until administration', 'Tablets', 100, 'Active'),
  ('med-mebeverine-135', 'Mebeverine', 'Colospa', '135 mg', 'Capsule', 'Abbott Healthcare', 'Gastroenterology / Antispasmodic', 'Store below 25°C away from direct sunlight', 'Capsules', 40, 'Active'),
  ('med-salbutamol-100', 'Salbutamol Inhaler', 'Asthalin HFA', '100 mcg/puff', 'Inhaler', 'Cipla Limited', 'Respiratory / Bronchodilator', 'Pressurized canister — store below 30°C; do not freeze', 'Inhalers', 12, 'Active'),
  ('med-paracetamol-650', 'Paracetamol', 'Dolo-650', '650 mg', 'Tablet', 'Micro Labs Limited', 'Analgesic & Antipyretic', 'Store below 30°C in dry dispensary rack', 'Tablets', 200, 'Active'),
  ('med-calcium-vitd3', 'Calcium + Vitamin D3', 'Shelcal-500', '500mg / 250IU', 'Tablet', 'Torrent Pharmaceuticals', 'Orthopedics & Mineral Supplement', 'Store in a dry place below 25°C', 'Tablets', 90, 'Active'),
  ('med-rosuvastatin-20', 'Rosuvastatin', 'Crestor', '20 mg', 'Tablet', 'AstraZeneca Pharma India', 'Cardiovascular / Lipid Lowering', 'Store at controlled room temperature (20°C - 25°C)', 'Tablets', 80, 'Active'),
  ('med-ramipril-5', 'Ramipril', 'Cardace', '5 mg', 'Tablet', 'Sanofi India', 'Cardiovascular / ACE Inhibitor', 'Store below 25°C', 'Tablets', 60, 'Active')
ON CONFLICT DO NOTHING;

-- 9. NORMALIZED PRESCRIPTION ITEMS (FIX #4)
INSERT INTO public.prescription_items (
  id, encounter_id, patient_id, prescribing_doctor_id, prescribing_doctor_name,
  medicine_id, medicine_name, drug_name, generic_name, dosage_form, strength,
  dosage, frequency, duration, prescribed_quantity, route, timing, instructions,
  created_date, status
) VALUES
  ('rx-ram-1', 'ENC-2026-002', 'pat-known-01', 'staff-doc-1', 'Dr. Vikram Malhotra',
   'med-ticagrelor-90', 'Tab. Ticagrelor', 'Tab. Ticagrelor 90 mg', 'Ticagrelor', 'Tablet', '90 mg',
   '1 tablet twice daily', '1-0-1 (Morning & Night)', '90 Days', 180, 'Oral', 'After Food',
   'Critical stent protection antiplatelet. Do not discontinue without cardiologist approval.', '2026-11-11', 'Active'),

  ('rx-ram-2', 'ENC-2026-002', 'pat-known-01', 'staff-doc-1', 'Dr. Vikram Malhotra',
   'med-aspirin-75', 'Tab. Aspirin', 'Tab. Aspirin 75 mg (Enteric Coated)', 'Aspirin', 'Tablet', '75 mg',
   '1 tablet once daily after lunch', '0-1-0 (Afternoon)', '90 Days', 90, 'Oral', 'After Food',
   'Take whole with water after lunch.', '2026-11-11', 'Active'),

  ('rx-ram-3', 'ENC-2026-002', 'pat-known-01', 'staff-doc-1', 'Dr. Vikram Malhotra',
   'med-atorvastatin-40', 'Tab. Atorvastatin', 'Tab. Atorvastatin 40 mg', 'Atorvastatin', 'Tablet', '40 mg',
   '1 tablet at bedtime', '0-0-1 (Night)', '90 Days', 90, 'Oral', 'Bedtime',
   'High-intensity statin for plaque stabilization.', '2026-11-11', 'Active'),

  ('rx-ram-4', 'ENC-2026-002', 'pat-known-01', 'staff-doc-1', 'Dr. Vikram Malhotra',
   'med-metoprolol-25', 'Tab. Metoprolol Succinate XL', 'Tab. Metoprolol Succinate XL 25 mg', 'Metoprolol Succinate XL', 'Tablet', '25 mg',
   '1 tablet once daily in the morning', '1-0-0 (Morning)', '90 Days', 90, 'Oral', 'After Food',
   'Monitor resting pulse; hold if heart rate < 55 bpm.', '2026-11-11', 'Active'),

  ('rx-gopal-1', 'ENC-2026-004', 'pat-known-03', 'doc-ortho-3', 'Dr. Rohan Iyer',
   'med-calcium-vitd3', 'Tab. Calcium + Vitamin D3', 'Tab. Calcium + Vitamin D3 (500mg/250IU)', 'Calcium + Vitamin D3', 'Tablet', '500mg / 250IU',
   '1 tablet once daily after lunch', '0-1-0 (Afternoon)', '60 Days', 60, 'Oral', 'After Food',
   'Bone mineralization support during post-fracture remodeling.', '2026-11-11', 'Active'),

  ('rx-gopal-2', 'ENC-2026-004', 'pat-known-03', 'doc-ortho-3', 'Dr. Rohan Iyer',
   'med-paracetamol-650', 'Tab. Paracetamol', 'Tab. Paracetamol 650 mg (SOS)', 'Paracetamol', 'Tablet', '650 mg',
   '1 tablet as needed for physiotherapy soreness (max 3 tablets/day)', 'SOS (As needed)', '14 Days', 10, 'Oral', 'After Food',
   'Take only if wrist soreness occurs after range-of-motion exercises.', '2026-11-11', 'Active')
ON CONFLICT DO NOTHING;

-- 10. PHARMACY BATCHES
INSERT INTO public.pharmacy_batches (
  id, medicine_id, batch_number, available_quantity, expiry_date, purchase_date,
  supplier_reference, supplier_name, stock_location, unit_of_measurement
) VALUES
  ('batch-tic-1', 'med-ticagrelor-90', 'AZ-TIC-9042', 360, CURRENT_DATE + 340, CURRENT_DATE - 35, 'PO-2026-8810', 'MedCore Institutional Distributors', 'Cardio Rack A-01', 'Tablets'),
  ('batch-asp-1', 'med-aspirin-75', 'USV-ECO-7519', 540, CURRENT_DATE + 290, CURRENT_DATE - 20, 'PO-2026-8845', 'Apex Pharma Supply Co.', 'Cardio Rack A-02', 'Tablets'),
  ('batch-ato-1', 'med-atorvastatin-40', 'ZYD-ATV-4088', 280, CURRENT_DATE + 210, CURRENT_DATE - 40, 'PO-2026-8790', 'MedCore Institutional Distributors', 'Cardio Rack A-03', 'Tablets'),
  ('batch-met-1', 'med-metoprolol-25', 'AZ-MET-2514', 210, CURRENT_DATE + 38, CURRENT_DATE - 180, 'PO-2026-7102', 'Apex Pharma Supply Co.', 'Cardio Rack A-04', 'Tablets'),
  ('batch-pan-1', 'med-pantoprazole-40', 'ALK-PAN-4031', 420, CURRENT_DATE + 410, CURRENT_DATE - 15, 'PO-2026-8901', 'Deccan Healthcare Logistics', 'GI Rack B-01', 'Tablets'),
  ('batch-tel-1', 'med-telmisartan-40', 'GLM-TEL-4062', 320, CURRENT_DATE + 310, CURRENT_DATE - 25, 'PO-2026-8833', 'MedCore Institutional Distributors', 'Cardio Rack A-05', 'Tablets'),
  ('batch-meb-1', 'med-mebeverine-135', 'ABT-MEB-1359', 24, CURRENT_DATE + 150, CURRENT_DATE - 90, 'PO-2026-8122', 'Deccan Healthcare Logistics', 'GI Rack B-04', 'Capsules'),
  ('batch-sal-1', 'med-salbutamol-100', 'CIP-SAL-1007', 5, CURRENT_DATE + 28, CURRENT_DATE - 160, 'PO-2026-7340', 'Apex Pharma Supply Co.', 'Respiratory Shelf C-02', 'Inhalers'),
  ('batch-pcm-exp', 'med-paracetamol-650', 'MIC-DOL-650E', 140, CURRENT_DATE - 18, CURRENT_DATE - 380, 'PO-2025-4410', 'Deccan Healthcare Logistics', 'Quarantine Hold Bin Q-01', 'Tablets'),
  ('batch-pcm-fresh', 'med-paracetamol-650', 'MIC-DOL-6599', 620, CURRENT_DATE + 420, CURRENT_DATE - 12, 'PO-2026-8924', 'Deccan Healthcare Logistics', 'General Dispensary Rack D-01', 'Tablets'),
  ('batch-cal-1', 'med-calcium-vitd3', 'TOR-CAL-5021', 240, CURRENT_DATE + 260, CURRENT_DATE - 30, 'PO-2026-8808', 'Apex Pharma Supply Co.', 'Ortho Supplement Rack E-01', 'Tablets'),
  ('batch-ros-1', 'med-rosuvastatin-20', 'AZ-ROS-2041', 190, CURRENT_DATE + 330, CURRENT_DATE - 18, 'PO-2026-8870', 'MedCore Institutional Distributors', 'Cardio Rack A-06', 'Tablets')
ON CONFLICT DO NOTHING;

-- 11. PHARMACY DISPENSING RECORDS & ITEMS
INSERT INTO public.pharmacy_dispensing_records (
  id, encounter_id, patient_id, patient_name, prescribing_doctor_id, prescribing_doctor_name,
  prescription_date, dispensed_at, dispensed_by_staff_id, dispensed_by_staff_name, status, notes
) VALUES
  ('DISP-2026-001', 'ENC-2026-004', 'pat-known-03', 'Gopal Krishnan', 'doc-ortho-3', 'Dr. Rohan Iyer',
   '2026-11-11', '2026-11-11T11:45:00Z', 'staff-pharm-1', 'Meera Krishnan', 'Fully Dispensed',
   'Counselled patient on calcium absorption post-lunch and SOS paracetamol limit.')
ON CONFLICT DO NOTHING;

INSERT INTO public.pharmacy_dispensing_items (
  id, dispensing_record_id, prescription_item_id, medicine_id, requested_medicine_name,
  requested_generic_name, requested_strength, requested_dosage_form, prescribed_quantity,
  dispensed_quantity, previously_dispensed_quantity, remaining_quantity, batch_id, batch_number, status
) VALUES
  ('ditem-seed-1', 'DISP-2026-001', 'rx-gopal-1', 'med-calcium-vitd3', 'Tab. Calcium + Vitamin D3 (500mg/250IU)',
   'calcium + vitamin d3', '500mg / 250IU', 'Tablet', 60, 60, 0, 0, 'batch-cal-1', 'TOR-CAL-5021', 'Dispensed'),
  ('ditem-seed-2', 'DISP-2026-001', 'rx-gopal-2', 'med-paracetamol-650', 'Tab. Paracetamol 650 mg (SOS)',
   'paracetamol', '650 mg', 'Tablet', 10, 10, 0, 0, 'batch-pcm-fresh', 'MIC-DOL-6599', 'Dispensed')
ON CONFLICT DO NOTHING;

-- 12. PHARMACY REORDER REQUESTS
INSERT INTO public.pharmacy_reorder_requests (
  id, medicine_id, generic_name, brand_name, strength, dosage_form, requested_quantity,
  current_usable_stock, minimum_threshold, supplier_name, supplier_reference, reason,
  status, created_by_staff_id, created_by, notes, created_at
) VALUES
  ('PRQ-2026-101', 'med-ramipril-5', 'Ramipril', 'Cardace', '5 mg', 'Tablet', 300, 0, 60,
   'MedCore Institutional Distributors', 'DRAFT-REQ-RAM5', 'Out of Stock',
   'Submitted Purchase Request', 'staff-pharm-1', 'Meera Krishnan',
   'Local hospital purchase request awaiting central stores approval (no external order transmitted).',
   '2026-11-11T16:20:00Z')
ON CONFLICT DO NOTHING;

COMMIT;


-- >>> FILE: 20261113000005_phase6c_complete_module_seed_and_enhancements.sql <<<
-- =============================================================================
-- HEALTHROUTE — PHASE 6C: COMPLETE MODULE SEED, RLS FIXES & SCHEMA VERIFIER RPC
-- Migration: 20261113000005_phase6c_complete_module_seed_and_enhancements.sql
-- =============================================================================
-- Resolves Phase 6C Step 1 Audit Findings:
--   1. Adds missing FOR UPDATE RLS policy on public.patient_medication_activities
--      so authenticated patients can update same-day adherence records via UPSERT.
--   2. Adds optional display/clinical columns (appointments.patient_photo_url,
--      appointments.doctor_photo_url, follow_up_reminders.condition) to preserve
--      100% fidelity with Phase 1–5 frontend domain models.
--   3. Creates public.rpc_verify_phase6_schema_status() for live server-side
--      introspection of all 33 tables, RLS enforcement flags, and RPC functions.
--   4. Idempotently seeds the remaining 20 tables (Emergency Cases, Timeline,
--      MLC, Poisoning/Toxicology, Transfers, Clinical & Patient Documents,
--      Lab Reports & Parameters, Follow-Ups, Conversations, Messages,
--      Notifications, Medication Activities, Pharmacy Transactions, Audit Logs,
--      and Patient Sub-tables) with 100% fictional demonstration data.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. SCHEMA ENHANCEMENTS FOR 100% FRONTEND MODEL PARITY
-- =============================================================================

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS patient_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS doctor_photo_url TEXT;

ALTER TABLE public.follow_up_reminders
  ADD COLUMN IF NOT EXISTS condition TEXT;

-- =============================================================================
-- 2. RLS POLICY ENHANCEMENT: ALLOW PATIENT SAME-DAY ADHERENCE UPSERT
-- =============================================================================

DROP POLICY IF EXISTS pol_med_activities_patient_update ON public.patient_medication_activities;
CREATE POLICY pol_med_activities_patient_update ON public.patient_medication_activities
  FOR UPDATE TO authenticated
  USING (patient_id = public.current_patient_id())
  WITH CHECK (patient_id = public.current_patient_id());

-- =============================================================================
-- 3. SERVER-SIDE SCHEMA & RLS INTROSPECTION RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_verify_phase6_schema_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_expected_tables TEXT[] := ARRAY[
    'hospitals', 'staff_users', 'patients', 'patient_allergies',
    'patient_chronic_conditions', 'patient_vital_readings', 'patient_medications',
    'patient_privacy_settings', 'patient_access_audits', 'appointments',
    'clinical_encounters', 'pharmacy_medicines', 'prescription_items',
    'patient_medication_activities', 'follow_up_reminders', 'diagnostic_lab_reports',
    'diagnostic_lab_parameters', 'emergency_cases', 'emergency_case_timeline_events',
    'medico_legal_cases', 'poisoning_toxicology_cases', 'referral_transfers',
    'clinical_documents', 'patient_portal_documents', 'message_conversations',
    'patient_messages', 'notifications', 'pharmacy_batches',
    'pharmacy_dispensing_records', 'pharmacy_dispensing_items',
    'pharmacy_transactions', 'pharmacy_reorder_requests', 'audit_logs'
  ];
  v_expected_rpcs TEXT[] := ARRAY[
    'rpc_dispense_prescription',
    'rpc_receive_pharmacy_batch_stock',
    'rpc_adjust_pharmacy_batch_stock',
    'rpc_reconcile_unidentified_patient',
    'rpc_record_patient_access_audit',
    'rpc_verify_phase6_schema_status'
  ];
  v_tbl TEXT;
  v_rpc TEXT;
  v_rel RECORD;
  v_tables_report JSONB := '[]'::JSONB;
  v_rpcs_report JSONB := '[]'::JSONB;
  v_existing_tables_count INTEGER := 0;
  v_rls_enabled_count INTEGER := 0;
  v_existing_rpcs_count INTEGER := 0;
BEGIN
  FOREACH v_tbl IN ARRAY v_expected_tables LOOP
    SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
    INTO v_rel
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = v_tbl
      AND c.relkind = 'r';

    IF FOUND THEN
      v_existing_tables_count := v_existing_tables_count + 1;
      IF v_rel.relrowsecurity THEN
        v_rls_enabled_count := v_rls_enabled_count + 1;
      END IF;
      v_tables_report := v_tables_report || jsonb_build_array(
        jsonb_build_object(
          'table', v_tbl,
          'exists', true,
          'rlsEnabled', v_rel.relrowsecurity,
          'rlsForced', v_rel.relforcerowsecurity
        )
      );
    ELSE
      v_tables_report := v_tables_report || jsonb_build_array(
        jsonb_build_object(
          'table', v_tbl,
          'exists', false,
          'rlsEnabled', false,
          'rlsForced', false
        )
      );
    END IF;
  END LOOP;

  FOREACH v_rpc IN ARRAY v_expected_rpcs LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = v_rpc
    ) THEN
      v_existing_rpcs_count := v_existing_rpcs_count + 1;
      v_rpcs_report := v_rpcs_report || jsonb_build_array(
        jsonb_build_object('rpc', v_rpc, 'exists', true)
      );
    ELSE
      v_rpcs_report := v_rpcs_report || jsonb_build_array(
        jsonb_build_object('rpc', v_rpc, 'exists', false)
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'verifiedAt', NOW(),
    'expectedTablesCount', array_length(v_expected_tables, 1),
    'existingTablesCount', v_existing_tables_count,
    'rlsEnabledTablesCount', v_rls_enabled_count,
    'expectedRpcsCount', array_length(v_expected_rpcs, 1),
    'existingRpcsCount', v_existing_rpcs_count,
    'allMigrationsApplied', (
      v_existing_tables_count = array_length(v_expected_tables, 1)
      AND v_rls_enabled_count = array_length(v_expected_tables, 1)
      AND v_existing_rpcs_count = array_length(v_expected_rpcs, 1)
    ),
    'tables', v_tables_report,
    'rpcs', v_rpcs_report
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_verify_phase6_schema_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_verify_phase6_schema_status() TO authenticated, anon;

-- =============================================================================
-- 4. COMPLETE FICTIONAL SEED DATA FOR REMAINING 20 MODULE TABLES
-- =============================================================================

-- 4A. Normalized Patient Allergies, Conditions, Vitals & Baseline Medications
INSERT INTO public.patient_allergies (id, patient_id, allergen, reaction_type, severity, recorded_by_staff_id)
VALUES
  ('alg-seed-1', 'pat-known-01', 'Penicillin', 'Severe Urticaria & Bronchospasm', 'Life-Threatening', 'staff-doc-1'),
  ('alg-seed-2', 'pat-known-01', 'Sulfonamide Antibiotics', 'Maculopapular Rash', 'High', 'staff-doc-1'),
  ('alg-seed-3', 'pat-known-03', 'NSAIDs', 'Gastric Irritation', 'Moderate', 'doc-ortho-3'),
  ('alg-seed-4', 'pat-opd-04', 'Codeine', 'Nausea & Dizziness', 'Moderate', 'staff-doc-1')
ON CONFLICT DO NOTHING;

INSERT INTO public.patient_chronic_conditions (id, patient_id, condition_name, category, is_verified)
VALUES
  ('cond-seed-1', 'pat-known-01', 'Post-PCI (DES to LAD - Nov 2026)', 'chronic', true),
  ('cond-seed-2', 'pat-known-01', 'Essential Hypertension (10 yrs)', 'chronic', true),
  ('cond-seed-3', 'pat-known-01', 'Dyslipidemia', 'chronic', true),
  ('cond-seed-4', 'pat-known-03', 'Healed Right Distal Radius Colles Fracture', 'surgical_history', true),
  ('cond-seed-5', 'pat-opd-04', 'Type 2 Diabetes Mellitus', 'chronic', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.patient_vital_readings (
  id, patient_id, bp, pulse, spo2, temp, rr, gcs, blood_sugar, pain_score, weight, source_type, source_id, recorded_by_staff_id
) VALUES
  ('vit-seed-1', 'pat-known-01', '122/76', 68, 99, 98.2, 14, 15, 118, 0, 74.5, 'encounter', 'ENC-2026-002', 'staff-doc-1'),
  ('vit-seed-2', 'pat-unk-01', '84/52', 128, 86, 97.4, 28, 7, 142, 8, 68.0, 'emergency_case', 'CASE-2026-0842', 'staff-nurse-1'),
  ('vit-seed-3', 'pat-known-02', '96/60', 52, 89, 97.8, 24, 11, 108, 5, 65.0, 'emergency_case', 'CASE-2026-0844', 'staff-nurse-1')
ON CONFLICT DO NOTHING;

INSERT INTO public.patient_medications (id, patient_id, medication_label, is_active, source)
VALUES
  ('pmed-seed-1', 'pat-known-01', 'Tab. Ticagrelor 90 mg BD', true, 'baseline'),
  ('pmed-seed-2', 'pat-known-01', 'Tab. Aspirin 75 mg OD', true, 'baseline'),
  ('pmed-seed-3', 'pat-known-01', 'Tab. Atorvastatin 40 mg HS', true, 'baseline'),
  ('pmed-seed-4', 'pat-known-01', 'Tab. Metoprolol Succinate XL 25 mg OD', true, 'baseline')
ON CONFLICT DO NOTHING;

-- 4B. Patient Medication Adherence Activities
INSERT INTO public.patient_medication_activities (
  id, patient_id, patient_name, encounter_id, prescription_item_id, medication_key,
  medicine_name, strength, dosage, status, note, reported_by, recorded_at
) VALUES
  ('mact-seed-1', 'pat-known-01', 'Rameshwar Reddy', 'ENC-2026-002', 'rx-ram-1', 'ENC-2026-002::rx-ram-1',
   'Tab. Ticagrelor', '90 mg', '1 tablet twice daily', 'Taken', 'Taken after breakfast at 08:30 AM', 'patient', '2026-11-11T08:35:00Z'),
  ('mact-seed-2', 'pat-known-01', 'Rameshwar Reddy', 'ENC-2026-002', 'rx-ram-2', 'ENC-2026-002::rx-ram-2',
   'Tab. Aspirin', '75 mg', '1 tablet once daily after lunch', 'Taken', 'Taken after lunch at 01:30 PM', 'patient', '2026-11-11T13:35:00Z')
ON CONFLICT DO NOTHING;

-- 4C. Follow-up Reminders
INSERT INTO public.follow_up_reminders (
  id, patient_id, patient_name, patient_phone, attending_doctor_id, attending_doctor_name,
  due_date, reason, condition, category, urgency, status
) VALUES
  ('FU-2026-001', 'pat-known-01', 'Rameshwar Reddy', '+91 98860 34120', 'staff-doc-1', 'Dr. Vikram Malhotra',
   '2026-11-14', 'Post-angioplasty groin/radial puncture site inspection & Echocardiogram review',
   'Post-PCI Stent Surveillance', 'Post-Surgical Review', 'urgent', 'pending'),
  ('FU-2026-002', 'pat-opd-04', 'Meenakshi Sundaram', '+91 98451 90112', 'staff-doc-1', 'Dr. Vikram Malhotra',
   '2026-11-18', 'HbA1c optimization check & urine microalbumin/creatinine ratio review',
   'Type 2 Diabetes Mellitus', 'Chronic Disease Review', 'important', 'pending'),
  ('FU-2026-003', 'pat-known-03', 'Gopal Krishnan', '+91 94480 11928', 'doc-ortho-3', 'Dr. Rohan Iyer',
   '2026-11-25', 'Right Colles fracture 2-week check X-ray to ensure anatomical reduction',
   'Distal Radius Fracture', 'Post-Surgical Review', 'routine', 'pending')
ON CONFLICT DO NOTHING;

-- 4D. Diagnostic Lab Reports & Parameters
INSERT INTO public.diagnostic_lab_reports (
  id, patient_id, patient_name, ordering_doctor_id, ordering_doctor_name,
  test_name, category, sample_date, reported_date, impression, clinical_notes,
  critical_panic_value, status
) VALUES
  ('LAB-2026-081', 'pat-known-01', 'Rameshwar Reddy', 'staff-doc-1', 'Dr. Vikram Malhotra',
   'High-Sensitivity Troponin-I & Cardiac Renal Panel', 'Cardiology',
   '2026-11-11T07:10:00Z', '2026-11-11T08:15:00Z',
   'Post-PCI downward trending Troponin-I; renal function and electrolytes within safe limits.',
   'Continue Dual Antiplatelet Therapy and high-intensity statin.',
   false, 'Finalized'),
  ('LAB-2026-082', 'pat-known-02', 'Lakshmi Narayanan', 'staff-cmo-1', 'Dr. Ananya Deshmukh',
   'Serum Cholinesterase (Pseudocholinesterase) & Arterial Blood Gas', 'Biochemistry',
   '2026-11-11T06:20:00Z', '2026-11-11T07:05:00Z',
   'CRITICAL PANIC ALERT: Markedly depressed serum cholinesterase (840 U/L) confirming severe organophosphate cholinergic crisis.',
   'Immediate IV Atropine titration and Pralidoxime (PAM) infusion.',
   true, 'Critical Panic Alert'),
  ('LAB-2026-083', 'pat-opd-04', 'Meenakshi Sundaram', 'staff-doc-1', 'Dr. Vikram Malhotra',
   'Glycated Hemoglobin (HbA1c) & Fasting Lipid Profile', 'Biochemistry',
   '2026-11-10T08:30:00Z', '2026-11-10T14:20:00Z',
   'Suboptimal glycemic control (HbA1c 7.8%); borderline elevated LDL cholesterol.',
   'Titrate oral hypoglycemic regimen and reinforce dietary adherence.',
   false, 'Pending Review')
ON CONFLICT DO NOTHING;

INSERT INTO public.diagnostic_lab_parameters (
  id, lab_report_id, parameter_order, name, value, unit, reference_range, flag
) VALUES
  ('lparam-seed-1', 'LAB-2026-081', 1, 'hs-Troponin I', '0.18', 'ng/mL', '< 0.04', 'High'),
  ('lparam-seed-2', 'LAB-2026-081', 2, 'Serum Creatinine', '1.04', 'mg/dL', '0.70 - 1.30', 'Normal'),
  ('lparam-seed-3', 'LAB-2026-081', 3, 'Serum Potassium (K+)', '4.3', 'mEq/L', '3.5 - 5.1', 'Normal'),
  ('lparam-seed-4', 'LAB-2026-082', 1, 'Serum Pseudocholinesterase', '840', 'U/L', '4620 - 11500', 'Critical'),
  ('lparam-seed-5', 'LAB-2026-082', 2, 'Arterial pH', '7.26', '', '7.35 - 7.45', 'Low'),
  ('lparam-seed-6', 'LAB-2026-083', 1, 'HbA1c', '7.8', '%', '< 6.5', 'High'),
  ('lparam-seed-7', 'LAB-2026-083', 2, 'Fasting Blood Glucose', '156', 'mg/dL', '70 - 100', 'High')
ON CONFLICT DO NOTHING;

-- 4E. Emergency Cases, Timeline Events, MLC, Poisoning & Transfers
INSERT INTO public.emergency_cases (
  id, patient_id, patient_snapshot, triage_level, esi_score, chief_complaint,
  incident_type, incident_details, vitals, bed_bay,
  assigned_physician_id, assigned_physician_name, assigned_nurse_id, assigned_nurse_name,
  status, is_mlc, mlc_id, is_poisoning, poison_case_id, transfer_id, created_at, updated_at
) VALUES
  ('CASE-2026-0842', 'pat-unk-01',
   '{"id": "pat-unk-01", "isUnidentified": true, "tempId": "TEMP-ER-2026-0841", "name": "Unidentified Male #0841", "ageEstimated": true, "age": 35, "gender": "Male", "bloodGroup": "O+", "registrationTimestamp": "2026-11-11T05:15:00Z", "registeredBy": "Sister Rekha Varma"}'::JSONB,
   'RED', 1,
   'Severe polytrauma, head injury, unresponsive following high-speed two-wheeler RTA',
   'RTA (Road Traffic Accident)',
   '{"location": "Silk Board Flyover Down-Ramp, Bengaluru", "timeOfIncident": "04:45 AM", "mechanism": "High-velocity two-wheeler skid & median impact without helmet", "broughtBy": "108 GVK EMRI Ambulance", "vehicleNo": "KA-01-G-4418"}'::JSONB,
   '{"bp": "84/52", "pulse": 128, "spo2": 86, "temp": 97.4, "rr": 28, "gcs": 7, "recordedAt": "2026-11-11T05:20:00Z"}'::JSONB,
   'Resus Bay 1 (Red Zone)',
   'staff-cmo-1', 'Dr. Ananya Deshmukh', 'staff-nurse-1', 'Sister Rekha Varma',
   'Under Resuscitation', true, 'MLC-2026-0419', false, NULL, 'TRF-2026-0045',
   '2026-11-11T05:15:00Z', '2026-11-11T06:00:00Z'),

  ('CASE-2026-0844', 'pat-known-02',
   '{"id": "pat-known-02", "isUnidentified": false, "permanentMrn": "AC-BLR-2026-0219", "name": "Lakshmi Narayanan", "age": 41, "gender": "Male", "bloodGroup": "A+", "contactNumber": "+91 97410 88210", "registrationTimestamp": "2026-11-11T06:10:00Z", "registeredBy": "Sister Rekha Varma"}'::JSONB,
   'RED', 1,
   'Acute cholinergic crisis, profuse frothing, pinpoint pupils & bradycardia following agricultural pesticide ingestion',
   'Poisoning / Toxin Ingestion',
   '{"location": "Anekal Agricultural Belt, Bengaluru South", "timeOfIncident": "05:10 AM", "mechanism": "Accidental/deliberate ingestion of liquid organophosphate pesticide", "broughtBy": "Family Vehicle & Bystanders"}'::JSONB,
   '{"bp": "96/60", "pulse": 52, "spo2": 89, "temp": 97.8, "rr": 24, "gcs": 11, "recordedAt": "2026-11-11T06:15:00Z"}'::JSONB,
   'Toxicology Resus Bay 2',
   'staff-cmo-1', 'Dr. Ananya Deshmukh', 'staff-nurse-1', 'Sister Rekha Varma',
   'Under Resuscitation', true, 'MLC-2026-0420', true, 'TOX-2026-0083', NULL,
   '2026-11-11T06:10:00Z', '2026-11-11T06:45:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO public.emergency_case_timeline_events (
  id, case_id, author_staff_id, author_name, author_role, category, note, timestamp
) VALUES
  ('ev-seed-1', 'CASE-2026-0842', 'staff-cmo-1', 'Dr. Ananya Deshmukh', 'Chief Medical Officer', 'procedure',
   'Rapid Sequence Intubation (RSI) performed with ETT 8.0mm; cervical spine immobilized with hard Philadelphia collar.', '2026-11-11T05:25:00Z'),
  ('ev-seed-2', 'CASE-2026-0842', 'staff-nurse-1', 'Sister Rekha Varma', 'Senior Triage Nurse', 'medication',
   'Initiated 2 large-bore 16G IV cannulae;infused 1000 mL warm Ringer Lactate & IV Tranexamic Acid 1g bolus.', '2026-11-11T05:20:00Z'),
  ('ev-seed-3', 'CASE-2026-0844', 'staff-cmo-1', 'Dr. Ananya Deshmukh', 'Chief Medical Officer', 'medication',
   'Administered IV Atropine 2 mg stat & doubled every 5 minutes targeting dry axillae and HR > 80 bpm; started Inj. Pralidoxime (PAM) 1g IV infusion.', '2026-11-11T06:18:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO public.medico_legal_cases (
  id, case_id, patient_id, patient_name, is_unidentified, police_station,
  fir_or_gd_number, intimation_sent_to_police, police_intimation_date,
  brought_by_name, brought_by_designation, injury_classification, wounds,
  weapon_or_agent_suspected, intoxication_suspected, smell_of_alcohol_or_agent,
  clothing_sealed_and_handed_over, sealed_articles_description,
  cmo_staff_id, cmo_name, review_status, cmo_signed_at, remarks, legal_disclaimer_acknowledged
) VALUES
  ('MLC-2026-0419', 'CASE-2026-0842', 'pat-unk-01', 'Unidentified Male #0841', true,
   'Madiwala Traffic Police Station, Bengaluru', 'GD-ENTRY-2026-1104', true, '2026-11-11T05:35:00Z',
   'EMT Ramesh Babu (108 EMRI) & PC #4192', '108 EMRI Paramedic & Traffic Police Constable',
   'Dangerous to Life',
   '[{"id": "w-1", "location": "Right Parieto-Temporal Scalp", "type": "Laceration", "dimensions": "6cm x 2cm x bone deep", "margins": "Irregular, contused with active venous oozing", "ageOfInjuryProvisional": "Fresh (< 2 hours)"}]'::JSONB,
   'Blunt High-Velocity Road Surface Impact', false, 'Nil alcohol odor detected on breath',
   true, 'Blood-stained dark grey jacket and torn denim trousers sealed in tamper-evident MLC Evidence Bag #E-842 with hospital wax seal.',
   'staff-cmo-1', 'Dr. Ananya Deshmukh', 'Signed & Sealed', '2026-11-11T05:50:00Z',
   'Statutory police intimation transmitted electronically and acknowledged by Duty HC at Madiwala PS.', true),

  ('MLC-2026-0420', 'CASE-2026-0844', 'pat-known-02', 'Lakshmi Narayanan', false,
   'Anekal Police Station, Bengaluru District', NULL, true, '2026-11-11T06:30:00Z',
   'Kavitha Narayanan (Spouse)', 'Family Member / Next of Kin',
   'Dangerous to Life', '[]'::JSONB,
   'Organophosphate Agricultural Pesticide (Monocrotophos 36% SL)', true,
   'Strong pungent garlic-like hydrocarbon solvent odor on breath and gastric aspirate',
   true, '50 mL sealed gastric lavage sample in saturated sodium chloride preservative + brought pesticide bottle sealed with CMO wax seal.',
   'staff-cmo-1', 'Dr. Ananya Deshmukh', 'Pending CMO Review', NULL,
   'Toxicology chain-of-custody samples preserved for Forensic Science Laboratory (FSL), Madiwala.', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.poisoning_toxicology_cases (
  id, case_id, patient_id, patient_name, suspected_agent, commercial_brand_or_local_name,
  estimated_time_of_ingestion, route_of_exposure, quantity_estimated, container_brought,
  vomitus_details, clinical_presentation, decontamination_actions, antidotes_administered,
  atropinization_status, toxicology_samples_collected, sample_preservative,
  supervising_cmo_staff_id, supervising_toxicologist_or_cmo
) VALUES
  ('TOX-2026-0083', 'CASE-2026-0844', 'pat-known-02', 'Lakshmi Narayanan',
   'Organophosphate', 'Monocrotophos 36% SL (Nuvacron)', 'Approx. 05:10 AM (60 mins prior to ER arrival)',
   'Oral Ingestion', '~45-60 mL liquid concentrate', true,
   '2 episodes of bilious, frothy vomitus with strong garlic-like solvent odor',
   '{"sludgeSigns": true, "pupils": "Pinpoint", "secretions": "Excessive Frothing", "fasciculations": true, "convulsions": false, "respiratoryDepression": true, "characteristicOdor": "Garlic / Hydrocarbon solvent odor"}'::JSONB,
   '{"gastricLavageDone": true, "gastricLavageTime": "06:16 AM", "activatedCharcoalAdministered": true, "bodyDecontaminationWash": true}'::JSONB,
   '[{"id": "ant-seed-1", "drugName": "Inj. Atropine Sulfate", "dose": "6 mg cumulative IV bolus + 1.2 mg/hr infusion", "route": "IV", "administeredAt": "06:18 AM", "administeredBy": "Dr. Ananya Deshmukh", "patientResponse": "Bronchorrhea subsiding; heart rate increased from 52 to 88 bpm"}, {"id": "ant-seed-2", "drugName": "Inj. Pralidoxime Chloride (PAM)", "dose": "1 g in 100 mL NS over 30 mins", "route": "IV Infusion", "administeredAt": "06:25 AM", "administeredBy": "Sister Rekha Varma", "patientResponse": "Diaphragmatic fasciculations decreasing"}]'::JSONB,
   '{"isAtropinized": true, "pulseTargetAchieved": true, "dryAxillae": true, "pupilsDilated": true, "chestClearOfRhonchi": true, "systolicBpAdequate": true}'::JSONB,
   true, 'First 50 mL gastric lavage aspirate preserved in saturated NaCl solution (FSL Sealed)',
   'staff-cmo-1', 'Dr. Ananya Deshmukh')
ON CONFLICT DO NOTHING;

INSERT INTO public.referral_transfers (
  id, case_id, patient_id, patient_name, originating_hospital,
  receiving_hospital_id, receiving_hospital, receiving_department,
  receiving_doctor_or_coordinator, acceptance_confirmed, acceptance_reference_code,
  clinical_reason, summary_at_transfer, transport_details, status, handover_notes
) VALUES
  ('TRF-2026-0045', 'CASE-2026-0842', 'pat-unk-01', 'Unidentified Male #0841',
   'Apex City Hospital, Bengaluru (Main Campus)', 'hosp-2',
   'NIMHANS Neuro-Trauma & Stroke Referral Center', 'Emergency Neurosurgery & Polytrauma ICU',
   'Dr. K. V. Shivarama (Duty Neurosurgeon)', true, 'NIMHANS-ER-2026-9914',
   'Specialized Neuro-trauma / CT Surgery Intervention',
   '{"triageCategory": "RED (ESI-1)", "gcsScore": "E2V1M4 (7/15) - Intubated", "currentVitals": "BP 104/68 mmHg (on Noradrenaline), HR 106 bpm, SpO2 98% on FiO2 60%", "interventionsGiven": "RSI ETT 8.0mm, C-Spine Collar, 1L RL, Inj. Tranexamic Acid 1g, Inj. Mannitol 100mL IV", "airwayStatus": "Intubated & Bagged/Ventilated", "ongoingInfusions": "NS + Noradrenaline 4 mcg/min"}'::JSONB,
   '{"ambulanceType": "Advanced Life Support (ALS)", "vehicleRegNumber": "KA-01-G-8821", "driverOrEMTName": "Sanjay Gowda (Senior ALS Paramedic)", "contactPhone": "+91 98450 10801", "accompanyingStaff": "Dr. Ananya Deshmukh & Critical Care EMT", "departureTime": "06:15 AM", "estimatedArrival": "06:30 AM (15 mins green corridor)", "transitChecklistPassed": true}'::JSONB,
   'Acceptance Confirmed',
   'CT Brain DICOM images and provisional MLC-2026-0419 certificate handed over to ALS crew.')
ON CONFLICT DO NOTHING;

-- 4F. Clinical Statutory Documents & Patient Portal Documents
INSERT INTO public.clinical_documents (
  id, title, doc_type, case_id, patient_id, patient_name, is_unidentified, temp_id,
  author_staff_id, author_name, status, summary_excerpt, generated_at
) VALUES
  ('DOC-2026-001', 'Emergency Resuscitation & Case Sheet - CASE-2026-0842', 'EMERGENCY_CASE_SHEET',
   'CASE-2026-0842', 'pat-unk-01', 'Unidentified Male #0841', true, 'TEMP-ER-2026-0841',
   'staff-cmo-1', 'Dr. Ananya Deshmukh', 'Verified',
   'Primary ATLS trauma survey, airway protection via RSI (ETT 8.0), hemodynamic stabilization, and neuro-trauma referral documentation.',
   '2026-11-11T05:55:00Z'),
  ('DOC-2026-002', 'Provisional Medico-Legal Injury Certificate - MLC-2026-0419', 'MLC_CERTIFICATE',
   'CASE-2026-0842', 'pat-unk-01', 'Unidentified Male #0841', true, 'TEMP-ER-2026-0841',
   'staff-cmo-1', 'Dr. Ananya Deshmukh', 'Verified',
   'Signed & sealed statutory Medico-Legal Certificate (GD-ENTRY-2026-1104) detailing grievous head trauma for Madiwala Traffic PS.',
   '2026-11-11T05:58:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO public.patient_portal_documents (
  id, patient_id, title, category, source, document_date, is_verified, file_type, file_size, summary, tags
) VALUES
  ('pdoc-1', 'pat-known-01', 'Primary Coronary Angioplasty (PCI) Discharge Summary', 'Discharge Summary',
   'Apex City Hospital — Dept. of Interventional Cardiology', '2026-11-09', true, 'PDF', '1.8 MB',
   'Successful primary PCI with 3.0 x 28 mm Drug-Eluting Stent (DES) deployed in proximal Left Anterior Descending (LAD) artery; TIMI-3 flow achieved.',
   ARRAY['Cardiology', 'PCI', 'Stent', 'Discharge Summary']),
  ('pdoc-2', 'pat-known-01', 'Post-Procedure 12-Lead Resting ECG & 2D Echocardiogram', 'Radiology / Imaging',
   'Apex City Non-Invasive Cardiac Lab', '2026-11-11', true, 'PDF', '2.4 MB',
   'Resolved ST-segment elevations in V1-V4; LVEF 52% with mild anterior wall hypokinesia; normal valvular function.',
   ARRAY['ECG', 'Echo', 'LVEF 52%'])
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  title = EXCLUDED.title,
  source = EXCLUDED.source,
  document_date = EXCLUDED.document_date,
  is_verified = EXCLUDED.is_verified,
  file_type = EXCLUDED.file_type,
  file_size = EXCLUDED.file_size,
  summary = EXCLUDED.summary,
  tags = EXCLUDED.tags;

-- 4G. Two-Way Doctor–Patient Conversations, Messages & Notifications
INSERT INTO public.message_conversations (
  id, patient_id, patient_name, doctor_id, doctor_name, doctor_specialty,
  doctor_department, related_appointment_id, status, created_at, last_message_at
) VALUES
  ('conv-pat-known-01-staff-doc-1', 'pat-known-01', 'Rameshwar Reddy',
   'staff-doc-1', 'Dr. Vikram Malhotra', 'Cardiology & Internal Medicine',
   'Cardiology & Internal Medicine', 'APT-2026-001', 'Active',
   '2026-11-11T08:00:00Z', '2026-11-11T10:20:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO public.patient_messages (
  id, conversation_id, patient_id, patient_name, doctor_id, doctor_name,
  doctor_specialty, sender_id, sender_role, sender, text, category,
  related_appointment_id, is_read, timestamp
) VALUES
  ('msg-seed-1', 'conv-pat-known-01-staff-doc-1', 'pat-known-01', 'Rameshwar Reddy',
   'staff-doc-1', 'Dr. Vikram Malhotra', 'Cardiology & Internal Medicine',
   'pat-known-01', 'Patient', 'patient',
   'Namaste Dr. Malhotra, my morning home blood pressure today was 122/76 mmHg and pulse 68 bpm. Should I continue taking Ticagrelor 90 mg right after breakfast?',
   'Medication Review', 'APT-2026-001', true, '2026-11-11T09:15:00Z'),
  ('msg-seed-2', 'conv-pat-known-01-staff-doc-1', 'pat-known-01', 'Rameshwar Reddy',
   'staff-doc-1', 'Dr. Vikram Malhotra', 'Cardiology & Internal Medicine',
   'staff-doc-1', 'Doctor', 'doctor',
   'Hello Mr. Reddy, 122/76 mmHg with a resting pulse of 68 bpm is ideal post-PCI control. Yes, please continue Tab. Ticagrelor 90 mg twice daily after meals without skipping any dose.',
   'Medication Review', 'APT-2026-001', false, '2026-11-11T10:20:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO public.notifications (
  id, patient_id, doctor_id, appointment_id, encounter_id, conversation_id,
  dedup_key, target_audience, category, title, message, is_read, action_tab, priority, timestamp
) VALUES
  ('notif-seed-1', 'pat-known-01', 'staff-doc-1', 'APT-2026-001', 'ENC-2026-002', NULL,
   'seed-notif-rx-enc-002', 'patient', 'prescription',
   'Post-PCI Prescription Active (ENC-2026-002)',
   'Dr. Vikram Malhotra signed your post-angioplasty cardiac regimen (4 medications).',
   false, 'patient-prescriptions', 'high', '2026-11-11T10:05:00Z'),
  ('notif-seed-2', 'pat-known-01', 'staff-doc-1', 'APT-2026-001', NULL, 'conv-pat-known-01-staff-doc-1',
   'seed-notif-msg-doc-1', 'patient', 'message',
   'New Reply from Dr. Vikram Malhotra',
   'Dr. Vikram Malhotra replied to your Medication Review query regarding home blood pressure and Ticagrelor timing.',
   false, 'patient-messages', 'high', '2026-11-11T10:20:00Z'),
  ('notif-seed-3', NULL, NULL, NULL, NULL, NULL,
   'seed-notif-pharm-salbutamol', 'pharmacy', 'pharmacy',
   'Low Stock Threshold Alert: Salbutamol Inhaler',
   'Salbutamol Inhaler (100 mcg/puff) usable stock is 5 Inhalers (minimum threshold: 12).',
   false, NULL, 'high', '2026-11-11T11:00:00Z')
ON CONFLICT DO NOTHING;

-- 4H. Pharmacy Transactions & System Audit Logs
INSERT INTO public.pharmacy_transactions (
  id, medicine_id, medicine_name, batch_id, batch_number, transaction_type,
  quantity_delta, previous_quantity, new_quantity, staff_id, staff_name, staff_role,
  reason, related_prescription_id, related_prescription_item_id, related_dispensing_record_id,
  patient_id, patient_name, timestamp
) VALUES
  ('ptx-seed-1', 'med-calcium-vitd3', 'Calcium + Vitamin D3 500mg / 250IU (Tablet)', 'batch-cal-1', 'TOR-CAL-5021',
   'Dispense', -60, 300, 240, 'staff-pharm-1', 'Meera Krishnan', 'pharmacist',
   'Dispensed for Prescription ENC-2026-004 (Gopal Krishnan)', 'ENC-2026-004', 'rx-gopal-1', 'DISP-2026-001',
   'pat-known-03', 'Gopal Krishnan', '2026-11-11T11:45:00Z'),
  ('ptx-seed-2', 'med-paracetamol-650', 'Paracetamol 650 mg (Tablet)', 'batch-pcm-fresh', 'MIC-DOL-6599',
   'Dispense', -10, 630, 620, 'staff-pharm-1', 'Meera Krishnan', 'pharmacist',
   'Dispensed for Prescription ENC-2026-004 (Gopal Krishnan)', 'ENC-2026-004', 'rx-gopal-2', 'DISP-2026-001',
   'pat-known-03', 'Gopal Krishnan', '2026-11-11T11:45:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO public.audit_logs (
  id, user_id, user_name, user_role, action, target_type, target_id, details, ip_station, timestamp
) VALUES
  ('aud-seed-1', 'staff-cmo-1', 'Dr. Ananya Deshmukh', 'cmo', 'MLC Signed and Sealed', 'MLC', 'MLC-2026-0419',
   'Formally validated, signed and hospital wax-seal authenticated for CASE-2026-0842 (Madiwala Traffic PS)', 'ER-CMO-CONSOLE-01', '2026-11-11T05:50:00Z'),
  ('aud-seed-2', 'staff-doc-1', 'Dr. Vikram Malhotra', 'doctor', 'Clinical Encounter & Prescription Signed', 'PATIENT', 'pat-known-01',
   'Signed post-PCI encounter ENC-2026-002 with 4 active cardiac medications for Rameshwar Reddy', 'OPD-204-WORKSTATION', '2026-11-11T10:05:00Z'),
  ('aud-seed-3', 'staff-pharm-1', 'Meera Krishnan', 'pharmacist', 'Prescription Dispensed (Fully Dispensed)', 'PHARMACY', 'DISP-2026-001',
   'Dispensed ENC-2026-004 for Gopal Krishnan from FEFO verified batches TOR-CAL-5021 and MIC-DOL-6599', 'PHARMACY-DISPENSARY-01', '2026-11-11T11:45:00Z')
ON CONFLICT DO NOTHING;

COMMIT;

