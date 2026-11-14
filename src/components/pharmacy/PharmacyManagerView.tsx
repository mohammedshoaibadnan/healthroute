import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Pill,
  Package,
  AlertTriangle,
  Clock,
  ClipboardCheck,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ShieldCheck,
  History,
  ShoppingCart,
  SlidersHorizontal,
  Ban,
  Eye,
  X,
  ArrowUpDown,
  Bell,
  Building2,
  UserCheck,
  FileText,
} from 'lucide-react';
import {
  canViewPharmacyDashboard,
  canManagePharmacyInventory,
  canDispenseMedications,
  getMedicineStockSummary,
  isBatchExpired,
  isBatchNearExpiry,
  getDaysUntilExpiry,
  matchPrescriptionItemToCatalogue,
  getPrescriptionDispensingSummary,
  DispenseLineInput,
} from '../../utils/rules';
import {
  PharmacyDosageForm,
  PharmacyMedicine,
  PharmacyBatch,
  ClinicalEncounter,
  PharmacyTransactionType,
} from '../../types';

type PharmacySubTab = 'catalogue' | 'dispense' | 'batches' | 'reorders' | 'transactions';

const DOSAGE_FORMS: PharmacyDosageForm[] = [
  'Tablet',
  'Capsule',
  'Inhaler',
  'Injection',
  'Syrup',
  'Ointment',
  'Drops',
  'Powder',
  'Solution',
];

const TRANSACTION_TYPES: PharmacyTransactionType[] = [
  'Stock Receipt',
  'Batch Addition',
  'Stock Adjustment',
  'Dispense',
  'Partial Dispense',
  'Expiry Write-Off',
  'Catalogue Update',
];

