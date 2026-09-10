import pool from './db.js';

const branches = [
  { id: 'HO', name: 'Head Office', gstin: '27AAAAA1111A1Z1', address: 'Mumbai HO, Nariman Point', type: 'HO' },
  { id: 'DEL', name: 'Delhi Branch', gstin: '07BBBBB2222B2Z2', address: 'Sanjay Gandhi Transport Nagar, Delhi', type: 'branch' },
  { id: 'BLR', name: 'Bangalore Hub', gstin: '29CCCCC3333C3Z3', address: 'Yeshwanthpur Hub, Bangalore', type: 'hub' },
  { id: 'BOM', name: 'Mumbai Warehouse', gstin: '27AAAAA1111A1Z1', address: 'Kalamboli Warehouse, Navi Mumbai', type: 'warehouse' }
];

const vehicleOwners = [
  { id: 'VOW-01', name: 'Shergill Roadlines', pan: 'ABCPS1234K', bank: 'SBI - 30291039281', defaultHireTerms: '70% Advance, 30% on POD' },
  { id: 'VOW-02', name: 'Haryana Freight Carriers', pan: 'AEEPH5678L', bank: 'HDFC - 50100293810', defaultHireTerms: '80% Advance, 20% on POD' }
];

const trucks = [
  { regNo: 'MH-12-Q-4567', model: 'Tata LPT 3118', capacityKg: 20000, ownership: 'own', ownerId: null, status: 'InTransit', expiryRC: '2028-12-10', expiryIns: '2026-10-15', permit: 'National', bodyType: 'Container', size: '32 Ft MX', cft: 2200, maxBoxes: 440 },
  { regNo: 'DL-1G-B-9988', model: 'Leyland U-3518', capacityKg: 25000, ownership: 'attached', ownerId: 'VOW-01', status: 'Available', expiryRC: '2027-05-18', expiryIns: '2026-07-20', permit: 'National', bodyType: 'Open Body', size: '24 Ft', cft: 1200, maxBoxes: 240 },
  { regNo: 'KA-03-MM-1212', model: 'BharatBenz 2823R', capacityKg: 18000, ownership: 'own', ownerId: null, status: 'Available', expiryRC: '2029-01-30', expiryIns: '2026-06-25', permit: 'State', bodyType: 'Tarpaulin', size: '19 Ft', cft: 900, maxBoxes: 180 },
  { regNo: 'HR-55-A-5678', model: 'Mahindra Blazo X', capacityKg: 15000, ownership: 'attached', ownerId: 'VOW-02', status: 'Available', expiryRC: '2026-08-01', expiryIns: '2026-06-18', permit: 'National', bodyType: 'Flatbed', size: '14 Ft', cft: 500, maxBoxes: 100 }
];

const drivers = [
  { id: 'DRV-01', name: 'Rajesh Kumar', licenceNo: 'DL-0720150089', phone: '9876543210', status: 'Active', otpStatus: 'Verified', licenceExp: '2030-05-12' },
  { id: 'DRV-02', name: 'Sukhwinder Singh', licenceNo: 'PB-1020180023', phone: '8765432109', status: 'Active', otpStatus: 'Verified', licenceExp: '2028-09-22' },
  { id: 'DRV-03', name: 'Muthu Swamy', licenceNo: 'KA-5120200045', phone: '7654321098', status: 'Active', otpStatus: 'Verified', licenceExp: '2026-06-20' }
];

const parties = [
  { id: 'PAR-01', name: 'Reliance Retail Ltd', type: 'client', gstin: '27AAACR1234F1ZA', creditLimit: 500000, creditDays: 30, address: null },
  { id: 'PAR-02', name: 'TATA Motors Logistics', type: 'client', gstin: '27AAACT5678G1ZB', creditLimit: 800000, creditDays: 45, address: null },
  { id: 'PAR-03', name: 'Hindustan Unilever', type: 'client', gstin: '07AAACH9012H1ZC', creditLimit: 400000, creditDays: 30, address: null },
  { id: 'PAR-04', name: 'Sharma Electronics (Consignee)', type: 'consignee', gstin: '07BBBSE3456F1ZA', creditLimit: null, creditDays: null, address: 'Lajpat Nagar, Delhi' }
];

