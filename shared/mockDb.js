export const INITIAL_BRANCHES = [
  { id: 'HO', name: 'Head Office', gstin: '27AAAAA1111A1Z1', address: 'Mumbai HO, Nariman Point', type: 'HO' },
  { id: 'DEL', name: 'Delhi Branch', gstin: '07BBBBB2222B2Z2', address: 'Sanjay Gandhi Transport Nagar, Delhi', type: 'branch' },
  { id: 'BLR', name: 'Bangalore Hub', gstin: '29CCCCC3333C3Z3', address: 'Yeshwanthpur Hub, Bangalore', type: 'hub' },
  { id: 'BOM', name: 'Mumbai Warehouse', gstin: '27AAAAA1111A1Z1', address: 'Kalamboli Warehouse, Navi Mumbai', type: 'warehouse' }
];

export const INITIAL_TRUCKS = [
  { regNo: 'MH-12-Q-4567', model: 'Tata LPT 3118', capacityKg: 20000, ownership: 'own', status: 'InTransit', expiryRC: '2028-12-10', expiryIns: '2026-10-15', permit: 'National', bodyType: 'Container', size: '32 Ft MX', cft: 2200, maxBoxes: 440 },
  { regNo: 'DL-1G-B-9988', model: 'Leyland U-3518', capacityKg: 25000, ownership: 'attached', ownerId: 'VOW-01', status: 'Available', expiryRC: '2027-05-18', expiryIns: '2026-07-20', permit: 'National', bodyType: 'Open Body', size: '24 Ft', cft: 1200, maxBoxes: 240 },
  { regNo: 'KA-03-MM-1212', model: 'BharatBenz 2823R', capacityKg: 18000, ownership: 'own', status: 'Available', expiryRC: '2029-01-30', expiryIns: '2026-06-25', permit: 'State', bodyType: 'Tarpaulin', size: '19 Ft', cft: 900, maxBoxes: 180 },
  { regNo: 'HR-55-A-5678', model: 'Mahindra Blazo X', capacityKg: 15000, ownership: 'attached', ownerId: 'VOW-02', status: 'Available', expiryRC: '2026-08-01', expiryIns: '2026-06-18', permit: 'National', bodyType: 'Flatbed', size: '14 Ft', cft: 500, maxBoxes: 100 }
];

export const INITIAL_DRIVERS = [
  { id: 'DRV-01', name: 'Rajesh Kumar', licenceNo: 'DL-0720150089', phone: '9876543210', status: 'Active', otpStatus: 'Verified', licenceExp: '2030-05-12' },
  { id: 'DRV-02', name: 'Sukhwinder Singh', licenceNo: 'PB-1020180023', phone: '8765432109', status: 'Active', otpStatus: 'Verified', licenceExp: '2028-09-22' },
  { id: 'DRV-03', name: 'Muthu Swamy', licenceNo: 'KA-5120200045', phone: '7654321098', status: 'Active', otpStatus: 'Verified', licenceExp: '2026-06-20' }
];

export const INITIAL_PARTIES = [
  { id: 'PAR-01', name: 'Reliance Retail Ltd', type: 'client', gstin: '27AAACR1234F1ZA', creditLimit: 500000, creditDays: 30, phone: '7799654708' },
  { id: 'PAR-02', name: 'TATA Motors Logistics', type: 'client', gstin: '27AAACT5678G1ZB', creditLimit: 800000, creditDays: 45, phone: '9876543210' },
  { id: 'PAR-03', name: 'Hindustan Unilever', type: 'client', gstin: '07AAACH9012H1ZC', creditLimit: 400000, creditDays: 30, phone: '9812345678' },
  { id: 'PAR-04', name: 'Sharma Electronics (Consignee)', type: 'consignee', gstin: '07BBBSE3456F1ZA', address: 'Lajpat Nagar, Delhi', phone: '9988776655' },
  { id: 'BRK-01', name: 'National Booking Agency', type: 'broker', phone: '9810012345', pan: 'AAABN1234K', gstin: '27AAABN1234K1Z5', commissionRate: 5.0, brokerType: 'Booking Agent', tdsSection: '194C (2%)', tdsRate: 2.0, address: 'Transport Nagar, Delhi' },
  { id: 'BRK-02', name: 'Mumbai Local Broker', type: 'broker', phone: '9820054321', pan: 'AABBM5678L', gstin: '27AABBM5678L1Z8', commissionRate: 5.0, brokerType: 'Commission Agent', parentBrokerId: 'BRK-01', subSplitPct: 30.0, tdsSection: '194C (2%)', tdsRate: 2.0, address: 'Vashi APMC Market, Navi Mumbai' }
];

