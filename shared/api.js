import { 
  INITIAL_BRANCHES, 
  INITIAL_PARTIES, 
  INITIAL_VEHICLE_OWNERS, 
  INITIAL_TRUCKS, 
  INITIAL_DRIVERS, 
  INITIAL_LRS,
  INITIAL_TRIPS,
  INITIAL_MANIFESTS,
  INITIAL_RATES
} from './mockDb';
import { USERS } from './users';
import { isTruckAvailable, isDriverAvailable } from './fleetAvailability';

const BASE_URL = (typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' || 
  window.location.hostname.startsWith('192.168.') || 
  window.location.hostname.startsWith('10.') ||
  (window.location.port && window.location.port !== '80' && window.location.port !== '443')
)) ? `http://${window.location.hostname || 'localhost'}:3001/api` : '/api';

const handleResponse = async (response) => {
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const error = new Error(err.error || `HTTP error! status: ${response.status}`);
    error.status = response.status;
    error.data = err;
    throw error;
  }
  return response.json();
};

// ── MAPPING HELPERS (Resilient to both snake_case & camelCase) ──
const mapTruck = (t) => {
  if (!t) return null;
  return {
    ...t,
    regNo: t.reg_no !== undefined ? t.reg_no : t.regNo,
    capacityKg: t.capacity_kg !== undefined ? Number(t.capacity_kg) : (t.capacityKg || 0),
    ownerId: t.owner_id !== undefined ? t.owner_id : t.ownerId,
    expiryRC: t.expiry_rc ? t.expiry_rc.split('T')[0] : (t.expiryRC || ''),
    expiryIns: t.expiry_ins ? t.expiry_ins.split('T')[0] : (t.expiryIns || ''),
    bodyType: t.body_type !== undefined ? t.body_type : (t.bodyType || 'Container'),
    size: t.size !== undefined ? t.size : (t.size || '19 Ft'),
    cft: t.cft !== undefined ? Number(t.cft) : (Number(t.cft) || 900),
    maxBoxes: t.max_boxes !== undefined ? Number(t.max_boxes) : (Number(t.maxBoxes) || 180),
    expiryFC: t.expiry_fc ? t.expiry_fc.split('T')[0] : (t.expiryFC || ''),
    expiryPUC: t.expiry_puc ? t.expiry_puc.split('T')[0] : (t.expiryPUC || ''),
    expiryRoadTax: t.expiry_road_tax ? t.expiry_road_tax.split('T')[0] : (t.expiryRoadTax || ''),
    chassisNo: t.chassis_no !== undefined ? t.chassis_no : (t.chassisNo || ''),
    engineNo: t.engine_no !== undefined ? t.engine_no : (t.engineNo || ''),
    fastagId: t.fastag_id !== undefined ? t.fastag_id : (t.fastagId || ''),
    fastagBalance: t.fastag_balance !== undefined ? Number(t.fastag_balance) : (t.fastagBalance || 0),
    gpsImei: t.gps_imei !== undefined ? t.gps_imei : (t.gpsImei || ''),
    currentOdo: t.current_odo !== undefined ? Number(t.current_odo) : (t.currentOdo || 0),
    fuelEfficiency: t.fuel_efficiency !== undefined ? Number(t.fuel_efficiency) : (t.fuelEfficiency || 0),
    yearManufacture: t.year_manufacture !== undefined ? Number(t.year_manufacture) : (t.yearManufacture || 2020),
    fcDocUrl: t.fc_doc_url !== undefined ? t.fc_doc_url : (t.fcDocUrl || ''),
    pucDocUrl: t.puc_doc_url !== undefined ? t.puc_doc_url : (t.pucDocUrl || ''),
    roadTaxDocUrl: t.road_tax_doc_url !== undefined ? t.road_tax_doc_url : (t.roadTaxDocUrl || ''),
  };
};

const mapDriver = (d) => {
  if (!d) return null;
  return {
    ...d,
    licenceNo: d.licence_no !== undefined ? d.licence_no : d.licenceNo,
    licenceExp: d.licence_exp ? d.licence_exp.split('T')[0] : (d.licenceExp || ''),
    otpStatus: d.otp_status !== undefined ? d.otp_status : d.otpStatus,
    aadhaarNo: d.aadhaar_no !== undefined ? d.aadhaar_no : (d.aadhaarNo || ''),
    emergencyName: d.emergency_name !== undefined ? d.emergency_name : (d.emergencyName || ''),
    emergencyPhone: d.emergency_phone !== undefined ? d.emergency_phone : (d.emergencyPhone || ''),
    bloodGroup: d.blood_group !== undefined ? d.blood_group : (d.bloodGroup || ''),
    bgvStatus: d.bgv_status !== undefined ? d.bgv_status : (d.bgvStatus || 'Pending'),
    bankAccNo: d.bank_acc_no !== undefined ? d.bank_acc_no : (d.bankAccNo || ''),
    bankIfsc: d.bank_ifsc !== undefined ? d.bank_ifsc : (d.bankIfsc || ''),
    upiId: d.upi_id !== undefined ? d.upi_id : (d.upiId || ''),
    panNo: d.pan_no !== undefined ? d.pan_no : (d.panNo || ''),
    experienceYears: d.experience_years !== undefined ? Number(d.experience_years) : (d.experienceYears || 0),
    preferredRoutes: d.preferred_routes !== undefined ? d.preferred_routes : (d.preferredRoutes || ''),
    rating: d.rating !== undefined ? Number(d.rating) : (d.rating || 5.0),
    aadhaarDocUrl: d.aadhaar_doc_url !== undefined ? d.aadhaar_doc_url : (d.aadhaarDocUrl || ''),
    panDocUrl: d.pan_doc_url !== undefined ? d.pan_doc_url : (d.panDocUrl || ''),
    licenceDocUrl: d.licence_doc_url !== undefined ? d.licence_doc_url : (d.licenceDocUrl || ''),
  };
};