const lrs = [
  {
    lrNo: 'LR-2026-001',
    bookingBranch: 'DEL',
    consignorId: 'PAR-02',
    consigneeId: 'PAR-04',
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
    physicalPodReceived: false,
    podUrl: null
  },
  {
    lrNo: 'LR-2026-002',
    bookingBranch: 'BOM',
    consignorId: 'PAR-01',
    consigneeId: 'PAR-04',
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
    physicalPodReceived: false,
    podUrl: null
  },
  {
    lrNo: 'LR-2026-003',
    bookingBranch: 'DEL',
    consignorId: 'PAR-03',
    consigneeId: 'PAR-04',
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
    consignorId: 'PAR-02',
    consigneeId: 'PAR-04',
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
    physicalPodReceived: false,
    podUrl: null
  },
  {
    lrNo: 'LR-2026-005',
    bookingBranch: 'BOM',
    consignorId: 'PAR-01',
    consigneeId: 'PAR-04',
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
    physicalPodReceived: false,
    podUrl: null
  },
  {
    lrNo: 'LR-2026-006',
    bookingBranch: 'BLR',
    consignorId: 'PAR-03',
    consigneeId: 'PAR-04',
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
    physicalPodReceived: false,
    podUrl: null
  }
];

const initialRates = [
  { lane: 'DEL-BOM', articleType: 'General Cargo', weightSlabKg: 1000, rate: 8.5, volumetricFactor: 12, surcharges: 500 },
  { lane: 'DEL-BLR', articleType: 'Electronics', weightSlabKg: 500, rate: 12.0, volumetricFactor: 15, surcharges: 800 },
  { lane: 'BOM-BLR', articleType: 'General Cargo', weightSlabKg: 1000, rate: 6.5, volumetricFactor: 12, surcharges: 400 },
  { lane: 'BOM-DEL', articleType: 'Auto Parts', weightSlabKg: 2000, rate: 9.0, volumetricFactor: 10, surcharges: 600 }
];

const initialManifests = [
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

const initialTrips = [
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
    driverAdvance: 15000,
    lorryReceiptNo: 'LR-2026-001',
    expenses: [
      { id: 'EXP-1', type: 'fuel', amount: 22000, source: 'FASTag', verified: true, date: '2026-06-14' },
      { id: 'EXP-2', type: 'toll', amount: 3500, source: 'FASTag', verified: true, date: '2026-06-14' },
      { id: 'EXP-3', type: 'batta', amount: 1500, source: 'manual', verified: true, date: '2026-06-15' },
      { id: 'EXP-4', type: 'misc', amount: 800, source: 'ocr', verified: false, date: '2026-06-15', merchant: 'Dhaba Stop & Hotel Highway', image_url: '/bill_ocr.jpg' }
    ]
  },
  {
    id: 'TRP-2026-002',
    origin: 'Mumbai',
    destination: 'Delhi',
    contractRate: 48000,
    truckNo: 'DL-1G-B-9988',
    driverId: 'DRV-02',
    driverName: 'Sukhwinder Singh',
    odoStart: 98000,
    odoEnd: 99400,
    status: 'InTransit',
    startDate: '2026-06-16',
    driverAdvance: 12000,
    lorryReceiptNo: 'LR-2026-002',
    expenses: [
      { id: 'EXP-5', type: 'fuel', amount: 16000, source: 'FASTag', verified: true, date: '2026-06-16' },
      { id: 'EXP-6', type: 'toll', amount: 2500, source: 'FASTag', verified: true, date: '2026-06-16' }
    ]
  }
];