export const INITIAL_VEHICLE_OWNERS = [
  { id: 'VOW-01', name: 'Shergill Roadlines', pan: 'ABCPS1234K', bank: 'SBI - 30291039281', defaultHireTerms: '70% Advance, 30% on POD' },
  { id: 'VOW-02', name: 'Haryana Freight Carriers', pan: 'AEEPH5678L', bank: 'HDFC - 50100293810', defaultHireTerms: '80% Advance, 20% on POD' }
];

export const INITIAL_RATES = [
  { lane: 'DEL-BOM', articleType: 'General Cargo', weightSlabKg: 1000, rate: 8.5, volumetricFactor: 12, surcharges: 500 },
  { lane: 'DEL-BLR', articleType: 'Electronics', weightSlabKg: 500, rate: 12.0, volumetricFactor: 15, surcharges: 800 },
  { lane: 'BOM-BLR', articleType: 'General Cargo', weightSlabKg: 1000, rate: 6.5, volumetricFactor: 12, surcharges: 400 },
  { lane: 'BOM-DEL', articleType: 'Auto Parts', weightSlabKg: 2000, rate: 9.0, volumetricFactor: 10, surcharges: 600 }
];

export const INITIAL_LRS = [
  {
    lrNo: 'LR-2026-001',
    bookingBranch: 'DEL',
    consignor: 'TATA Motors Logistics',
    consignee: 'Sharma Electronics (Consignee)',
    origin: 'Delhi',
    destination: 'Mumbai',
    articles: 150,
    actualWt: 4500,
    chargeWt: 5000,
    privateMark: 'TM-DEL-BOM-01',
    saidToContain: 'Auto Spare Parts',
    freightTerms: 'TBB',
    ewayBill: '411029381029',
    value: 1250000,
    freightAmt: 45000,
    cgst: 2250,
    sgst: 2250,
    igst: 0,
    status: 'Booked',
    date: '2026-06-14',
    manifestId: null,
    warehouseBin: 'B-04',
    physicalPodReceived: false
  },
  {
    lrNo: 'LR-2026-002',
    bookingBranch: 'BOM',
    consignor: 'Reliance Retail Ltd',
    consignee: 'Sharma Electronics (Consignee)',
    origin: 'Mumbai',
    destination: 'Delhi',
    articles: 80,
    actualWt: 1200,
    chargeWt: 1500,
    privateMark: 'RR-BOM-DEL-25',
    saidToContain: 'FMCG Goods Pack',
    freightTerms: 'To-Pay',
    ewayBill: '411082910398',
    value: 450000,
    freightAmt: 18000,
    cgst: 0,
    sgst: 0,
    igst: 900,
    status: 'AtHub',
    date: '2026-06-15',
    manifestId: null,
    warehouseBin: 'A-12',
    physicalPodReceived: false
  },
  {
    lrNo: 'LR-2026-003',
    bookingBranch: 'DEL',
    consignor: 'Hindustan Unilever',
    consignee: 'Sharma Electronics (Consignee)',
    origin: 'Delhi',
    destination: 'Bangalore',
    articles: 200,
    actualWt: 3200,
    chargeWt: 3200,
    privateMark: 'HU-DEL-BLR-88',
    saidToContain: 'Soaps & Cosmetics',
    freightTerms: 'Paid',
    ewayBill: '411038291029',
    value: 850000,
    freightAmt: 38400,
    cgst: 960,
    sgst: 960,
    igst: 0,
    status: 'Delivered',
    date: '2026-06-10',
    manifestId: 'MNF-2026-001',
    warehouseBin: null,
    physicalPodReceived: true,
    podUrl: '/pod_sample.jpg'
  },
  {
    lrNo: 'LR-2026-004',
    bookingBranch: 'DEL',
    consignor: 'TATA Motors Logistics',
    consignee: 'Sharma Electronics (Consignee)',
    origin: 'Delhi',
    destination: 'Mumbai',
    articles: 10,
    actualWt: 200,
    chargeWt: 250,
    privateMark: 'PTL-DEL-BOM-10',
    saidToContain: 'Electronics Sample',
    freightTerms: 'Paid',
    ewayBill: '411029381030',
    value: 120000,
    freightAmt: 2500,
    cgst: 125,
    sgst: 125,
    igst: 0,
    status: 'Booked',
    date: '2026-06-20',
    manifestId: null,
    warehouseBin: 'B-01',
    physicalPodReceived: false
  },
  {
    lrNo: 'LR-2026-005',
    bookingBranch: 'BOM',
    consignor: 'Reliance Retail Ltd',
    consignee: 'Sharma Electronics (Consignee)',
    origin: 'Mumbai',
    destination: 'Mumbai',
    articles: 30,
    actualWt: 600,
    chargeWt: 700,
    privateMark: 'PTL-BOM-MUM-30',
    saidToContain: 'Assorted Garments',
    freightTerms: 'TBB',
    ewayBill: '411082910399',
    value: 300000,
    freightAmt: 7000,
    cgst: 0,
    sgst: 0,
    igst: 350,
    status: 'Booked',
    date: '2026-06-22',
    manifestId: null,
    warehouseBin: 'A-02',
    physicalPodReceived: false
  },
  {
    lrNo: 'LR-2026-006',
    bookingBranch: 'BLR',
    consignor: 'Hindustan Unilever',
    consignee: 'Sharma Electronics (Consignee)',
    origin: 'Bangalore',
    destination: 'Mumbai',
    articles: 20,
    actualWt: 400,
    chargeWt: 450,
    privateMark: 'PTL-BLR-BOM-20',
    saidToContain: 'Auto Components',
    freightTerms: 'To-Pay',
    ewayBill: '411038291030',
    value: 180000,
    freightAmt: 4500,
    cgst: 225,
    sgst: 225,
    igst: 0,
    status: 'Booked',
    date: '2026-06-23',
    manifestId: null,
    warehouseBin: 'C-01',
    physicalPodReceived: false
  }
];

