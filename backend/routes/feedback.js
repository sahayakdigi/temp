import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Dynamically initialize the feedback table in PostgreSQL
const initTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        user_name VARCHAR(100),
        type VARCHAR(50) NOT NULL,
        priority VARCHAR(50) DEFAULT 'Medium',
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'Submitted',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error('Failed to initialize feedback table in PostgreSQL:', err);
  }
};
initTable();

// Submit feedback
router.post('/', async (req, res) => {
  const { userId, userName, type, priority, subject, message } = req.body;
  if (!userId || !type || !subject || !message) {
    return res.status(400).json({ error: 'Missing required feedback parameters.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO feedback (user_id, user_name, type, priority, subject, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, userName, type, priority || 'Medium', subject, message]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Database error on feedback submission:', err);
    res.status(500).json({ error: 'Internal database error saving feedback.' });
  }
});

// Fetch feedback history for a user (or all feedback if admin/all)
router.get('/', async (req, res) => {
  const { userId } = req.query;

  try {
    let result;
    if (!userId || userId === 'admin' || userId === 'all') {
      result = await pool.query(
        `SELECT * FROM feedback ORDER BY created_at DESC`
      );
    } else {
      result = await pool.query(
        `SELECT * FROM feedback WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Database error on fetching feedback:', err);
    res.status(500).json({ error: 'Internal database error fetching feedback.' });
  }
});

// Delete feedback
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  // If the ID is a mock ID (e.g. contains letters like FB-), bypass DB delete
  if (isNaN(Number(id))) {
    return res.json({ success: true, message: 'Mock feedback entry bypassed.' });
  }

  try {
    const result = await pool.query(
      `DELETE FROM feedback WHERE id = $1 RETURNING *`,
      [Number(id)]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Feedback entry not found.' });
    }
    res.json({ success: true, message: 'Feedback entry deleted successfully.', deleted: result.rows[0] });
  } catch (err) {
    console.error('Database error on deleting feedback:', err);
    res.status(500).json({ error: 'Internal database error deleting feedback.' });
  }
});

export default router;
