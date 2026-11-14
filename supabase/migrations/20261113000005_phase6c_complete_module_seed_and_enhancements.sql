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
