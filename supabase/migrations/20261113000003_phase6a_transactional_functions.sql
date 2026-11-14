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
