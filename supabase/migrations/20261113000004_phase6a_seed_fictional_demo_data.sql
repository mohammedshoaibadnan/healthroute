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