const initialGlossary = [
  { termId: 'LR', term: 'LR / Bilty / GR / CN', definition: 'Lorry Receipt / Goods Receipt / Consignment Note — the core legal receipt issued when goods are booked for transport.', category: 'booking' },
  { termId: 'BILTY', term: 'Bilty', definition: 'Colloquial name for a Lorry Receipt (LR/GR). Given by transporter to shipper confirming goods accepted.', category: 'booking' },
  { termId: 'CHALLAN', term: 'Challan', definition: 'Generic transport note: booking, delivery, or truck hire challan.', category: 'booking' },
  { termId: 'PRIVATE_MARK', term: 'Private Mark', definition: "Shipper's identifying code stamped on packages for hub sorting.", category: 'booking' },
  { termId: 'ARTICLES', term: 'Articles', definition: 'Total count of physical packages or cartons in a consignment.', category: 'booking' },
  { termId: 'CHARGEABLE_WEIGHT', term: 'Chargeable Weight', definition: 'The higher of actual weight and volumetric (dimensional) weight.', category: 'booking' },
  { termId: 'FREIGHT_TERMS', term: 'Freight Terms', definition: 'To-Pay, Paid, or TBB (To Be Billed) freight payment modes.', category: 'billing' },
  { termId: 'TO_PAY', term: 'To-Pay', definition: 'Freight payment mode where consignee pays upon delivery.', category: 'billing' },
  { termId: 'TBB', term: 'TBB (To Be Billed)', definition: 'Consignor on monthly credit invoiced at end of billing period.', category: 'billing' },
  { termId: 'BOD', term: 'BOD (Basis of Delivery)', definition: 'Customer pays after partial delivery before balance released.', category: 'billing' },
  { termId: 'GRN', term: 'GRN (Goods Receipt Note)', definition: 'Internal warehouse document recording articles received against LR.', category: 'warehouse' },
  { termId: 'MATERIAL_TAG', term: 'Material Tag', definition: 'Per-article barcode label bound to LR and private mark.', category: 'warehouse' },
  { termId: 'PUTAWAY', term: 'Putaway / Bin', definition: 'Placing tagged goods into assigned storage bin or rack.', category: 'warehouse' },
  { termId: 'GODOWN', term: 'Godown', definition: 'Warehouse or storage shed at branch or hub location.', category: 'warehouse' },
  { termId: 'MANIFEST', term: 'Manifest / Trip Sheet', definition: 'Document tying many LRs to one vehicle for a line-haul leg.', category: 'hub' },
  { termId: 'CROSSING', term: 'Crossing / Transshipment', definition: 'Moving consignments between vehicles at intermediate hub.', category: 'hub' },
  { termId: 'DRS', term: 'DRS (Delivery Run Sheet)', definition: 'Delivery list assigned to a driver for a locality.', category: 'hub' },
  { termId: 'EPOD', term: 'ePOD (Electronic Proof of Delivery)', definition: 'Digital proof of delivery with photo + signature.', category: 'hub' },
  { termId: 'HAMALI', term: 'Hamali', definition: 'Loading/unloading labour charge at origin or destination.', category: 'billing' },
  { termId: 'BHADA', term: 'Bhada / Hire', definition: 'Freight/hire amount paid to a hired lorry owner.', category: 'billing' }
];

