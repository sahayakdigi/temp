import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get all rates
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM rates ORDER BY lane ASC, id ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Create a new rate card
router.post('/', async (req, res) => {
  const { lane, article_type, weight_slab_kg, rate, volumetric_factor, surcharges } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO rates (lane, article_type, weight_slab_kg, rate, volumetric_factor, surcharges) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [lane, article_type, weight_slab_kg, rate, volumetric_factor, surcharges]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

export default router;
