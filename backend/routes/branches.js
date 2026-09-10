import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get all branches
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM branches ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Create a branch
router.post('/', async (req, res) => {
  const { id, name, gstin, address, type } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO branches (id, name, gstin, address, type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, name, gstin, address, type]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

export default router;