export const PharmacyManagerView: React.FC = () => {
  const {
    currentUser,
    switchRole,
    patients,
    encounters,
    pharmacyMedicines,
    pharmacyBatches,
    pharmacyTransactions,
    pharmacyDispensingRecords,
    pharmacyReorderRequests,
    patientNotifications,
    markNotificationRead,
    addPharmacyMedicine,
    togglePharmacyMedicineStatus,
    updatePharmacyMedicineThreshold,
    receivePharmacyBatchStock,
    adjustPharmacyBatchStock,
    dispensePrescription,
    createPharmacyReorderRequest,
    updatePharmacyReorderStatus,
  } = useApp();

  const todayDate = new Date().toISOString().split('T')[0];

  const canView = canViewPharmacyDashboard(currentUser.role);
  const canManage = canManagePharmacyInventory(currentUser.role);
  const canDispense = canDispenseMedications(currentUser.role);

  const [subTab, setSubTab] = useState<PharmacySubTab>(
    canDispense ? 'dispense' : 'catalogue'
  );
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Catalogue Filters
  const [catSearch, setCatSearch] = useState('');
  const [catCategoryFilter, setCatCategoryFilter] = useState('ALL');
  const [catStatusFilter, setCatStatusFilter] = useState<'ALL' | 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Inactive'>('ALL');
  const [selectedMedicineId, setSelectedMedicineId] = useState<string | null>(null);
  const [editingThresholdMedId, setEditingThresholdMedId] = useState<string | null>(null);
  const [thresholdDraft, setThresholdDraft] = useState<string>('0');

  // Dispense Queue State
  const [dispenseFilter, setDispenseFilter] = useState<'pending' | 'dispensed' | 'all'>('pending');
  const [dispenseSearch, setDispenseSearch] = useState('');
  const [activeEncounterId, setActiveEncounterId] = useState<string | null>(null);
  const [lineDrafts, setLineDrafts] = useState<
    Record<
      string,
      {
        action: 'dispense' | 'unavailable' | 'skip';
        batchId: string;
        quantity: string;
        note: string;
      }
    >
  >({});
  const [dispenseSessionNotes, setDispenseSessionNotes] = useState('');
  const [confirmDispenseOpen, setConfirmDispenseOpen] = useState(false);

  // Batches Monitor Filters
  const [batchFilter, setBatchFilter] = useState<'all' | 'near-expiry' | 'expired' | 'depleted'>('all');
  const [batchSearch, setBatchSearch] = useState('');

  // Transactions Filters
  const [txTypeFilter, setTxTypeFilter] = useState<string>('ALL');
  const [txSearch, setTxSearch] = useState('');

  // Modals: Add Medicine
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [newMedForm, setNewMedForm] = useState({
    genericName: '',
    brandName: '',
    strength: '',
    dosageForm: 'Tablet' as PharmacyDosageForm,
    manufacturer: '',
    category: 'Cardiovascular',
    storageRequirements: 'Store below 25°C in a dry place',
    unitOfMeasurement: 'Tablets',
    minimumStockThreshold: '50',
  });

  // Modal: Receive Batch
  const [receiveModalMedId, setReceiveModalMedId] = useState<string | null>(null);
  const [receiveForm, setReceiveForm] = useState({
    batchNumber: '',
    quantity: '100',
    expiryDate: '',
    purchaseDate: todayDate,
    supplierName: 'MedCore Institutional Distributors',
    supplierReference: '',
    stockLocation: 'Main Dispensary Rack A1',
    reason: '',
  });

  // Modal: Adjust / Add to Existing Batch
  const [adjustModalBatch, setAdjustModalBatch] = useState<{
    batch: PharmacyBatch;
    mode: 'add' | 'adjust';
  } | null>(null);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Modal: Create Local Reorder Draft
  const [isReorderOpen, setIsReorderOpen] = useState(false);
  const [reorderForm, setReorderForm] = useState({
    medicineId: '',
    requestedQuantity: '200',
    supplierName: 'MedCore Institutional Distributors',
    supplierReference: '',
    reason: 'Low Stock' as 'Low Stock' | 'Out of Stock' | 'Near Expiry Replacement',
    notes: '',
    submitImmediately: false,
  });

  // Summaries & KPI Calculations
  const medicineSummaries = useMemo(() => {
    return pharmacyMedicines.map((med) =>
      getMedicineStockSummary(med, pharmacyBatches, todayDate)
    );
  }, [pharmacyMedicines, pharmacyBatches, todayDate]);

  const categories = useMemo(() => {
    const set = new Set(pharmacyMedicines.map((m) => m.category));
    return Array.from(set).sort();
  }, [pharmacyMedicines]);

  const encounterDispenseList = useMemo(() => {
    return encounters
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((enc) => ({
        encounter: enc,
        summary: getPrescriptionDispensingSummary(enc, pharmacyDispensingRecords),
      }));
  }, [encounters, pharmacyDispensingRecords]);

  const kpis = useMemo(() => {
    const activeMeds = medicineSummaries.filter((s) => s.medicine.status === 'Active');
    const totalUsableUnits = medicineSummaries.reduce((sum, s) => sum + s.usableQuantity, 0);
    const lowOrOutCount = activeMeds.filter(
      (s) => s.stockStatus === 'Low Stock' || s.stockStatus === 'Out of Stock'
    ).length;
    const nearExpiryBatchesCount = pharmacyBatches.filter(
      (b) => b.availableQuantity > 0 && isBatchNearExpiry(b.expiryDate, todayDate, 60)
    ).length;
    const expiredBatchesWithStock = pharmacyBatches.filter(
      (b) => b.availableQuantity > 0 && isBatchExpired(b.expiryDate, todayDate)
    ).length;
    const pendingPrescriptions = encounterDispenseList.filter(
      (e) =>
        e.encounter.status !== 'Draft' &&
        e.encounter.prescriptionStatus !== 'Draft' &&
        e.encounter.prescriptionStatus !== 'Discontinued' &&
        e.summary.overallStatus !== 'Fully Dispensed'
    ).length;

    return {
      activeCount: activeMeds.length,
      totalCount: pharmacyMedicines.length,
      totalUsableUnits,
      lowOrOutCount,
      nearExpiryBatchesCount,
      expiredBatchesWithStock,
      pendingPrescriptions,
    };
  }, [medicineSummaries, pharmacyMedicines.length, pharmacyBatches, encounterDispenseList, todayDate]);

  const unreadPharmacyNotifs = patientNotifications.filter(
    (n) => n.targetAudience === 'pharmacy' && !n.isRead
  );

  // Filtered Lists
  const filteredCatalogue = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    return medicineSummaries.filter((s) => {
      if (catCategoryFilter !== 'ALL' && s.medicine.category !== catCategoryFilter) return false;
      if (catStatusFilter !== 'ALL' && s.stockStatus !== catStatusFilter) return false;
      if (!q) return true;
      return (
        s.medicine.genericName.toLowerCase().includes(q) ||
        (s.medicine.brandName || '').toLowerCase().includes(q) ||
        s.medicine.strength.toLowerCase().includes(q) ||
        s.medicine.category.toLowerCase().includes(q) ||
        s.medicine.manufacturer.toLowerCase().includes(q)
      );
    });
  }, [medicineSummaries, catCategoryFilter, catStatusFilter, catSearch]);

  const filteredQueue = useMemo(() => {
    const q = dispenseSearch.trim().toLowerCase();
    return encounterDispenseList.filter(({ encounter, summary }) => {
      const isDraftOrDisc =
        encounter.status === 'Draft' ||
        encounter.prescriptionStatus === 'Draft' ||
        encounter.prescriptionStatus === 'Discontinued';

      if (dispenseFilter === 'pending') {
        if (isDraftOrDisc || summary.overallStatus === 'Fully Dispensed') return false;
      } else if (dispenseFilter === 'dispensed') {
        if (summary.overallStatus !== 'Fully Dispensed') return false;
      }

      if (!q) return true;
      return (
        encounter.id.toLowerCase().includes(q) ||
        encounter.patientName.toLowerCase().includes(q) ||
        encounter.patientId.toLowerCase().includes(q) ||
        encounter.doctorName.toLowerCase().includes(q)
      );
    });
  }, [encounterDispenseList, dispenseFilter, dispenseSearch]);

  const filteredBatches = useMemo(() => {
    const q = batchSearch.trim().toLowerCase();
    return pharmacyBatches
      .map((b) => {
        const med = pharmacyMedicines.find((m) => m.id === b.medicineId);
        const expired = isBatchExpired(b.expiryDate, todayDate);
        const nearExp = isBatchNearExpiry(b.expiryDate, todayDate, 60);
        const daysLeft = getDaysUntilExpiry(b.expiryDate, todayDate);
        return { batch: b, med, expired, nearExp, daysLeft };
      })
      .filter((row) => {
        if (batchFilter === 'near-expiry' && (!row.nearExp || row.batch.availableQuantity <= 0)) return false;
        if (batchFilter === 'expired' && (!row.expired || row.batch.availableQuantity <= 0)) return false;
        if (batchFilter === 'depleted' && row.batch.availableQuantity > 0) return false;
        if (!q) return true;
        return (
          row.batch.batchNumber.toLowerCase().includes(q) ||
          (row.med?.genericName || '').toLowerCase().includes(q) ||
          (row.med?.brandName || '').toLowerCase().includes(q) ||
          row.batch.supplierName.toLowerCase().includes(q) ||
          row.batch.stockLocation.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.batch.expiryDate.localeCompare(b.batch.expiryDate));
  }, [pharmacyBatches, pharmacyMedicines, batchFilter, batchSearch, todayDate]);

  const filteredTransactions = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    return pharmacyTransactions.filter((tx) => {
      if (txTypeFilter !== 'ALL' && tx.transactionType !== txTypeFilter) return false;
      if (!q) return true;
      return (
        tx.medicineName.toLowerCase().includes(q) ||
        (tx.batchNumber || '').toLowerCase().includes(q) ||
        tx.staffName.toLowerCase().includes(q) ||
        tx.reason.toLowerCase().includes(q) ||
        (tx.relatedPrescriptionId || '').toLowerCase().includes(q) ||
        (tx.patientName || '').toLowerCase().includes(q)
      );
    });
  }, [pharmacyTransactions, txTypeFilter, txSearch]);

  // Restricted Roles Gate (Nurse / Records)
  if (!canView) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-slate-900">
              Hospital Pharmacy Access Restricted
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              Your active session profile (<strong className="text-slate-900">{currentUser.name}</strong> —{' '}
              <span className="uppercase font-bold">{currentUser.role}</span>) does not hold Pharmacy Dispensary or Administrator privileges. Inventory adjustments and prescription dispensing are restricted to authorised Pharmacy Staff and Administrators.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => switchRole('pharmacist')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0b192e] hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              <UserCheck className="w-4 h-4 text-teal-400" />
              <span>Simulate Pharmacist Session (Meera Krishnan)</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Note: Role switching is a client-side demonstration simulation and not production authentication.
          </p>
        </div>
      </div>
    );
  }

  // Helpers for opening Dispensing Sheet
  const openEncounterForDispense = (enc: ClinicalEncounter) => {
    const summary = getPrescriptionDispensingSummary(enc, pharmacyDispensingRecords);
    const nextDrafts: typeof lineDrafts = {};
    summary.items.forEach((it) => {
      const match = matchPrescriptionItemToCatalogue(it.item, pharmacyMedicines, false);
      const medSummary = match.matchedMedicine
        ? getMedicineStockSummary(match.matchedMedicine, pharmacyBatches, todayDate)
        : undefined;
      const firstBatch = medSummary?.usableBatches[0];
      const defaultQty =
        firstBatch && it.remainingQuantity > 0
          ? Math.min(it.remainingQuantity, firstBatch.availableQuantity)
          : 0;

      nextDrafts[it.prescriptionItemId] = {
        action:
          it.remainingQuantity === 0
            ? 'skip'
            : firstBatch && defaultQty > 0
            ? 'dispense'
            : 'unavailable',
        batchId: firstBatch?.id || '',
        quantity: defaultQty > 0 ? String(defaultQty) : '0',
        note:
          !match.matchedMedicine
            ? 'Exact medicine/strength/form not in active hospital formulary'
            : !firstBatch
            ? 'No usable non-expired batch in stock'
            : '',
      };
    });
    setLineDrafts(nextDrafts);
    setDispenseSessionNotes('');
    setConfirmDispenseOpen(false);
    setActiveEncounterId(enc.id);
  };

  const activeEncounterObj = activeEncounterId
    ? encounterDispenseList.find((e) => e.encounter.id === activeEncounterId)
    : undefined;

  const handleConfirmDispense = () => {
    if (!activeEncounterObj) return;
    const inputs: DispenseLineInput[] = [];
    for (const itemState of activeEncounterObj.summary.items) {
      if (
        itemState.remainingQuantity <= 0 ||
        itemState.item.status === 'Discontinued' ||
        itemState.item.status === 'Draft'
      ) {
        continue;
      }
      const draft = lineDrafts[itemState.prescriptionItemId];
      if (!draft || draft.action === 'skip') continue;

      if (draft.action === 'unavailable') {
        inputs.push({
          prescriptionItemId: itemState.prescriptionItemId,
          action: 'unavailable',
          note: draft.note,
        });
      } else {
        inputs.push({
          prescriptionItemId: itemState.prescriptionItemId,
          action: 'dispense',
          batchId: draft.batchId,
          quantity: Number(draft.quantity),
          note: draft.note,
        });
      }
    }

    const res = dispensePrescription(activeEncounterObj.encounter.id, inputs, dispenseSessionNotes);
    setConfirmDispenseOpen(false);
    if (!res.success) {
      setFeedback({ type: 'error', message: res.error || 'Dispensing failed.' });
      return;
    }

    setFeedback({
      type: 'success',
      message: `Dispensing Receipt ${res.record?.id} confirmed (${res.record?.status}) for ${activeEncounterObj.encounter.patientName}. Inventory & Patient Portal synchronized.`,
    });
    setActiveEncounterId(null);
  };

  const openReceiveBatchModal = (medicineId: string) => {
    const defaultExp = new Date();
    defaultExp.setDate(defaultExp.getDate() + 365);
    setReceiveModalMedId(medicineId);
    setReceiveForm({
      batchNumber: '',
      quantity: '100',
      expiryDate: defaultExp.toISOString().split('T')[0],
      purchaseDate: todayDate,
      supplierName: 'MedCore Institutional Distributors',
      supplierReference: `PO-${todayDate.replace(/-/g, '')}-${Math.floor(10 + Math.random() * 89)}`,
      stockLocation: 'Main Dispensary Rack A1',
      reason: '',
    });
  };

  const openReorderModal = (medicineId?: string) => {
    const targetMed =
      pharmacyMedicines.find((m) => m.id === medicineId) ||
      medicineSummaries.find((s) => s.stockStatus === 'Out of Stock' || s.stockStatus === 'Low Stock')?.medicine ||
      pharmacyMedicines[0];
    if (!targetMed) return;
    const sum = getMedicineStockSummary(targetMed, pharmacyBatches, todayDate);
    setReorderForm({
      medicineId: targetMed.id,
      requestedQuantity: String(Math.max(targetMed.minimumStockThreshold * 2, 100)),
      supplierName: 'MedCore Institutional Distributors',
      supplierReference: `PR-LOC-${Math.floor(100 + Math.random() * 899)}`,
      reason:
        sum.usableQuantity === 0
          ? 'Out of Stock'
          : sum.nearExpiryQuantity > 0
          ? 'Near Expiry Replacement'
          : 'Low Stock',
      notes: '',
      submitImmediately: false,
    });
    setIsReorderOpen(true);
  };

  const selectedMedSummary = selectedMedicineId
    ? medicineSummaries.find((s) => s.medicine.id === selectedMedicineId)
    : undefined;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Hospital Pharmacy &amp; Dispensary Operations
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
              Central Formulary
            </span>
            {canManage ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Dispense &amp; Stock Write Access
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                Read-Only Formulary View ({currentUser.role.toUpperCase()})
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Batch-tracked medicine inventory, FEFO expiry safety enforcement, and verified outpatient prescription dispensing connected to Doctor &amp; Patient workflows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!canManage && (
            <button
              onClick={() => switchRole('pharmacist')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold cursor-pointer transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Switch to Pharmacist Demo Role</span>
            </button>
          )}
          {canManage && (
            <>
              <button
                onClick={() => openReceiveBatchModal(pharmacyMedicines[0]?.id || '')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                <Package className="w-3.5 h-3.5 text-teal-600" />
                <span>Receive Stock Batch</span>
              </button>
              <button
                onClick={() => setIsAddMedOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b192e] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-teal-400" />
                <span>Add Medicine</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Role Simulation & Safety Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[11px] font-bold underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Pharmacy Notifications Strip */}
      {unreadPharmacyNotifs.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
              <Bell className="w-4 h-4 text-amber-600" />
              <span>Hospital Pharmacy Alerts ({unreadPharmacyNotifs.length} Unread)</span>
            </div>
            <span className="text-[10px] text-amber-800 font-medium">
              Scoped to Pharmacy Dispensary Staff
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {unreadPharmacyNotifs.slice(0, 4).map((notif) => (
              <div
                key={notif.id}
                className="p-2.5 rounded-xl bg-white border border-amber-200/80 flex items-start justify-between gap-2 text-[11px]"
              >
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-900">{notif.title}</p>
                  <p className="text-slate-600 leading-snug">{notif.message}</p>
                </div>
                <button
                  onClick={() => markNotificationRead(notif.id)}
                  className="text-[10px] font-bold text-teal-700 hover:underline shrink-0 cursor-pointer"
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div
          onClick={() => setSubTab('catalogue')}
          className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-teal-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Pill className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
              Formulary
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3">{kpis.activeCount}</p>
          <p className="text-[11px] text-slate-500 font-medium">
            Active Medicines ({kpis.totalCount} total)
          </p>
        </div>

        <div
          onClick={() => setSubTab('catalogue')}
          className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-blue-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              Usable
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3">
            {kpis.totalUsableUnits.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">Non-Expired Stock Units</p>
        </div>

        <div
          onClick={() => {
            setSubTab('catalogue');
            setCatStatusFilter('Low Stock');
          }}
          className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-amber-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              Threshold
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3">{kpis.lowOrOutCount}</p>
          <p className="text-[11px] text-slate-500 font-medium">Low / Out-of-Stock Items</p>
        </div>

        <div
          onClick={() => {
            setSubTab('batches');
            setBatchFilter('near-expiry');
          }}
          className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-rose-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold uppercase text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
              Expiry Risk
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3">
            {kpis.nearExpiryBatchesCount + kpis.expiredBatchesWithStock}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">
            {kpis.nearExpiryBatchesCount} Near-Exp • {kpis.expiredBatchesWithStock} Expired
          </p>
        </div>

        <div
          onClick={() => {
            setSubTab('dispense');
            setDispenseFilter('pending');
          }}
          className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-indigo-400 transition-all cursor-pointer col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
              Queue
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3">{kpis.pendingPrescriptions}</p>
          <p className="text-[11px] text-slate-500 font-medium">Prescriptions Pending Dispense</p>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/60 p-1.5 rounded-2xl text-xs font-semibold">
        {[
          { id: 'dispense' as const, label: `Dispensing Queue (${kpis.pendingPrescriptions})`, icon: ClipboardCheck },
          { id: 'catalogue' as const, label: `Medicine Catalogue (${pharmacyMedicines.length})`, icon: Pill },
          { id: 'batches' as const, label: `Batches & Expiry (${pharmacyBatches.length})`, icon: Package },
          { id: 'reorders' as const, label: `Purchase Requests (${pharmacyReorderRequests.length})`, icon: ShoppingCart },
          { id: 'transactions' as const, label: `Transactions Ledger (${pharmacyTransactions.length})`, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                active
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-teal-600' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================
          TAB 1: DISPENSING QUEUE
         ========================================================= */}
      {subTab === 'dispense' && (
        <div className="space-y-6">
          {/* Active Prescription Dispense Workspace */}
          {activeEncounterObj && (
            <div className="bg-white rounded-2xl border-2 border-teal-500/70 shadow-lg p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-teal-600 text-white">
                      Dispensing Worksheet
                    </span>
                    <h2 className="text-base font-bold text-slate-900">
                      Prescription {activeEncounterObj.encounter.id} — {activeEncounterObj.encounter.patientName}
                    </h2>
                    <span className="text-[11px] font-mono text-slate-500">
                      ({activeEncounterObj.encounter.patientId})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Prescribed by <strong>{activeEncounterObj.encounter.doctorName}</strong> on{' '}
                    <strong>{activeEncounterObj.encounter.date}</strong> • Diagnosis:{' '}
                    {activeEncounterObj.encounter.assessmentDiagnosis || activeEncounterObj.encounter.diagnosis}
                  </p>
                  {(() => {
                    const pat = patients.find((p) => p.id === activeEncounterObj.encounter.patientId);
                    if (pat?.allergies && pat.allergies.length > 0) {
                      return (
                        <p className="text-[11px] font-bold text-rose-700 mt-1">
                          Allergies Noted: {pat.allergies.join(', ')}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>

                <button
                  onClick={() => setActiveEncounterId(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!activeEncounterObj.summary.isEligibleForDispensing && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 font-semibold flex items-center gap-2">
                  <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{activeEncounterObj.summary.ineligibleReason}</span>
                </div>
              )}

              {/* Safety Rule Notice */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  <strong>Dispensing Safety:</strong> Medicines match strictly by generic/brand name + strength + dosage form. No automatic substitutions allowed. Expired batches are blocked. Stock is deducted only upon confirmation.
                </span>
              </div>

              <div className="space-y-3">
                {activeEncounterObj.summary.items.map((itemState) => {
                  const draft = lineDrafts[itemState.prescriptionItemId];
                  const match = matchPrescriptionItemToCatalogue(
                    itemState.item,
                    pharmacyMedicines,
                    false
                  );
                  const medSummary = match.matchedMedicine
                    ? getMedicineStockSummary(match.matchedMedicine, pharmacyBatches, todayDate)
                    : undefined;
                  const isLocked =
                    itemState.remainingQuantity <= 0 ||
                    itemState.item.status === 'Discontinued' ||
                    itemState.item.status === 'Draft';

                  return (
                    <div
                      key={itemState.prescriptionItemId}
                      className={`p-4 rounded-xl border text-xs space-y-3 ${
                        isLocked ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">
                              {itemState.item.drugName || itemState.item.medicineName}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              {itemState.itemStatus}
                            </span>
                            {match.matchedMedicine ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Exact Match: {match.matchedMedicine.genericName} {match.matchedMedicine.strength} ({match.matchedMedicine.dosageForm})
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                                {match.matchStatus === 'INACTIVE_MATCH'
                                  ? 'Formulary Inactive — Cannot Dispense'
                                  : 'No Active Formulary Match (Strength/Form)'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Dosage: <strong>{itemState.item.dosage}</strong> • Freq: <strong>{itemState.item.frequency}</strong> • Duration: <strong>{itemState.item.duration}</strong> • Route: <strong>{itemState.item.route || 'Oral'}</strong>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Prescribed: <strong>{itemState.prescribedQuantity}</strong> • Dispensed: <strong>{itemState.dispensedQuantity}</strong> • Remaining: <strong className="text-teal-700">{itemState.remainingQuantity}</strong>
                          </p>
                        </div>

                        {!isLocked && draft && (
                          <div className="flex items-center gap-1.5">
                            <select
                              aria-label={`Action for ${itemState.item.drugName}`}
                              value={draft.action}
                              onChange={(e) =>
                                setLineDrafts((prev) => ({
                                  ...prev,
                                  [itemState.prescriptionItemId]: {
                                    ...draft,
                                    action: e.target.value as 'dispense' | 'unavailable' | 'skip',
                                  },
                                }))
                              }
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-xs"
                            >
                              <option value="dispense" disabled={!medSummary || medSummary.usableBatches.length === 0}>
                                Dispense from Batch
                              </option>
                              <option value="unavailable">Mark Unavailable</option>
                              <option value="skip">Skip (Hold for Later)</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {!isLocked && draft && draft.action === 'dispense' && medSummary && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              Select Batch (FEFO Ordered)
                            </label>
                            <select
                              value={draft.batchId}
                              onChange={(e) => {
                                const bId = e.target.value;
                                const chosen = medSummary.usableBatches.find((b) => b.id === bId);
                                setLineDrafts((prev) => ({
                                  ...prev,
                                  [itemState.prescriptionItemId]: {
                                    ...draft,
                                    batchId: bId,
                                    quantity: chosen
                                      ? String(Math.min(itemState.remainingQuantity, chosen.availableQuantity))
                                      : draft.quantity,
                                  },
                                }));
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium"
                            >
                              {medSummary.usableBatches.length === 0 && (
                                <option value="">No usable non-expired batch</option>
                              )}
                              {medSummary.usableBatches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.batchNumber} — Qty: {b.availableQuantity} (Exp: {b.expiryDate})
                                </option>
                              ))}
                              {medSummary.expiredBatches.map((eb) => (
                                <option key={eb.id} value={eb.id} disabled>
                                  {eb.batchNumber} — EXPIRED {eb.expiryDate} (Qty: {eb.availableQuantity} BLOCKED)
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              Dispense Quantity (Max {itemState.remainingQuantity})
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={itemState.remainingQuantity}
                              value={draft.quantity}
                              onChange={(e) =>
                                setLineDrafts((prev) => ({
                                  ...prev,
                                  [itemState.prescriptionItemId]: {
                                    ...draft,
                                    quantity: e.target.value,
                                  },
                                }))
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              Dispensary Line Note
                            </label>
                            <input
                              type="text"
                              placeholder="Optional batch / partial note..."
                              value={draft.note}
                              onChange={(e) =>
                                setLineDrafts((prev) => ({
                                  ...prev,
                                  [itemState.prescriptionItemId]: {
                                    ...draft,
                                    note: e.target.value,
                                  },
                                }))
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                            />
                          </div>
                        </div>
                      )}

                      {!isLocked && draft && draft.action === 'unavailable' && (
                        <div className="pt-2 border-t border-slate-100">
                          <label className="block text-[10px] font-bold text-rose-700 mb-1">
                            Unavailability Reason (Visible to Doctor &amp; Patient)
                          </label>
                          <input
                            type="text"
                            value={draft.note}
                            onChange={(e) =>
                              setLineDrafts((prev) => ({
                                ...prev,
                                [itemState.prescriptionItemId]: {
                                  ...draft,
                                  note: e.target.value,
                                },
                              }))
                            }
                            placeholder="e.g. Out of stock in hospital dispensary; doctor review needed"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50/40 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {activeEncounterObj.summary.isEligibleForDispensing && canDispense && (
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Overall Dispensing Notes
                    </label>
                    <input
                      type="text"
                      value={dispenseSessionNotes}
                      onChange={(e) => setDispenseSessionNotes(e.target.value)}
                      placeholder="e.g. Verified patient MRN & allergies; partial supply issued pending restock"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>

                  {!confirmDispenseOpen ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveEncounterId(null)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDispenseOpen(true)}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Review &amp; Confirm Dispense</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-teal-50 border border-teal-300 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-teal-950">
                        <p className="font-bold">Final Pharmacy Verification</p>
                        <p className="text-[11px] text-teal-800">
                          Confirming will deduct selected quantities from hospital batches and log an immutable dispensing record under <strong>{currentUser.name}</strong>.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDispenseOpen(false)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmDispense}
                          className="px-4 py-1.5 rounded-lg bg-[#0b192e] hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                        >
                          Confirm &amp; Deduct Stock
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Queue Filter & List */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'pending' as const, label: 'Pending / Partial' },
                  { id: 'dispensed' as const, label: 'Fully Dispensed' },
                  { id: 'all' as const, label: 'All Prescriptions' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setDispenseFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                      dispenseFilter === f.id
                        ? 'bg-[#0b192e] text-white border-slate-900'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search prescription ID, patient, doctor..."
                  value={dispenseSearch}
                  onChange={(e) => setDispenseSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredQueue.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No prescriptions match the selected dispensing filter.
                </div>
              ) : (
                filteredQueue.map(({ encounter, summary }) => {
                  const rxStatus = encounter.prescriptionStatus || (encounter.status === 'Draft' ? 'Draft' : 'Active');
                  const statusBadge =
                    summary.overallStatus === 'Fully Dispensed'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : summary.overallStatus === 'Partially Dispensed'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : summary.overallStatus === 'Unavailable'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-blue-50 text-blue-800 border-blue-200';

                  return (
                    <div
                      key={encounter.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-slate-900">{encounter.id}</span>
                          <span className="font-bold text-sm text-slate-900">{encounter.patientName}</span>
                          <span className="text-[11px] font-mono text-slate-500">({encounter.patientId})</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge}`}>
                            {summary.overallStatus}
                          </span>
                          {(rxStatus === 'Draft' || rxStatus === 'Discontinued') && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-200">
                              Rx: {rxStatus} (Dispense Blocked)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600">
                          {encounter.doctorName} • Date: <strong>{encounter.date}</strong> •{' '}
                          {encounter.prescriptions.length} medicine(s)
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {summary.items.map((it) => (
                            <span
                              key={it.prescriptionItemId}
                              className="text-[10px] px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700"
                            >
                              {it.item.drugName || it.item.medicineName} ({it.dispensedQuantity}/{it.prescribedQuantity})
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {canDispense ? (
                          <button
                            onClick={() => openEncounterForDispense(encounter)}
                            disabled={!summary.isEligibleForDispensing}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                              summary.isEligibleForDispensing
                                ? 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer shadow-xs'
                                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            <span>
                              {summary.overallStatus === 'Fully Dispensed'
                                ? 'Already Dispensed'
                                : !summary.isEligibleForDispensing
                                ? 'Dispensing Locked'
                                : summary.overallStatus === 'Partially Dispensed'
                                ? 'Dispense Remaining'
                                : 'Process Dispense'}
                            </span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-500">
                            Pharmacist Action Required
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Dispensing Receipts */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-3 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              <span>Confirmed Dispensing Receipts ({pharmacyDispensingRecords.length})</span>
            </h3>
            <div className="space-y-2.5">
              {pharmacyDispensingRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-900">{rec.id}</span>
                      <span className="font-bold text-teal-800">{rec.encounterId}</span>
                      <span className="text-slate-700 font-semibold">{rec.patientName}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {rec.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Dispensed by <strong>{rec.dispensedByStaffName}</strong> on{' '}
                      {new Date(rec.dispensedAt).toLocaleString()}
                      {rec.notes ? ` • Note: ${rec.notes}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {rec.items.map((it) => (
                        <span
                          key={it.prescriptionItemId}
                          className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700"
                        >
                          {it.requestedMedicineName}: {it.dispensedQuantity} issued
                          {it.batchNumber ? ` [Batch ${it.batchNumber}]` : ''} ({it.status})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: MEDICINE CATALOGUE & STOCK
         ========================================================= */}
      {subTab === 'catalogue' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search generic, brand, strength, category, manufacturer..."
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={catCategoryFilter}
                onChange={(e) => setCatCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
              >
                <option value="ALL">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={catStatusFilter}
                onChange={(e) => setCatStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
              >
                <option value="ALL">All Stock Status</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-3">Medicine (Generic / Brand)</th>
                  <th className="py-3 px-3">Strength &amp; Form</th>
                  <th className="py-3 px-3">Category &amp; Storage</th>
                  <th className="py-3 px-3">Usable Stock</th>
                  <th className="py-3 px-3">Min Threshold</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCatalogue.map((summary) => {
                  const { medicine, usableQuantity, expiredQuantity, nearExpiryQuantity, stockStatus } = summary;
                  const badgeCls =
                    stockStatus === 'In Stock'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : stockStatus === 'Low Stock'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : stockStatus === 'Out of Stock'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200';

                  return (
                    <tr key={medicine.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">
                          {medicine.genericName}
                          {medicine.brandName ? (
                            <span className="text-slate-500 font-medium"> ({medicine.brandName})</span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-slate-500">{medicine.manufacturer}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-800">{medicine.strength}</span>
                        <span className="ml-1.5 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {medicine.dosageForm}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{medicine.category}</div>
                        <div className="text-[10px] text-slate-500">{medicine.storageRequirements}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-900">
                          {usableQuantity} <span className="font-medium text-slate-500">{medicine.unitOfMeasurement}</span>
                        </div>
                        {nearExpiryQuantity > 0 && (
                          <div className="text-[10px] text-amber-700 font-semibold">
                            {nearExpiryQuantity} near expiry
                          </div>
                        )}
                        {expiredQuantity > 0 && (
                          <div className="text-[10px] text-rose-700 font-bold">
                            {expiredQuantity} expired (blocked)
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {editingThresholdMedId === medicine.id && canManage ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              value={thresholdDraft}
                              onChange={(e) => setThresholdDraft(e.target.value)}
                              className="w-16 px-2 py-1 rounded border border-slate-300 text-xs"
                            />
                            <button
                              onClick={() => {
                                const res = updatePharmacyMedicineThreshold(medicine.id, Number(thresholdDraft));
                                setEditingThresholdMedId(null);
                                if (!res.success) {
                                  setFeedback({ type: 'error', message: res.error || 'Failed to update threshold.' });
                                } else {
                                  setFeedback({ type: 'success', message: `Updated minimum threshold for ${medicine.genericName}.` });
                                }
                              }}
                              className="px-2 py-1 rounded bg-teal-600 text-white text-[10px] font-bold cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700">{medicine.minimumStockThreshold}</span>
                            {canManage && (
                              <button
                                onClick={() => {
                                  setEditingThresholdMedId(medicine.id);
                                  setThresholdDraft(String(medicine.minimumStockThreshold));
                                }}
                                className="text-[10px] text-teal-700 hover:underline cursor-pointer"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeCls}`}>
                          {stockStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => setSelectedMedicineId(medicine.id)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 cursor-pointer"
                          >
                            Batches ({summary.usableBatches.length + summary.expiredBatches.length})
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => openReceiveBatchModal(medicine.id)}
                                className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-semibold cursor-pointer"
                              >
                                + Receive
                              </button>
                              {(stockStatus === 'Low Stock' || stockStatus === 'Out of Stock' || nearExpiryQuantity > 0) && (
                                <button
                                  onClick={() => openReorderModal(medicine.id)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold cursor-pointer"
                                >
                                  Reorder
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  const res = togglePharmacyMedicineStatus(medicine.id);
                                  if (res.success) {
                                    setFeedback({
                                      type: 'success',
                                      message: `Updated ${medicine.genericName} ${medicine.strength} formulary status.`,
                                    });
                                  }
                                }}
                                className="px-2 py-1 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                              >
                                {medicine.status === 'Active' ? 'Deactivate' : 'Activate'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: BATCHES & EXPIRY MONITOR
         ========================================================= */}
      {subTab === 'batches' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all' as const, label: 'All Batches' },
                { id: 'near-expiry' as const, label: 'Near Expiry (<= 60d)' },
                { id: 'expired' as const, label: 'Expired (Blocked)' },
                { id: 'depleted' as const, label: 'Zero Stock' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setBatchFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                    batchFilter === f.id
                      ? 'bg-[#0b192e] text-white border-slate-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search batch #, medicine, rack, supplier..."
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-3">Batch # &amp; Location</th>
                  <th className="py-3 px-3">Medicine</th>
                  <th className="py-3 px-3">Supplier &amp; Ref</th>
                  <th className="py-3 px-3">Purchase / Expiry</th>
                  <th className="py-3 px-3">Available Qty</th>
                  <th className="py-3 px-3">Batch Health</th>
                  {canManage && <th className="py-3 px-3 text-right">Stock Controls</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBatches.map(({ batch, med, expired, nearExp, daysLeft }) => {
                  const healthBadge = expired
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : nearExp
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200';

                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-slate-900">{batch.batchNumber}</div>
                        <div className="text-[10px] text-slate-500">{batch.stockLocation}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">
                          {med ? `${med.genericName} ${med.strength}` : batch.medicineId}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {med?.brandName ? `${med.brandName} • ` : ''}
                          {med?.dosageForm}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-700 font-medium">{batch.supplierName}</div>
                        <div className="text-[10px] font-mono text-slate-500">{batch.supplierReference}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-[11px] text-slate-500">Purchased: {batch.purchaseDate}</div>
                        <div className={`font-bold ${expired ? 'text-rose-700' : nearExp ? 'text-amber-800' : 'text-slate-800'}`}>
                          Exp: {batch.expiryDate} ({daysLeft >= 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d ago`})
                        </div>
                      </td>
                      <td className="py-3 px-3 font-extrabold text-slate-900">
                        {batch.availableQuantity} <span className="font-normal text-slate-500">{batch.unitOfMeasurement}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${healthBadge}`}>
                          {expired ? 'Expired (Blocked)' : nearExp ? 'Near Expiry' : 'Healthy'}
                        </span>
                      </td>
                      {canManage && (
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!expired && (
                              <button
                                onClick={() => {
                                  setAdjustModalBatch({ batch, mode: 'add' });
                                  setAdjustDelta('50');
                                  setAdjustReason('Additional boxes received into existing batch');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-semibold cursor-pointer"
                              >
                                + Add
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setAdjustModalBatch({ batch, mode: 'adjust' });
                                setAdjustDelta('-1');
                                setAdjustReason('');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold cursor-pointer"
                            >
                              Adjust
                            </button>
                            {expired && batch.availableQuantity > 0 && (
                              <button
                                onClick={() => {
                                  const res = adjustPharmacyBatchStock({
                                    batchId: batch.id,
                                    quantityDelta: -batch.availableQuantity,
                                    reason: `Expiry Write-Off (Expired ${batch.expiryDate})`,
                                    transactionType: 'Expiry Write-Off',
                                  });
                                  setFeedback({
                                    type: res.success ? 'success' : 'error',
                                    message: res.success
                                      ? `Wrote off ${batch.availableQuantity} expired units from batch ${batch.batchNumber}.`
                                      : res.error || 'Write-off failed.',
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold cursor-pointer"
                              >
                                Write Off
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 4: LOCAL PURCHASE REQUESTS / REORDER DRAFTS
         ========================================================= */}
      {subTab === 'reorders' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-xs">
          <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <Building2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Local Reorder Drafts &amp; Purchase Requests Only</p>
                <p className="text-[11px] text-blue-800">
                  Requests created here are stored locally inside HealthRoute for hospital procurement coordination. No real external supplier orders or EDI transmissions are placed.
                </p>
              </div>
            </div>
            {canManage && (
              <button
                onClick={() => openReorderModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0b192e] hover:bg-slate-800 text-white text-xs font-bold cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-teal-400" />
                <span>Create Reorder Draft</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {pharmacyReorderRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-slate-900">{req.id}</span>
                    <span className="font-bold text-sm text-slate-900">
                      {req.genericName} {req.strength} ({req.dosageForm})
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        req.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : req.status === 'Submitted Purchase Request'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : req.status === 'Cancelled'
                          ? 'bg-slate-100 text-slate-500 border-slate-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {req.status}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                      {req.reason}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    Requested Qty: <strong className="text-slate-900">{req.requestedQuantity}</strong> • Current Usable Stock:{' '}
                    <strong>{req.currentUsableStock}</strong> (Threshold: {req.minimumThreshold}) • Supplier:{' '}
                    <strong>{req.supplierName}</strong>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Created by {req.createdBy} on {new Date(req.createdAt).toLocaleString()}
                    {req.notes ? ` • ${req.notes}` : ''}
                  </p>
                </div>

                {canManage && req.status !== 'Cancelled' && req.status !== 'Approved' && (
                  <div className="flex items-center gap-2 shrink-0">
                    {req.status === 'Draft' && (
                      <button
                        onClick={() => updatePharmacyReorderStatus(req.id, 'Submitted Purchase Request')}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold cursor-pointer"
                      >
                        Submit Request
                      </button>
                    )}
                    {req.status === 'Submitted Purchase Request' && (
                      <button
                        onClick={() => updatePharmacyReorderStatus(req.id, 'Approved')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                      >
                        Approve Locally
                      </button>
                    )}
                    <button
                      onClick={() => updatePharmacyReorderStatus(req.id, 'Cancelled')}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-[11px] font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 5: STOCK TRANSACTIONS & AUDIT LEDGER
         ========================================================= */}
      {subTab === 'transactions' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transactions by medicine, batch, staff, Rx ID, reason..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <select
              value={txTypeFilter}
              onChange={(e) => setTxTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium"
            >
              <option value="ALL">All Transaction Types</option>
              {TRANSACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Medicine &amp; Batch</th>
                  <th className="py-2.5 px-3">Delta / Stock</th>
                  <th className="py-2.5 px-3">Staff &amp; Role</th>
                  <th className="py-2.5 px-3">Reason &amp; Prescription Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 whitespace-nowrap">
                        {tx.transactionType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{tx.medicineName}</div>
                      {tx.batchNumber && (
                        <div className="text-[10px] font-mono text-slate-500">Batch: {tx.batchNumber}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`font-extrabold ${
                          tx.quantityDelta > 0
                            ? 'text-emerald-700'
                            : tx.quantityDelta < 0
                            ? 'text-rose-700'
                            : 'text-slate-600'
                        }`}
                      >
                        {tx.quantityDelta > 0 ? `+${tx.quantityDelta}` : tx.quantityDelta}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1.5 font-mono">
                        ({tx.previousQuantity} → {tx.newQuantity})
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800">{tx.staffName}</div>
                      <div className="text-[10px] uppercase text-slate-500">{tx.staffRole}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div>{tx.reason}</div>
                      {tx.relatedPrescriptionId && (
                        <div className="text-[10px] font-mono text-teal-700">
                          Rx: {tx.relatedPrescriptionId} {tx.patientName ? `• ${tx.patientName}` : ''}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: MEDICINE DETAIL & BATCH HISTORY
         ========================================================= */}
      {selectedMedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-[#0b192e] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {selectedMedSummary.medicine.genericName} {selectedMedSummary.medicine.strength} (
                  {selectedMedSummary.medicine.dosageForm})
                </h3>
                <p className="text-xs text-slate-300">
                  {selectedMedSummary.medicine.brandName ? `Brand: ${selectedMedSummary.medicine.brandName} • ` : ''}
                  {selectedMedSummary.medicine.manufacturer} • {selectedMedSummary.medicine.category}
                </p>
              </div>
              <button
                onClick={() => setSelectedMedicineId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Usable Stock</span>
                  <span className="text-lg font-extrabold text-slate-900">
                    {selectedMedSummary.usableQuantity} {selectedMedSummary.medicine.unitOfMeasurement}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Min Threshold</span>
                  <span className="text-lg font-extrabold text-slate-900">
                    {selectedMedSummary.medicine.minimumStockThreshold}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Storage</span>
                  <span className="font-semibold text-slate-700">
                    {selectedMedSummary.medicine.storageRequirements || 'Standard Room Temp'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Batches for this Medicine</h4>
                {pharmacyBatches
                  .filter((b) => b.medicineId === selectedMedSummary.medicine.id)
                  .map((b) => {
                    const exp = isBatchExpired(b.expiryDate, todayDate);
                    return (
                      <div
                        key={b.id}
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          exp ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <p className="font-mono font-bold text-slate-900">
                            {b.batchNumber} ({b.stockLocation})
                          </p>
                          <p className="text-[11px] text-slate-600">
                            Supplier: {b.supplierName} ({b.supplierReference}) • Purchased: {b.purchaseDate} • Exp:{' '}
                            <strong className={exp ? 'text-rose-700' : 'text-slate-900'}>{b.expiryDate}</strong>
                          </p>
                        </div>
                        <span className="font-extrabold text-sm text-slate-900">
                          {b.availableQuantity} {b.unitOfMeasurement}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: ADD NEW MEDICINE TO CATALOGUE
         ========================================================= */}
      {isAddMedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="px-5 py-4 bg-[#0b192e] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Add New Medicine to Hospital Formulary</h3>
              <button onClick={() => setIsAddMedOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const res = addPharmacyMedicine({
                  genericName: newMedForm.genericName,
                  brandName: newMedForm.brandName,
                  strength: newMedForm.strength,
                  dosageForm: newMedForm.dosageForm,
                  manufacturer: newMedForm.manufacturer,
                  category: newMedForm.category,
                  storageRequirements: newMedForm.storageRequirements,
                  unitOfMeasurement: newMedForm.unitOfMeasurement,
                  minimumStockThreshold: Number(newMedForm.minimumStockThreshold),
                });
                if (!res.success) {
                  setFeedback({ type: 'error', message: res.error || 'Could not add medicine.' });
                  return;
                }
                setFeedback({
                  type: 'success',
                  message: `Added ${res.medicine?.genericName} ${res.medicine?.strength} (${res.medicine?.dosageForm}) to catalogue.`,
                });
                setIsAddMedOpen(false);
                setNewMedForm({
                  genericName: '',
                  brandName: '',
                  strength: '',
                  dosageForm: 'Tablet',
                  manufacturer: '',
                  category: 'Cardiovascular',
                  storageRequirements: 'Store below 25°C in a dry place',
                  unitOfMeasurement: 'Tablets',
                  minimumStockThreshold: '50',
                });
              }}
              className="p-5 space-y-3 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Generic Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Amlodipine"
                    value={newMedForm.genericName}
                    onChange={(e) => setNewMedForm((p) => ({ ...p, genericName: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Amlong"
                    value={newMedForm.brandName}
                    onChange={(e) => setNewMedForm((p) => ({ ...p, brandName: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Strength *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. 5 mg"
                    value={newMedForm.strength}
                    onChange={(e) => setNewMedForm((p) => ({ ...p, strength: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dosage Form *</label>
                  <select
                    value={newMedForm.dosageForm}
                    onChange={(e) => setNewMedForm((p) => ({ ...p, dosageForm: e.target.value as PharmacyDosageForm }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  >
                    {DOSAGE_FORMS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Manufacturer *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Micro Labs"
                    value={newMedForm.manufacturer}
                    onChange={(e) => setNewMedForm((p) => ({ ...p, manufacturer: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Cardiovascular"
                    value={newMedForm.category}
                    onChange={(e) => setNewMedForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit of Measurement</label>
                  <input
                    type="text"
                    value={newMedForm.unitOfMeasurement}
                    onChange={(e) => setNewMedForm((p) => ({ ...p, unitOfMeasurement: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Minimum Stock Threshold *</label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={newMedForm.minimumStockThreshold}
                    onChange={(e) => setNewMedForm((p) => ({ ...p, minimumStockThreshold: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Storage Requirements</label>
                <input
                  type="text"
                  value={newMedForm.storageRequirements}
                  onChange={(e) => setNewMedForm((p) => ({ ...p, storageRequirements: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMedOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer"
                >
                  Save Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: RECEIVE NEW BATCH
         ========================================================= */}
      {receiveModalMedId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="px-5 py-4 bg-[#0b192e] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Receive New Pharmacy Stock Batch</h3>
              <button onClick={() => setReceiveModalMedId(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const res = receivePharmacyBatchStock({
                  medicineId: receiveModalMedId,
                  batchNumber: receiveForm.batchNumber,
                  quantity: Number(receiveForm.quantity),
                  expiryDate: receiveForm.expiryDate,
                  purchaseDate: receiveForm.purchaseDate,
                  supplierName: receiveForm.supplierName,
                  supplierReference: receiveForm.supplierReference,
                  stockLocation: receiveForm.stockLocation,
                  reason: receiveForm.reason,
                });
                if (!res.success) {
                  setFeedback({ type: 'error', message: res.error || 'Could not receive stock batch.' });
                  return;
                }
                setFeedback({
                  type: 'success',
                  message: `Received ${res.batch?.availableQuantity} units under Batch ${res.batch?.batchNumber}.`,
                });
                setReceiveModalMedId(null);
              }}
              className="p-5 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Formulary Medicine *</label>
                <select
                  value={receiveModalMedId}
                  onChange={(e) => setReceiveModalMedId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                >
                  {pharmacyMedicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.genericName} {m.strength} ({m.dosageForm}) {m.brandName ? `— ${m.brandName}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batch Number *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. SUN-TEL-269"
                    value={receiveForm.batchNumber}
                    onChange={(e) => setReceiveForm((p) => ({ ...p, batchNumber: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity Received *</label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={receiveForm.quantity}
                    onChange={(e) => setReceiveForm((p) => ({ ...p, quantity: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Date *</label>
                  <input
                    required
                    type="date"
                    value={receiveForm.purchaseDate}
                    onChange={(e) => setReceiveForm((p) => ({ ...p, purchaseDate: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Date * (Must be after today)</label>
                  <input
                    required
                    type="date"
                    value={receiveForm.expiryDate}
                    onChange={(e) => setReceiveForm((p) => ({ ...p, expiryDate: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier Name *</label>
                  <input
                    required
                    type="text"
                    value={receiveForm.supplierName}
                    onChange={(e) => setReceiveForm((p) => ({ ...p, supplierName: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier Reference / Invoice</label>
                  <input
                    type="text"
                    value={receiveForm.supplierReference}
                    onChange={(e) => setReceiveForm((p) => ({ ...p, supplierReference: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dispensary Storage Location *</label>
                <input
                  required
                  type="text"
                  value={receiveForm.stockLocation}
                  onChange={(e) => setReceiveForm((p) => ({ ...p, stockLocation: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReceiveModalMedId(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer"
                >
                  Confirm Stock Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: ADJUST EXISTING BATCH STOCK (Mandatory Reason)
         ========================================================= */}
      {adjustModalBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-[#0b192e] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {adjustModalBatch.mode === 'add' ? 'Add Stock to Existing Batch' : 'Manual Stock Adjustment'} —{' '}
                {adjustModalBatch.batch.batchNumber}
              </h3>
              <button onClick={() => setAdjustModalBatch(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const res = adjustPharmacyBatchStock({
                  batchId: adjustModalBatch.batch.id,
                  quantityDelta: Number(adjustDelta),
                  reason: adjustReason,
                  transactionType: adjustModalBatch.mode === 'add' ? 'Batch Addition' : 'Stock Adjustment',
                });
                if (!res.success) {
                  setFeedback({ type: 'error', message: res.error || 'Stock adjustment rejected.' });
                  return;
                }
                setFeedback({
                  type: 'success',
                  message: `Updated Batch ${adjustModalBatch.batch.batchNumber} by ${adjustDelta} units.`,
                });
                setAdjustModalBatch(null);
              }}
              className="p-5 space-y-3 text-xs"
            >
              <p className="text-slate-600">
                Current Available Quantity:{' '}
                <strong className="text-slate-900">
                  {adjustModalBatch.batch.availableQuantity} {adjustModalBatch.batch.unitOfMeasurement}
                </strong>
              </p>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quantity Change (+/-) * (Negative stock prohibited)
                </label>
                <input
                  required
                  type="number"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mandatory Adjustment Reason *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Damaged blister strip removed during cycle count"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 resize-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalBatch(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0b192e] hover:bg-slate-800 text-white font-bold cursor-pointer"
                >
                  Apply Stock Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: CREATE LOCAL REORDER DRAFT
         ========================================================= */}
      {isReorderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 bg-[#0b192e] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Create Local Purchase Request Draft</h3>
              <button onClick={() => setIsReorderOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const res = createPharmacyReorderRequest({
                  medicineId: reorderForm.medicineId,
                  requestedQuantity: Number(reorderForm.requestedQuantity),
                  supplierName: reorderForm.supplierName,
                  supplierReference: reorderForm.supplierReference,
                  reason: reorderForm.reason,
                  notes: reorderForm.notes,
                  submitImmediately: reorderForm.submitImmediately,
                });
                if (!res.success) {
                  setFeedback({ type: 'error', message: res.error || 'Could not create reorder request.' });
                  return;
                }
                setFeedback({
                  type: 'success',
                  message: `Created local ${res.request?.status} (${res.request?.id}) for ${res.request?.genericName}.`,
                });
                setIsReorderOpen(false);
                setSubTab('reorders');
              }}
              className="p-5 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Medicine *</label>
                <select
                  value={reorderForm.medicineId}
                  onChange={(e) => setReorderForm((p) => ({ ...p, medicineId: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                >
                  {medicineSummaries.map((s) => (
                    <option key={s.medicine.id} value={s.medicine.id}>
                      {s.medicine.genericName} {s.medicine.strength} ({s.medicine.dosageForm}) — Usable: {s.usableQuantity} [{s.stockStatus}]
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Requested Quantity *</label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={reorderForm.requestedQuantity}
                    onChange={(e) => setReorderForm((p) => ({ ...p, requestedQuantity: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reason *</label>
                  <select
                    value={reorderForm.reason}
                    onChange={(e) => setReorderForm((p) => ({ ...p, reason: e.target.value as any }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="Low Stock">Low Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                    <option value="Near Expiry Replacement">Near Expiry Replacement</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supplier Name *</label>
                <input
                  required
                  type="text"
                  value={reorderForm.supplierName}
                  onChange={(e) => setReorderForm((p) => ({ ...p, supplierName: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Internal procurement note (no external order sent)"
                  value={reorderForm.notes}
                  onChange={(e) => setReorderForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                />
              </div>
              <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={reorderForm.submitImmediately}
                  onChange={(e) => setReorderForm((p) => ({ ...p, submitImmediately: e.target.checked }))}
                />
                <span>Mark immediately as Submitted Purchase Request (Local Workflow)</span>
              </label>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReorderOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer"
                >
                  Save Local Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
