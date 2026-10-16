import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get all trips (including nested expenses)
router.get('/', async (req, res) => {
  try {
    const tripsRes = await pool.query('SELECT * FROM trips ORDER BY start_date DESC, id DESC');
    const expensesRes = await pool.query('SELECT * FROM expenses ORDER BY date ASC, id ASC');

    const trips = tripsRes.rows.map(trip => {
      const tripExpenses = expensesRes.rows.filter(exp => exp.trip_id === trip.id);
      return {
        ...trip,
        expenses: tripExpenses
      };
    });

    res.json(trips);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Create a trip
router.post('/', async (req, res) => {
  const {
    id, origin, destination, contract_rate, truck_no, driver_id, driver_name,
    odo_start, odo_end, status, start_date, driver_advance, lorry_receipt_no
  } = req.body;

  try {
    // 1. Guard against assigning a driver who is already on an active trip or manifest
    if (driver_id && driver_id !== 'DRV-HIRED') {
      const busyDriverTrip = await pool.query(
        `SELECT id, status FROM trips WHERE driver_id = $1 AND status NOT IN ('Delivered', 'Cancelled') LIMIT 1`,
        [driver_id]
      );
      if (busyDriverTrip.rows.length > 0) {
        return res.status(400).json({ 
          error: `Driver is already assigned to active trip ${busyDriverTrip.rows[0].id} (${busyDriverTrip.rows[0].status}). Complete or deliver that trip first.` 
        });
      }
    }
    if (driver_name) {
      const busyDriverManifest = await pool.query(
        `SELECT id, status FROM manifests WHERE LOWER(driver_name) = LOWER($1) AND status NOT IN ('Delivered', 'Completed', 'Received', 'Cancelled') LIMIT 1`,
        [driver_name]
      );
      if (busyDriverManifest.rows.length > 0) {
        return res.status(400).json({ 
          error: `Driver ${driver_name} is already assigned to active manifest ${busyDriverManifest.rows[0].id} (${busyDriverManifest.rows[0].status}). Complete that manifest first.` 
        });
      }
    }

    // 2. Guard against assigning a truck that is already on an active trip or manifest
    if (truck_no) {
      const busyTruckTrip = await pool.query(
        `SELECT id, status FROM trips WHERE UPPER(REPLACE(truck_no, ' ', '')) = UPPER(REPLACE($1, ' ', '')) AND status NOT IN ('Delivered', 'Cancelled') LIMIT 1`,
        [truck_no]
      );
      if (busyTruckTrip.rows.length > 0) {
        return res.status(400).json({ 
          error: `Truck ${truck_no} is already assigned to active trip ${busyTruckTrip.rows[0].id} (${busyTruckTrip.rows[0].status}). Complete or deliver that trip first.` 
        });
      }

      const busyTruckManifest = await pool.query(
        `SELECT id, status FROM manifests WHERE UPPER(REPLACE(vehicle_no, ' ', '')) = UPPER(REPLACE($1, ' ', '')) AND status NOT IN ('Delivered', 'Completed', 'Received', 'Cancelled') LIMIT 1`,
        [truck_no]
      );
      if (busyTruckManifest.rows.length > 0) {
        return res.status(400).json({ 
          error: `Truck ${truck_no} is already assigned to active manifest ${busyTruckManifest.rows[0].id} (${busyTruckManifest.rows[0].status}). Complete that manifest first.` 
        });
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO trips (
        id, origin, destination, contract_rate, truck_no, driver_id, driver_name,
        odo_start, odo_end, status, start_date, driver_advance, lorry_receipt_no
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        id, origin, destination, contract_rate, truck_no, driver_id, driver_name,
        odo_start || null, odo_end || null, status || 'Assigned', start_date, driver_advance || 0, lorry_receipt_no || null
      ]
    );

    // Update truck status to InTransit if fleet truck
    if (truck_no) {
      await pool.query(
        `UPDATE trucks SET status = 'InTransit' WHERE UPPER(REPLACE(reg_no, ' ', '')) = UPPER(REPLACE($1, ' ', ''))`,
        [truck_no]
      );
    }

    const newTrip = { ...rows[0], expenses: [] };
    res.status(201).json(newTrip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

// Update a trip
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No update parameters provided' });
  }

  const ALLOWED_COLUMNS = new Set([
    'origin', 'destination', 'contract_rate', 'truck_no', 'driver_id', 'driver_name',
    'odo_start', 'odo_end', 'status', 'start_date', 'driver_advance', 'lorry_receipt_no'
  ]);

  const FIELD_MAP = {
    odoStart: 'odo_start',
    odoEnd: 'odo_end',
    startDate: 'start_date',
    lorryReceiptNo: 'lorry_receipt_no',
    driverId: 'driver_id',
    driverName: 'driver_name',
    truckNo: 'truck_no',
    contractRate: 'contract_rate',
    driverAdvance: 'driver_advance'
  };

  const dbUpdates = {};
  for (const [key, val] of Object.entries(updates)) {
    const colName = FIELD_MAP[key] || key;
    if (ALLOWED_COLUMNS.has(colName)) {
      dbUpdates[colName] = val;
    }
  }

  if (Object.keys(dbUpdates).length === 0) {
    // Only virtual fields or expenses was updated
    const tripRes = await pool.query('SELECT * FROM trips WHERE id = $1', [id]);
    const expensesRes = await pool.query('SELECT * FROM expenses WHERE trip_id = $1 ORDER BY date ASC, id ASC', [id]);
    if (tripRes.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    return res.json({ ...tripRes.rows[0], expenses: expensesRes.rows });
  }

  const fields = Object.keys(dbUpdates).map((key, index) => `${key} = $${index + 1}`).join(', ');
  const values = [...Object.values(dbUpdates), id];

  try {
    const { rows } = await pool.query(
      `UPDATE trips SET ${fields} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (dbUpdates.status === 'Delivered' || dbUpdates.status === 'Cancelled') {
      const truckNo = rows[0]?.truck_no;
      if (truckNo) {
        const activeRemaining = await pool.query(
          `SELECT id FROM trips WHERE UPPER(REPLACE(truck_no, ' ', '')) = UPPER(REPLACE($1, ' ', '')) AND status NOT IN ('Delivered', 'Cancelled') AND id != $2`,
          [truckNo, id]
        );
        const activeManifests = await pool.query(
          `SELECT id FROM manifests WHERE UPPER(REPLACE(vehicle_no, ' ', '')) = UPPER(REPLACE($1, ' ', '')) AND status NOT IN ('Delivered', 'Completed', 'Received', 'Cancelled')`,
          [truckNo]
        );
        if (activeRemaining.rows.length === 0 && activeManifests.rows.length === 0) {
          await pool.query(
            `UPDATE trucks SET status = 'Available' WHERE UPPER(REPLACE(reg_no, ' ', '')) = UPPER(REPLACE($1, ' ', ''))`,
            [truckNo]
          );
        }
      }
    }

    const expensesRes = await pool.query('SELECT * FROM expenses WHERE trip_id = $1 ORDER BY date ASC, id ASC', [id]);
    const updatedTrip = {
      ...rows[0],
      expenses: expensesRes.rows
    };
    res.json(updatedTrip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database update failed' });
  }
});

// Add an expense to a trip
router.post('/:id/expenses', async (req, res) => {
  const { id: tripId } = req.params;
  const { id, type, amount, source, verified, date, merchant, image_url } = req.body;

  try {
    // Verify trip exists
    const tripCheck = await pool.query('SELECT 1 FROM trips WHERE id = $1', [tripId]);
    if (tripCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const { rows } = await pool.query(
      `INSERT INTO expenses (id, trip_id, type, amount, source, verified, date, merchant, image_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [id, tripId, type, amount, source || 'manual', verified || false, date, merchant || null, image_url || null]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

// Update an expense on a trip
router.patch('/:tripId/expenses/:expenseId', async (req, res) => {
  const { tripId, expenseId } = req.params;
  const updates = req.body;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No update parameters provided' });
  }

  const fields = Object.keys(updates).map((key, index) => {
    // Translate camelCase key to snake_case if any
    const dbKey = key === 'imageUrl' ? 'image_url' : key;
    return `${dbKey} = $${index + 1}`;
  }).join(', ');
  const values = [...Object.values(updates), expenseId, tripId];

  try {
    const { rows } = await pool.query(
      `UPDATE expenses SET ${fields} WHERE id = $${values.length - 1} AND trip_id = $${values.length} RETURNING *`,
      values
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database update failed' });
  }
});

// Delete a trip
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const tripRes = await pool.query('SELECT truck_no FROM trips WHERE id = $1', [id]);
    const truckNo = tripRes.rows[0]?.truck_no;

    await pool.query('DELETE FROM expenses WHERE trip_id = $1', [id]);
    const { rowCount } = await pool.query('DELETE FROM trips WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (truckNo) {
      const activeRemaining = await pool.query(
        `SELECT id FROM trips WHERE UPPER(REPLACE(truck_no, ' ', '')) = UPPER(REPLACE($1, ' ', '')) AND status NOT IN ('Delivered', 'Cancelled')`,
        [truckNo]
      );
      const activeManifests = await pool.query(
        `SELECT id FROM manifests WHERE UPPER(REPLACE(vehicle_no, ' ', '')) = UPPER(REPLACE($1, ' ', '')) AND status NOT IN ('Delivered', 'Completed', 'Received', 'Cancelled')`,
        [truckNo]
      );
      if (activeRemaining.rows.length === 0 && activeManifests.rows.length === 0) {
        await pool.query(
          `UPDATE trucks SET status = 'Available' WHERE UPPER(REPLACE(reg_no, ' ', '')) = UPPER(REPLACE($1, ' ', ''))`,
          [truckNo]
        );
      }
    }

    res.json({ message: 'Trip deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database deletion failed' });
  }
});

export default router;

