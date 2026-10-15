import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Auto-ensure lrs table columns exist
const ensureLrsSchema = async () => {
  try {
    await pool.query(`
      ALTER TABLE lrs 
      ADD COLUMN IF NOT EXISTS cft_per_box NUMERIC DEFAULT 5,
      ADD COLUMN IF NOT EXISTS total_cft NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS box_size_type VARCHAR(50) DEFAULT 'Medium',
      ADD COLUMN IF NOT EXISTS current_location VARCHAR(50),
      ADD COLUMN IF NOT EXISTS vehicle_no VARCHAR(50);
    `);
  } catch (err) {
    console.error('Failed to update lrs table schema:', err);
  }
};

ensureLrsSchema();

// Get all LRs
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT l.*, 
             p1.name AS consignor, 
             p2.name AS consignee 
      FROM lrs l
      LEFT JOIN parties p1 ON l.consignor_id = p1.id
      LEFT JOIN parties p2 ON l.consignee_id = p2.id
      ORDER BY l.date DESC, l.lr_no DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Create a new LR
router.post('/', async (req, res) => {
  const {
    lr_no, lrNo, booking_branch, bookingBranch, consignor_id, consignorId, consignee_id, consigneeId,
    origin, destination, articles, actual_wt, actualWt, charge_wt, chargeWt, private_mark, privateMark,
    said_to_contain, saidToContain, freight_terms, freightTerms, eway_bill, ewayBill, value,
    freight_amt, freightAmt, cgst, sgst, igst, status, date, manifest_id, manifestId,
    warehouse_bin, warehouseBin, physical_pod_received, physicalPodReceived, pod_url, podUrl,
    cft_per_box, cftPerBox, total_cft, totalCft, box_size_type, boxSizeType,
    current_location, currentLocation,
    broker_id, brokerId, broker_name, brokerName, broker_commission, brokerCommission,
    broker_commission_type, brokerCommissionType, broker_commission_rate, brokerCommissionRate,
    vehicle_no, vehicleNo
  } = req.body;

  const effLrNo = lr_no || lrNo;
  const effBookingBranch = booking_branch || bookingBranch || 'DEL';
  const effConsignorId = consignor_id || consignorId;
  const effConsigneeId = consignee_id || consigneeId;
  const effArticles = articles !== undefined ? Number(articles) : 1;
  const effActualWt = actual_wt !== undefined ? Number(actual_wt) : (actualWt !== undefined ? Number(actualWt) : 0);
  const effChargeWt = charge_wt !== undefined ? Number(charge_wt) : (chargeWt !== undefined ? Number(chargeWt) : 0);
  const effPrivateMark = private_mark || privateMark || '';
  const effSaidToContain = said_to_contain || saidToContain || '';
  const effFreightTerms = freight_terms || freightTerms || 'TBB';
  const effEwayBill = eway_bill || ewayBill || '';
  const effValue = value !== undefined ? Number(value) : 0;
  const effFreightAmt = freight_amt !== undefined ? Number(freight_amt) : (freightAmt !== undefined ? Number(freightAmt) : 0);
  const effStatus = status || 'Booked';
  const effDate = date || new Date().toISOString().split('T')[0];
  const effManifestId = manifest_id !== undefined ? manifest_id : (manifestId !== undefined ? manifestId : null);
  const effWarehouseBin = warehouse_bin || warehouseBin || null;
  const effPhysicalPod = physical_pod_received !== undefined ? physical_pod_received : (physicalPodReceived !== undefined ? physicalPodReceived : false);
  const effPodUrl = pod_url || podUrl || null;
  const cftBox = cft_per_box !== undefined ? Number(cft_per_box) : (cftPerBox !== undefined ? Number(cftPerBox) : 5);
  const totCft = total_cft !== undefined ? Number(total_cft) : (totalCft !== undefined ? Number(totalCft) : (effArticles * cftBox));
  const boxType = box_size_type || boxSizeType || 'Medium';
  const effCurrentLocation = current_location || currentLocation || effBookingBranch;
  const effBrokerId = broker_id || brokerId || null;
  const effBrokerName = broker_name || brokerName || null;
  const effBrokerCommission = broker_commission !== undefined ? Number(broker_commission) : (brokerCommission !== undefined ? Number(brokerCommission) : 0);
  const effBrokerCommissionType = broker_commission_type || brokerCommissionType || 'percent';
  const effBrokerCommissionRate = broker_commission_rate !== undefined ? Number(broker_commission_rate) : (brokerCommissionRate !== undefined ? Number(brokerCommissionRate) : 0);
  const effVehicleNo = vehicle_no || vehicleNo || null;

  try {
    await pool.query(
      `INSERT INTO lrs (
        lr_no, booking_branch, consignor_id, consignee_id, origin, destination,
        articles, actual_wt, charge_wt, private_mark, said_to_contain, freight_terms,
        eway_bill, value, freight_amt, cgst, sgst, igst, status, date, manifest_id,
        warehouse_bin, physical_pod_received, pod_url, cft_per_box, total_cft, box_size_type,
        current_location, broker_id, broker_name, broker_commission, broker_commission_type, broker_commission_rate,
        vehicle_no
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34)`,
      [
        effLrNo, effBookingBranch, effConsignorId, effConsigneeId, origin, destination,
        effArticles, effActualWt, effChargeWt, effPrivateMark, effSaidToContain, effFreightTerms,
        effEwayBill, effValue, effFreightAmt, cgst || 0, sgst || 0, igst || 0, effStatus, effDate, effManifestId,
        effWarehouseBin, effPhysicalPod, effPodUrl, cftBox, totCft, boxType, effCurrentLocation,
        effBrokerId, effBrokerName, effBrokerCommission, effBrokerCommissionType, effBrokerCommissionRate,
        effVehicleNo
      ]
    );

    // Query with JOIN to return populated consignor and consignee names matching React expectations
    const { rows } = await pool.query(`
      SELECT l.*, 
             p1.name AS consignor, 
             p2.name AS consignee 
      FROM lrs l
      LEFT JOIN parties p1 ON l.consignor_id = p1.id
      LEFT JOIN parties p2 ON l.consignee_id = p2.id
      WHERE l.lr_no = $1
    `, [effLrNo]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

// Update an LR
router.patch('/:lrNo', async (req, res) => {
  const { lrNo } = req.params;
  const body = req.body;

  if (Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'No update parameters provided' });
  }

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
    currentLocation: 'current_location',
    vehicleNo: 'vehicle_no'
  };

  const updates = {};
  for (const [key, val] of Object.entries(body)) {
    const dbKey = keyMap[key] || key;
    updates[dbKey] = val;
  }

  const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
  const values = [...Object.values(updates), lrNo];

  try {
    const { rows } = await pool.query(
      `UPDATE lrs SET ${fields} WHERE lr_no = $${values.length} RETURNING *`,
      values
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lorry Receipt not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database update failed' });
  }
});

// Delete an LR
router.delete('/:lrNo', async (req, res) => {
  const { lrNo } = req.params;
  try {
    const { rowCount } = await pool.query('DELETE FROM lrs WHERE lr_no = $1', [lrNo]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Lorry Receipt not found' });
    }
    res.json({ message: 'Lorry Receipt deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database deletion failed' });
  }
});

export default router;
