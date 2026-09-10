import express from 'express';
import pool from '../db.js';

const router = express.Router();

// ── Auto-ensure tables exist ──
const ensureTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS warehouse_bins (
        id VARCHAR(50) PRIMARY KEY,
        description VARCHAR(255),
        max_capacity INTEGER NOT NULL DEFAULT 150
      );

      CREATE TABLE IF NOT EXISTS discrepancies (
        id VARCHAR(50) PRIMARY KEY,
        lr_no VARCHAR(50),
        reported_at VARCHAR(50),
        booked_qty INTEGER,
        received_qty INTEGER,
        damage_qty INTEGER,
        status VARCHAR(50) DEFAULT 'Logged',
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error('Failed to verify warehouse tables:', err);
  }
};

ensureTables();

// Get all custom warehouse bins
router.get('/bins', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM warehouse_bins ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Create a custom warehouse bin
router.post('/bins', async (req, res) => {
  const { id, description, max_capacity } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO warehouse_bins (id, description, max_capacity) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (id) DO UPDATE SET description = $2, max_capacity = $3 
       RETURNING *`,
      [id, description || 'Custom Rack Bin', max_capacity || 150]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

// Get all discrepancies
router.get('/discrepancies', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM discrepancies ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Create a discrepancy
router.post('/discrepancies', async (req, res) => {
  const { id, lr_no, lrNo, reported_at, reportedAt, booked_qty, bookedQty, received_qty, receivedQty, damage_qty, damageQty, status, remarks } = req.body;
  try {
    const discId = id || `DISC-${Date.now()}`;
    const { rows } = await pool.query(
      `INSERT INTO discrepancies (id, lr_no, reported_at, booked_qty, received_qty, damage_qty, status, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        discId,
        lr_no || lrNo,
        reported_at || reportedAt || 'DEL',
        booked_qty || bookedQty || 0,
        received_qty || receivedQty || 0,
        damage_qty || damageQty || 0,
        status || 'Logged',
        remarks || ''
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

export default router;