const mapLR = (l) => {
  if (!l) return null;
  const articles = Number(l.articles || 0);
  const cftPerBox = l.cft_per_box !== undefined ? Number(l.cft_per_box) : (l.cftPerBox !== undefined ? Number(l.cftPerBox) : 5);
  const totalCft = l.total_cft !== undefined ? Number(l.total_cft) : (l.totalCft !== undefined ? Number(l.totalCft) : (articles * cftPerBox));

  return {
    ...l,
    lrNo: l.lr_no !== undefined ? l.lr_no : l.lrNo,
    bookingBranch: l.booking_branch !== undefined ? l.booking_branch : l.bookingBranch,
    consignor: l.consignor || (l.consignor_id !== undefined ? l.consignor_id : l.consignor),
    consignee: l.consignee || (l.consignee_id !== undefined ? l.consignee_id : l.consignee),
    actualWt: l.actual_wt !== undefined ? Number(l.actual_wt) : (l.actualWt || 0),
    chargeWt: l.charge_wt !== undefined ? Number(l.charge_wt) : (l.chargeWt || 0),
    cftPerBox: cftPerBox,
    totalCft: totalCft,
    boxSizeType: l.box_size_type || l.boxSizeType || 'Medium',
    privateMark: l.private_mark !== undefined ? l.private_mark : l.privateMark,
    saidToContain: l.said_to_contain !== undefined ? l.said_to_contain : l.saidToContain,
    freightTerms: l.freight_terms !== undefined ? l.freight_terms : l.freightTerms,
    ewayBill: l.eway_bill !== undefined ? l.eway_bill : l.ewayBill,
    freightAmt: l.freight_amt !== undefined ? Number(l.freight_amt) : (l.freightAmt || 0),
    manifestId: l.manifest_id !== undefined ? l.manifest_id : l.manifestId,
    warehouseBin: l.warehouse_bin !== undefined ? l.warehouse_bin : l.warehouseBin,
    physicalPodReceived: l.physical_pod_received !== undefined ? l.physical_pod_received : l.physicalPodReceived,
    podUrl: l.pod_url !== undefined ? l.pod_url : l.podUrl,
    date: l.date ? l.date.split('T')[0] : '',
    brokerId: l.broker_id !== undefined ? l.broker_id : (l.brokerId || null),
    brokerName: l.broker_name !== undefined ? l.broker_name : (l.brokerName || null),
    brokerCommission: l.broker_commission !== undefined ? Number(l.broker_commission) : (l.brokerCommission !== undefined ? Number(l.brokerCommission) : 0),
    brokerCommissionType: l.broker_commission_type || l.brokerCommissionType || 'percent',
    brokerCommissionRate: l.broker_commission_rate !== undefined ? Number(l.broker_commission_rate) : (l.brokerCommissionRate !== undefined ? Number(l.brokerCommissionRate) : 0),
    vehicleNo: l.vehicle_no !== undefined ? l.vehicle_no : (l.vehicleNo || '')
  };
};

const mapFeedback = (f) => {
  if (!f) return null;
  return {
    id: f.id,
    userId: f.user_id !== undefined ? f.user_id : f.userId,
    userName: f.user_name !== undefined ? f.user_name : f.userName,
    type: f.type,
    priority: f.priority,
    subject: f.subject,
    message: f.message,
    status: f.status,
    createdAt: f.created_at !== undefined ? f.created_at : f.createdAt
  };
};

const mapRate = (r) => {
  if (!r) return null;
  return {
    ...r,
    articleType: r.article_type !== undefined ? r.article_type : r.articleType,
    weightSlabKg: r.weight_slab_kg !== undefined ? Number(r.weight_slab_kg) : (r.weightSlabKg || 0),
    rate: r.rate !== undefined ? Number(r.rate) : (r.rate || 0),
    volumetricFactor: r.volumetric_factor !== undefined ? Number(r.volumetric_factor) : (r.volumetricFactor || 0),
    surcharges: r.surcharges !== undefined ? Number(r.surcharges) : (r.surcharges || 0)
  };
};

const mapExpense = (e) => {
  if (!e) return null;
  return {
    ...e,
    tripId: e.trip_id !== undefined ? e.trip_id : e.tripId,
    amount: e.amount !== undefined ? Number(e.amount) : (e.amount || 0),
    imageUrl: e.image_url !== undefined ? e.image_url : e.imageUrl,
    date: e.date ? e.date.split('T')[0] : ''
  };
};

const mapParty = (p) => {
  if (!p) return null;
  return {
    ...p,
    creditLimit: p.credit_limit !== undefined ? (p.credit_limit !== null ? Number(p.credit_limit) : null) : (p.creditLimit !== undefined && p.creditLimit !== null ? Number(p.creditLimit) : null),
    creditDays: p.credit_days !== undefined ? (p.credit_days !== null ? Number(p.credit_days) : null) : (p.creditDays !== undefined && p.creditDays !== null ? Number(p.creditDays) : null),
    address: p.address || null,
    phone: p.phone || '',
    pan: p.pan || '',
    commissionRate: p.commission_rate !== undefined ? (p.commission_rate !== null ? Number(p.commission_rate) : null) : (p.commissionRate !== undefined && p.commissionRate !== null ? Number(p.commissionRate) : (p.type === 'broker' ? 5.0 : null)),
    brokerType: p.broker_type !== undefined ? p.broker_type : (p.brokerType || (p.type === 'broker' ? 'Booking Agent' : null)),
    parentBrokerId: p.parent_broker_id !== undefined ? p.parent_broker_id : (p.parentBrokerId || null),
    subSplitPct: p.sub_split_pct !== undefined && p.sub_split_pct !== null ? Number(p.sub_split_pct) : (p.subSplitPct !== undefined && p.subSplitPct !== null ? Number(p.subSplitPct) : 30),
    tdsSection: p.tds_section !== undefined ? p.tds_section : (p.tdsSection || '194C (2%)'),
    tdsRate: p.tds_rate !== undefined && p.tds_rate !== null ? Number(p.tds_rate) : (p.tdsRate !== undefined && p.tdsRate !== null ? Number(p.tdsRate) : 2.0)
  };
};

const mapTrip = (t) => {
  if (!t) return null;
  return {
    ...t,
    contractRate: t.contract_rate !== undefined ? Number(t.contract_rate) : (t.contractRate || 0),
    truckNo: t.truck_no !== undefined ? t.truck_no : t.truckNo,
    driverId: t.driver_id !== undefined ? t.driver_id : t.driverId,
    driverName: t.driver_name !== undefined ? t.driver_name : t.driverName,
    odoStart: (t.odo_start !== undefined && t.odo_start !== null) ? Number(t.odo_start) : (t.odoStart ? Number(t.odoStart) : null),
    odoEnd: (t.odo_end !== undefined && t.odo_end !== null) ? Number(t.odo_end) : (t.odoEnd ? Number(t.odoEnd) : null),
    startDate: t.start_date ? t.start_date.split('T')[0] : (t.startDate || ''),
    driverAdvance: t.driver_advance !== undefined ? Number(t.driver_advance) : (t.driverAdvance || 0),
    lorryReceiptNo: t.lorry_receipt_no !== undefined ? t.lorry_receipt_no : t.lorryReceiptNo,
    expenses: Array.isArray(t.expenses) ? t.expenses.map(mapExpense) : []
  };
};