async function seed() {
  try {
    console.log('Creating rates, manifests, trips, and expenses tables if they do not exist...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rates (
        id SERIAL PRIMARY KEY,
        lane VARCHAR(50),
        article_type VARCHAR(50),
        weight_slab_kg NUMERIC,
        rate NUMERIC,
        volumetric_factor NUMERIC,
        surcharges NUMERIC
      );

      CREATE TABLE IF NOT EXISTS manifests (
        id VARCHAR(50) PRIMARY KEY,
        lane VARCHAR(100),
        vehicle_no VARCHAR(20),
        driver_name VARCHAR(100),
        status VARCHAR(50),
        date DATE,
        lr_count INTEGER,
        total_weight NUMERIC,
        total_freight NUMERIC,
        manifest_pdf VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS trips (
        id VARCHAR(50) PRIMARY KEY,
        origin VARCHAR(100),
        destination VARCHAR(100),
        contract_rate NUMERIC,
        truck_no VARCHAR(20),
        driver_id VARCHAR(50),
        driver_name VARCHAR(100),
        odo_start INTEGER,
        odo_end INTEGER,
        status VARCHAR(50),
        start_date DATE,
        driver_advance NUMERIC,
        lorry_receipt_no VARCHAR(50)
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(50) PRIMARY KEY,
        trip_id VARCHAR(50) REFERENCES trips(id) ON DELETE CASCADE,
        type VARCHAR(50),
        amount NUMERIC,
        source VARCHAR(50),
        verified BOOLEAN,
        date DATE,
        image_url VARCHAR(255),
        merchant VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS glossary (
        term_id VARCHAR(100) PRIMARY KEY,
        term VARCHAR(255) NOT NULL,
        definition TEXT NOT NULL,
        category VARCHAR(100) NOT NULL
      );
    `);

    console.log('Altering trucks table schema if columns are missing...');
    await pool.query(`
      ALTER TABLE trucks ADD COLUMN IF NOT EXISTS body_type VARCHAR(50) DEFAULT 'Container';
      ALTER TABLE trucks ADD COLUMN IF NOT EXISTS size VARCHAR(50) DEFAULT '19 Ft';
      ALTER TABLE trucks ADD COLUMN IF NOT EXISTS cft INTEGER DEFAULT 900;
      ALTER TABLE trucks ADD COLUMN IF NOT EXISTS max_boxes INTEGER DEFAULT 180;
    `);

    console.log('Clearing database tables...');
    await pool.query('TRUNCATE lrs, trucks, vehicle_owners, drivers, parties, branches, rates, manifests, trips, expenses, glossary CASCADE');

    console.log('Seeding branches...');
    for (const b of branches) {
      await pool.query(
        `INSERT INTO branches (id, name, gstin, address, type) VALUES ($1, $2, $3, $4, $5)`,
        [b.id, b.name, b.gstin, b.address, b.type]
      );
    }

    console.log('Seeding vehicle owners...');
    for (const vo of vehicleOwners) {
      await pool.query(
        `INSERT INTO vehicle_owners (id, name, pan, bank, default_hire_terms) VALUES ($1, $2, $3, $4, $5)`,
        [vo.id, vo.name, vo.pan, vo.bank, vo.default_hire_terms]
      );
    }

    console.log('Seeding trucks...');
    for (const t of trucks) {
      await pool.query(
        `INSERT INTO trucks (reg_no, model, capacity_kg, ownership, owner_id, status, expiry_rc, expiry_ins, permit, body_type, size, cft, max_boxes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [t.regNo, t.model, t.capacityKg, t.ownership, t.ownerId, t.status, t.expiryRC, t.expiryIns, t.permit, t.bodyType, t.size, t.cft, t.maxBoxes]
      );
    }

    console.log('Seeding drivers...');
    for (const d of drivers) {
      await pool.query(
        `INSERT INTO drivers (id, name, licence_no, phone, status, otp_status, licence_exp) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [d.id, d.name, d.licenceNo, d.phone, d.status, d.otpStatus, d.licenceExp]
      );
    }

    console.log('Seeding parties...');
    for (const p of parties) {
      await pool.query(
        `INSERT INTO parties (id, name, type, gstin, credit_limit, credit_days, address) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [p.id, p.name, p.type, p.gstin, p.creditLimit, p.creditDays, p.address]
      );
    }

    console.log('Seeding LRs...');
    for (const lr of lrs) {
      await pool.query(
        `INSERT INTO lrs (lr_no, booking_branch, consignor_id, consignee_id, origin, destination, articles, actual_wt, charge_wt, private_mark, said_to_contain, freight_terms, eway_bill, value, freight_amt, cgst, sgst, igst, status, date, manifest_id, warehouse_bin, physical_pod_received, pod_url) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
        [lr.lrNo, lr.bookingBranch, lr.consignorId, lr.consigneeId, lr.origin, lr.destination, lr.articles, lr.actualWt, lr.chargeWt, lr.privateMark, lr.saidToContain, lr.freightTerms, lr.ewayBill, lr.value, lr.freightAmt, lr.cgst, lr.sgst, lr.igst, lr.status, lr.date, lr.manifestId, lr.warehouseBin, lr.physicalPodReceived, lr.podUrl]
      );
    }

    console.log('Seeding rates...');
    for (const r of initialRates) {
      await pool.query(
        `INSERT INTO rates (lane, article_type, weight_slab_kg, rate, volumetric_factor, surcharges) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [r.lane, r.articleType, r.weightSlabKg, r.rate, r.volumetricFactor, r.surcharges]
      );
    }

    console.log('Seeding manifests...');
    for (const m of initialManifests) {
      await pool.query(
        `INSERT INTO manifests (id, lane, vehicle_no, driver_name, status, date, lr_count, total_weight, total_freight, manifest_pdf) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [m.id, m.lane, m.vehicleNo, m.driverName, m.status, m.date, m.lrCount, m.totalWeight, m.totalFreight, m.manifestPdf]
      );
    }

    console.log('Seeding trips...');
    for (const t of initialTrips) {
      await pool.query(
        `INSERT INTO trips (id, origin, destination, contract_rate, truck_no, driver_id, driver_name, odo_start, odo_end, status, start_date, driver_advance, lorry_receipt_no) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [t.id, t.origin, t.destination, t.contractRate, t.truckNo, t.driverId, t.driverName, t.odoStart, t.odoEnd, t.status, t.startDate, t.driverAdvance, t.lorryReceiptNo]
      );

      for (const e of t.expenses) {
        await pool.query(
          `INSERT INTO expenses (id, trip_id, type, amount, source, verified, date, merchant, image_url) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [e.id, t.id, e.type, e.amount, e.source, e.verified, e.date, e.merchant || null, e.image_url || null]
        );
      }
    }

    console.log('Seeding glossary...');
    for (const g of initialGlossary) {
      await pool.query(
        `INSERT INTO glossary (term_id, term, definition, category) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (term_id) DO NOTHING`,
        [g.termId, g.term, g.definition, g.category]
      );
    }

    console.log('Database seeded successfully! 🌱');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    pool.end();
  }
}

seed();
