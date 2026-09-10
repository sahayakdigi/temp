import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get all trucks
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM trucks ORDER BY reg_no ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Create a truck
router.post('/', async (req, res) => {
  const { 
    reg_no, model, capacity_kg, ownership, owner_id, status, expiry_rc, expiry_ins, permit, body_type, size, cft, max_boxes,
    expiry_fc, expiry_puc, expiry_road_tax, chassis_no, engine_no, fastag_id, fastag_balance, gps_imei, current_odo, fuel_efficiency, year_manufacture,
    fc_doc_url, puc_doc_url, road_tax_doc_url
  } = req.body;
  const cleanExpiryRC = (expiry_rc && expiry_rc.trim() !== '') ? expiry_rc : null;
  const cleanExpiryIns = (expiry_ins && expiry_ins.trim() !== '') ? expiry_ins : null;
  const cleanExpiryFC = (expiry_fc && expiry_fc.trim() !== '') ? expiry_fc : null;
  const cleanExpiryPUC = (expiry_puc && expiry_puc.trim() !== '') ? expiry_puc : null;
  const cleanExpiryRoadTax = (expiry_road_tax && expiry_road_tax.trim() !== '') ? expiry_road_tax : null;
  try {
    const { rows } = await pool.query(
      `INSERT INTO trucks (
        reg_no, model, capacity_kg, ownership, owner_id, status, expiry_rc, expiry_ins, permit, body_type, size, cft, max_boxes,
        expiry_fc, expiry_puc, expiry_road_tax, chassis_no, engine_no, fastag_id, fastag_balance, gps_imei, current_odo, fuel_efficiency, year_manufacture,
        fc_doc_url, puc_doc_url, road_tax_doc_url
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) RETURNING *`,
      [
        reg_no, model, capacity_kg, ownership, owner_id || null, status || 'Available', cleanExpiryRC, cleanExpiryIns, permit, body_type || 'Container', size || '19 Ft', Number(cft) || 900, Number(max_boxes) || 180,
        cleanExpiryFC, cleanExpiryPUC, cleanExpiryRoadTax, chassis_no || '', engine_no || '', fastag_id || '', Number(fastag_balance) || 0, gps_imei || '', Number(current_odo) || 0, Number(fuel_efficiency) || 0, Number(year_manufacture) || 2020,
        fc_doc_url || '', puc_doc_url || '', road_tax_doc_url || ''
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

// Update truck status or info
router.patch('/:regNo', async (req, res) => {
  const { regNo } = req.params;
  const updates = req.body;
  
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No update parameters provided' });
  }

  const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
  const values = [...Object.values(updates), regNo];

  try {
    const { rows } = await pool.query(
      `UPDATE trucks SET ${fields} WHERE reg_no = $${values.length} RETURNING *`,
      values
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Truck not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database update failed' });
  }
});

export default router;
