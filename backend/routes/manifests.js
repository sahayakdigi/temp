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
    id, lane, vehicle_no, vehicleNo, driver_name, driverName, driver_phone, driverPhone,
    status, date, lr_count, lrCount, total_weight, totalWeight, total_freight, totalFreight,
    total_cft, totalCft, manifest_pdf, manifestPdf, origin_hub, originHub, dest_hub, destHub,
    lr_nos, lrNos
  } = req.body;

  const effId = id || `MNF-2026-${Date.now()}`;
  const effLane = lane || '';
  const effVehicleNo = vehicle_no || vehicleNo || '';
  const effDriverName = driver_name || driverName || '';
  const effDriverPhone = driver_phone || driverPhone || '';
  const effStatus = status || 'Dispatched';
  const effDate = date || new Date().toISOString().split('T')[0];
  const effLrCount = lr_count !== undefined ? Number(lr_count) : (lrCount !== undefined ? Number(lrCount) : 0);
  const effTotalWeight = total_weight !== undefined ? Number(total_weight) : (totalWeight !== undefined ? Number(totalWeight) : 0);
  const effTotalFreight = total_freight !== undefined ? Number(total_freight) : (totalFreight !== undefined ? Number(totalFreight) : 0);
  const effTotalCft = total_cft !== undefined ? Number(total_cft) : (totalCft !== undefined ? Number(totalCft) : 0);
  const effManifestPdf = manifest_pdf || manifestPdf || '';
  const effOriginHub = origin_hub || originHub || 'DEL';
  const effDestHub = dest_hub || destHub || 'BOM';
  const rawLrNos = lr_nos !== undefined ? lr_nos : lrNos;
  const lrNosStr = Array.isArray(rawLrNos) ? JSON.stringify(rawLrNos) : (rawLrNos || '[]');

  try {
    // 1. Guard against vehicle already on an active manifest or active trip
    if (effVehicleNo) {
      const busyVehicleTrip = await pool.query(
        `SELECT id, status FROM trips WHERE UPPER(REPLACE(truck_no, ' ', '')) = UPPER(REPLACE($1, ' ', '')) AND status NOT IN ('Delivered', 'Cancelled') LIMIT 1`,
        [effVehicleNo]
      );
      if (busyVehicleTrip.rows.length > 0) {
        return res.status(400).json({ 
          error: `Vehicle ${effVehicleNo} is already assigned to active FTL trip ${busyVehicleTrip.rows[0].id} (${busyVehicleTrip.rows[0].status}).` 
        });
      }

      const busyVehicleManifest = await pool.query(
        `SELECT id, status FROM manifests WHERE UPPER(REPLACE(vehicle_no, ' ', '')) = UPPER(REPLACE($1, ' ', '')) AND status NOT IN ('Delivered', 'Completed', 'Received', 'Cancelled') LIMIT 1`,
        [effVehicleNo]
      );
      if (busyVehicleManifest.rows.length > 0) {
        return res.status(400).json({ 
          error: `Vehicle ${effVehicleNo} is already assigned to active manifest ${busyVehicleManifest.rows[0].id} (${busyVehicleManifest.rows[0].status}).` 
        });
      }
    }

    // 2. Guard against driver already on an active manifest or active trip
    if (effDriverName) {
      const busyDriverTrip = await pool.query(
        `SELECT id, status FROM trips WHERE LOWER(driver_name) = LOWER($1) AND status NOT IN ('Delivered', 'Cancelled') LIMIT 1`,
        [effDriverName]
      );
      if (busyDriverTrip.rows.length > 0) {
        return res.status(400).json({ 
          error: `Driver ${effDriverName} is already assigned to active FTL trip ${busyDriverTrip.rows[0].id} (${busyDriverTrip.rows[0].status}).` 
        });
      }

      const busyDriverManifest = await pool.query(
        `SELECT id, status FROM manifests WHERE LOWER(driver_name) = LOWER($1) AND status NOT IN ('Delivered', 'Completed', 'Received', 'Cancelled') LIMIT 1`,
        [effDriverName]
      );
      if (busyDriverManifest.rows.length > 0) {
        return res.status(400).json({ 
          error: `Driver ${effDriverName} is already assigned to active manifest ${busyDriverManifest.rows[0].id} (${busyDriverManifest.rows[0].status}).` 
        });
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO manifests (
        id, lane, vehicle_no, driver_name, driver_phone, status, date,
        lr_count, total_weight, total_freight, total_cft, manifest_pdf,
        origin_hub, dest_hub, lr_nos
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        effId, effLane, effVehicleNo, effDriverName, effDriverPhone, effStatus, effDate,
        effLrCount, effTotalWeight, effTotalFreight, effTotalCft, effManifestPdf,
        effOriginHub, effDestHub, lrNosStr
      ]
    );

    if (effVehicleNo) {
      await pool.query(
        `UPDATE trucks SET status = 'InTransit' WHERE UPPER(REPLACE(reg_no, ' ', '')) = UPPER(REPLACE($1, ' ', ''))`,
        [effVehicleNo]
      );
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

// Update a manifest
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body;

  if (Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'No update parameters provided' });
  }

  const keyMap = {
    vehicleNo: 'vehicle_no',
    driverName: 'driver_name',
    driverPhone: 'driver_phone',
    originHub: 'origin_hub',
    destHub: 'dest_hub',
    lrCount: 'lr_count',
    totalWeight: 'total_weight',
    totalFreight: 'total_freight',
    totalCft: 'total_cft',
    manifestPdf: 'manifest_pdf',
    lrNos: 'lr_nos'
  };

  const updates = {};
  for (const [key, val] of Object.entries(body)) {
    const dbKey = keyMap[key] || key;
    if (dbKey === 'lr_nos' && Array.isArray(val)) {
      updates[dbKey] = JSON.stringify(val);
    } else {
      updates[dbKey] = val;
    }
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

    const updated = rows[0];
    if (['Delivered', 'Completed', 'Received', 'Cancelled'].includes(updated.status)) {
      const vehNo = updated.vehicle_no;
      if (vehNo) {
        const activeManifests = await pool.query(
          `SELECT id FROM manifests WHERE UPPER(REPLACE(vehicle_no, ' ', '')) = UPPER(REPLACE($1, ' ', '')) AND status NOT IN ('Delivered', 'Completed', 'Received', 'Cancelled') AND id != $2`,
          [vehNo, id]
        );
        const activeTrips = await pool.query(
          `SELECT id FROM trips WHERE UPPER(REPLACE(truck_no, ' ', '')) = UPPER(REPLACE($1, ' ', '')) AND status NOT IN ('Delivered', 'Cancelled')`,
          [vehNo]
        );
        if (activeManifests.rows.length === 0 && activeTrips.rows.length === 0) {
          await pool.query(
            `UPDATE trucks SET status = 'Available' WHERE UPPER(REPLACE(reg_no, ' ', '')) = UPPER(REPLACE($1, ' ', ''))`,
            [vehNo]
          );
        }
      }
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database update failed' });
  }
});

export default router;
