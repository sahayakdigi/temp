import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Auto-migrate manifests schema columns if missing
const ensureManifestsSchema = async () => {
  try {
    await pool.query(`
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

      ALTER TABLE manifests 
      ADD COLUMN IF NOT EXISTS origin_hub VARCHAR(50),
      ADD COLUMN IF NOT EXISTS dest_hub VARCHAR(50),
      ADD COLUMN IF NOT EXISTS driver_phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS total_cft NUMERIC,
      ADD COLUMN IF NOT EXISTS lr_nos TEXT;
    `);
  } catch (err) {
    console.error('Failed to ensure manifests table schema:', err);
  }
};

ensureManifestsSchema();

// Get all manifests
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM manifests ORDER BY date DESC, id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Create a manifest
router.post('/', async (req, res) => {
  const {
    id, lane, vehicle_no, driver_name, driver_phone, status, date,
    lr_count, total_weight, total_freight, total_cft, manifest_pdf,
    origin_hub, dest_hub, lr_nos
  } = req.body;

  const lrNosStr = Array.isArray(lr_nos) ? JSON.stringify(lr_nos) : (lr_nos || '[]');

  try {
    const { rows } = await pool.query(
      `INSERT INTO manifests (
        id, lane, vehicle_no, driver_name, driver_phone, status, date,
        lr_count, total_weight, total_freight, total_cft, manifest_pdf,
        origin_hub, dest_hub, lr_nos
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id, lane, vehicle_no, driver_name, driver_phone || '', status || 'Dispatched', date,
        lr_count || 0, total_weight || 0, total_freight || 0, total_cft || 0, manifest_pdf || '',
        origin_hub || 'DEL', dest_hub || 'BOM', lrNosStr
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

// Update a manifest
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body };

  if (updates.lr_nos && Array.isArray(updates.lr_nos)) {
    updates.lr_nos = JSON.stringify(updates.lr_nos);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No update parameters provided' });
  }

  const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
  const values = [...Object.values(updates), id];

  try {
    const { rows } = await pool.query(
      `UPDATE manifests SET ${fields} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Manifest not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database update failed' });
  }
});

export default router;