export const INITIAL_MANIFESTS = [
  {
    id: 'MNF-2026-001',
    lane: 'DEL-BLR',
    vehicleNo: 'MH-12-Q-4567',
    driverName: 'Rajesh Kumar',
    status: 'Closed',
    date: '2026-06-10',
    lrCount: 1,
    totalWeight: 3200,
    totalFreight: 38400,
    manifestPdf: '/manifest_sample.pdf'
  }
];

export const INITIAL_TRIPS = [
  {
    id: 'TRP-2026-001',
    origin: 'Delhi',
    destination: 'Mumbai',
    contractRate: 65000,
    truckNo: 'MH-12-Q-4567',
    driverId: 'DRV-01',
    driverName: 'Rajesh Kumar',
    odoStart: 125430,
    odoEnd: 126850,
    status: 'InTransit',
    startDate: '2026-06-14',
    expenses: [
      { id: 'EXP-1', type: 'fuel', amount: 22000, source: 'FASTag', verified: true, date: '2026-06-14' },
      { id: 'EXP-2', type: 'toll', amount: 3500, source: 'FASTag', verified: true, date: '2026-06-14' },
      { id: 'EXP-3', type: 'batta', amount: 1500, source: 'manual', verified: true, date: '2026-06-15' },
      { id: 'EXP-4', type: 'misc', amount: 800, source: 'ocr', verified: false, date: '2026-06-15', image: '/bill_ocr.jpg' }
    ],
    driverAdvance: 15000,
    lorryReceiptNo: 'LR-2026-001'
  }
];