const mapManifest = (m) => {
  if (!m) return null;
  let lrNos = [];
  if (Array.isArray(m.lr_nos)) {
    lrNos = m.lr_nos;
  } else if (typeof m.lr_nos === 'string' && m.lr_nos.startsWith('[')) {
    try { lrNos = JSON.parse(m.lr_nos); } catch (e) { lrNos = []; }
  } else if (Array.isArray(m.lrNos)) {
    lrNos = m.lrNos;
  }

  return {
    ...m,
    id: m.id,
    originHub: m.origin_hub !== undefined ? m.origin_hub : (m.originHub || (m.lane ? m.lane.split(/[-➔→]/)[0]?.trim() : 'DEL')),
    destHub: m.dest_hub !== undefined ? m.dest_hub : (m.destHub || (m.lane ? m.lane.split(/[-➔→]/)[1]?.trim() : 'BOM')),
    lane: m.lane,
    vehicleNo: m.vehicle_no !== undefined ? m.vehicle_no : m.vehicleNo,
    driverName: m.driver_name !== undefined ? m.driver_name : m.driverName,
    driverPhone: m.driver_phone !== undefined ? m.driver_phone : m.driverPhone,
    status: m.status,
    date: m.date ? m.date.split('T')[0] : '',
    lrCount: m.lr_count !== undefined ? Number(m.lr_count) : (m.lrCount || 0),
    totalWeight: m.total_weight !== undefined ? Number(m.total_weight) : (m.totalWeight || 0),
    totalFreight: m.total_freight !== undefined ? Number(m.total_freight) : (m.totalFreight || 0),
    totalCft: m.total_cft !== undefined ? Number(m.total_cft) : (m.totalCft || 0),
    manifestPdf: m.manifest_pdf !== undefined ? m.manifest_pdf : m.manifestPdf,
    lrNos: lrNos
  };
};

// ── LOCAL STORAGE MOCK DATABASE (Fallback when server is down/local only) ──
if (typeof window !== 'undefined' && !localStorage.getItem('temp_clean_v2')) {
  [
    'temp_trucks',
    'temp_drivers',
    'temp_parties',
    'temp_vehicle_owners',
    'temp_trips',
    'temp_manifests',
    'temp_lrs',
    'temp_expenses',
    'temp_feedback',
    'temp_trip_checklists',
    'temp_approvals'
  ].forEach(k => localStorage.removeItem(k));
  localStorage.setItem('temp_clean_v2', 'true');
}

const getStorageItem = (key, initial) => {
  const item = localStorage.getItem(key);
  if (!item) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(item);
  } catch {
    return initial;
  }
};

const setStorageItem = (key, val) => {
  localStorage.setItem(key, JSON.stringify(val));
};

