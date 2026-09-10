import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get all vehicle owners
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM vehicle_owners ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Create a vehicle owner
router.post('/', async (req, res) => {
  const { id, name, pan, bank, default_hire_terms } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO vehicle_owners (id, name, pan, bank, default_hire_terms) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, name, pan, bank, default_hire_terms]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

export default router;
