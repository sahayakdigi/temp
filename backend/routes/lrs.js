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
      ADD COLUMN IF NOT EXISTS box_size_type VARCHAR(50) DEFAULT 'Medium';
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
    lr_no, booking_branch, consignor_id, consignee_id, origin, destination,
    articles, actual_wt, charge_wt, private_mark, said_to_contain, freight_terms,
    eway_bill, value, freight_amt, cgst, sgst, igst, status, date, manifest_id,
    warehouse_bin, physical_pod_received, pod_url, cft_per_box, total_cft, box_size_type
  } = req.body;

  const cftBox = cft_per_box || 5;
  const totCft = total_cft || (Number(articles || 0) * cftBox);

  try {
    await pool.query(
      `INSERT INTO lrs (
        lr_no, booking_branch, consignor_id, consignee_id, origin, destination,
        articles, actual_wt, charge_wt, private_mark, said_to_contain, freight_terms,
        eway_bill, value, freight_amt, cgst, sgst, igst, status, date, manifest_id,
        warehouse_bin, physical_pod_received, pod_url, cft_per_box, total_cft, box_size_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)`,
      [
        lr_no, booking_branch, consignor_id, consignee_id, origin, destination,
        articles, actual_wt, charge_wt, private_mark, said_to_contain, freight_terms,
        eway_bill, value, freight_amt, cgst, sgst, igst, status || 'Booked', date, manifest_id || null,
        warehouse_bin || null, physical_pod_received || false, pod_url || null,
        cftBox, totCft, box_size_type || 'Medium'
      ]
    );

    // Query with JOIN to return populated consignor and consignee names to matching React expectations
    const { rows } = await pool.query(`
      SELECT l.*, 
             p1.name AS consignor, 
             p2.name AS consignee 
      FROM lrs l
      LEFT JOIN parties p1 ON l.consignor_id = p1.id
      LEFT JOIN parties p2 ON l.consignee_id = p2.id
      WHERE l.lr_no = $1
    `, [lr_no]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

// Update an LR
router.patch('/:lrNo', async (req, res) => {
  const { lrNo } = req.params;
  const updates = req.body;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No update parameters provided' });
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