const mockDb = {
  getBranches: () => getStorageItem('temp_branches', INITIAL_BRANCHES),
  createBranch: (data) => {
    const list = mockDb.getBranches();
    const newItem = { ...data, id: data.id || `BR-${list.length + 1}` };
    list.push(newItem);
    setStorageItem('temp_branches', list);
    return newItem;
  },

  getVehicleOwners: () => getStorageItem('temp_vehicle_owners', INITIAL_VEHICLE_OWNERS),
  createVehicleOwner: (data) => {
    const list = mockDb.getVehicleOwners();
    const newItem = { ...data, id: data.id || `VOW-0${list.length + 1}` };
    list.push(newItem);
    setStorageItem('temp_vehicle_owners', list);
    return newItem;
  },

  getTrucks: () => getStorageItem('temp_trucks', INITIAL_TRUCKS),
  createTruck: (data) => {
    const list = mockDb.getTrucks();
    const newItem = {
      ...data,
      reg_no: data.reg_no || data.regNo,
      capacity_kg: data.capacity_kg || data.capacityKg,
      ownership: data.ownership,
      status: data.status || 'Available',
      expiry_rc: data.expiry_rc || data.expiryRC,
      expiry_ins: data.expiry_ins || data.expiryIns,
      permit: data.permit,
      body_type: data.body_type || data.bodyType || 'Container',
      size: data.size || '19 Ft',
      cft: data.cft !== undefined ? Number(data.cft) : (Number(data.cft) || 900),
      max_boxes: data.max_boxes !== undefined ? Number(data.max_boxes) : (Number(data.maxBoxes) || 180),
      expiry_fc: data.expiry_fc || data.expiryFC || null,
      expiry_puc: data.expiry_puc || data.expiryPUC || null,
      expiry_road_tax: data.expiry_road_tax || data.expiryRoadTax || null,
      chassis_no: data.chassis_no || data.chassisNo || '',
      engine_no: data.engine_no || data.engineNo || '',
      fastag_id: data.fastag_id || data.fastagId || '',
      fastag_balance: data.fastag_balance !== undefined ? Number(data.fastag_balance) : (Number(data.fastagBalance) || 0),
      gps_imei: data.gps_imei || data.gpsImei || '',
      current_odo: data.current_odo !== undefined ? Number(data.current_odo) : (Number(data.currentOdo) || 0),
      fuel_efficiency: data.fuel_efficiency !== undefined ? Number(data.fuel_efficiency) : (Number(data.fuelEfficiency) || 0),
      year_manufacture: data.year_manufacture !== undefined ? Number(data.year_manufacture) : (Number(data.yearManufacture) || 2020),
      fc_doc_url: data.fc_doc_url || data.fcDocUrl || '',
      puc_doc_url: data.puc_doc_url || data.pucDocUrl || '',
      road_tax_doc_url: data.road_tax_doc_url || data.roadTaxDocUrl || '',
    };
    list.push(newItem);
    setStorageItem('temp_trucks', list);
    return newItem;
  },
  updateTruck: (regNo, updates) => {
    const list = mockDb.getTrucks();
    const idx = list.findIndex(t => (t.regNo || t.reg_no) === regNo);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      setStorageItem('temp_trucks', list);
      return list[idx];
    }
    throw new Error('Truck not found');
  },

  getDrivers: () => getStorageItem('temp_drivers', INITIAL_DRIVERS),
  createDriver: (data) => {
    const list = mockDb.getDrivers();
    const newItem = {
      ...data,
      id: data.id || `DRV-0${list.length + 1}`,
      name: data.name,
      licence_no: data.licence_no || data.licenceNo,
      phone: data.phone,
      status: data.status || 'Active',
      otp_status: data.otp_status || data.otpStatus || 'Pending',
      licence_exp: data.licence_exp || data.licenceExp || null,
      aadhaar_no: data.aadhaar_no || data.aadhaarNo || '',
      emergency_name: data.emergency_name || data.emergencyName || '',
      emergency_phone: data.emergency_phone || data.emergencyPhone || '',
      blood_group: data.blood_group || data.bloodGroup || '',
      bgv_status: data.bgv_status || data.bgvStatus || 'Pending',
      bank_acc_no: data.bank_acc_no || data.bankAccNo || '',
      bank_ifsc: data.bank_ifsc || data.bankIfsc || '',
      upi_id: data.upi_id || data.upiId || '',
      pan_no: data.pan_no || data.panNo || '',
      experience_years: data.experience_years !== undefined ? Number(data.experience_years) : (Number(data.experienceYears) || 0),
      preferred_routes: data.preferred_routes || data.preferredRoutes || '',
      rating: data.rating !== undefined ? Number(data.rating) : (Number(data.rating) || 5.0),
      aadhaar_doc_url: data.aadhaar_doc_url || data.aadhaarDocUrl || '',
      pan_doc_url: data.pan_doc_url || data.panDocUrl || '',
      licence_doc_url: data.licence_doc_url || data.licenceDocUrl || '',
    };
    list.push(newItem);
    setStorageItem('temp_drivers', list);
    return newItem;
  },
  updateDriver: (id, updates) => {
    const list = mockDb.getDrivers();
    const idx = list.findIndex(d => d.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      setStorageItem('temp_drivers', list);
      return list[idx];
    }
    throw new Error('Driver not found');
  },

  getParties: () => getStorageItem('temp_parties', INITIAL_PARTIES),
  createParty: (data) => {
    const list = mockDb.getParties();
    const prefix = data.type === 'broker' ? 'BRK' : 'PAR';
    const newItem = { ...data, id: data.id || `${prefix}-0${list.length + 1}` };
    list.push(newItem);
    setStorageItem('temp_parties', list);
    return newItem;
  },
  updateParty: (id, updates) => {
    const list = mockDb.getParties();
    const idx = list.findIndex(p => p.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      setStorageItem('temp_parties', list);
      return list[idx];
    }
    throw new Error('Party not found');
  },
  deleteParty: (id) => {
    const list = mockDb.getParties();
    const newList = list.filter(p => p.id !== id);
    setStorageItem('temp_parties', newList);
    return { success: true };
  },

  getLRs: () => getStorageItem('temp_lrs', INITIAL_LRS),
  createLR: (data) => {
    const list = mockDb.getLRs();
    const newItem = {
      ...data,
      lrNo: data.lrNo || `LR-2026-00${list.length + 1}`,
      bookingBranch: data.bookingBranch || 'DEL',
      consignor: data.consignor,
      consignee: data.consignee,
      origin: data.origin || 'Delhi',
      destination: data.destination || 'Mumbai',
      articles: Number(data.articles || 1),
      actualWt: Number(data.actualWt || 0),
      chargeWt: Number(data.chargeWt || 0),
      freightTerms: data.freightTerms || 'TBB',
      vehicleNo: data.vehicleNo || data.vehicle_no || '',
      status: 'Booked',
      date: new Date().toISOString().split('T')[0]
    };
    list.push(newItem);
    setStorageItem('temp_lrs', list);
    return newItem;
  },
  updateLR: (lrNo, updates) => {
    const list = mockDb.getLRs();
    const idx = list.findIndex(l => (l.lrNo || l.lr_no) === lrNo);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      setStorageItem('temp_lrs', list);
      return list[idx];
    }
    throw new Error('LR not found');
  },
  deleteLR: (lrNo) => {
    let list = mockDb.getLRs();
    list = list.filter(l => (l.lrNo || l.lr_no) !== lrNo);
    setStorageItem('temp_lrs', list);
    return { success: true };
  },

  login: (email) => {
    const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user) throw new Error('User profile not found in database.');
    return { user };
  },
  updateSettings: (data) => {
    const userList = getStorageItem('temp_users', USERS);
    const idx = userList.findIndex(u => u.id === data.userId);
    if (idx !== -1) {
      userList[idx] = { ...userList[idx], ...data };
      setStorageItem('temp_users', userList);
      return { user: userList[idx] };
    }
    throw new Error('User not found');
  },
  submitFeedback: (data) => {
    const feedbackList = getStorageItem('temp_feedback', []);
    const newItem = {
      id: `FB-${feedbackList.length + 1}`,
      user_id: data.userId,
      user_name: data.userName,
      type: data.type,
      priority: data.priority || 'Medium',
      subject: data.subject,
      message: data.message,
      status: 'Submitted',
      created_at: new Date().toISOString()
    };
    feedbackList.push(newItem);
    setStorageItem('temp_feedback', feedbackList);
    return newItem;
  },
  getFeedback: (userId) => {
    const feedbackList = getStorageItem('temp_feedback', []);
    if (!userId || userId === 'admin' || userId === 'all') {
      return feedbackList.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
    }
    return feedbackList
      .filter(fb => (fb.user_id === userId || fb.userId === userId))
      .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
  },
  deleteFeedback: (id) => {
    let feedbackList = getStorageItem('temp_feedback', []);
    feedbackList = feedbackList.filter(fb => String(fb.id) !== String(id));
    setStorageItem('temp_feedback', feedbackList);
    return { success: true };
  },

  getRates: () => getStorageItem('temp_rates', INITIAL_RATES),
  createRate: (data) => {
    const list = mockDb.getRates();
    const newItem = { ...data, id: list.length + 1 };
    list.push(newItem);
    setStorageItem('temp_rates', list);
    return newItem;
  },

  getManifests: () => getStorageItem('temp_manifests', INITIAL_MANIFESTS),
  createManifest: (data) => {
    const list = mockDb.getManifests();
    const trips = mockDb.getTrips();
    const trucks = mockDb.getTrucks();
    const drivers = mockDb.getDrivers();

    const vehNo = data.vehicleNo || data.vehicle_no;
    const drvName = data.driverName || data.driver_name;

    if (vehNo) {
      const truckCheck = isTruckAvailable(vehNo, trips, list, trucks);
      if (!truckCheck.available) {
        throw new Error(`Vehicle ${vehNo} is not available: ${truckCheck.reason}. The vehicle must complete its current trip/manifest first.`);
      }
    }

    if (drvName) {
      const driverCheck = isDriverAvailable(drvName, trips, list, drivers);
      if (!driverCheck.available) {
        throw new Error(`Driver ${drvName} is not available: ${driverCheck.reason}. The driver must complete their current trip/manifest first.`);
      }
    }

    const newItem = {
      ...data,
      id: data.id || `MNF-2026-00${list.length + 1}`,
      lrCount: Number(data.lrCount || 0),
      totalWeight: Number(data.totalWeight || 0),
      totalFreight: Number(data.totalFreight || 0),
      date: data.date || new Date().toISOString().split('T')[0]
    };
    list.push(newItem);
    setStorageItem('temp_manifests', list);

    if (vehNo) {
      const cleanReg = vehNo.replace(/\s+/g, '').toUpperCase();
      const tIdx = trucks.findIndex(t => (t.regNo || t.reg_no || '').replace(/\s+/g, '').toUpperCase() === cleanReg);
      if (tIdx !== -1) {
        trucks[tIdx] = { ...trucks[tIdx], status: 'InTransit' };
        setStorageItem('temp_trucks', trucks);
      }
    }

    return newItem;
  },
  updateManifest: (id, updates) => {
    const list = mockDb.getManifests();
    const idx = list.findIndex(m => m.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      setStorageItem('temp_manifests', list);

      if (['Delivered', 'Completed', 'Received', 'Cancelled'].includes(updates.status)) {
        const vehNo = list[idx].vehicleNo || list[idx].vehicle_no;
        if (vehNo) {
          const trips = mockDb.getTrips();
          const cleanReg = vehNo.replace(/\s+/g, '').toUpperCase();
          const otherActiveManifests = list.filter(m =>
            m.id !== id &&
            (m.vehicleNo || m.vehicle_no || '').replace(/\s+/g, '').toUpperCase() === cleanReg &&
            !['Delivered', 'Completed', 'Received', 'Cancelled'].includes(m.status)
          );
          const activeTrips = trips.filter(t =>
            (t.truckNo || t.truck_no || '').replace(/\s+/g, '').toUpperCase() === cleanReg &&
            !['Delivered', 'Cancelled'].includes(t.status)
          );
          if (otherActiveManifests.length === 0 && activeTrips.length === 0) {
            const trucks = mockDb.getTrucks();
            const tIdx = trucks.findIndex(t => (t.regNo || t.reg_no || '').replace(/\s+/g, '').toUpperCase() === cleanReg);
            if (tIdx !== -1) {
              trucks[tIdx] = { ...trucks[tIdx], status: 'Available' };
              setStorageItem('temp_trucks', trucks);
            }
          }
        }
      }

      return list[idx];
    }
    throw new Error('Manifest not found');
  },

  getTrips: () => getStorageItem('temp_trips', INITIAL_TRIPS),
  createTrip: (data) => {
    const list = mockDb.getTrips();
    const manifests = mockDb.getManifests();
    const trucks = mockDb.getTrucks();
    const drivers = mockDb.getDrivers();

    if (data.truckNo) {
      const truckCheck = isTruckAvailable(data.truckNo, list, manifests, trucks);
      if (!truckCheck.available) {
        throw new Error(`Vehicle ${data.truckNo} is not available: ${truckCheck.reason}. The truck must complete its current trip first.`);
      }
    }

    if (data.driverId && data.driverId !== 'DRV-HIRED') {
      const driverCheck = isDriverAvailable(data.driverId, list, manifests, drivers);
      if (!driverCheck.available) {
        throw new Error(`Driver is not available: ${driverCheck.reason}. The driver must complete their current trip first.`);
      }
    } else if (data.driverName) {
      const driverCheck = isDriverAvailable(data.driverName, list, manifests, drivers);
      if (!driverCheck.available) {
        throw new Error(`Driver ${data.driverName} is not available: ${driverCheck.reason}. The driver must complete their current trip first.`);
      }
    }

    const newItem = {
      ...data,
      id: data.id || `TRP-2026-00${list.length + 1}`,
      contractRate: Number(data.contractRate || 0),
      odoStart: Number(data.odoStart || 0),
      odoEnd: Number(data.odoEnd || 0),
      driverAdvance: Number(data.driverAdvance || 0),
      expenses: data.expenses || [],
      startDate: data.startDate || new Date().toISOString().split('T')[0]
    };
    list.push(newItem);
    setStorageItem('temp_trips', list);

    if (data.truckNo) {
      const cleanReg = data.truckNo.replace(/\s+/g, '').toUpperCase();
      const tIdx = trucks.findIndex(t => (t.regNo || t.reg_no || '').replace(/\s+/g, '').toUpperCase() === cleanReg);
      if (tIdx !== -1) {
        trucks[tIdx] = { ...trucks[tIdx], status: 'InTransit' };
        setStorageItem('temp_trucks', trucks);
      }
    }

    return newItem;
  },
  updateTrip: (id, updates) => {
    const list = mockDb.getTrips();
    const idx = list.findIndex(t => t.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      setStorageItem('temp_trips', list);

      if (updates.status === 'Delivered' || updates.status === 'Cancelled') {
        const truckNo = list[idx].truckNo || list[idx].truck_no;
        if (truckNo) {
          const manifests = mockDb.getManifests();
          const cleanReg = truckNo.replace(/\s+/g, '').toUpperCase();
          const otherActiveTrips = list.filter(t => 
            t.id !== id && 
            (t.truckNo || t.truck_no || '').replace(/\s+/g, '').toUpperCase() === cleanReg &&
            !['Delivered', 'Cancelled'].includes(t.status)
          );
          const activeManifests = manifests.filter(m =>
            (m.vehicleNo || m.vehicle_no || '').replace(/\s+/g, '').toUpperCase() === cleanReg &&
            !['Delivered', 'Completed', 'Received', 'Cancelled'].includes(m.status)
          );
          if (otherActiveTrips.length === 0 && activeManifests.length === 0) {
            const trucks = mockDb.getTrucks();
            const tIdx = trucks.findIndex(t => (t.regNo || t.reg_no || '').replace(/\s+/g, '').toUpperCase() === cleanReg);
            if (tIdx !== -1) {
              trucks[tIdx] = { ...trucks[tIdx], status: 'Available' };
              setStorageItem('temp_trucks', trucks);
            }
          }
        }
      }

      return list[idx];
    }
    throw new Error('Trip not found');
  },
  deleteTrip: (id) => {
    let list = mockDb.getTrips();
    const target = list.find(t => t.id === id);
    list = list.filter(t => t.id !== id);
    setStorageItem('temp_trips', list);

    if (target) {
      const truckNo = target.truckNo || target.truck_no;
      if (truckNo) {
        const manifests = mockDb.getManifests();
        const cleanReg = truckNo.replace(/\s+/g, '').toUpperCase();
        const otherActiveTrips = list.filter(t => 
          (t.truckNo || t.truck_no || '').replace(/\s+/g, '').toUpperCase() === cleanReg &&
          !['Delivered', 'Cancelled'].includes(t.status)
        );
        const activeManifests = manifests.filter(m =>
          (m.vehicleNo || m.vehicle_no || '').replace(/\s+/g, '').toUpperCase() === cleanReg &&
          !['Delivered', 'Completed', 'Received', 'Cancelled'].includes(m.status)
        );
        if (otherActiveTrips.length === 0 && activeManifests.length === 0) {
          const trucks = mockDb.getTrucks();
          const tIdx = trucks.findIndex(t => (t.regNo || t.reg_no || '').replace(/\s+/g, '').toUpperCase() === cleanReg);
          if (tIdx !== -1) {
            trucks[tIdx] = { ...trucks[tIdx], status: 'Available' };
            setStorageItem('temp_trucks', trucks);
          }
        }
      }
    }

    return { success: true };
  },
  createTripExpense: (tripId, expense) => {
    const list = mockDb.getTrips();
    const idx = list.findIndex(t => t.id === tripId);
    if (idx !== -1) {
      const trip = list[idx];
      const newExp = {
        ...expense,
        id: expense.id || `EXP-${Date.now()}`,
        amount: Number(expense.amount || 0),
        date: expense.date || new Date().toISOString().split('T')[0]
      };
      trip.expenses = [...(trip.expenses || []), newExp];
      setStorageItem('temp_trips', list);
      return newExp;
    }
    throw new Error('Trip not found');
  },
  updateTripExpense: (tripId, expenseId, updates) => {
    const list = mockDb.getTrips();
    const idx = list.findIndex(t => t.id === tripId);
    if (idx !== -1) {
      const trip = list[idx];
      const expenses = trip.expenses || [];
      const expIdx = expenses.findIndex(e => e.id === expenseId);
      if (expIdx !== -1) {
        expenses[expIdx] = { ...expenses[expIdx], ...updates };
        trip.expenses = expenses;
        setStorageItem('temp_trips', list);
        return expenses[expIdx];
      }
    }
    throw new Error('Expense or Trip not found');
  },
  getWarehouseBins: () => getStorageItem('temp_warehouse_bins', {}),
  createWarehouseBin: (data) => {
    const bins = mockDb.getWarehouseBins();
    bins[data.id] = {
      occupied: false,
      lr: '',
      count: 0,
      maxCapacity: data.max_capacity,
      description: data.description,
      weight: 0
    };
    setStorageItem('temp_warehouse_bins', bins);
    return data;
  },
  getDiscrepancies: () => getStorageItem('temp_discrepancies', []),
  createDiscrepancy: (data) => {
    const list = mockDb.getDiscrepancies();
    const newItem = {
      ...data,
      id: data.id || `DISC-2026-0${list.length + 1}`,
      reported_at: data.reportedAt || data.reported_at || 'DEL',
      booked_qty: data.bookedQty || data.booked_qty,
      received_qty: data.receivedQty || data.received_qty,
      damage_qty: data.damageQty || data.damage_qty,
      remarks: data.remarks
    };
    list.unshift(newItem);
    setStorageItem('temp_discrepancies', list);
    return newItem;
  },
  getGlossary: () => []
};

