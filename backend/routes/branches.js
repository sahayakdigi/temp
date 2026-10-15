import express from 'express';
import pool from '../db.js';

const router = express.Router();

const ensureBranchesSchema = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        gstin VARCHAR(50),
        address TEXT,
        type VARCHAR(50)
      );
    `);

    // Ensure default branches exist
    const defaultBranches = [
      ['HO', 'Head Office', '27AAAAA1111A1Z1', 'Mumbai HO, Nariman Point', 'HO'],
      ['DEL', 'Delhi Branch', '07BBBBB2222B2Z2', 'Sanjay Gandhi Transport Nagar, Delhi', 'branch'],
      ['BLR', 'Bangalore Hub', '29CCCCC3333C3Z3', 'Yeshwanthpur Hub, Bangalore', 'hub'],
      ['BOM', 'Mumbai Warehouse', '27AAAAA1111A1Z1', 'Kalamboli Warehouse, Navi Mumbai', 'warehouse']
    ];

    for (const b of defaultBranches) {
      await pool.query(
        `INSERT INTO branches (id, name, gstin, address, type) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (id) DO NOTHING`,
        b
      );
    }
  } catch (err) {
    console.error('Failed to ensure branches schema:', err);
  }
};

ensureBranchesSchema();

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
