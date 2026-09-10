import express from 'express';
import pool from '../db.js';

const router = express.Router();

const initGlossaryTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS glossary (
        term_id VARCHAR(100) PRIMARY KEY,
        term VARCHAR(255) NOT NULL,
        definition TEXT NOT NULL,
        category VARCHAR(100) NOT NULL
      );
    `);
  } catch (err) {
    console.error('Failed to initialize glossary table:', err);
  }
};
initGlossaryTable();

// Get all glossary terms
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM glossary ORDER BY term ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Upsert a glossary term
router.post('/', async (req, res) => {
  const { termId, term, definition, category } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO glossary (term_id, term, definition, category)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (term_id) DO UPDATE SET term = $2, definition = $3, category = $4
       RETURNING *`,
      [termId, term, definition, category]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

export default router;