const callWithFallback = async (apiPromiseFn, mockFn, isWrite = false) => {
  const isLocal = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname.startsWith('192.168.') || 
    window.location.hostname.startsWith('10.') || 
    (window.location.port && window.location.port !== '80' && window.location.port !== '443')
  );
  if (!isLocal) {
    return Promise.resolve(mockFn());
  }
  try {
    return await apiPromiseFn();
  } catch (error) {
    // When performing mutating write operations (POST, PUT, PATCH, DELETE) or when receiving HTTP errors,
    // NEVER mask the database error by falling back to mockDb in local storage.
    // Throwing ensures the backend failure is surfaced to the UI and user, preventing ghost records.
    if (isWrite || (error && (error.status >= 400 || (error.message && error.message.includes('status:'))))) {
      throw error;
    }
    console.warn("Backend API failed, falling back to mock database:", error);
    return Promise.resolve(mockFn());
  }
};

export const api = {
  // Branches
  getBranches: () => 
    callWithFallback(
      () => fetch(`${BASE_URL}/branches`).then(handleResponse),
      () => mockDb.getBranches()
    ),
  createBranch: (data) => 
    callWithFallback(
      () => fetch(`${BASE_URL}/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(handleResponse),
      () => mockDb.createBranch(data)
    ),

  // Vehicle Owners
  getVehicleOwners: () => 
    callWithFallback(
      () => fetch(`${BASE_URL}/vehicle-owners`).then(handleResponse),
      () => mockDb.getVehicleOwners()
    ),
  createVehicleOwner: (data) => 
    callWithFallback(
      () => fetch(`${BASE_URL}/vehicle-owners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(handleResponse),
      () => mockDb.createVehicleOwner(data)
    ),

  // Trucks
  getTrucks: () => 
    callWithFallback(
      () => fetch(`${BASE_URL}/trucks`).then(handleResponse).then(list => list.map(mapTruck)),
      () => mockDb.getTrucks().map(mapTruck)
    ),
  createTruck: (data) => 
    callWithFallback(
      () => fetch(`${BASE_URL}/trucks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(handleResponse).then(mapTruck),
      () => mapTruck(mockDb.createTruck(data))
    ),
  updateTruck: (regNo, updates) => 
    callWithFallback(
      () => fetch(`${BASE_URL}/trucks/${regNo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }).then(handleResponse).then(mapTruck),
      () => mapTruck(mockDb.updateTruck(regNo, updates))
    ),

  // Drivers
  getDrivers: () => 
    callWithFallback(
      () => fetch(`${BASE_URL}/drivers`).then(handleResponse).then(list => list.map(mapDriver)),
      () => mockDb.getDrivers().map(mapDriver)
    ),
  createDriver: (data) => 
    callWithFallback(
      () => fetch(`${BASE_URL}/drivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(handleResponse).then(mapDriver),
      () => mapDriver(mockDb.createDriver(data))
    ),
  updateDriver: (id, updates) => 
    callWithFallback(
      () => fetch(`${BASE_URL}/drivers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }).then(handleResponse).then(mapDriver),
      () => mapDriver(mockDb.updateDriver(id, updates))
    ),

  // Parties
  getParties: () => 
    callWithFallback(
      () => fetch(`${BASE_URL}/parties`).then(handleResponse).then(list => list.map(mapParty)),
      () => mockDb.getParties().map(mapParty)
    ),
  createParty: (data) => 
    callWithFallback(
      () => fetch(`${BASE_URL}/parties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(handleResponse).then(mapParty),
      () => mapParty(mockDb.createParty(data)),
      true
    ),
  updateParty: (id, updates) => 
    callWithFallback(
      () => fetch(`${BASE_URL}/parties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }).then(handleResponse).then(mapParty),
      () => mapParty(mockDb.updateParty(id, updates)),
      true
    ),
  deleteParty: (id) => 
    callWithFallback(
      () => fetch(`${BASE_URL}/parties/${id}`, {
        method: 'DELETE'
      }).then(handleResponse),
      () => mockDb.deleteParty(id),
      true
    ),

  // Lorry Receipts (Bookings)
  getLRs: () => 
    callWithFallback(
      () => fetch(`${BASE_URL}/lrs`).then(handleResponse).then(list => list.map(mapLR)),
      () => mockDb.getLRs().map(mapLR)
    ),
  createLR: (data) => 
    callWithFallback(
      () => fetch(`${BASE_URL}/lrs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(handleResponse).then(mapLR),
      () => mapLR(mockDb.createLR(data))
    ),
  updateLR: (lrNo, updates) => {
    const keyMap = {
      bookingBranch: 'booking_branch',
      consignorId: 'consignor_id',
      consigneeId: 'consignee_id',
      actualWt: 'actual_wt',
      chargeWt: 'charge_wt',
      privateMark: 'private_mark',
      saidToContain: 'said_to_contain',
      freightTerms: 'freight_terms',
      ewayBill: 'eway_bill',
      freightAmt: 'freight_amt',
      manifestId: 'manifest_id',
      warehouseBin: 'warehouse_bin',
      physicalPodReceived: 'physical_pod_received',
      podUrl: 'pod_url',
      cftPerBox: 'cft_per_box',
      totalCft: 'total_cft',
      boxSizeType: 'box_size_type',
      currentLocation: 'current_location'
    };
    const dbUpdates = {};
    for (const [key, val] of Object.entries(updates)) {
      const dbKey = keyMap[key] || key;
      dbUpdates[dbKey] = val;
    }

    return callWithFallback(
      () => fetch(`${BASE_URL}/lrs/${lrNo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbUpdates)
      }).then(handleResponse).then(mapLR),
      () => mapLR(mockDb.updateLR(lrNo, updates))
    );
  },
  deleteLR: (lrNo) => 
    callWithFallback(
      () => fetch(`${BASE_URL}/lrs/${lrNo}`, {
        method: 'DELETE'
      }).then(handleResponse),
      () => mockDb.deleteLR(lrNo)
    ),

  // Warehouse Bins & Discrepancies
  getWarehouseBins: () =>
    callWithFallback(
      () => fetch(`${BASE_URL}/warehouse/bins`).then(handleResponse),
      () => mockDb.getWarehouseBins()
    ),
  createWarehouseBin: (data) =>
    callWithFallback(
      () => fetch(`${BASE_URL}/warehouse/bins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(handleResponse),
      () => mockDb.createWarehouseBin(data)
    ),
  getDiscrepancies: () =>
    callWithFallback(
      () => fetch(`${BASE_URL}/warehouse/discrepancies`).then(handleResponse),
      () => mockDb.getDiscrepancies()
    ),
  createDiscrepancy: (data) =>
    callWithFallback(
      () => fetch(`${BASE_URL}/warehouse/discrepancies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(handleResponse),
      () => mockDb.createDiscrepancy(data)
    ),

  // Auth
  login: (email) =>
    callWithFallback(
      () => fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      }).then(handleResponse),
      () => mockDb.login(email)
    ),
  updateSettings: (data) =>
    callWithFallback(
      () => fetch(`${BASE_URL}/auth/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(handleResponse),
      () => mockDb.updateSettings(data)
    ),
  registerClient: (data) =>
    callWithFallback(
      () => fetch(`${BASE_URL}/auth/register-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: data.companyName,
          gstin: data.gstin,
          email: data.email,
          password: data.password,
          phone: data.phone,
          address: data.address
        })
      }).then(handleResponse),
      () => ({
        message: 'Registration successful',
        user: {
          id: 999,
          name: `${data.companyName} Admin`,
          email: data.email.toLowerCase(),
          role: 'Client',
          branch: 'HO',
          branchLabel: 'Client Portal',
          avatar: data.companyName.substring(0,2).toUpperCase(),
          designation: 'Client Admin',
          phone: data.phone || '',
          partyId: 'PAR-MOCK'
        }
      })
    ),
  getTenantSettings: () =>
    callWithFallback(
      () => fetch(`${BASE_URL}/tenant-settings`).then(handleResponse),
      () => ({
        tenant_id: 'default_tenant',
        company_name: 'Chetak Roadways Pvt Ltd',
        brand_name: 'Chetak Roadways',
        gstin: '06AAABC1234D1ZE',
        pan: 'AAABC1234D',
        registered_address: 'Plot 14, Industrial Area, Gurgaon - 122001, Haryana',
        primary_contact_name: 'Pradeep Kumar',
        primary_phone: '+91 98765 43210',
        support_email: 'support@chetakroad.com',
        website: 'https://yourcompany.com',
        logo_url: ''
      })
    ),
  updateTenantSettings: (data) =>
    callWithFallback(
      () => fetch(`${BASE_URL}/tenant-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(handleResponse),
      () => data
    ),

  // Feedback
  submitFeedback: (data) =>
    callWithFallback(
      () => fetch(`${BASE_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(handleResponse).then(mapFeedback),
      () => mapFeedback(mockDb.submitFeedback(data))
    ),
  getFeedback: (userId) =>
    callWithFallback(
      () => fetch(`${BASE_URL}/feedback?userId=${userId}`).then(handleResponse).then(list => list.map(mapFeedback)),
      () => mockDb.getFeedback(userId).map(mapFeedback)
    ),
  deleteFeedback: (id) =>
    callWithFallback(
      () => fetch(`${BASE_URL}/feedback/${id}`, {
        method: 'DELETE'
      }).then(handleResponse),
      () => mockDb.deleteFeedback(id)
    ),

  // Rates
  getRates: () => 
    callWithFallback(
      () => fetch(`${BASE_URL}/rates`).then(handleResponse).then(list => list.map(mapRate)),
      () => mockDb.getRates().map(mapRate)
    ),
  createRate: (data) => 
    callWithFallback(
      () => fetch(`${BASE_URL}/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lane: data.lane,
          article_type: data.articleType,
          weight_slab_kg: Number(data.weightSlabKg),
          rate: Number(data.rate),
          volumetric_factor: Number(data.volumetricFactor),
          surcharges: Number(data.surcharges)
        })
      }).then(handleResponse).then(mapRate),
      () => mapRate(mockDb.createRate(data))
    ),

  // Manifests
  getManifests: () => 
    callWithFallback(
      () => fetch(`${BASE_URL}/manifests`).then(handleResponse).then(list => list.map(mapManifest)),
      () => mockDb.getManifests().map(mapManifest)
    ),
  createManifest: (data) => 
    callWithFallback(
      () => fetch(`${BASE_URL}/manifests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: data.id,
          origin_hub: data.originHub,
          dest_hub: data.destHub,
          lane: data.lane,
          vehicle_no: data.vehicleNo,
          driver_name: data.driverName,
          driver_phone: data.driverPhone,
          status: data.status,
          date: data.date,
          lr_count: Number(data.lrCount),
          total_weight: Number(data.totalWeight),
          total_freight: Number(data.totalFreight),
          total_cft: Number(data.totalCft || 0),
          manifest_pdf: data.manifestPdf,
          lr_nos: data.lrNos
        })
      }).then(handleResponse).then(mapManifest),
      () => mapManifest(mockDb.createManifest(data))
    ),
  updateManifest: (id, updates) => {
    const dbUpdates = {};
    if (updates.vehicleNo !== undefined) dbUpdates.vehicle_no = updates.vehicleNo;
    if (updates.driverName !== undefined) dbUpdates.driver_name = updates.driverName;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.lrCount !== undefined) dbUpdates.lr_count = Number(updates.lrCount);
    if (updates.totalWeight !== undefined) dbUpdates.total_weight = Number(updates.totalWeight);
    if (updates.totalFreight !== undefined) dbUpdates.total_freight = Number(updates.totalFreight);
    if (updates.manifestPdf !== undefined) dbUpdates.manifest_pdf = updates.manifestPdf;
    if (updates.date !== undefined) dbUpdates.date = updates.date;

    return callWithFallback(
      () => fetch(`${BASE_URL}/manifests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbUpdates)
      }).then(handleResponse).then(mapManifest),
      () => mapManifest(mockDb.updateManifest(id, updates))
    );
  },

  // Trips & Expenses
  getTrips: () => 
    callWithFallback(
      () => fetch(`${BASE_URL}/trips`).then(handleResponse).then(list => list.map(mapTrip)),
      () => mockDb.getTrips().map(mapTrip)
    ),
  createTrip: (data) => 
    callWithFallback(
      () => fetch(`${BASE_URL}/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: data.id,
          origin: data.origin,
          destination: data.destination,
          contract_rate: Number(data.contractRate),
          truck_no: data.truckNo,
          driver_id: data.driverId,
          driver_name: data.driverName,
          odo_start: Number(data.odoStart) || 0,
          odo_end: (data.odoEnd !== undefined && data.odoEnd !== null && !isNaN(Number(data.odoEnd))) ? Number(data.odoEnd) : null,
          status: data.status || 'Started',
          start_date: data.startDate || new Date().toISOString().split('T')[0],
          driver_advance: Number(data.driverAdvance) || 0,
          lorry_receipt_no: data.lorryReceiptNo || null
        })
      }).then(handleResponse).then(mapTrip),
      () => mapTrip(mockDb.createTrip(data))
    ),
  updateTrip: (id, updates) => {
    const dbUpdates = {};
    if (updates.origin !== undefined) dbUpdates.origin = updates.origin;
    if (updates.destination !== undefined) dbUpdates.destination = updates.destination;
    if (updates.contractRate !== undefined) dbUpdates.contract_rate = Number(updates.contractRate);
    if (updates.truckNo !== undefined) dbUpdates.truck_no = updates.truckNo;
    if (updates.driverId !== undefined) dbUpdates.driver_id = updates.driverId;
    if (updates.driverName !== undefined) dbUpdates.driver_name = updates.driverName;
    if (updates.odoStart !== undefined) dbUpdates.odo_start = Number(updates.odoStart);
    if (updates.odoEnd !== undefined) dbUpdates.odo_end = Number(updates.odoEnd);
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
    if (updates.driverAdvance !== undefined) dbUpdates.driver_advance = Number(updates.driverAdvance);
    if (updates.lorryReceiptNo !== undefined) dbUpdates.lorry_receipt_no = updates.lorryReceiptNo;

    return callWithFallback(
      () => fetch(`${BASE_URL}/trips/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbUpdates)
      }).then(handleResponse).then(mapTrip),
      () => mapTrip(mockDb.updateTrip(id, updates))
    );
  },
  deleteTrip: (id) =>
    callWithFallback(
      () => fetch(`${BASE_URL}/trips/${id}`, {
        method: 'DELETE'
      }).then(handleResponse),
      () => mockDb.deleteTrip(id)
    ),
  deleteLoad: async ({ lrNo, tripId }) => {
    const promises = [];
    if (tripId) {
      promises.push(
        api.deleteTrip(tripId).catch(err => console.warn('Could not delete trip:', err))
      );
    }
    if (lrNo) {
      promises.push(
        api.deleteLR(lrNo).catch(err => console.warn('Could not delete LR:', err))
      );
    }
    await Promise.all(promises);
    return { success: true };
  },
  createTripExpense: (tripId, expense) => 
    callWithFallback(
      () => fetch(`${BASE_URL}/trips/${tripId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: expense.id,
          type: expense.type,
          amount: Number(expense.amount),
          source: expense.source,
          verified: expense.verified,
          date: expense.date,
          merchant: expense.merchant,
          image_url: expense.imageUrl
        })
      }).then(handleResponse).then(mapExpense),
      () => mapExpense(mockDb.createTripExpense(tripId, expense))
    ),
  updateTripExpense: (tripId, expenseId, updates) => 
    callWithFallback(
      () => fetch(`${BASE_URL}/trips/${tripId}/expenses/${expenseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }).then(handleResponse).then(mapExpense),
      () => mapExpense(mockDb.updateTripExpense(tripId, expenseId, updates))
    ),

  // Glossary
  getGlossary: () => 
    callWithFallback(
      () => fetch(`${BASE_URL}/glossary`).then(handleResponse),
      () => mockDb.getGlossary()
    ),

  // AI Photo Processing
  analyzePhoto: (base64Image, contextType) =>
    callWithFallback(
      () => fetch(`${BASE_URL}/ai/analyze-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, contextType })
      }).then(handleResponse),
      () => {
        // Client-side fallback if server is offline or not run with backend
        const dateStr = new Date().toISOString().split('T')[0];
        if (contextType === 'expense') {
          return {
            documentType: 'receipt',
            ocrText: 'INDIAN OIL CORP LTD\nFUEL INVOICE\nDATE: ' + dateStr + '\nQTY: 15.5L\nRATE: 96.50\nTOTAL: 1500.00\nVEHICLE: MH04GP4321\nTHANK YOU',
            legibilityScore: 92,
            confidenceScore: 95,
            extractedFields: { amount: 1500, merchant: 'Indian Oil Corp Ltd', date: dateStr, expenseType: 'Fuel', vehicleNumber: 'MH04GP4321' },
            warnings: []
          };
        } else if (contextType === 'waybill') {
          return {
            documentType: 'waybill',
            ocrText: 'CONSIGNMENT NOTE / WAYBILL\nLR NO: LR-1082\nCONSIGNOR: RELIANCE RETAIL LTD\nCONSIGNEE: SPAR HYPERMARKETS\nFROM: MUMBAI\nTO: BANGALORE\nITEMS: 45 BOXES ELECTRONICS\nSIGNATURE RECEIVED',
            legibilityScore: 88,
            confidenceScore: 90,
            extractedFields: { lrNumber: 'LR-1082', consignor: 'Reliance Retail Ltd', consignee: 'Spar Hypermarkets', destination: 'Bangalore' },
            warnings: []
          };
        } else if (contextType === 'odometer') {
          return {
            documentType: 'odo',
            ocrText: 'ODOMETER READING\nCURRENT KM: 87430 KM\nENGINE STATUS: OK',
            legibilityScore: 95,
            confidenceScore: 98,
            extractedFields: { odometerValue: 87430 },
            warnings: []
          };
        }
        return {
          documentType: 'unknown',
          ocrText: 'RAW DOCUMENT TEXT - CLIENT-SIDE FALLBACK EXTRACTED',
          legibilityScore: 75,
          confidenceScore: 80,
          extractedFields: {},
          warnings: ['Running in client-side offline sandbox fallback']
        };
      }
    )
};

export { isTruckAvailable, isDriverAvailable } from './fleetAvailability';

